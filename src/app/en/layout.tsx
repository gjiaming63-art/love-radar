import type { ReactNode } from "react";
import { PolicyFooter } from "@/components/radar/en/policy-page";

export default function EnglishLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <PolicyFooter />
    </>
  );
}
