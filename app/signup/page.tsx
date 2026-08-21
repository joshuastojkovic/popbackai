'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const BUSINESS_TYPES = [
  'Hair Salon',
  'Barber Shop',
  'Aesthetics Clinic',
  'Nail Salon',
  'Beauty Spa',
  'Tattoo Studio',
  'Massage Therapy',
  'Lash & Brow Studio',
  'Other',
];

export default function SignupPage() {
  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    businessName: '',
    businessType: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleChange = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    const { error } = await signUp(form.email, form.password, form.fullName, form.businessName);
    if (error) {
      setError(error.includes('already') ? 'An account with this email already exists.' : error);
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/dashboard'), 1500);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Account created!</h2>
          <p className="text-gray-500">Taking you to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900">PopbackAI</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Start your free trial</h1>
          <p className="text-gray-500 mt-1">14 days free — no credit card needed</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm mb-6">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="fullName" className="text-gray-700 font-medium">Your name</Label>
                <Input
                  id="fullName"
                  placeholder="Jane Smith"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  required
                  className="h-11 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="businessName" className="text-gray-700 font-medium">Business name</Label>
                <Input
                  id="businessName"
                  placeholder="Glow Hair Studio"
                  value={form.businessName}
                  onChange={(e) => handleChange('businessName', e.target.value)}
                  required
                  className="h-11 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-gray-700 font-medium">Business type</Label>
                <Select onValueChange={(v) => handleChange('businessType', v)} required>
                  <SelectTrigger className="h-11 border-gray-200">
                    <SelectValue placeholder="Select your business type" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUSINESS_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-gray-700 font-medium">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@yoursalon.com"
                  value={form.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="h-11 border-gray-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 8 characters"
                    value={form.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    className="h-11 border-gray-200 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold mt-2"
            >
              {loading ? 'Creating account...' : 'Create free account'}
            </Button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-4">
            By signing up you agree to our{' '}
            <a href="#" className="text-blue-600 hover:underline">Terms</a> and{' '}
            <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
          </p>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
