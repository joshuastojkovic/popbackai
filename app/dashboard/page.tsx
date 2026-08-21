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
  ArrowRight,
  UploadCloud,
  Play,
} from 'lucide-react';
import Link from 'next/link';

type Stats = {
  totalClients: number;
  lapsedClients: number;
  activeCampaigns: number;
  totalReEngaged: number;
};

export default function DashboardPage() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'there';

  const [stats, setStats] = useState<Stats>({
    totalClients: 0,
    lapsedClients: 0,
    activeCampaigns: 0,
    totalReEngaged: 0,
  });
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
        .select('status, converted'),
    ]);

    const activeCampaigns = (campaignsRes.data ?? []).filter(c => c.status === 'active').length;
    const totalReEngaged = (campaignsRes.data ?? []).reduce((s, c) => s + (c.converted ?? 0), 0);

    setStats({
      totalClients: clientsRes.count ?? 0,
      lapsedClients: lapsedRes.count ?? 0,
      activeCampaigns,
      totalReEngaged,
    });
    setLoading(false);
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const isEmpty = stats.totalClients === 0;

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();

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

      {/* Empty state — shown when no clients imported yet */}
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

      {/* Stats grid — shown when there is data */}
      {(!isEmpty || loading) && (
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              label: 'Total Clients',
              value: loading ? '—' : stats.totalClients.toLocaleString(),
              icon: Users,
              color: 'text-blue-600',
              bg: 'bg-blue-50',
              href: '/dashboard/clients',
            },
            {
              label: 'Lapsed Clients',
              value: loading ? '—' : stats.lapsedClients.toLocaleString(),
              icon: Repeat,
              color: 'text-amber-600',
              bg: 'bg-amber-50',
              href: '/dashboard/campaigns',
              note: stats.lapsedClients > 0 ? 'Ready to win back' : 'None yet',
            },
            {
              label: 'Active Campaigns',
              value: loading ? '—' : stats.activeCampaigns.toLocaleString(),
              icon: Mail,
              color: 'text-emerald-600',
              bg: 'bg-emerald-50',
              href: '/dashboard/campaigns',
            },
            {
              label: 'Clients Re-engaged',
              value: loading ? '—' : stats.totalReEngaged.toLocaleString(),
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
      )}

      {/* Opportunity callout — shown when lapsed clients exist but no campaigns running */}
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
