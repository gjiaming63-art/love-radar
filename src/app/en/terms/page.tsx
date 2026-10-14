import { PolicyPage, supportEmail } from "@/components/radar/en/policy-page";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({ title: "Terms of Service | Love Radar AI", description: "Terms of Service for Love Radar AI.", path: "/en/terms", locale: "en_US" });

export default function TermsPage() {
  return (
    <PolicyPage title="Terms of Service">
      <p>These terms govern your use of Love Radar AI (&ldquo;Love Radar&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) at lovescannerai.com. By using the service you agree to them.</p>
      <h2>What Love Radar is</h2>
      <p>Love Radar is an AI tool that analyzes chat conversations you provide and generates a report with scores, observations and suggested replies. Reports are generated automatically by AI, can be wrong, and are provided for entertainment and self-reflection only. They are not psychological, medical, legal or professional relationship advice. Do not make important decisions based only on a report.</p>
      <h2>Who can use it</h2>
      <p>You must be at least 18 years old to use Love Radar.</p>
      <h2>Your content</h2>
      <ul>
        <li>Only upload conversations that you personally took part in. Do not upload other people&apos;s private conversations.</li>
        <li>Remove phone numbers, addresses and other sensitive details before uploading.</li>
        <li>Do not use Love Radar to harass, stalk, monitor or harm anyone.</li>
        <li>You keep ownership of what you upload. You give us permission to process it only to generate your report.</li>
      </ul>
      <h2>Paid reports</h2>
      <p>Some features, such as the full report, require a one-time payment. Prices are shown before checkout. Payments are processed by our payment provider, which acts as Merchant of Record, handles applicable taxes and issues receipts. Refunds are covered by our <a href="/en/refund">Refund Policy</a>.</p>
      <h2>Availability</h2>
      <p>We may change, suspend or discontinue features at any time. Reports may expire and be deleted after a period of time.</p>
      <h2>Limitation of liability</h2>
      <p>The service is provided &ldquo;as is&rdquo;. To the extent permitted by law, we are not liable for indirect or consequential damages, and our total liability is limited to the amount you paid us in the 12 months before the claim.</p>
      <h2>Changes</h2>
      <p>We may update these terms. Continued use after an update means you accept the new terms.</p>
      <h2>Contact</h2>
      <p>Questions: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
    </PolicyPage>
  );
}
