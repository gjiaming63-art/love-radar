import { NextResponse } from "next/server";
import { extractChatTextFromImage } from "@/lib/ocr";

const allowedTypes = new Set(["image/png", "image/jpeg"]);
const maxImageSize = 8 * 1024 * 1024;

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const image = formData.get("image");

    if (!(image instanceof File)) {
      return NextResponse.json({ error: "请先上传聊天截图。" }, { status: 400 });
    }

    if (!allowedTypes.has(image.type)) {
      return NextResponse.json({ error: "只支持 PNG、JPG 格式的聊天截图。" }, { status: 400 });
    }

    if (image.size > maxImageSize) {
      return NextResponse.json({ error: "图片太大，请上传 8MB 以内的聊天截图。" }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const text = await extractChatTextFromImage(buffer.toString("base64"), image.type);

    return NextResponse.json({ text });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : "截图识别失败，请稍后重试。";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
