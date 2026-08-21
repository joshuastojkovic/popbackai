'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { clientStatus } from '@/lib/csvParser';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Play,
  Pause,
  BarChart3,
  Users,
  TrendingUp,
  Zap,
  ChevronRight,
  Mail,
  MessageSquare,
  Clock,
  RefreshCw,
  X,
  CheckCircle,
  Sparkles,
  Target,
  AlertTriangle,
  Trash2,
  XCircle,
} from 'lucide-react';

// ── types ────────────────────────────────────────────────────────────────────

type CampaignStatus = 'active' | 'paused' | 'draft' | 'completed' | 'cancelled';
type Channel = 'email' | 'sms';
type Segment = 'lapsed_60' | 'lapsed_90' | 'lapsed_180' | 'lapsed_365' | 'all_lapsed';

type Campaign = {
  id: string;
  name: string;
  status: CampaignStatus;
  channel: Channel;
  target_segment: Segment;
  target_description: string | null;
  message_subject: string | null;
  message_body: string | null;
  recipient_count: number;
  sent: number;
  opened: number;
  converted: number;
  created_at: string;
  launched_at: string | null;
};

type ClientRow = {
  id: string;
  last_visit_date: string | null;
};

type AiRecommendation = {
  segment: Segment;
  label: string;
  clientCount: number;
  estimatedRevenue: string;
  urgency: 'high' | 'medium' | 'low';
  reason: string;
  suggestedSubject: string;
  suggestedBody: string;
};

// ── constants ─────────────────────────────────────────────────────────────────

const SEGMENT_OPTIONS: { value: Segment; label: string; days: number }[] = [
  { value: 'lapsed_60',  label: 'Lapsed 2+ months',   days: 60 },
  { value: 'lapsed_90',  label: 'Lapsed 3+ months',   days: 90 },
  { value: 'lapsed_180', label: 'Lapsed 6+ months',   days: 180 },
  { value: 'lapsed_365', label: 'Lapsed 12+ months',  days: 365 },
  { value: 'all_lapsed', label: 'All lapsed clients', days: 60 },
];

const STATUS_CONFIG: Record<CampaignStatus, { label: string; color: string; bg: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-700', bg: 'bg-emerald-50',  dot: 'bg-emerald-500' },
  paused:    { label: 'Paused',    color: 'text-amber-700',   bg: 'bg-amber-50',    dot: 'bg-amber-400' },
  draft:     { label: 'Draft',     color: 'text-gray-600',    bg: 'bg-gray-100',    dot: 'bg-gray-400' },
  completed: { label: 'Completed', color: 'text-blue-700',    bg: 'bg-blue-50',     dot: 'bg-blue-500' },
  cancelled: { label: 'Cancelled', color: 'text-red-700',     bg: 'bg-red-50',      dot: 'bg-red-500' },
};

// ── AI recommendation engine (rule-based on real client data) ─────────────────

