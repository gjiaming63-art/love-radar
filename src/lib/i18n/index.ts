import { enUS } from "./en-US";
import { zhCN } from "./zh-CN";

export type AppLocale = "zh-CN" | "en-US";

export function getMessages(locale: AppLocale) {
  return locale === "en-US" ? enUS : zhCN;
}
