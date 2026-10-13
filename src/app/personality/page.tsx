import { PersonalityQuiz } from "@/components/radar/personality-quiz";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "恋爱人格测试｜测测你天生是哪一种恋人 - Love Radar",
  description: "从心动、暧昧到亲密关系，发现隐藏在选择背后的恋爱人格。",
  path: "/personality",
  keywords: ["恋爱人格测试", "爱情测试", "恋爱雷达", "恋爱类型"],
  ogImage: "/personality-og.svg",
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: "Love Radar 恋爱人格测试",
  languages: {
    "zh-CN": "/personality",
    "en-US": "/en/personality",
  },
});

export default function PersonalityPage() {
  return <PersonalityQuiz />;
}
