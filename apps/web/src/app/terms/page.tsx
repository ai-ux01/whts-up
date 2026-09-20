import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'The terms governing use of the platform.',
};

const LAST_UPDATED = 'September 19, 2026';
const COMPANY = 'AI Content & Communication OS';
const CONTACT_EMAIL = 'support@example.com'; // TODO: replace with your real contact email

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-gray-800">
      <h1 className="mb-2 text-3xl font-bold text-gray-900">Terms of Service</h1>
      <p className="mb-8 text-gray-500">Last updated: {LAST_UPDATED}</p>

      <section className="space-y-6">
        <p>
          These Terms of Service govern your use of {COMPANY} (the &quot;Service&quot;). By
          creating an account or using the Service, you agree to these terms.
        </p>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">1. Use of the Service</h2>
          <p>
            You may use the Service only for lawful business communication and marketing.
            You are responsible for obtaining any consent required to message your own
            customers and for complying with the WhatsApp Business Platform policies and
            applicable law.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">2. Your account</h2>
          <p>
            You are responsible for maintaining the confidentiality of your credentials and
            for all activity under your account.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">3. Acceptable use</h2>
          <p>
            You agree not to use the Service to send spam, unlawful, deceptive, or harmful
            content, or to violate the terms of any connected platform (Meta, Google, etc.).
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">4. Data</h2>
          <p>
            Your use of data is also governed by our{' '}
            <a href="/privacy" className="text-emerald-700 underline">
              Privacy Policy
            </a>
            .
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">5. Disclaimer & liability</h2>
          <p>
            The Service is provided &quot;as is&quot; without warranties of any kind. To the
            maximum extent permitted by law, we are not liable for indirect or consequential
            damages arising from your use of the Service.
          </p>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">6. Contact</h2>
          <p>
            Questions? Email{' '}
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
