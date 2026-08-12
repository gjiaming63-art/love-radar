export type ParsedChatTextMessage = {
  speaker: string;
  text: string;
};

export type ParsedChatTextResult = {
  rawText: string;
  normalizedText: string;
  messages: ParsedChatTextMessage[];
  speakers: string[];
};

const systemLinePatterns = [
  /^以下为新消息$/,
  /^微信$/,
  /^聊天记录$/,
  /^消息记录$/,
  /^以上是打招呼的内容$/,
  /^对方撤回了一条消息$/,
  /^你撤回了一条消息$/,
  /^撤回了一条消息$/,
  /^图片$/,
  /^语音$/,
  /^视频$/,
  /^表情$/,
  /^文件$/,
  /^位置$/,
  /^转账$/,
  /^红包$/,
  /^拍了拍/,
  /^我通过了你的朋友验证请求/,
  /^你已添加了.*现在可以开始聊天了/,
];

export function normalizeChatText(text: string) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u2028|\u2029/g, "\n");
}

export function parseWechatTranscript(text: string): ParsedChatTextResult {
  const rawText = normalizeChatText(text);
  const lines = rawText
    .split("\n")
    .map((line) => cleanLine(line))
    .filter(Boolean);

  const messages: ParsedChatTextMessage[] = [];
  const speakerHints = new Map<string, number>();
  let currentSpeaker = "";

  function markSpeakerHint(speaker: string) {
    const cleanSpeaker = cleanSpeakerName(speaker);
    if (!cleanSpeaker) return;
    speakerHints.set(cleanSpeaker, (speakerHints.get(cleanSpeaker) ?? 0) + 1);
  }

  function pushMessage(speaker: string, messageText: string) {
    const cleanSpeaker = cleanSpeakerName(speaker);
    const cleanText = cleanMessageText(messageText);
    if (!cleanSpeaker || !cleanText) return;
    markSpeakerHint(cleanSpeaker);
    messages.push({ speaker: cleanSpeaker, text: cleanText });
    currentSpeaker = cleanSpeaker;
  }

  function appendToLast(messageText: string) {
    const cleanText = cleanMessageText(messageText);
    if (!cleanText) return;
    const last = messages[messages.length - 1];
    if (last && last.speaker === currentSpeaker) {
      last.text = `${last.text}\n${cleanText}`;
      return;
    }
    if (currentSpeaker) pushMessage(currentSpeaker, cleanText);
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = stripTimestampPrefix(lines[index]);
    if (isIgnorableLine(line)) continue;
    if (isTimeLine(line) || isDateLine(line)) continue;

    const colon = parseColonLine(line);
    if (colon) {
      pushMessage(colon.speaker, colon.text);
      continue;
    }

    const timeWithName = parseTimeNameLine(line);
    if (timeWithName) {
      markSpeakerHint(timeWithName);
      currentSpeaker = timeWithName;
      continue;
    }

    const nextMeaningful = findNextMeaningfulLine(lines, index + 1);
    if (isSpeakerNameCandidate(line, nextMeaningful)) {
      const speaker = cleanSpeakerName(line);
      markSpeakerHint(speaker);
      currentSpeaker = speaker;
      continue;
    }

    appendToLast(line);
  }

  const normalizedText = messages.map((message) => `${message.speaker}：${message.text}`).join("\n");
  const speakers = getTopSpeakers(messages, speakerHints);

  return {
    rawText,
    normalizedText,
    messages,
    speakers,
  };
}

function cleanLine(line: string) {
  return line
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .trim();
}

function cleanSpeakerName(value: string) {
  const name = cleanLine(value)
    .replace(/^\[|\]$/g, "")
    .replace(/[：:]+$/g, "")
    .trim();

  if (!name || name.length > 24) return "";
  if (/^\d+$/.test(name)) return "";
  if (/^(http|https|www\.)/i.test(name)) return "";
  if (isTimeLine(name) || isDateLine(name) || isDateTimeLike(name) || isIgnorableLine(name)) return "";
  if (/[年月日]/.test(name) && /\d/.test(name)) return "";
  if (/\d{1,2}:\d{2}/.test(name)) return "";
  return name;
}

function cleanMessageText(value: string) {
  return cleanLine(value).replace(/^["“”]+|["“”]+$/g, "").trim();
}