function buildRecommendations(clients: ClientRow[]): AiRecommendation[] {
  const now = Date.now();
  const daysSince = (iso: string | null) =>
    iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : null;

  const lapsed60  = clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 60 && d < 90; });
  const lapsed90  = clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 90 && d < 180; });
  const lapsed180 = clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 180 && d < 365; });
  const lapsed365 = clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 365; });

  const avgRevPerClient = 65;
  const recs: AiRecommendation[] = [];

  if (lapsed90.length > 0) {
    recs.push({
      segment: 'lapsed_90',
      label: '3-Month Lapsed Win-Back',
      clientCount: lapsed90.length,
      estimatedRevenue: `£${(lapsed90.length * avgRevPerClient * 0.28).toFixed(0)}`,
      urgency: 'high',
      reason: `${lapsed90.length} clients haven't been in for 3–6 months — the sweet spot where a timely offer is most likely to bring them back.`,
      suggestedSubject: 'We miss you — here\'s something special',
      suggestedBody: `Hi [Name],\n\nIt's been a while since your last visit and we'd love to see you back.\n\nAs a valued client, we'd like to offer you a complimentary upgrade on your next appointment. Simply mention this message when you book.\n\nBook now — we can't wait to see you.\n\n[Your business name]`,
    });
  }

  if (lapsed180.length > 0) {
    recs.push({
      segment: 'lapsed_180',
      label: '6-Month Re-engagement',
      clientCount: lapsed180.length,
      estimatedRevenue: `£${(lapsed180.length * avgRevPerClient * 0.18).toFixed(0)}`,
      urgency: 'medium',
      reason: `${lapsed180.length} clients are 6–12 months lapsed. A stronger incentive like a discount will be needed to re-engage them.`,
      suggestedSubject: 'It\'s been too long — 15% off your next visit',
      suggestedBody: `Hi [Name],\n\nWe've noticed it's been a while since your last appointment and we'd love to welcome you back.\n\nEnjoy 15% off your next visit — just mention this message when you book. Valid for the next 30 days.\n\nWe look forward to seeing you.\n\n[Your business name]`,
    });
  }

  if (lapsed60.length > 0) {
    recs.push({
      segment: 'lapsed_60',
      label: 'Early Lapse Nudge',
      clientCount: lapsed60.length,
      estimatedRevenue: `£${(lapsed60.length * avgRevPerClient * 0.35).toFixed(0)}`,
      urgency: 'high',
      reason: `${lapsed60.length} clients are just 2–3 months overdue — a gentle reminder now is the highest-conversion opportunity.`,
      suggestedSubject: 'Time for your next appointment?',
      suggestedBody: `Hi [Name],\n\nJust a friendly reminder that it might be time to book your next visit with us.\n\nWe have availability this week — click below to book at a time that suits you.\n\nSee you soon!\n\n[Your business name]`,
    });
  }

  if (lapsed365.length > 0) {
    recs.push({
      segment: 'lapsed_365',
      label: '12-Month Recovery Campaign',
      clientCount: lapsed365.length,
      estimatedRevenue: `£${(lapsed365.length * avgRevPerClient * 0.10).toFixed(0)}`,
      urgency: 'low',
      reason: `${lapsed365.length} clients haven't visited in over a year. A bold win-back offer is the best chance to recover these relationships.`,
      suggestedSubject: 'We\'d love to have you back — exclusive returning client offer',
      suggestedBody: `Hi [Name],\n\nWe know it's been a while, and we've missed you.\n\nAs a special welcome back, we're offering 20% off your first appointment when you return. No conditions, just our way of saying we're glad you're back.\n\nBook anytime in the next 60 days.\n\n[Your business name]`,
    });
  }

  return recs.sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.urgency] - order[b.urgency];
  });
}

function segmentClientCount(clients: ClientRow[], segment: Segment): number {
  const now = Date.now();
  const daysSince = (iso: string | null) =>
    iso ? Math.floor((now - new Date(iso).getTime()) / 86400000) : null;

  switch (segment) {
    case 'lapsed_60':  return clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 60 && d < 90; }).length;
    case 'lapsed_90':  return clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 90 && d < 180; }).length;
    case 'lapsed_180': return clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 180 && d < 365; }).length;
    case 'lapsed_365': return clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 365; }).length;
    case 'all_lapsed': return clients.filter(c => { const d = daysSince(c.last_visit_date); return d !== null && d >= 60; }).length;
  }
}

// ── sub-components ────────────────────────────────────────────────────────────

function UrgencyDot({ urgency }: { urgency: 'high' | 'medium' | 'low' }) {
  const cls = urgency === 'high' ? 'bg-red-500' : urgency === 'medium' ? 'bg-amber-400' : 'bg-blue-400';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />;
}

// ── create campaign modal ──────────────────────────────────────────────────────

type CreateModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  clients: ClientRow[];
  initialRec?: AiRecommendation | null;
};

