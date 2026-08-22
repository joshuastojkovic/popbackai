import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-400 mb-10">Last updated: August 2026</p>
        <div className="prose prose-gray max-w-none space-y-6 text-gray-600 leading-relaxed">
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">1. Acceptance of terms</h2>
            <p>By creating an account or using PopbackAI, you agree to these terms. If you do not agree, do not use the service.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">2. Your account</h2>
            <p>You are responsible for maintaining the security of your account and password. You must provide accurate information at signup and keep it up to date. You are responsible for all activity under your account.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">3. Acceptable use</h2>
            <p>You agree to use PopbackAI only for legitimate business purposes. You must not send unsolicited spam, use purchased contact lists, or send content that is illegal, defamatory, or infringes on others' rights. You are responsible for ensuring you have consent to contact the clients whose data you upload.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">4. Subscription and billing</h2>
            <p>A 14-day free trial is available with no credit card required. Paid plans are billed monthly and can be cancelled at any time. No refunds are provided for partial billing periods. Prices may change with notice.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">5. Data and privacy</h2>
            <p>You retain ownership of all client data you upload. We process it on your behalf to deliver the service. You can export or delete your data at any time. See our Privacy Policy for details.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">6. Service availability</h2>
            <p>We strive for high availability but do not guarantee uninterrupted service. We are not liable for downtime, data loss, or service interruptions caused by third-party providers.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">7. Limitation of liability</h2>
            <p>PopbackAI is provided "as is" without warranties of any kind. We are not liable for indirect, incidental, or consequential damages arising from the use of the service.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">8. Termination</h2>
            <p>You can cancel your account at any time. We may suspend or terminate accounts that violate these terms. Upon termination, your data will be deleted within 30 days.</p>
          </section>
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-2">9. Contact</h2>
            <p>For questions about these terms, contact <a href="mailto:support@popbackai.com" className="text-blue-600 hover:underline">support@popbackai.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
