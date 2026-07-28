import crypto from "crypto";

type OcrProvider = "tencent" | "openai";

type TencentOcrTextDetection = {
  DetectedText?: string;
};

type TencentOcrResponse = {
  Response?: {
    TextDetections?: TencentOcrTextDetection[];
    Error?: {
      Code?: string;
      Message?: string;
    };
  };
};

type OpenAIResponseContent = {
  type?: string;
  text?: string;
};

type OpenAIResponseOutput = {
  content?: OpenAIResponseContent[];
};

type OpenAIResponsesResult = {
  output_text?: string;
  output?: OpenAIResponseOutput[];
};

function cleanOcrText(text: string) {
  return text
    .replace(/^```(?:text|txt)?/i, "")
    .replace(/```$/i, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getOcrProvider(): OcrProvider {
  const provider = process.env.OCR_PROVIDER?.toLowerCase();
  if (provider === "openai") return "openai";
  return "tencent";
}

function sha256Hex(value: string) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: string | Buffer, value: string) {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function formatUtcDate(timestamp: number) {
  return new Date(timestamp * 1000).toISOString().slice(0, 10);
}

async function extractWithTencent(base64Image: string) {
  const secretId = process.env.TENCENT_SECRET_ID || "";
  const secretKey = process.env.TENCENT_SECRET_KEY || "";
  const region = process.env.TENCENT_OCR_REGION || "ap-guangzhou";

  if (!secretId || !secretKey) {
    throw new Error("服务端未配置腾讯云 OCR 密钥，暂时不能识别聊天截图。");
  }

  const service = "ocr";
  const host = "ocr.tencentcloudapi.com";
  const action = "GeneralBasicOCR";
  const version = "2018-11-19";
  const timestamp = Math.floor(Date.now() / 1000);
  const date = formatUtcDate(timestamp);
  const payload = JSON.stringify({
    ImageBase64: base64Image,
    LanguageType: "zh",
  });

  const contentType = "application/json; charset=utf-8";
  const canonicalRequest = [
    "POST",
    "/",
    "",
    `content-type:${contentType}\nhost:${host}\n`,
    "content-type;host",
    sha256Hex(payload),
  ].join("\n");
  const credentialScope = `${date}/${service}/tc3_request`;
  const stringToSign = [
    "TC3-HMAC-SHA256",
    String(timestamp),
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const secretDate = hmac(`TC3${secretKey}`, date);
  const secretService = hmac(secretDate, service);
  const secretSigning = hmac(secretService, "tc3_request");
  const signature = crypto.createHmac("sha256", secretSigning).update(stringToSign, "utf8").digest("hex");
  const authorization =
    `TC3-HMAC-SHA256 Credential=${secretId}/${credentialScope}, ` +
    "SignedHeaders=content-type;host, " +
    `Signature=${signature}`;

  const response = await fetch(`https://${host}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      "Content-Type": contentType,
      Host: host,
      "X-TC-Action": action,
      "X-TC-Region": region,
      "X-TC-Timestamp": String(timestamp),
      "X-TC-Version": version,
    },
    body: payload,
  });

  const data = (await response.json().catch(() => ({}))) as TencentOcrResponse;
  const apiError = data.Response?.Error;
  if (!response.ok || apiError) {
    const detail = apiError?.Message || response.statusText || "腾讯云 OCR 请求失败";
    throw new Error(`截图识别失败：${detail}`);
  }

  const text = cleanOcrText(
    data.Response?.TextDetections?.map((item) => item.DetectedText || "")
      .filter(Boolean)
      .join("\n") ?? "",
  );

  if (!text) {
    throw new Error("没有从截图中识别到可用聊天文字，请换一张更清晰的截图。");
  }

  return text;
}

function extractOpenAIOutputText(data: OpenAIResponsesResult) {
  if (data.output_text?.trim()) return data.output_text.trim();

  return (
    data.output
      ?.flatMap((item) => item.content ?? [])
      .map((item) => item.text ?? "")
      .join("\n")
      .trim() ?? ""
  );
}

async function extractWithOpenAI(imageDataUrl: string) {
  const apiKey = process.env.OCR_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "";
  const baseUrl = (process.env.OCR_OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/+$/, "");
  const model = process.env.OCR_OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    throw new Error("服务端未配置 OPENAI_API_KEY，暂时不能识别聊天截图。");
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_output_tokens: 2500,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "请只做 OCR 提取，不要分析关系。图片是手机聊天截图，可能来自微信。请按从上到下的顺序提取可读聊天内容，尽量保留发言人昵称、时间和原句。忽略状态栏、输入框、表情商店、转发提示等界面元素。不要补全看不清的内容，不要编造。只输出纯文本聊天记录，不要 Markdown，不要解释。",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`截图识别失败：${response.status}${detail ? ` ${detail}` : ""}`);
  }

  const data = (await response.json()) as OpenAIResponsesResult;
  const text = cleanOcrText(extractOpenAIOutputText(data));

  if (!text) {
    throw new Error("没有从截图中识别到可用聊天文字，请换一张更清晰的截图。");
  }

  return text;
}

export async function extractChatTextFromImage(base64Image: string, mimeType: string) {
  if (getOcrProvider() === "openai") {
    return extractWithOpenAI(`data:${mimeType};base64,${base64Image}`);
  }

  return extractWithTencent(base64Image);
}
