'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
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
  Sparkles,
  ChevronRight,
  Users,
  Mail,
  TrendingUp,
  Edit3,
  Target,
} from 'lucide-react';
import Link from 'next/link';

type ReviewStat = {
  sent: number;
  converted: number;
};

type EligibleClient = {
  id: string;
  name: string;
  email: string;
  last_visit_date: string | null;
};

function StatCard({ icon: Icon, iconBg, iconColor, value, label, loading }: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
  loading: boolean;
}) {
  return (
    <Card className="border-gray-100 shadow-sm">
      <CardContent className="p-5">
        <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center mb-3`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        {loading ? (
          <Skeleton className="h-7 w-16 mb-1" />
        ) : (
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        )}
        <div className="text-sm text-gray-500">{label}</div>
      </CardContent>
    </Card>
  );
}

export default function ReviewBoosterPage() {
  const { profile, updateProfile } = useAuth();
  const [googleUrl, setGoogleUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stats, setStats] = useState<ReviewStat>({ sent: 0, converted: 0 });
  const [loading, setLoading] = useState(true);
  const [eligibleClients, setEligibleClients] = useState<EligibleClient[]>([]);
  const [showLaunch, setShowLaunch] = useState(false);

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

    // Fetch eligible clients (visited in last 60 days, not yet asked)
    const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
    const { data: eligible } = await supabase
      .from('clients')
      .select('id, name, email, last_visit_date')
      .not('email', 'is', null)
      .gte('last_visit_date', cutoff)
      .eq('review_requested', false);

    setEligibleClients((eligible ?? []) as EligibleClient[]);
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

  const conversionRate = stats.sent > 0 ? Math.min(100, Math.round((stats.converted / stats.sent) * 100)) : 0;

  const businessName = profile?.business_name ?? 'your business';
  const boosterSentTotal = profile?.review_booster_sent ?? stats.sent;

  return (
    <div className="p-6 lg:p-8 max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Review Booster</h2>
        <p className="text-sm text-gray-500 mt-0.5">Send review requests to your active clients and track results</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={Send} iconBg="bg-blue-50" iconColor="text-blue-600" value={String(boosterSentTotal)} label="Requests sent" loading={loading} />
        <StatCard icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" value={String(stats.converted)} label="Reviews completed" loading={loading} />
        <StatCard icon={Star} iconBg="bg-amber-50" iconColor="text-amber-600" value={`${conversionRate}%`} label="Conversion rate" loading={loading} />
      </div>

      {/* AI Recommendation Banner */}
      {eligibleClients.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-amber-100/50 border border-amber-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm mb-1">AI Recommendation</div>
            <p className="text-sm text-gray-600">
              You have <strong>{eligibleClients.length} clients</strong> who visited recently and haven&apos;t been asked for a review yet. A personalised request now — while their visit is fresh — is the highest-conversion moment for earning 5-star reviews.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setShowLaunch(true)}
            disabled={!googleUrl}
            className="bg-amber-500 hover:bg-amber-600 text-white font-semibold flex-shrink-0 gap-1"
          >
            Launch now
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

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
              Find it: Google Business Profile &rarr; Home &rarr; &ldquo;Get more reviews&rdquo; &rarr; copy the link.
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

      {/* Launch modal */}
      <ReviewLaunchModal
        open={showLaunch}
        onClose={() => setShowLaunch(false)}
        onSent={() => { fetchStats(); setShowLaunch(false); }}
        eligibleCount={eligibleClients.length}
        businessName={businessName}
        googleUrl={googleUrl}
        savedSubject={profile?.review_email_subject ?? null}
        savedBody={profile?.review_email_body ?? null}
      />
    </div>
  );
}

// ── Launch modal with AI suggestion + editable email ──────────────────────────

type LaunchModalProps = {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
  eligibleCount: number;
  businessName: string;
  googleUrl: string;
  savedSubject: string | null;
  savedBody: string | null;
};

function ReviewLaunchModal({ open, onClose, onSent, eligibleCount, businessName, googleUrl, savedSubject, savedBody }: LaunchModalProps) {
  const defaultSubject = `How was your visit to ${businessName}?`;
  const defaultBody =
    `Hi [Name],\n\nThank you for visiting ${businessName} recently. We'd love to hear about your experience!\n\n` +
    `If you enjoyed your visit, could you take 30 seconds to leave us a Google review? It really helps us grow:\n` +
    `${googleUrl}\n\n` +
    `If something wasn't right, just reply to this email and we'll make it right.\n\n` +
    `Thank you,\n${businessName}`;

  const [subject, setSubject] = useState(savedSubject ?? defaultSubject);
  const [body, setBody] = useState(savedBody ?? defaultBody);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{ count: number; message: string } | null>(null);

  useEffect(() => {
    if (open) {
      setSubject(savedSubject ?? defaultSubject);
      setBody(savedBody ?? defaultBody);
      setError('');
      setSuccess(null);
    }
  }, [open, savedSubject, savedBody, defaultSubject, defaultBody]);

  const handleSend = async () => {
    setSending(true);
    setError('');
    setSuccess(null);

    const { data: { session } } = await supabase.auth.getSession();

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-campaign`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ reviewBooster: true, subject, body }),
      }
    );

    const result = await res.json();
    setSending(false);

    if (!res.ok) {
      setError(result.error ?? 'Could not send review requests. Please try again.');
      return;
    }

    setSuccess({ count: result.sent ?? 0, message: result.message ?? `${result.sent ?? 0} review requests sent` });
    setTimeout(() => onSent(), 1500);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold text-gray-900">Launch Review Booster</DialogTitle>
          <DialogDescription className="text-sm text-gray-500 mt-0.5">
            Review the AI-suggested email below, edit anything you like, then send to your eligible clients.
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4 space-y-4">
          {/* AI pre-fill banner */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-amber-50 border border-amber-100">
            <Sparkles className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-amber-800 font-medium">
                AI drafted this review request for you — feel free to edit the subject or message before sending.
              </p>
            </div>
          </div>

          {/* Recipient summary */}
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg bg-emerald-50 border border-emerald-100 text-sm">
            <Target className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span className="text-emerald-800 font-medium">
              <strong>{eligibleCount}</strong> eligible clients will receive this request
            </span>
          </div>

          {/* Subject */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Email Subject</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-10 border-gray-200"
            />
          </div>

          {/* Body */}
          <div>
            <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Email Body</Label>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="border-gray-200 resize-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Use <code className="text-gray-600">[Name]</code> to personalise with each client&apos;s name. Your Google review link is included automatically.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {success.message}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {eligibleCount} recipients</span>
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> Email</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onClose} className="border-gray-200 text-gray-700 text-xs h-9">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSend}
                disabled={sending || eligibleCount === 0}
                className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs h-9 gap-1.5"
              >
                {sending ? (
                  <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Sending...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Send to {eligibleCount} clients</>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
