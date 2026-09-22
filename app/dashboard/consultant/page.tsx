'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { buildAiStrategies, applyPersonalization, AnalyticsClient, AiStrategy } from '@/lib/analytics';
import { computeChurnSegments, totalRecoverableRevenue, ChurnSegment } from '@/lib/analytics';
import { CHURN_TIER_CONFIG, ChurnTier } from '@/lib/csvParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain,
  Sparkles,
  Users,
  ChevronRight,
  Mail,
  MessageSquare,
  Smartphone,
  Copy,
  Check,
  Zap,
  Target,
  Lightbulb,
  RefreshCw,
  Repeat,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

type Channel = 'email' | 'sms' | 'whatsapp';

const CHANNEL_CONFIG: Record<Channel, { label: string; icon: typeof Mail; comingSoon: boolean }> = {
  email: { label: 'Email', icon: Mail, comingSoon: false },
  sms: { label: 'SMS', icon: MessageSquare, comingSoon: true },
  whatsapp: { label: 'WhatsApp', icon: Smartphone, comingSoon: true },
};

const PERSONALIZATION_TAGS = [
  { tag: '{{first_name}}', label: 'First Name' },
  { tag: '{{last_service}}', label: 'Last Service' },
  { tag: '{{favorite_barber}}', label: 'Preferred Staff' },
  { tag: '{{days_since_visit}}', label: 'Days Since Visit' },
];

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const config = {
    high: { label: 'High Priority', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500' },
    medium: { label: 'Medium Priority', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
    low: { label: 'Low Priority', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', dot: 'bg-blue-400' },
  };
  const c = config[priority];
  return (
    <Badge className={`${c.bg} ${c.color} border ${c.border} text-xs font-semibold`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} mr-1.5 inline-block`} />
      {c.label}
    </Badge>
  );
}

function ComingSoonBadge() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold cursor-help">
            <Clock className="w-2.5 h-2.5" />
            Soon
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">SMS Integration Coming Soon — Use White-Label Email or Export Copy Currently</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default function ConsultantPage() {
  const { profile } = useAuth();
  const businessName = profile?.business_name ?? 'your business';
  const { toast } = useToast();

  const { clients, segments: contextSegments, loading, refresh, refreshCampaigns } = useClientData();
  const [strategies, setStrategies] = useState<AiStrategy[]>([]);
  const [segments, setSegments] = useState<ChurnSegment[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<AiStrategy | null>(null);
  const [channel, setChannel] = useState<Channel>('email');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);

  // Derive strategies from shared context clients
  useEffect(() => {
    const segs = computeChurnSegments(clients);
    setSegments(segs);
    const strats = buildAiStrategies(clients, businessName);
    setStrategies(strats);
    if (strats.length > 0 && !selectedStrategy) {
      setSelectedStrategy(strats[0]);
      setSubject(strats[0].suggestedSubject);
      setBody(strats[0].suggestedBody);
    }
  }, [clients, businessName, selectedStrategy]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
    toast({ title: 'Analysis refreshed', description: `Re-evaluated ${clients.length} clients. ${strategies.length} strategies recommended.` });
  };

  const handleSelectStrategy = (s: AiStrategy) => {
    setSelectedStrategy(s);
    setChannel('email');
    setSubject(s.suggestedSubject);
    setBody(s.suggestedBody);
    setExpandedWhy(null);
  };

  const handleChannelChange = (ch: Channel) => {
    if (CHANNEL_CONFIG[ch].comingSoon) return;
    setChannel(ch);
    if (!selectedStrategy) return;
    if (ch === 'email') {
      setSubject(selectedStrategy.suggestedSubject);
      setBody(selectedStrategy.suggestedBody);
    } else if (ch === 'sms') {
      setBody(selectedStrategy.suggestedSms);
    } else {
      setBody(selectedStrategy.suggestedWhatsapp);
    }
  };

  const handleCopy = () => {
    const text = channel === 'email' ? `Subject: ${subject}\n\n${body}` : body;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: 'Copied to clipboard', description: 'Paste into your sending tool (Klaviyo, Mailchimp, etc.)' });
  };

  const handleInsertTag = (tag: string) => {
    setBody(prev => prev + ' ' + tag);
  };

  const handleLaunchCampaign = async () => {
    if (!selectedStrategy) return;
    setGenerating(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      toast({ title: 'Session expired', description: 'Please sign in again.', variant: 'destructive' });
      setGenerating(false);
      return;
    }

    const tier = selectedStrategy.tier;
    const segmentMap: Record<string, string> = {
      slipping_away: 'lapsed_60',
      high_value_at_risk: 'lapsed_60',
      lapsed: 'lapsed_90',
      lost: 'lapsed_180',
      active: 'all_lapsed',
    };

    const campaignData = {
      user_id: session.user.id,
      name: selectedStrategy.title,
      status: 'draft',
      channel: 'email',
      target_segment: segmentMap[tier] ?? 'all_lapsed',
      target_description: CHURN_TIER_CONFIG[tier as ChurnTier]?.label ?? tier,
      message_subject: subject.trim(),
      message_body: body.trim(),
      recipient_count: selectedStrategy.clientCount,
    };

    const { error } = await supabase.from('campaigns').insert(campaignData);

    if (error) {
      toast({ title: 'Could not create campaign', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Campaign created', description: `"${selectedStrategy.title}" saved as a draft. Go to Campaigns to launch it.` });
      refreshCampaigns();
    }
    setGenerating(false);
  };

  const recoverableRevenue = totalRecoverableRevenue(segments);
  const atRiskCount = segments.filter(s => s.tier !== 'active').reduce((sum, s) => sum + s.count, 0);

  const sampleClient = selectedStrategy
    ? clients.find(c => c.churn_tier === selectedStrategy.tier) ?? clients[0]
    : null;
  const previewText = sampleClient ? applyPersonalization(body, sampleClient) : body;
  const previewSubject = sampleClient ? applyPersonalization(subject, sampleClient) : subject;

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">AI Retention Consultant</h2>
          </div>
          <p className="text-sm text-gray-500">Your AI-powered win-back strategist — analyzes your client data and generates personalised recovery campaigns</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-gray-200 text-gray-700 font-semibold gap-1.5 self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Analysis'}
        </Button>
      </div>

      {/* AI Summary Banner */}
      {!loading && atRiskCount > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-bold text-gray-900 text-sm mb-1">AI Analysis Complete</div>
              <p className="text-sm text-gray-600">
                Analyzed <strong>{clients.length} clients</strong>. Found <strong>{atRiskCount} at-risk</strong> with an estimated <strong>£{recoverableRevenue.toLocaleString()}</strong> in recoverable revenue. {strategies.length} strategies recommended below.
              </p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-sm">Analyzing your client data...</p>
        </div>
      ) : atRiskCount === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
            <Check className="w-8 h-8 text-emerald-500" />
          </div>
          <h3 className="text-base font-bold text-gray-700 mb-1">All clients are active</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-5">
            No at-risk clients detected. Import more clients or refresh later as visit patterns change.
          </p>
          <Link href="/dashboard/clients">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="w-4 h-4" /> Import more clients
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* LEFT: AI Strategy Recommendations */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">AI Strategy Recommendations</h3>
            </div>

            {strategies.map((s) => {
              const isActive = selectedStrategy?.id === s.id;
              const tierConfig = CHURN_TIER_CONFIG[s.tier as ChurnTier];
              const isWhyExpanded = expandedWhy === s.id;
              return (
                <div key={s.id} className={`rounded-xl border transition-all ${isActive ? 'border-blue-300 bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-blue-200 hover:bg-blue-50/30'}`}>
                  <button
                    onClick={() => handleSelectStrategy(s)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${tierConfig?.dot ?? 'bg-gray-400'}`} />
                        <span className="font-bold text-gray-900 text-sm">{s.title}</span>
                      </div>
                      <PriorityBadge priority={s.priority} />
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{s.insight}</p>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="text-xs font-semibold text-gray-700">
                        <span className="text-blue-600">{s.clientCount}</span> clients
                      </span>
                      <span className="text-xs font-semibold text-emerald-700">
                        ~{s.estimatedRevenue} recoverable
                      </span>
                      <div className="flex items-center gap-1">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">Email</span>
                        <span className="text-xs text-gray-300 mx-0.5">·</span>
                        <span className="text-xs text-gray-400 line-through">SMS</span>
                        <ComingSoonBadge />
                      </div>
                    </div>
                  </button>

                  {/* Why this recommendation? */}
                  {isActive && (
                    <div className="mt-1 pt-0 px-4 pb-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); setExpandedWhy(isWhyExpanded ? null : s.id); }}
                        className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        Why this recommendation?
                        {isWhyExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                      {isWhyExpanded && (
                        <div className="mt-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                          <p className="text-xs text-gray-600 leading-relaxed">{s.whyExplanation}</p>
                        </div>
                      )}

                      <div className="mt-3 pt-3 border-t border-blue-100">
                        <div className="flex items-start gap-2">
                          <Target className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-0.5">Recommendation</div>
                            <p className="text-xs text-gray-500">{s.recommendation}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 mt-2">
                          <Zap className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <div className="text-xs font-semibold text-gray-700 mb-0.5">Suggested Offer</div>
                            <p className="text-xs text-gray-500">{s.offer}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* RIGHT: Campaign Copy Studio */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-gray-900">Campaign Copy Studio</h3>
            </div>

            {selectedStrategy && (
              <Card className="border-gray-100 shadow-sm">
                <CardContent className="p-5 space-y-4">
                  {/* Channel toggle */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Delivery Channel</Label>
                    <div className="flex gap-2">
                      {(['email', 'sms', 'whatsapp'] as Channel[]).map(ch => {
                        const config = CHANNEL_CONFIG[ch];
                        const Icon = config.icon;
                        return (
                          <button
                            key={ch}
                            onClick={() => handleChannelChange(ch)}
                            disabled={config.comingSoon}
                            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all relative ${
                              channel === ch && !config.comingSoon
                                ? 'bg-blue-600 text-white border-blue-600'
                                : config.comingSoon
                                  ? 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed'
                                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Icon className="w-3.5 h-3.5" />
                            {config.label}
                            {config.comingSoon && (
                              <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-[8px] font-bold leading-none">SOON</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {channel === 'email' && (
                      <p className="text-xs text-emerald-600 mt-1.5 flex items-center gap-1">
                        <Check className="w-3 h-3" /> White-label email is active and ready to send
                      </p>
                    )}
                  </div>

                  {/* Subject (email only) */}
                  {channel === 'email' && (
                    <div>
                      <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Subject Line</Label>
                      <Input
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="h-10 border-gray-200"
                      />
                    </div>
                  )}

                  {/* Body */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                      {channel === 'email' ? 'Email Body' : channel === 'sms' ? 'SMS Script' : 'WhatsApp Script'}
                    </Label>
                    <Textarea
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      rows={8}
                      className="border-gray-200 resize-none text-sm"
                    />
                  </div>

                  {/* Personalization tags */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Personalization Tags</Label>
                    <div className="flex flex-wrap gap-2">
                      {PERSONALIZATION_TAGS.map(t => (
                        <button
                          key={t.tag}
                          onClick={() => handleInsertTag(t.tag)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 transition-all text-xs text-gray-600 hover:text-blue-700"
                        >
                          <span className="font-mono text-blue-600">{t.tag}</span>
                          <span className="text-gray-400">— {t.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* White-label note */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                    <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                    <span className="text-xs text-emerald-700 font-medium">100% white-label — no third-party branding or ads in your copy</span>
                  </div>

                  {/* Preview */}
                  <div>
                    <Label className="text-xs font-semibold text-gray-700 mb-1.5 block">Preview (with sample client)</Label>
                    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      {channel === 'email' && (
                        <div className="mb-3 pb-3 border-b border-gray-100">
                          <div className="text-xs text-gray-400 mb-0.5">Subject</div>
                          <div className="text-sm font-semibold text-gray-800">{previewSubject}</div>
                        </div>
                      )}
                      <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{previewText}</div>
                    </div>
                    {sampleClient && (
                      <p className="text-xs text-gray-400 mt-1.5">
                        Preview uses sample client: <strong>{sampleClient.name}</strong>
                        {sampleClient.preferred_service && ` · ${sampleClient.preferred_service}`}
                        {sampleClient.preferred_staff && ` · ${sampleClient.preferred_staff}`}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopy}
                      className="border-gray-200 text-gray-700 text-xs h-9 gap-1.5"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy script'}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleLaunchCampaign}
                      disabled={generating}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 gap-1.5 ml-auto"
                    >
                      {generating ? (
                        <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                      ) : (
                        <><Repeat className="w-3.5 h-3.5" /> Save as campaign</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
