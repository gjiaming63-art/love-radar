import { PersonalityQuiz } from "@/components/radar/personality-quiz";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "测一测你的恋爱人格 | 恋爱雷达",
  description: "用 10 道题看看你在恋爱里的隐藏模式，生成适合分享的恋爱人格测试结果。",
  path: "/personality",
  keywords: ["恋爱人格测试", "爱情测试", "恋爱雷达", "恋爱类型"],
  languages: {
    "zh-CN": "/personality",
    "en-US": "/en/personality",
  },
});

export default function PersonalityPage() {
  return <PersonalityQuiz />;
}
