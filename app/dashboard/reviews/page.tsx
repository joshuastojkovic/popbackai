'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  Zap,
  Shield,
  ArrowRight,
  CheckCircle,
  ExternalLink,
  Save,
  Send,
  RefreshCw,
  Link2,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

type ReviewStat = {
  sent: number;
  converted: number;
};

export default function ReviewBoosterPage() {
  const { profile, updateProfile } = useAuth();
  const [googleUrl, setGoogleUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<ReviewStat>({ sent: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ count: number; message: string } | null>(null);
  const [sendError, setSendError] = useState('');

  useEffect(() => {
    setGoogleUrl(profile?.google_review_url ?? '');
  }, [profile]);

  const fetchStats = useCallback(async () => {
    const { count: sentCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('review_requested', true);

    const { count: convertedCount } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('review_requested', true)
      .eq('review_completed', true);

    setStats({ sent: sentCount ?? 0, converted: convertedCount ?? 0 });
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleSaveUrl = async () => {
    setSaving(true);
    setSaved(false);
    const { error } = await updateProfile({ google_review_url: googleUrl.trim() || null });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  const handleSendRequests = async () => {
    setSending(true);
    setSendError('');
    setSendResult(null);

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-campaign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ reviewBooster: true }),
      }
    );

    const result = await res.json();
    setSending(false);

    if (!res.ok) {
      setSendError(result.error ?? 'Could not send review requests. Make sure your Google review link is saved first.');
      return;
    }

    setSendResult({ count: result.sent ?? 0, message: result.message ?? `${result.sent ?? 0} review requests sent` });
    fetchStats();
  };

  const conversionRate = stats.sent > 0 ? Math.round((stats.converted / stats.sent) * 100) : 0;

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Booster</h2>
        <p className="text-sm text-gray-500 mt-0.5">Send review requests to your active clients and track results</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <Send className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.sent}</div>
            <div className="text-sm text-gray-500">Requests sent</div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : stats.converted}</div>
            <div className="text-sm text-gray-500">Reviews completed</div>
          </CardContent>
        </Card>
        <Card className="border-gray-100 shadow-sm">
          <CardContent className="p-5">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-3">
              <Star className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">{loading ? '—' : `${conversionRate}%`}</div>
            <div className="text-sm text-gray-500">Conversion rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Google Review Link Setup */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Link2 className="w-4 h-4 text-blue-600" />
            Google Review Link
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Paste your Google Business review link below. This is the URL your clients will be directed to when they receive a review request.
          </p>
          <div className="space-y-1.5">
            <Label className="text-gray-700 font-medium text-sm">Your Google review URL</Label>
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

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveUrl}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              size="sm"
            >
              <Save className="w-3.5 h-3.5 mr-1.5" />
              {saving ? 'Saving...' : 'Save link'}
            </Button>
            {saved && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 font-medium">
                <CheckCircle className="w-4 h-4" />
                Saved
              </span>
            )}
            {googleUrl && (
              <a href={googleUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline flex items-center gap-1 ml-auto">
                Test link <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Send Review Requests */}
      <Card className="border-gray-100 shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            Send Review Requests
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Send a personalised review request email to all clients who have visited in the last 60 days but haven&apos;t been asked for a review yet. Each email includes your Google review link.
          </p>

          {!googleUrl && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>Save your Google review link above before sending requests.</span>
            </div>
          )}

          {sendResult && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{sendResult.message}</span>
            </div>
          )}

          {sendError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{sendError}</span>
            </div>
          )}

          <Button
            onClick={handleSendRequests}
            disabled={sending || !googleUrl}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2"
          >
            {sending ? <><RefreshCw className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-4 h-4" /> Send review requests</>}
          </Button>
        </CardContent>
      </Card>

      {/* How it works */}
      <div className="grid gap-3">
        {[
          {
            icon: Zap,
            color: 'bg-blue-50 text-blue-600',
            title: 'Automatic targeting',
            desc: 'Only clients who visited in the last 60 days are contacted — and only once.',
          },
          {
            icon: Shield,
            color: 'bg-emerald-50 text-emerald-600',
            title: 'Protected rating',
            desc: 'Each email asks if they enjoyed their visit first. Happy clients go to Google, unhappy clients can message you directly.',
          },
          {
            icon: Star,
            color: 'bg-amber-50 text-amber-600',
            title: 'Track your growth',
            desc: 'See how many requests were sent, how many converted, and your conversion rate over time.',
          },
        ].map((item) => (
          <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-100 shadow-sm">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">{item.title}</div>
              <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-xs text-gray-400">
        Want to win back lapsed clients too?{' '}
        <Link href="/dashboard/campaigns" className="text-blue-600 hover:underline inline-flex items-center gap-0.5">
          Launch a win-back campaign <ArrowRight className="w-3 h-3" />
        </Link>
      </p>
    </div>
  );
}
