import { PolicyPage, supportEmail } from "@/components/radar/en/policy-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Refund Policy | Love Radar AI", description: "Refund policy for Love Radar AI.", path: "/en/refund", locale: "en_US" });

export default function RefundPage() {
  return (
    <PolicyPage title="Refund Policy">
      <p>Full reports are a one-time digital purchase. There is no subscription and you will not be charged again.</p>
      <h2>7-day refunds</h2>
      <p>If you are not happy with a paid report, email us within 7 days of purchase and we will refund you in full. No complicated forms.</p>
      <p>We will also always refund you if the full report failed to unlock or did not generate correctly.</p>
      <h2>How to request</h2>
      <p>Email <a href={`mailto:${supportEmail}`}>{supportEmail}</a> with the email address used at checkout or your order number. Refunds are processed through Lemon Squeezy and usually appear within 5–10 business days depending on your bank.</p>
      <p>When a refund is issued, access to the full version of that report is removed.</p>
    </PolicyPage>
  );
}
