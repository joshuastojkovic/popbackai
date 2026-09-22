'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { computeChurnSegments, totalRecoverableRevenue, AnalyticsClient, ChurnSegment } from '@/lib/analytics';
import { CHURN_TIER_CONFIG, ChurnTier } from '@/lib/csvParser';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  TrendingUp,
  DollarSign,
  Target,
  ChevronRight,
  Zap,
  UploadCloud,
  Play,
  BarChart3,
  Mail,
  Star,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Brain,
  Repeat,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import Link from 'next/link';
import { AskPopbackAI } from '@/components/dashboard/AskPopbackAI';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

type CampaignData = { name: string; sent: number; opened: number; converted: number };
type TimelinePoint = { date: string; sent: number; opened: number };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

const CHURN_COLORS: Record<ChurnTier, string> = {
  active: '#10b981',
  slipping_away: '#f59e0b',
  high_value_at_risk: '#f97316',
  lapsed: '#ef4444',
  lost: '#6b7280',
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';
  const businessName = profile?.business_name ?? 'your business';

  const [clients, setClients] = useState<AnalyticsClient[]>([]);
  const [segments, setSegments] = useState<ChurnSegment[]>([]);
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [stats, setStats] = useState({
    totalClients: 0,
    atRiskClients: 0,
    recoverableRevenue: 0,
    conversionRate: 0,
    totalSent: 0,
    totalOpened: 0,
    totalReEngaged: 0,
    activeCampaigns: 0,
  });

  const fetchStats = useCallback(async () => {
    const now = new Date();

    const [clientsRes, campaignsRes] = await Promise.all([
      supabase.from('clients').select('id, name, email, phone, last_visit_date, lifetime_spend, preferred_service, preferred_staff, churn_tier, review_requested, review_completed'),
      supabase.from('campaigns').select('id, name, status, sent, opened, converted, created_at, launched_at, deleted_at').is('deleted_at', null),
    ]);

    const allClients = (clientsRes.data ?? []) as AnalyticsClient[];
    setClients(allClients);

    const churnSegments = computeChurnSegments(allClients);
    setSegments(churnSegments);

    const atRisk = churnSegments
      .filter(s => s.tier !== 'active')
      .reduce((sum, s) => sum + s.count, 0);
    const recoverable = totalRecoverableRevenue(churnSegments);

    const allCampaigns = (campaignsRes.data ?? []) as Array<{ id: string; name: string; status: string; sent: number; opened: number; converted: number; created_at: string; launched_at: string | null }>;
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;
    const totalReEngaged = allCampaigns.reduce((s, c) => s + (c.converted ?? 0), 0);
    const totalSent = allCampaigns.reduce((s, c) => s + (c.sent ?? 0), 0);
    const totalOpened = allCampaigns.reduce((s, c) => s + Math.min(c.opened ?? 0, c.sent ?? 0), 0);
    const conversionRate = totalSent > 0 ? Math.min(100, Math.round((totalReEngaged / totalSent) * 100)) : 0;

    setStats({
      totalClients: allClients.length,
      atRiskClients: atRisk,
      recoverableRevenue: recoverable,
      conversionRate,
      totalSent,
      totalOpened,
      totalReEngaged,
      activeCampaigns,
    });

    // Campaign chart data
    const chartData = allCampaigns
      .filter(c => (c.sent ?? 0) > 0)
      .sort((a, b) => (b.sent ?? 0) - (a.sent ?? 0))
      .slice(0, 6)
      .map(c => ({
        name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
        sent: c.sent ?? 0,
        opened: c.opened ?? 0,
        converted: c.converted ?? 0,
      }));
    setCampaignData(chartData);

    // Timeline
    const timelineMap = new Map<string, { sent: number; opened: number }>();
    for (const c of allCampaigns) {
      if (!c.launched_at) continue;
      const d = new Date(c.launched_at).toISOString().split('T')[0];
      const existing = timelineMap.get(d) ?? { sent: 0, opened: 0 };
      existing.sent += c.sent ?? 0;
      existing.opened += c.opened ?? 0;
      timelineMap.set(d, existing);
    }
    const points: TimelinePoint[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000).toISOString().split('T')[0];
      const data = timelineMap.get(d) ?? { sent: 0, opened: 0 };
      points.push({ date: d, sent: data.sent, opened: data.opened });
    }
    setTimeline(points);
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const isEmpty = stats.totalClients === 0;
  const overallOpenRate = stats.totalSent > 0 ? Math.min(100, Math.round((stats.totalOpened / stats.totalSent) * 100)) : 0;
  const greeting = getGreeting();

  // Churn distribution chart data
  const churnChartData = segments.map(s => ({
    name: CHURN_TIER_CONFIG[s.tier].label,
    count: s.count,
    color: CHURN_COLORS[s.tier],
  }));

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-screen-xl">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-blue-500/10 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-16 w-28 h-28 bg-blue-500/10 rounded-full translate-y-1/3 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-200 text-sm font-medium mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 opacity-75" />
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="text-2xl font-bold mb-1">{greeting}, {firstName}!</h2>
            <p className="text-blue-200 text-sm">
              {profile?.business_name
                ? `Here's your AI retention briefing for ${businessName}.`
                : "Here's your AI retention briefing."}
            </p>
          </div>
          {stats.atRiskClients > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-amber-500/20 rounded-xl px-4 py-2.5 flex-shrink-0 border border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <div>
                <div className="text-white font-bold text-lg leading-none">{stats.atRiskClients}</div>
                <div className="text-amber-200 text-xs">at-risk clients</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state */}
      {isEmpty && !loading && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <UploadCloud className="w-7 h-7 text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Import your client list to get started</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Export a CSV from Booksy, Mindbody, Phorest, or Fresha and drop it here. PopbackAI will instantly analyze your client base and generate retention strategies.
          </p>
          <Link href="/dashboard/clients">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2">
              <UploadCloud className="w-4 h-4" />
              Import Client CSV
            </Button>
          </Link>
        </div>
      )}

      {/* Main content */}
      {(!isEmpty || loading) && (
        <>
          {/* Top-line metrics */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              { label: 'Total Clients Analyzed', value: loading ? '-' : stats.totalClients.toLocaleString(), icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/clients' },
              { label: 'At-Risk / Lapsed Clients', value: loading ? '-' : stats.atRiskClients.toLocaleString(), icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', href: '/dashboard/consultant', note: stats.atRiskClients > 0 ? 'Need attention' : 'All healthy' },
              { label: 'Est. Recoverable Revenue', value: loading ? '-' : `£${stats.recoverableRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50', href: '/dashboard/consultant' },
              { label: 'Campaign Conversion Rate', value: loading ? '-' : `${stats.conversionRate}%`, icon: Target, color: 'text-blue-600', bg: 'bg-blue-50', href: '/dashboard/campaigns' },
            ].map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                      <stat.icon className={`w-5 h-5 ${stat.color}`} />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 mb-0.5">{stat.value}</div>
                    <div className="text-sm text-gray-500">{stat.label}</div>
                    {stat.note && (
                      <div className={`text-xs font-medium mt-1 ${stat.note === 'All healthy' ? 'text-emerald-600' : 'text-amber-600'}`}>{stat.note}</div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* AI Analysis CTA */}
          {stats.atRiskClients > 0 && !loading && (
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
              <div className="relative flex items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Run AI Client Analysis</h3>
                    <p className="text-blue-100 text-sm max-w-md">
                      PopbackAI has identified {stats.atRiskClients} at-risk clients with an estimated £{stats.recoverableRevenue.toLocaleString()} in recoverable revenue. Get your personalised retention strategy now.
                    </p>
                  </div>
                </div>
                <Link href="/dashboard/consultant" className="flex-shrink-0">
                  <Button className="bg-white text-blue-700 hover:bg-blue-50 font-semibold gap-2">
                    <Sparkles className="w-4 h-4" />
                    Run Analysis
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Churn Segmentation Matrix */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Churn Segmentation Matrix</h3>
                <p className="text-xs text-gray-400 mt-0.5">Client breakdown by risk level</p>
              </div>
              <Link href="/dashboard/clients" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all clients <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {segments.length === 0 && loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="border-gray-100 shadow-sm">
                    <CardContent className="p-4">
                      <div className="w-3 h-3 rounded-full bg-gray-200 mb-3" />
                      <div className="h-6 w-12 bg-gray-100 rounded mb-1" />
                      <div className="h-3 w-20 bg-gray-50 rounded" />
                    </CardContent>
                  </Card>
                ))
              ) : (
                segments.map((seg) => {
                  const config = CHURN_TIER_CONFIG[seg.tier];
                  return (
                    <Link key={seg.tier} href="/dashboard/consultant">
                      <Card className="border-gray-100 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                            <span className="text-xs font-semibold text-gray-700">{config.label}</span>
                          </div>
                          <div className="text-2xl font-bold text-gray-900">{seg.count}</div>
                          <div className="text-xs text-gray-400 mt-0.5">clients</div>
                          {seg.estimatedRecoverable > 0 && (
                            <div className="text-xs font-semibold text-emerald-600 mt-2">
                              ~£{seg.estimatedRecoverable.toLocaleString()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

          {/* Analytics charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Churn distribution */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Churn Distribution</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Clients by risk tier</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : churnChartData.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-300">
                    <BarChart3 className="w-8 h-8 mb-2" />
                    <p className="text-sm">No data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={churnChartData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }} cursor={{ fill: '#f9fafb' }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Clients">
                        {churnChartData.map((entry, index) => (
                          <Cell key={index} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Email activity timeline */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Campaign Activity</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-48 flex items-center justify-center">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : timeline.every(p => p.sent === 0) ? (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-300">
                    <TrendingUp className="w-8 h-8 mb-2" />
                    <p className="text-sm">No activity yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={timeline}>
                      <defs>
                        <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="openedGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} interval={6} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }} labelFormatter={(v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} />
                      <Area type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={2} fill="url(#sentGrad)" name="Sent" />
                      <Area type="monotone" dataKey="opened" stroke="#10b981" strokeWidth={2} fill="url(#openedGrad)" name="Opened" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Key metrics row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Emails Sent', value: stats.totalSent, icon: Mail, color: 'text-blue-600' },
              { label: 'Total Opens', value: stats.totalOpened, icon: BarChart3, color: 'text-emerald-600' },
              { label: 'Open Rate', value: `${overallOpenRate}%`, icon: Target, color: 'text-amber-600' },
              { label: 'Clients Re-engaged', value: stats.totalReEngaged, icon: TrendingUp, color: 'text-blue-600' },
            ].map((m) => (
              <Card key={m.label} className="border-gray-100 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0">
                      <m.icon className={`w-4 h-4 ${m.color}`} />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900">{loading ? '-' : m.value}</div>
                      <div className="text-xs text-gray-400">{m.label}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick actions */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick actions</h3>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { label: 'AI Consultant', href: '/dashboard/consultant', icon: Brain, color: 'bg-blue-600' },
                { label: 'Import Client CSV', href: '/dashboard/clients', icon: UploadCloud, color: 'bg-emerald-600' },
                { label: 'Launch Campaign', href: '/dashboard/campaigns', icon: Repeat, color: 'bg-amber-500' },
              ].map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all cursor-pointer group">
                    <div className={`w-9 h-9 rounded-lg ${action.color} flex items-center justify-center flex-shrink-0`}>
                      <action.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 group-hover:text-gray-900">{action.label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-300 ml-auto group-hover:text-gray-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Ask Popback AI floating button */}
      {!loading && clients.length > 0 && (
        <>
          <button
            onClick={() => setChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-full shadow-lg shadow-blue-300 transition-all"
          >
            <Brain className="w-5 h-5" />
            <span className="font-semibold text-sm">Ask Popback AI</span>
          </button>
          <AskPopbackAI open={chatOpen} onOpenChange={setChatOpen} clients={clients} />
        </>
      )}
    </div>
  );
}
