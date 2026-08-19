import { createNoIndexMetadata } from "@/lib/seo";

export const metadata = createNoIndexMetadata("Love Radar admin");

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}