function parseColonLine(line: string) {
  const match = line.match(/^(.{1,24}?)[：:]\s*(.+)$/);
  if (!match) return null;
  const speaker = cleanSpeakerName(match[1]);
  const messageText = cleanMessageText(match[2]);
  if (!speaker || !messageText) return null;
  return { speaker, text: messageText };
}

function stripTimestampPrefix(line: string) {
  return line
    .replace(/^\[?\d{1,4}[/-]\d{1,2}[/-]\d{1,4},?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]?\s*(?:[-–—:]\s*)?/i, "")
    .replace(/^\[?(?:Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]?\s*(?:[-–—:]\s*)?/i, "")
    .replace(/^\[?\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]?\s*[-–—:]\s*/i, "")
    .trim();
}

function parseTimeNameLine(line: string) {
  const timePrefix = line.match(/^(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?|(?:上午|下午|晚上|凌晨|中午)\s*\d{1,2}:\d{2})\s+(.{1,24})$/i);
  if (timePrefix) return cleanSpeakerName(timePrefix[1]);

  const timeSuffix = line.match(/^(.{1,24})\s+(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?|(?:上午|下午|晚上|凌晨|中午)\s*\d{1,2}:\d{2})$/i);
  if (timeSuffix) return cleanSpeakerName(timeSuffix[1]);

  return "";
}

function findNextMeaningfulLine(lines: string[], start: number) {
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line || isIgnorableLine(line) || isTimeLine(line) || isDateLine(line)) continue;
    return line;
  }
  return "";
}

function isSpeakerNameCandidate(line: string, nextLine: string) {
  const name = cleanSpeakerName(line);
  if (!name || !nextLine) return false;
  if (parseColonLine(line) || parseTimeNameLine(line)) return false;
  if (name.length > 18) return false;
  if (/[。！？!?，,；;、]/.test(name)) return false;
  if (name.length > 2 && /[吗呢吧呀啦啊哦嘛]/.test(name)) return false;
  if (/^(我|你|他|她|它|这|那|嗯|啊|哦|好|行|可以|不是|没有|就是|然后|但是)$/.test(name)) return false;
  if (isLikelySentence(name)) return false;
  return true;
}

function isLikelySentence(value: string) {
  if (value.length >= 8 && /[吗呢吧呀了的就想要会能不]/.test(value)) return true;
  if (/[。！？!?，,；;]/.test(value)) return true;
  return false;
}

function isIgnorableLine(line: string) {
  if (!line) return true;
  if (systemLinePatterns.some((pattern) => pattern.test(line))) return true;
  if (/^\[.*\]$/.test(line) && line.length <= 20) return true;
  return false;
}

function isTimeLine(line: string) {
  return /^(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?|(?:上午|下午|晚上|凌晨|中午)\s*\d{1,2}:\d{2})$/i.test(line);
}

function isDateLine(line: string) {
  return /^(?:\d{4}[/-]\d{1,2}[/-]\d{1,2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}月\d{1,2}日|今天|昨天|前天|星期[一二三四五六日天]|Today|Yesterday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)(?:,?\s+(?:\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?|(?:上午|下午|晚上|凌晨|中午)\s*\d{1,2}:\d{2}))?$/i.test(
    line,
  );
}

function isDateTimeLike(line: string) {
  return (
    /^(?:\d{4}年)?\d{1,2}月\d{1,2}日(?:\s+星期[一二三四五六日天])?(?:\s+(?:上午|下午|晚上|凌晨|中午)?\s*\d{1,2}:\d{2})?$/.test(
      line,
    ) ||
    /^\d{4}[/-]\d{1,2}[/-]\d{1,2}(?:\s+(?:上午|下午|晚上|凌晨|中午)?\s*\d{1,2}:\d{2})?$/.test(line) ||
    /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:,?\s+\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)?$/i.test(line)
  );
}

function getTopSpeakers(messages: ParsedChatTextMessage[], speakerHints: Map<string, number>) {
  const counts = new Map<string, number>();
  for (const [speaker, count] of speakerHints.entries()) {
    counts.set(speaker, count * 3);
  }
  for (const message of messages) {
    counts.set(message.speaker, (counts.get(message.speaker) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([speaker]) => speaker)
    .slice(0, 4);
}
