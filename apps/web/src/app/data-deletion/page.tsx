import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions',
  description: 'How to request deletion of your data.',
};

const CONTACT_EMAIL = 'privacy@example.com'; // TODO: replace with your real contact email

export default function DataDeletionPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 text-sm leading-7 text-gray-800">
      <h1 className="mb-6 text-3xl font-bold text-gray-900">Data Deletion Instructions</h1>

      <section className="space-y-6">
        <p>
          You can request deletion of the personal data associated with your account or
          your connected accounts (including data obtained via the WhatsApp Business
          Platform or Meta login) at any time.
        </p>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">How to request deletion</h2>
          <ol className="list-decimal space-y-1 pl-6">
            <li>
              Email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-emerald-700 underline">
                {CONTACT_EMAIL}
              </a>{' '}
              from the email address associated with your account.
            </li>
            <li>Use the subject line &quot;Data Deletion Request&quot;.</li>
            <li>Include your account email and, if applicable, the connected business name.</li>
          </ol>
        </div>

        <div>
          <h2 className="mb-2 text-xl font-semibold text-gray-900">What happens next</h2>
          <ul className="list-disc space-y-1 pl-6">
            <li>We verify the request comes from the account owner.</li>
            <li>
              We delete your account data, stored messages, and any connected-account
              access tokens within 30 days.
            </li>
            <li>We send a confirmation once deletion is complete.</li>
          </ul>
        </div>

        <p>
          Disconnecting a connected Meta or Google account from within the app immediately
          removes the stored access tokens for that account.
        </p>
      </section>
    </main>
  );
}
