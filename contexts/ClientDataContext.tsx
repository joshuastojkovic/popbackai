'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import {
  AnalyticsClient,
  ChurnSegment,
  computeChurnSegments,
  totalRecoverableRevenue,
  buildAiStrategies,
  AiStrategy,
} from '@/lib/analytics';

type CampaignSummary = {
  id: string;
  name: string;
  status: string;
  channel: string;
  target_segment: string;
  target_description: string | null;
  message_subject: string | null;
  message_body: string | null;
  recipient_count: number;
  sent: number;
  opened: number;
  converted: number;
  created_at: string;
  launched_at: string | null;
  scheduled_for: string | null;
  deleted_at: string | null;
};

type DashboardStats = {
  totalClients: number;
  atRiskClients: number;
  recoverableRevenue: number;
  conversionRate: number;
  totalSent: number;
  totalOpened: number;
  totalReEngaged: number;
  activeCampaigns: number;
};

type ClientDataContextType = {
  clients: AnalyticsClient[];
  campaigns: CampaignSummary[];
  segments: ChurnSegment[];
  strategies: AiStrategy[];
  stats: DashboardStats;
  contactedClientIds: Set<string>;
  loading: boolean;
  lastUpdated: number | null;
  refresh: () => Promise<void>;
  refreshClients: () => Promise<void>;
  refreshCampaigns: () => Promise<void>;
};

const ClientDataContext = createContext<ClientDataContextType | undefined>(undefined);

export function ClientDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<AnalyticsClient[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchClients = useCallback(async () => {
    const { data } = await supabase
      .from('clients')
      .select('id, name, email, phone, last_visit_date, lifetime_spend, preferred_service, preferred_staff, churn_tier, review_requested, review_completed');
    setClients((data ?? []) as AnalyticsClient[]);
  }, []);

  const fetchCampaigns = useCallback(async () => {
    const { data } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    setCampaigns((data ?? []) as CampaignSummary[]);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchClients(), fetchCampaigns()]);
    setLastUpdated(Date.now());
    setLoading(false);
  }, [fetchClients, fetchCampaigns]);

  const refreshClients = useCallback(async () => {
    await fetchClients();
    setLastUpdated(Date.now());
  }, [fetchClients]);

  const refreshCampaigns = useCallback(async () => {
    await fetchCampaigns();
    setLastUpdated(Date.now());
  }, [fetchCampaigns]);

  useEffect(() => {
    if (user) {
      refresh();
    } else {
      setClients([]);
      setCampaigns([]);
      setLoading(false);
    }
  }, [user, refresh]);

  // Subscribe to realtime changes on campaigns and clients
  useEffect(() => {
    if (!user) return;

    const campaignChannel = supabase
      .channel('campaigns-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'campaigns' }, () => {
        fetchCampaigns();
      })
      .subscribe();

    const clientChannel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => {
        fetchClients();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(campaignChannel);
      supabase.removeChannel(clientChannel);
    };
  }, [user, fetchClients, fetchCampaigns]);

  // Derived data
  const segments = computeChurnSegments(clients);
  const strategies = buildAiStrategies(clients, 'your business');

  // Collect IDs of clients who have been contacted (have campaign_recipients with sent_at)
  const [contactedIds, setContactedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (campaigns.length === 0) {
      setContactedIds(new Set());
      return;
    }
    // Only exclude clients from campaigns that have actually been sent (status active/completed, sent > 0)
    const activeOrSentCampaigns = campaigns.filter(
      c => !c.deleted_at && (c.status === 'active' || c.status === 'completed') && c.sent > 0
    );
    if (activeOrSentCampaigns.length === 0) {
      setContactedIds(new Set());
      return;
    }
    // Fetch recipient client IDs for these campaigns
    const campaignIds = activeOrSentCampaigns.map(c => c.id);
    supabase
      .from('campaign_recipients')
      .select('client_id')
      .in('campaign_id', campaignIds)
      .not('sent_at', 'is', null)
      .then(({ data }) => {
        const ids = new Set<string>();
        for (const row of data ?? []) {
          if (row.client_id) ids.add(row.client_id);
        }
        setContactedIds(ids);
      });
  }, [campaigns]);

  // Stats
  const activeCampaignsList = campaigns.filter(c => !c.deleted_at);
  const totalSent = activeCampaignsList.reduce((s, c) => s + c.sent, 0);
  const totalOpened = activeCampaignsList.reduce((s, c) => s + Math.min(c.opened, c.sent), 0);
  const totalReEngaged = activeCampaignsList.reduce((s, c) => s + c.converted, 0);
  const conversionRate = totalSent > 0 ? Math.min(100, Math.round((totalReEngaged / totalSent) * 100)) : 0;
  const activeCampaigns = activeCampaignsList.filter(c => c.status === 'active').length;
  const atRiskClients = segments.filter(s => s.tier !== 'active').reduce((sum, s) => sum + s.count, 0);
  const recoverableRevenue = totalRecoverableRevenue(segments);

  const stats: DashboardStats = {
    totalClients: clients.length,
    atRiskClients,
    recoverableRevenue,
    conversionRate,
    totalSent,
    totalOpened,
    totalReEngaged,
    activeCampaigns,
  };

  return (
    <ClientDataContext.Provider
      value={{
        clients,
        campaigns,
        segments,
        strategies,
        stats,
        contactedClientIds: contactedIds,
        loading,
        lastUpdated,
        refresh,
        refreshClients,
        refreshCampaigns,
      }}
    >
      {children}
    </ClientDataContext.Provider>
  );
}

export function useClientData() {
  const context = useContext(ClientDataContext);
  if (!context) throw new Error('useClientData must be used within ClientDataProvider');
  return context;
}
