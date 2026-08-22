'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Users,
  Repeat,
  Star,
  ChevronRight,
  Zap,
  Calendar,
  Mail,
  UploadCloud,
  Play,
  TrendingUp,
  BarChart3,
  Target,
} from 'lucide-react';
import Link from 'next/link';
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
} from 'recharts';

type Stats = {
  totalClients: number;
  lapsedClients: number;
  activeCampaigns: number;
  totalReEngaged: number;
  totalSent: number;
  totalOpened: number;
};

type CampaignData = {
  name: string;
  sent: number;
  opened: number;
  converted: number;
  openRate: number;
};

type TimelinePoint = {
  date: string;
  sent: number;
  opened: number;
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    lapsedClients: 0,
    activeCampaigns: 0,
    totalReEngaged: 0,
    totalSent: 0,
    totalOpened: 0,
  });
  const [campaignData, setCampaignData] = useState<CampaignData[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const now = new Date();
    const cutoff60 = new Date(now.getTime() - 60 * 86400000).toISOString().split('T')[0];

    const [clientsRes, lapsedRes, campaignsRes] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase
        .from('clients')
        .select('id', { count: 'exact', head: true })
        .lte('last_visit_date', cutoff60),
      supabase
        .from('campaigns')
        .select('id, name, status, sent, opened, converted, created_at, launched_at, deleted_at')
        .is('deleted_at', null),
    ]);

    const allCampaigns = (campaignsRes.data ?? []) as Array<{ id: string; name: string; status: string; sent: number; opened: number; converted: number; created_at: string; launched_at: string | null; deleted_at: string | null }>;
    const activeCampaigns = allCampaigns.filter(c => c.status === 'active').length;
    const totalReEngaged = allCampaigns.reduce((s, c) => s + (c.converted ?? 0), 0);
    const totalSent = allCampaigns.reduce((s, c) => s + (c.sent ?? 0), 0);
    const totalOpened = allCampaigns.reduce((s, c) => s + (c.opened ?? 0), 0);

    setStats({
      totalClients: clientsRes.count ?? 0,
      lapsedClients: lapsedRes.count ?? 0,
      activeCampaigns,
      totalReEngaged,
      totalSent,
      totalOpened,
    });

    // Campaign chart data (top 6 campaigns by sent)
    const chartData = allCampaigns
      .filter(c => (c.sent ?? 0) > 0)
      .sort((a, b) => (b.sent ?? 0) - (a.sent ?? 0))
      .slice(0, 6)
      .map(c => ({
        name: c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name,
        sent: c.sent ?? 0,
        opened: c.opened ?? 0,
        converted: c.converted ?? 0,
        openRate: (c.sent ?? 0) > 0 ? Math.round(((c.opened ?? 0) / c.sent) * 100) : 0,
      }));
    setCampaignData(chartData);

    // Build timeline from campaign launch dates (last 30 days)
    const timelineMap = new Map<string, { sent: number; opened: number }>();
    for (const c of allCampaigns) {
      if (!c.launched_at) continue;
      const d = new Date(c.launched_at).toISOString().split('T')[0];
      const existing = timelineMap.get(d) ?? { sent: 0, opened: 0 };
      existing.sent += c.sent ?? 0;
      existing.opened += c.opened ?? 0;
      timelineMap.set(d, existing);
    }

    // Fill in last 30 days
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
  const overallOpenRate = stats.totalSent > 0 ? Math.round((stats.totalOpened / stats.totalSent) * 100) : 0;

  const greeting = getGreeting();

  return (
    <div className="p-6 lg:p-8 space-y-8 max-w-screen-xl">

      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-56 h-56 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/4 pointer-events-none" />
        <div className="absolute bottom-0 right-16 w-28 h-28 bg-white/5 rounded-full translate-y-1/3 pointer-events-none" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-blue-100 text-sm font-medium mb-1 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 opacity-75" />
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
            <h2 className="text-2xl font-bold mb-1">{greeting}, {firstName}!</h2>
            <p className="text-blue-100 text-sm">
              {profile?.business_name
                ? `Here's what's happening at ${profile.business_name} today.`
                : "Here's what's happening with your business today."}
            </p>
          </div>
          {stats.totalReEngaged > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-white/15 rounded-xl px-4 py-2.5 flex-shrink-0">
              <Zap className="w-4 h-4 text-blue-200" />
              <div>
                <div className="text-white font-bold text-lg leading-none">{stats.totalReEngaged}</div>
                <div className="text-blue-200 text-xs">clients re-engaged</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Empty state - shown when no clients imported yet */}
      {isEmpty && !loading && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50/50 p-10 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <UploadCloud className="w-7 h-7 text-blue-400" />
          </div>
          <h3 className="text-base font-bold text-gray-800 mb-1">Import your client list to get started</h3>
          <p className="text-sm text-gray-500 max-w-sm mb-6">
            Upload a CSV of your clients and PopbackAI will instantly identify who's lapsed and show you win-back opportunities.
          </p>
          <Link href="/dashboard/clients">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2">
              <UploadCloud className="w-4 h-4" />
              Import Client List
            </Button>
          </Link>
        </div>
      )}

      {/* Stats grid - shown when there is data */}
      {(!isEmpty || loading) && (
        <>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
            {[
              {
                label: 'Total Clients',
                value: loading ? '-' : stats.totalClients.toLocaleString(),
                icon: Users,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                href: '/dashboard/clients',
              },
              {
                label: 'Lapsed Clients',
                value: loading ? '-' : stats.lapsedClients.toLocaleString(),
                icon: Repeat,
                color: 'text-amber-600',
                bg: 'bg-amber-50',
                href: '/dashboard/campaigns',
                note: stats.lapsedClients > 0 ? 'Ready to win back' : 'None yet',
              },
              {
                label: 'Active Campaigns',
                value: loading ? '-' : stats.activeCampaigns.toLocaleString(),
                icon: Mail,
                color: 'text-emerald-600',
                bg: 'bg-emerald-50',
                href: '/dashboard/campaigns',
              },
              {
                label: 'Clients Re-engaged',
                value: loading ? '-' : stats.totalReEngaged.toLocaleString(),
                icon: Star,
                color: 'text-blue-600',
                bg: 'bg-blue-50',
                href: '/dashboard/campaigns',
              },
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
                      <div className="text-xs text-amber-600 font-medium mt-1">{stat.note}</div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {/* Analytics charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Campaign performance chart */}
            <Card className="border-gray-100 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">Campaign Performance</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Sent vs opened vs converted</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-48 flex items-center justify-center text-gray-300">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : campaignData.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-gray-300">
                    <BarChart3 className="w-8 h-8 mb-2" />
                    <p className="text-sm">No campaign data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={campaignData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }}
                        cursor={{ fill: '#f9fafb' }}
                      />
                      <Bar dataKey="sent" fill="#93c5fd" radius={[4, 4, 0, 0]} name="Sent" />
                      <Bar dataKey="opened" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Opened" />
                      <Bar dataKey="converted" fill="#10b981" radius={[4, 4, 0, 0]} name="Converted" />
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
                    <h3 className="text-sm font-bold text-gray-900">Email Activity</h3>
                    <p className="text-xs text-gray-400 mt-0.5">Last 30 days</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                {loading ? (
                  <div className="h-48 flex items-center justify-center text-gray-300">
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
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: '#9ca3af' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        interval={6}
                      />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #f3f4f6', fontSize: 12 }}
                        labelFormatter={(v: string) => new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      />
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
              { label: 'Conversions', value: stats.totalReEngaged, icon: TrendingUp, color: 'text-blue-600' },
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
        </>
      )}

      {/* Opportunity callout */}
      {stats.lapsedClients > 0 && stats.activeCampaigns === 0 && !loading && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <div className="font-bold text-gray-900 text-sm mb-0.5">
              {stats.lapsedClients} lapsed client{stats.lapsedClients !== 1 ? 's' : ''} waiting to be won back
            </div>
            <p className="text-sm text-gray-500">
              You have clients who haven't visited in over 60 days. Launch a win-back campaign to bring them back.
            </p>
          </div>
          <Link href="/dashboard/campaigns" className="flex-shrink-0">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-1">
              <Play className="w-3.5 h-3.5" />
              Launch Campaign
            </Button>
          </Link>
        </div>
      )}

      {/* Quick actions */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Quick actions</h3>
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: 'Import Client List', href: '/dashboard/clients', icon: UploadCloud, color: 'bg-emerald-600' },
            { label: 'Launch Win-Back Campaign', href: '/dashboard/campaigns', icon: Repeat, color: 'bg-blue-600' },
            { label: 'Review Booster', href: '/dashboard/reviews', icon: Star, color: 'bg-amber-500' },
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
    </div>
  );
}
