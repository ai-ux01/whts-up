import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How we collect, use, and protect your data.',
};

const LAST_UPDATED = 'September 19, 2026';
const COMPANY = 'AI Content & Communication OS';
const CONTACT_EMAIL = 'privacy@example.com'; // TODO: replace with your real contact email

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-gray-800">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Privacy Policy</h1>
      <p className="mb-8 text-gray-500">Last updated: {LAST_UPDATED}</p>

      <section className="space-y-6">
        <p>
          {COMPANY} (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;) provides a
          multi-channel customer communication and marketing platform for businesses,
          including WhatsApp messaging, social content, and customer relationship
          management. This Privacy Policy explains what information we collect, how we
          use it, and the choices you have.
        </p>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Information we collect</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>
              <strong>Account data:</strong> name, email, business name, and hashed
              password for users who create an account.
            </li>
            <li>
              <strong>Customer & contact data:</strong> phone numbers, names, and
              message content that businesses using our platform import or exchange with
              their own customers (including via the WhatsApp Business Platform).
            </li>
            <li>
              <strong>Connected account data:</strong> when a business connects a Meta
              (Facebook/Instagram) or Google account via OAuth, we store the access
              tokens and account identifiers needed to provide the service.
            </li>
            <li>
              <strong>Usage data:</strong> logs, timestamps, and metadata generated while
              using the platform.
            </li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. How we use information</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>To provide messaging, CRM, content, and analytics features.</li>
            <li>To send and receive messages on behalf of businesses through their connected channels.</li>
            <li>To authenticate users and secure accounts.</li>
            <li>To operate, maintain, and improve the platform.</li>
          </ul>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. WhatsApp & Meta Platform data</h2>
          <p>
            When a business connects the WhatsApp Business Platform or other Meta
            products, we process messages and related metadata solely to deliver the
            requested features. We use Meta Platform data in accordance with Meta&apos;s
            Platform Terms and Developer Policies. We do not sell this data, and we do not
            use it for advertising or profiling beyond the connected business&apos;s own use.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Data storage & security</h2>
          <p>
            Data is stored on managed cloud infrastructure. Connected-account access
            tokens are encrypted at rest using AES-256-GCM. Access to production data is
            restricted. Passwords are stored only as salted hashes and are never stored in
            plain text.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Data sharing</h2>
          <p>
            We do not sell personal information. We share data only with service providers
            that help us operate the platform (e.g., cloud hosting, messaging and email
            providers), and only as necessary to provide the service or comply with law.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Data retention & deletion</h2>
          <p>
            We retain data for as long as an account is active or as needed to provide the
            service. You may request deletion of your data at any time — see our{' '}
            <a href="/data-deletion" className="text-emerald-700 underline">
              Data Deletion Instructions
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">7. Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, correct, export, or
            delete your personal data. To exercise these rights, contact us at{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">8. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be
            reflected by updating the &quot;Last updated&quot; date above.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">9. Contact us</h2>
          <p>
            Questions about this policy? Email{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </div>
      </section>
    </main>
  );
}
