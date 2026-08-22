import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900">PopbackAI</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: August 2026</p>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Who we are</h2>
            <p>PopbackAI is a client retention platform for local service businesses such as hair salons, barber shops, and aesthetic clinics. We help you identify lapsed clients, send win-back campaigns, and grow your online reviews.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. What data we collect</h2>
            <p>When you use PopbackAI, we collect:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Your name, email address, and business details provided at signup.</li>
              <li>Client contact information (names, emails, phone numbers, visit dates) that you upload via CSV import.</li>
              <li>Campaign data including message content, send status, and open/click tracking.</li>
              <li>Usage data such as login times and feature interactions, used to improve the product.</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. How we use your data</h2>
            <p>We use your data to provide the PopbackAI service: identifying lapsed clients, sending campaigns on your behalf, tracking results, and displaying analytics. We do not sell your data or your clients' data to third parties.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Data storage and security</h2>
            <p>Your data is stored securely using Supabase (PostgreSQL) with row-level security policies that ensure each user can only access their own data. All data is transmitted over HTTPS. Passwords are hashed by Supabase Auth and never stored in plain text.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Email communications</h2>
            <p>Campaign emails sent through PopbackAI include an unsubscribe link. Recipients who unsubscribe will not receive further campaign emails. Transactional emails (such as password resets) are sent as needed and are not subject to unsubscribe.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Your rights</h2>
            <p>Under UK GDPR and EU GDPR, you have the right to access, correct, export, or delete your personal data. You can delete your account at any time from the Settings page, which removes all associated client data and campaign history.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Third-party services</h2>
            <p>We use Resend for email delivery and Supabase for database hosting. Both are GDPR-compliant services. Your data is processed in the EU/UK regions where applicable.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Contact</h2>
            <p>For privacy enquiries, contact us at <a href="mailto:support@popbackai.com" className="text-blue-600 hover:underline">support@popbackai.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
