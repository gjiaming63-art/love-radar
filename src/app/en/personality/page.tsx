import { EnglishPersonalityQuiz } from "@/components/radar/en/personality-quiz";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Love Type Quiz | Love Radar AI",
  description: "Take a 10-question quiz to discover your relationship style and shareable love personality result.",
  path: "/en/personality",
  locale: "en_US",
  keywords: ["love type quiz", "relationship personality quiz", "dating personality"],
  languages: {
    "zh-CN": "/personality",
    "en-US": "/en/personality",
  },
});

export default function EnglishPersonalityPage() {
  return <EnglishPersonalityQuiz />;
}
