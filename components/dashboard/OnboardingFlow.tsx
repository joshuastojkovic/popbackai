'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Zap,
  Upload,
  Sparkles,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Star,
  Repeat,
  Link2,
} from 'lucide-react';

const steps = [
  { id: 0, label: 'Welcome', icon: Sparkles },
  { id: 1, label: 'Business', icon: Zap },
  { id: 2, label: 'Import', icon: Upload },
  { id: 3, label: 'Reviews', icon: Star },
  { id: 4, label: 'Done', icon: CheckCircle },
];

export default function OnboardingFlow() {
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [step, setStep] = useState(profile?.business_name ? 2 : 0);
  const [saving, setSaving] = useState(false);

  const [businessForm, setBusinessForm] = useState({
    business_name: profile?.business_name ?? '',
    business_type: profile?.business_type ?? '',
  });
  const [googleUrl, setGoogleUrl] = useState(profile?.google_review_url ?? '');

  const goToImport = async () => {
    setSaving(true);
    await updateProfile({
      ...businessForm,
      google_review_url: googleUrl.trim() || null,
      onboarding_completed: true,
    });
    setSaving(false);
    router.push('/dashboard/clients');
  };

  const handleComplete = async () => {
    setSaving(true);
    await updateProfile({
      ...businessForm,
      google_review_url: googleUrl.trim() || null,
      onboarding_completed: true,
    });
    setSaving(false);
    router.push('/dashboard');
  };

  const handleSkip = async () => {
    setSaving(true);
    await updateProfile({ onboarding_completed: true });
    setSaving(false);
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-gray-900">PopbackAI</span>
        </div>

        {/* Progress bar */}
        <div className="flex items-center justify-between mb-8 px-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                i <= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {i < step ? <CheckCircle className="w-4 h-4" /> : i + 1}
              </div>
              {i < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-1 transition-all ${i < step ? 'bg-blue-600' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {/* Step 0: Welcome */}
          {step === 0 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Welcome to PopbackAI!</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                We'll get you set up in just a few minutes. You'll import your client list, set up your review booster, and be ready to launch your first win-back campaign.
              </p>
              <div className="space-y-3 text-left mb-6">
                {[
                  { icon: Zap, text: 'Tell us about your business' },
                  { icon: Upload, text: 'Import your client list' },
                  { icon: Star, text: 'Set up your Google review link' },
                  { icon: Repeat, text: 'Launch your first campaign' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                      <item.icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{item.text}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setStep(1)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
              >
                Let's get started
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Step 1: Business details */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">About your business</h2>
              <p className="text-sm text-gray-500 mb-6">We use this to personalise your campaign messages.</p>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-gray-700 font-medium text-sm">Business name</Label>
                  <Input
                    value={businessForm.business_name}
                    onChange={(e) => setBusinessForm((p) => ({ ...p, business_name: e.target.value }))}
                    placeholder="Glow Hair Studio"
                    className="h-10 border-gray-200"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-gray-700 font-medium text-sm">Business type</Label>
                  <select
                    value={businessForm.business_type}
                    onChange={(e) => setBusinessForm((p) => ({ ...p, business_type: e.target.value }))}
                    className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select type</option>
                    {['Hair Salon', 'Barber Shop', 'Aesthetics Clinic', 'Nail Salon', 'Beauty Spa', 'Tattoo Studio', 'Massage Therapy', 'Lash & Brow Studio', 'Other'].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(0)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(2)}
                  disabled={!businessForm.business_name.trim()}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex-1 gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Import clients */}
          {step === 2 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Import your client list</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Upload a CSV exported from Fresha, Square, or any booking platform. We'll automatically detect names, emails, phone numbers, and visit dates.
              </p>
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-4 mb-6 text-left">
                <p className="text-xs text-blue-700 font-medium mb-2">Your CSV should include:</p>
                <ul className="space-y-1 text-xs text-blue-600">
                  <li>• Client Name (required)</li>
                  <li>• Email (for sending campaigns)</li>
                  <li>• Phone (optional)</li>
                  <li>• Last Visit Date (to identify lapsed clients)</li>
                </ul>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={goToImport}
                  disabled={saving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex-1 gap-2"
                >
                  {saving ? 'Saving...' : 'Go to import'}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <button
                onClick={() => setStep(3)}
                className="text-xs text-gray-400 hover:text-gray-600 mt-4"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Step 3: Review link */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Star className="w-6 h-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Google Review Link</h2>
                  <p className="text-sm text-gray-500">Boost your online reputation (optional)</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                Paste your Google Business review link so we can send review requests to your happy clients.
              </p>
              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium text-sm flex items-center gap-1.5">
                  <Link2 className="w-3.5 h-3.5 text-gray-400" />
                  Google review URL
                </Label>
                <Input
                  value={googleUrl}
                  onChange={(e) => setGoogleUrl(e.target.value)}
                  placeholder="https://www.google.com/maps/place/..."
                  className="h-10 border-gray-200"
                />
                <p className="text-xs text-gray-400">
                  Find it: Google Business Profile &rarr; Home &rarr; "Get more reviews" &rarr; copy the link.
                </p>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <Button variant="outline" onClick={() => setStep(2)} className="gap-1.5">
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={() => setStep(4)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex-1 gap-2"
                >
                  Continue
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <button
                onClick={() => setStep(4)}
                className="text-xs text-gray-400 hover:text-gray-600 mt-4 block mx-auto"
              >
                Skip for now
              </button>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">You're all set!</h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-6">
                Your account is ready. Head to your dashboard to import clients, launch campaigns, and start winning back lapsed clients.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { icon: Upload, label: 'Import', href: '/dashboard/clients' },
                  { icon: Repeat, label: 'Campaigns', href: '/dashboard/campaigns' },
                  { icon: Star, label: 'Reviews', href: '/dashboard/reviews' },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-gray-50 text-center">
                    <item.icon className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <span className="text-xs font-medium text-gray-600">{item.label}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={handleComplete}
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
              >
                {saving ? 'Finishing up...' : 'Go to dashboard'}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {step < 4 && (
          <button
            onClick={handleSkip}
            disabled={saving}
            className="text-xs text-gray-400 hover:text-gray-600 mt-4 block mx-auto"
          >
            Skip onboarding
          </button>
        )}
      </div>
    </div>
  );
}