function CreateCampaignModal({ open, onClose, onCreated, clients, initialRec }: CreateModalProps) {
  const [step, setStep] = useState<'ai' | 'form'>(initialRec ? 'form' : 'ai');
  const [selectedRec, setSelectedRec] = useState<AiRecommendation | null>(initialRec ?? null);
  const recommendations = buildRecommendations(clients);

  const [name, setName] = useState('');
  const [channel, setChannel] = useState<Channel>('email');
  const [segment, setSegment] = useState<Segment>('lapsed_90');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) {
      setStep(initialRec ? 'form' : 'ai');
      setSelectedRec(initialRec ?? null);
      setName('');
      setChannel('email');
      setSegment('lapsed_90');
      setSubject('');
      setBody('');
      setError('');
    }
  }, [open, initialRec]);

  useEffect(() => {
    if (selectedRec) {
      setName(selectedRec.label);
      setSegment(selectedRec.segment);
      setSubject(selectedRec.suggestedSubject);
      setBody(selectedRec.suggestedBody);
    }
  }, [selectedRec]);

  const recipientCount = segmentClientCount(clients, segment);

  const handleSelectRec = (rec: AiRecommendation) => {
    setSelectedRec(rec);
    setStep('form');
  };

  const handleSkipToForm = () => {
    setSelectedRec(null);
    setStep('form');
  };

  const handleSave = async (launch: boolean) => {
    if (!name.trim()) { setError('Campaign name is required.'); return; }
    setSaving(true);
    setError('');

    const segmentOption = SEGMENT_OPTIONS.find(s => s.value === segment);
    const { data: inserted, error: err } = await supabase.from('campaigns').insert({
      name: name.trim(),
      status: launch ? 'active' : 'draft',
      channel,
      target_segment: segment,
      target_description: segmentOption?.label ?? segment,
      message_subject: subject.trim() || null,
      message_body: body.trim() || null,
      recipient_count: recipientCount,
      launched_at: launch ? new Date().toISOString() : null,
    }).select('id').single();

    if (err || !inserted) {
      setError('Could not save the campaign. Please try again.');
      setSaving(false);
      return;
    }

    if (launch) {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ campaignId: inserted.id }),
        }
      );
      const result = await res.json();
      if (!res.ok) {
        setError(result.error ?? 'Campaign saved but emails could not be sent. Check your Resend API key.');
        setSaving(false);
        onCreated();
        return;
      }
    }

    onCreated();
    onClose();
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="text-lg font-bold text-gray-900">
            {step === 'ai' ? 'AI Recommendations' : 'Campaign Details'}
          </DialogTitle>
          <p className="text-sm text-gray-500 mt-0.5">
            {step === 'ai'
              ? 'Based on your client list, here are the best win-back opportunities right now.'
              : 'Customise your campaign before launching.'}
          </p>
        </DialogHeader>

        <div className="px-6 pb-6 pt-4 space-y-4">

          {/* ── STEP 1: AI recommendations ── */}
          {step === 'ai' && (
            <>
              {recommendations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
                    <Users className="w-7 h-7 text-gray-300" />
                  </div>
                  <h3 className="font-bold text-gray-700 mb-1">No lapsed clients yet</h3>
                  <p className="text-sm text-gray-400 max-w-xs">
                    Import your client list first and AI recommendations will appear based on their visit history.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recommendations.map((rec) => (
                    <button
                      key={rec.segment}
                      onClick={() => handleSelectRec(rec)}
                      className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Sparkles className="w-4.5 h-4.5 text-blue-600 w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-bold text-gray-900 text-sm">{rec.label}</span>
                              <UrgencyDot urgency={rec.urgency} />
                              <span className="text-xs text-gray-400 capitalize">{rec.urgency} priority</span>
                            </div>
                            <p className="text-xs text-gray-500 leading-relaxed">{rec.reason}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs font-semibold text-gray-700">
                                <span className="text-blue-600">{rec.clientCount}</span> clients
                              </span>
                              <span className="text-xs font-semibold text-emerald-700">
                                ~{rec.estimatedRevenue} estimated
                              </span>
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors flex-shrink-0 mt-1" />
                      </div>
                    </button>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-400">
                  Based on {clients.length} clients in your list
                </span>
                <button
                  onClick={handleSkipToForm}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Build manually instead
                </button>
              </div>
            </>
          )}

          {/* ── STEP 2: Campaign form ── */}
          {step === 'form' && (
            <>
              {selectedRec && (
                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                  <Sparkles className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-blue-800 font-medium">AI pre-filled this campaign for you — feel free to edit anything.</p>
                  </div>
                  <button onClick={() => setStep('ai')} className="text-blue-400 hover:text-blue-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="space-y-4">
                {/* Name */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Campaign Name</Label>
                  <Input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. 3-Month Win-Back"
                    className="h-10 border-gray-200"
                  />
                </div>

                {/* Channel + Segment row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Channel</Label>
                    <div className="flex gap-2">
                      {(['email', 'sms'] as Channel[]).map(ch => (
                        <button
                          key={ch}
                          onClick={() => setChannel(ch)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
                            channel === ch
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {ch === 'email' ? <Mail className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
                          {ch.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Target Segment</Label>
                    <select
                      value={segment}
                      onChange={e => setSegment(e.target.value as Segment)}
                      className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {SEGMENT_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Recipient count indicator */}
                <div className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-sm ${
                  recipientCount > 0 ? 'bg-emerald-50 border border-emerald-100' : 'bg-amber-50 border border-amber-100'
                }`}>
                  <Target className={`w-4 h-4 flex-shrink-0 ${recipientCount > 0 ? 'text-emerald-600' : 'text-amber-500'}`} />
                  {recipientCount > 0 ? (
                    <span className="text-emerald-800 font-medium">
                      <strong>{recipientCount}</strong> clients match this segment
                    </span>
                  ) : (
                    <span className="text-amber-700">No clients match this segment yet — import your client list first.</span>
                  )}
                </div>

                {/* Subject (email only) */}
                {channel === 'email' && (
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Email Subject</Label>
                    <Input
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="e.g. We miss you — here's something special"
                      className="h-10 border-gray-200"
                    />
                  </div>
                )}

                {/* Message body */}
                <div>
                  <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                    Message {channel === 'sms' ? '(SMS)' : '(Email Body)'}
                  </Label>
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write your message here... Use [Name] to personalise."
                    rows={7}
                    className="border-gray-200 resize-none text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">Use [Name] to insert the client's name automatically.</p>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              {/* Footer actions */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <button
                  onClick={() => setStep('ai')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to recommendations
                </button>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    className="border-gray-200 text-gray-700 text-xs h-9"
                  >
                    Save as draft
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSave(true)}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-1.5"
                  >
                    {saving ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                    ) : (
                      <><Play className="w-3.5 h-3.5" /> Launch now</>
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [launchRec, setLaunchRec] = useState<AiRecommendation | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campaign | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [campaignRes, clientRes] = await Promise.all([
      supabase.from('campaigns').select('*').order('created_at', { ascending: false }),
      supabase.from('clients').select('id, last_visit_date'),
    ]);
    if (!campaignRes.error && campaignRes.data) setCampaigns(campaignRes.data);
    if (!clientRes.error && clientRes.data) setClients(clientRes.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCancelCampaign = async (c: Campaign) => {
    await supabase.from('campaigns').update({ status: 'cancelled' }).eq('id', c.id);
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'cancelled' } : x));
  };

  const handleDeleteCampaign = async (c: Campaign) => {
    await supabase.from('campaigns').delete().eq('id', c.id);
    setCampaigns(prev => prev.filter(x => x.id !== c.id));
    setDeleteTarget(null);
  };

  const handleStatusToggle = async (c: Campaign) => {
    if (c.status === 'draft') {
      // Launch draft — save active then fire emails
      await supabase.from('campaigns').update({ status: 'active', launched_at: new Date().toISOString() }).eq('id', c.id);
      setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: 'active', launched_at: new Date().toISOString() } : x));
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-campaign`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ campaignId: c.id }),
        }
      );
      fetchData();
      return;
    }
    const newStatus = c.status === 'active' ? 'paused' : 'active';
    await supabase.from('campaigns').update({ status: newStatus }).eq('id', c.id);
    setCampaigns(prev => prev.map(x => x.id === c.id ? { ...x, status: newStatus } : x));
  };

  const recommendations = buildRecommendations(clients);
  const topRec = recommendations[0] ?? null;

  const totalSent = campaigns.reduce((s, c) => s + c.sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.opened, 0);
  const totalConverted = campaigns.reduce((s, c) => s + c.converted, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const summaryStats = [
    { label: 'Active Campaigns', value: String(activeCampaigns), icon: Play },
    { label: 'Total Sent', value: String(totalSent), icon: Mail },
    { label: 'Total Opened', value: String(totalOpened), icon: BarChart3 },
    { label: 'Clients Re-engaged', value: String(totalConverted), icon: TrendingUp },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-xl">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Win-Back Campaigns</h2>
          <p className="text-sm text-gray-500 mt-0.5">Re-engage clients who haven't visited recently</p>
        </div>
        <Button
          onClick={() => { setLaunchRec(null); setShowCreate(true); }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold self-start sm:self-auto gap-1.5"
        >
          <Plus className="w-4 h-4" />
          New Campaign
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryStats.map((stat) => (
          <Card key={stat.label} className="border-gray-100 shadow-sm">
            <CardContent className="p-5">
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                <stat.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{stat.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI recommendation banner — only when there's a real opportunity */}
      {topRec && (
        <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm mb-1">AI Recommendation</div>
            <p className="text-sm text-gray-600">{topRec.reason} A targeted campaign could recover approximately <strong>{topRec.estimatedRevenue}</strong>.</p>
          </div>
          <Button
            size="sm"
            onClick={() => { setLaunchRec(topRec); setShowCreate(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex-shrink-0 gap-1"
          >
            Launch now
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <RefreshCw className="w-6 h-6 animate-spin mb-3 text-blue-400" />
          <p className="text-sm">Loading campaigns...</p>
        </div>
      ) : campaigns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
            <MessageSquare className="w-8 h-8 text-gray-300" />
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">No campaigns yet</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-5">
            Create your first win-back campaign to start re-engaging lapsed clients.
          </p>
          <Button
            onClick={() => { setLaunchRec(null); setShowCreate(true); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
            size="sm"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((c) => {
            const config = STATUS_CONFIG[c.status];
            const openRate = c.sent > 0 ? Math.round((c.opened / c.sent) * 100) : 0;
            const convRate = c.sent > 0 ? Math.round((c.converted / c.sent) * 100) : 0;

            return (
              <Card key={c.id} className="border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        c.status === 'active' ? 'bg-emerald-50' : c.status === 'paused' ? 'bg-amber-50' : 'bg-gray-100'
                      }`}>
                        {c.channel === 'email'
                          ? <Mail className={`w-5 h-5 ${c.status === 'active' ? 'text-emerald-600' : 'text-gray-500'}`} />
                          : <MessageSquare className={`w-5 h-5 ${c.status === 'active' ? 'text-emerald-600' : 'text-gray-500'}`} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">{c.name}</span>
                          <Badge className={`${config.bg} ${config.color} border-0 text-xs font-semibold`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5 ${c.status === 'active' ? 'animate-pulse' : ''}`} />
                            {config.label}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{c.target_description ?? c.target_segment}</p>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Users className="w-3 h-3" />
                            {c.recipient_count} recipients
                          </div>
                          {c.launched_at && (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <Clock className="w-3 h-3" />
                              Launched {new Date(c.launched_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900">{c.sent}</div>
                        <div className="text-xs text-gray-400">Sent</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-gray-900">{openRate}%</div>
                        <div className="text-xs text-gray-400">Opened</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm font-bold text-emerald-600">{convRate}%</div>
                        <div className="text-xs text-gray-400">Converted</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {c.status === 'active' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusToggle(c)}
                          className="border-gray-200 text-gray-600 h-8 text-xs"
                        >
                          <Pause className="w-3 h-3 mr-1" /> Pause
                        </Button>
                      )}
                      {c.status === 'paused' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusToggle(c)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" /> Resume
                        </Button>
                      )}
                      {c.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => handleStatusToggle(c)}
                          className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                        >
                          <Play className="w-3 h-3 mr-1" /> Launch
                        </Button>
                      )}
                      {(c.status === 'active' || c.status === 'paused') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelCampaign(c)}
                          className="border-red-200 text-red-600 hover:bg-red-50 h-8 text-xs"
                        >
                          <XCircle className="w-3 h-3 mr-1" /> Cancel
                        </Button>
                      )}
                      {(c.status === 'paused' || c.status === 'cancelled' || c.status === 'draft' || c.status === 'completed') && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(c)}
                          className="border-gray-200 text-gray-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 h-8 text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Delete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <CreateCampaignModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setLaunchRec(null); }}
        onCreated={fetchData}
        clients={clients}
        initialRec={launchRec}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove "{deleteTarget?.name}" and all its stats from your history. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && handleDeleteCampaign(deleteTarget)}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
