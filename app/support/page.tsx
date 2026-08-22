import Link from 'next/link';
import { Zap, ArrowLeft, Mail, MessageSquare, Clock, CheckCircle } from 'lucide-react';

export default function SupportPage() {
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Support</h1>
        <p className="text-gray-500 mb-10">We're here to help. Reach out and we'll get back to you as soon as we can.</p>

        <div className="grid gap-4 mb-10">
          <a href="mailto:support@popbackai.com" className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
              <Mail className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Email us</h3>
              <p className="text-sm text-gray-500">support@popbackai.com</p>
              <p className="text-xs text-gray-400 mt-1">Best for account, billing, and technical issues.</p>
            </div>
          </a>
          <div className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
              <MessageSquare className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">In-app help</h3>
              <p className="text-sm text-gray-500">Log in to your dashboard and visit the Settings page for account management options.</p>
            </div>
          </div>
          <div className="flex items-start gap-4 p-6 rounded-2xl border border-gray-100">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center flex-shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-1">Response time</h3>
              <p className="text-sm text-gray-500">We typically respond within 24 hours on business days.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl bg-gray-50 border border-gray-100 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Frequently asked questions</h3>
          <div className="space-y-4">
            {[
              { q: 'How do I import my client list?', a: 'Go to the Client List page and click "Import CSV". Upload a spreadsheet exported from Fresha, Square, or any booking platform. We automatically detect name, email, phone, and last visit date columns.' },
              { q: 'How do win-back campaigns work?', a: 'PopbackAI identifies clients who haven\'t visited in 60+ days and suggests personalised messages. You review, edit, and launch — we send the emails and track opens and conversions.' },
              { q: 'Can I cancel anytime?', a: 'Yes. There are no contracts or lock-in. Cancel from Settings at any time and your account remains active until the end of your billing period.' },
              { q: 'Is my data safe?', a: 'Your data is stored securely with row-level security policies. Each business can only access their own data. We never sell or share your client data.' },
            ].map((faq) => (
              <div key={faq.q}>
                <div className="flex items-start gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <span className="font-semibold text-gray-800 text-sm">{faq.q}</span>
                </div>
                <p className="text-sm text-gray-500 pl-6">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
