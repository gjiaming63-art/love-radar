import { PolicyPage, supportEmail } from "@/components/radar/en/policy-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Contact | Love Radar AI", description: "Contact Love Radar AI.", path: "/en/contact", locale: "en_US" });

export default function ContactPage() {
  return (
    <PolicyPage title="Contact">
      <p>Questions, refunds, data requests or feedback: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
      <p>We usually reply within 1–2 business days.</p>
    </PolicyPage>
  );
}
