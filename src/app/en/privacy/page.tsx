import { PolicyPage, supportEmail } from "@/components/radar/en/policy-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Privacy Policy | Love Radar AI", description: "How Love Radar AI handles your data.", path: "/en/privacy", locale: "en_US" });

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy">
      <p>This policy explains what Love Radar AI collects and how it is used.</p>
      <h2>Chats and screenshots</h2>
      <ul>
        <li>Chat text and screenshots you submit are sent to our AI providers only to generate your report.</li>
        <li>We do not store your raw chat logs or screenshots. We store the generated report (scores, tags, short quoted excerpts and suggestions) so you can view and share it.</li>
        <li>Reports expire and are deleted automatically after a limited period. You can also delete a report yourself.</li>
      </ul>
      <h2>Other data we collect</h2>
      <ul>
        <li>Account data: your email address if you sign in.</li>
        <li>Usage data: anonymous product events (for example page views and button clicks) and a hashed device identifier, used to improve the product and prevent abuse.</li>
        <li>Payment data: handled by Lemon Squeezy. We receive order details such as order ID, amount and email, but never your card details.</li>
      </ul>
      <h2>Service providers</h2>
      <p>We use third-party providers to run the service, including AI model providers (DeepSeek and Alibaba Cloud Qwen) to analyze conversations, Vercel for hosting, Neon for our database, Resend for login emails and Lemon Squeezy for payments. They process data on our behalf and may be located outside your country.</p>
      <h2>We do not</h2>
      <ul>
        <li>Sell your personal data.</li>
        <li>Use your chats to train our own models.</li>
      </ul>
      <h2>Your choices</h2>
      <p>You can request access to or deletion of your account data by emailing <a href={`mailto:${supportEmail}`}>{supportEmail}</a>.</p>
      <h2>Children</h2>
      <p>Love Radar is not intended for anyone under 18.</p>
    </PolicyPage>
  );
}
