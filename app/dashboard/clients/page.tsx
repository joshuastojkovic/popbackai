'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { parseCSV, clientStatus, daysSinceVisit, ParsedClient, ParseResult } from '@/lib/csvParser';
import CSVDropZone from '@/components/dashboard/CSVDropZone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Search,
  Users,
  UserCheck,
  UserX,
  HelpCircle,
  Upload,
  Trash2,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  AlertTriangle,
  CheckCircle,
  X,
  Mail,
  Phone,
  Calendar,
  Download,
  RefreshCw,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Repeat,
  Star,
} from 'lucide-react';

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  last_visit_date: string | null;
  source: string | null;
  notes: string | null;
  review_requested: boolean;
  review_completed: boolean;
  created_at: string;
};

type CampaignRecipient = {
  id: string;
  campaign_id: string;
  opened: boolean;
  converted: boolean;
  sent_at: string;
  campaign_name?: string;
};

type SortField = 'name' | 'last_visit_date' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'lapsed' | 'unknown';

const PAGE_SIZE = 25;

const STATUS_CONFIG = {
  active: {
    label: 'Active',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
  },
  lapsed: {
    label: 'Lapsed',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
  },
  unknown: {
    label: 'No date',
    color: 'text-gray-500',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    dot: 'bg-gray-400',
  },
} as const;

function formatDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
}

function toCSV(clients: Client[]): string {
  const headers = ['Name', 'Email', 'Phone', 'Last Visit Date', 'Status', 'Source', 'Review Requested', 'Review Completed'];
  const rows = clients.map((c) => {
    const status = clientStatus(c.last_visit_date);
    return [
      c.name,
      c.email ?? '',
      c.phone ?? '',
      c.last_visit_date ?? '',
      status,
      c.source ?? '',
      c.review_requested ? 'Yes' : 'No',
      c.review_completed ? 'Yes' : 'No',
    ].map((v) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export default function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [pendingClients, setPendingClients] = useState<ParsedClient[]>([]);
  const [duplicateCount, setDuplicateCount] = useState(0);
  const [importSuccess, setImportSuccess] = useState<{ count: number; duplicates: number } | null>(null);
  const [importError, setImportError] = useState('');
  const [importExpanded, setImportExpanded] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // table state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('last_visit_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  // edit state
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editForm, setEditForm] = useState({ name: '', email: '', phone: '', last_visit_date: '', notes: '' });
  const [editSaving, setEditSaving] = useState(false);

  // detail drawer state
  const [detailClient, setDetailClient] = useState<Client | null>(null);
  const [detailRecipients, setDetailRecipients] = useState<CampaignRecipient[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── data fetching ──────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setFetchError('');

    let countQuery = supabase.from('clients').select('*', { count: 'exact', head: true });
    let dataQuery = supabase
      .from('clients')
      .select('*');

    if (statusFilter !== 'all') {
      if (statusFilter === 'active') {
        const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
        countQuery = countQuery.gte('last_visit_date', cutoff);
        dataQuery = dataQuery.gte('last_visit_date', cutoff);
      } else if (statusFilter === 'lapsed') {
        const cutoff = new Date(Date.now() - 60 * 86400000).toISOString().split('T')[0];
        countQuery = countQuery.lte('last_visit_date', cutoff);
        dataQuery = dataQuery.lte('last_visit_date', cutoff);
      } else if (statusFilter === 'unknown') {
        countQuery = countQuery.is('last_visit_date', null);
        dataQuery = dataQuery.is('last_visit_date', null);
      }
    }

    if (search.trim()) {
      const s = `%${search.trim()}%`;
      countQuery = countQuery.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
      dataQuery = dataQuery.or(`name.ilike.${s},email.ilike.${s},phone.ilike.${s}`);
    }

    const sortCol = sortField === 'status' ? 'last_visit_date' : sortField;
    dataQuery = dataQuery.order(sortCol, { ascending: sortDir === 'asc' });
    if (sortField === 'name') dataQuery = dataQuery.order('name', { ascending: sortDir === 'asc' });

    dataQuery = dataQuery.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    const [countRes, dataRes] = await Promise.all([countQuery, dataQuery]);

    if (countRes.count !== null) setTotalCount(countRes.count);
    if (dataRes.error) {
      setFetchError(dataRes.error.message);
      setClients([]);
    } else if (dataRes.data) {
      setClients(dataRes.data as Client[]);
    }
    setLoading(false);
  }, [statusFilter, search, sortField, sortDir, page]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [statusFilter, search]);

  // ── CSV handling ───────────────────────────────────────────────────────

  const handleFileParsed = (text: string, _filename: string) => {
    const result = parseCSV(text);
    setParseResult(result);
    setPendingClients(result.clients);
    setImportError('');
    setImportSuccess(null);
    setDuplicateCount(0);
  };

  const handleConfirmImport = async () => {
    if (pendingClients.length === 0) return;
    setUploading(true);
    setImportError('');

    // Fetch existing clients to detect duplicates
    const { data: existing } = await supabase
      .from('clients')
      .select('name, email');

    const existingEmails = new Set((existing ?? []).map((c: { email: string | null }) => c.email?.toLowerCase()).filter(Boolean));
    const existingNames = new Set((existing ?? []).filter((c: { email: string | null }) => !c.email).map((c: { name: string }) => c.name.toLowerCase()));

    const unique: ParsedClient[] = [];
    const seenInBatch = new Set<string>();
    let dups = 0;

    for (const c of pendingClients) {
      const key = c.email ? c.email.toLowerCase() : c.name.toLowerCase();
      if (c.email && existingEmails.has(key)) { dups++; continue; }
      if (!c.email && existingNames.has(key)) { dups++; continue; }
      if (seenInBatch.has(key)) { dups++; continue; }
      seenInBatch.add(key);
      unique.push(c);
    }

    setDuplicateCount(dups);

    if (unique.length === 0) {
      setImportError(`All ${pendingClients.length} clients already exist in your list — no new clients to import.`);
      setUploading(false);
      return;
    }

    const rows = unique.map((c) => ({
      name: c.name,
      email: c.email || null,
      phone: c.phone || null,
      last_visit_date: c.last_visit_date || null,
      source: 'csv',
    }));

    const CHUNK = 500;
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const { error } = await supabase.from('clients').insert(rows.slice(i, i + CHUNK));
      if (error) {
        setImportError('Some records could not be saved: ' + error.message);
        setUploading(false);
        return;
      }
      totalInserted += Math.min(CHUNK, rows.length - i);
    }

    setImportSuccess({ count: totalInserted, duplicates: dups });
    setPendingClients([]);
    setParseResult(null);
    setImportExpanded(false);
    await fetchClients();
    setUploading(false);
  };

  const handleCancelImport = () => {
    setPendingClients([]);
    setParseResult(null);
    setDuplicateCount(0);
  };

  // ── delete ─────────────────────────────────────────────────────────────

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (!error) {
      setClients((prev) => prev.filter((c) => !ids.includes(c.id)));
      setTotalCount((prev) => Math.max(0, prev - ids.length));
      setSelected(new Set());
    }
  };

  // ── edit ───────────────────────────────────────────────────────────────

  const handleEditClick = (client: Client) => {
    setEditClient(client);
    setEditForm({
      name: client.name,
      email: client.email ?? '',
      phone: client.phone ?? '',
      last_visit_date: client.last_visit_date ?? '',
      notes: client.notes ?? '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editClient) return;
    if (!editForm.name.trim()) return;
    setEditSaving(true);
    const { error } = await supabase
      .from('clients')
      .update({
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        last_visit_date: editForm.last_visit_date || null,
        notes: editForm.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editClient.id);
    setEditSaving(false);
    if (!error) {
      setClients((prev) => prev.map((c) => c.id === editClient.id ? {
        ...c,
        name: editForm.name.trim(),
        email: editForm.email.trim() || null,
        phone: editForm.phone.trim() || null,
        last_visit_date: editForm.last_visit_date || null,
        notes: editForm.notes.trim() || null,
      } : c));
      setEditClient(null);
    }
  };

  // ── detail drawer ──────────────────────────────────────────────────────

  const handleRowClick = async (client: Client) => {
    setDetailClient(client);
    setDetailLoading(true);
    const { data: recipients } = await supabase
      .from('campaign_recipients')
      .select('id, campaign_id, opened, converted, sent_at')
      .eq('client_id', client.id)
      .order('sent_at', { ascending: false });

    if (recipients && recipients.length > 0) {
      const campaignIds = Array.from(new Set(recipients.map((r) => r.campaign_id)));
      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, name')
        .in('id', campaignIds);
      const campaignMap = new Map((campaigns ?? []).map((c: { id: string; name: string }) => [c.id, c.name]));
      const enriched = recipients.map((r) => ({ ...r, campaign_name: campaignMap.get(r.campaign_id) ?? 'Unknown' }));
      setDetailRecipients(enriched);
    } else {
      setDetailRecipients([]);
    }
    setDetailLoading(false);
  };

  // ── export ─────────────────────────────────────────────────────────────

  const handleExport = async () => {
    const { data: allClients, error } = await supabase
      .from('clients')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !allClients) return;

    const csv = toCSV(allClients as Client[]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `popbackai-clients-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── sort ───────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── derived data ───────────────────────────────────────────────────────

  const enriched = clients.map((c) => ({
    ...c,
    status: clientStatus(c.last_visit_date),
    daysSince: daysSinceVisit(c.last_visit_date),
  }));

  const allSelected = enriched.length > 0 && enriched.every((c) => selected.has(c.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((s) => { const next = new Set(s); enriched.forEach((c) => next.delete(c.id)); return next; });
    } else {
      setSelected((s) => { const next = new Set(s); enriched.forEach((c) => next.add(c.id)); return next; });
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const statusCounts = {
    all: totalCount,
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-xl">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Client List</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading...' : `${totalCount} total clients`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeleteSelected}
              className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete {selected.size} selected
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={totalCount === 0}
            className="border-gray-200 text-gray-600 hover:bg-gray-50 gap-1.5"
          >
            <Download className="w-4 h-4" />
            Export
          </Button>
          <Button
            size="sm"
            onClick={() => { setImportExpanded((v) => !v); setParseResult(null); setPendingClients([]); setDuplicateCount(0); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
          >
            <Upload className="w-4 h-4" />
            {importExpanded ? 'Hide import' : 'Import CSV'}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${importExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Import success toast */}
      {importSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>
            {importSuccess.count} clients imported successfully.
            {importSuccess.duplicates > 0 && ` ${importSuccess.duplicates} duplicate${importSuccess.duplicates !== 1 ? 's' : ''} skipped.`}
          </span>
          <button onClick={() => setImportSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Import panel — always present, collapsible */}
      <div className={`grid transition-all duration-300 ease-in-out ${importExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Import Clients from CSV</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  Supports exports from Fresha, Square, and any standard CSV format
                </p>
              </div>
              <button onClick={() => { setImportExpanded(false); setParseResult(null); setPendingClients([]); setDuplicateCount(0); }}
                className="text-gray-400 hover:text-gray-600">
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">

            {/* Column guide */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { col: 'Client Name', aliases: 'name, customer name, full name', required: true },
                { col: 'Email', aliases: 'email, email address, e-mail', required: false },
                { col: 'Phone', aliases: 'phone, mobile, telephone, tel', required: false },
                { col: 'Last Visit Date', aliases: 'last visit, last appointment, last booking', required: false },
              ].map((c) => (
                <div key={c.col} className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-xs font-bold text-gray-800">{c.col}</span>
                    {c.required && (
                      <span className="text-xs font-semibold text-red-500">*</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 leading-relaxed">{c.aliases}</div>
                </div>
              ))}
            </div>

            <CSVDropZone onFileParsed={handleFileParsed} disabled={uploading} />

            {/* Parse results / warnings */}
            {parseResult && (
              <div className="space-y-3">
                {parseResult.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {parseResult.warnings.map((w, i) => (
                      <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100 text-amber-800 text-xs">
                        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-500" />
                        <span>{w}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-gray-900">
                        {parseResult.clients.length} clients ready to import
                      </div>
                      <div className="text-xs text-gray-500">
                        {parseResult.totalRows} rows parsed
                        {parseResult.skippedRows > 0 && ` · ${parseResult.skippedRows} skipped (no name)`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelImport} className="border-gray-200 text-xs h-8">
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleConfirmImport}
                      disabled={uploading || parseResult.clients.length === 0}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 gap-1.5"
                    >
                      {uploading
                        ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                        : <><CheckCircle className="w-3.5 h-3.5" /> Confirm import</>
                      }
                    </Button>
                  </div>
                </div>

                {/* Preview table */}
                {pendingClients.length > 0 && (
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Preview — first {Math.min(5, pendingClients.length)} of {pendingClients.length} clients
                      </span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {pendingClients.slice(0, 5).map((c, i) => {
                        const status = clientStatus(c.last_visit_date);
                        const cfg = STATUS_CONFIG[status];
                        return (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                              {c.name[0]?.toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-semibold text-gray-900 truncate">{c.name}</div>
                              <div className="text-xs text-gray-400 truncate">
                                {[c.email, c.phone].filter(Boolean).join(' · ') || 'No contact info'}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 hidden sm:block">{formatDate(c.last_visit_date)}</div>
                            <Badge className={`${cfg.bg} ${cfg.color} border ${cfg.border} text-xs font-semibold`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`} />
                              {cfg.label}
                            </Badge>
                          </div>
                        );
                      })}
                      {pendingClients.length > 5 && (
                        <div className="px-4 py-2.5 text-xs text-gray-400 text-center">
                          + {pendingClients.length - 5} more clients
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {importError && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>

      {/* Fetch error banner */}
      {fetchError && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>Could not load clients: {fetchError}</span>
        </div>
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all',     label: 'All clients',   icon: Users,      count: totalCount },
          { key: 'active',  label: 'Active',         icon: UserCheck  },
          { key: 'lapsed',  label: 'Lapsed',         icon: UserX      },
          { key: 'unknown', label: 'No visit date',  icon: HelpCircle },
        ] as const).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm font-medium transition-all ${
              statusFilter === key
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search by name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 border-gray-200 bg-white"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Data table */}
      <Card className="border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <RefreshCw className="w-6 h-6 animate-spin mb-3 text-blue-400" />
            <p className="text-sm">Loading your clients...</p>
          </div>
        ) : totalCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-1">No clients yet</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-5">
              Import your first client list by uploading a CSV exported from Fresha, Square, or any booking platform.
            </p>
            <Button
              onClick={() => { setImportExpanded(true); }}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
              size="sm"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
          </div>
        ) : enriched.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 text-sm">
            <Search className="w-6 h-6 mb-2 text-gray-300" />
            No clients match your search or filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                    />
                  </th>
                  <th className="text-left px-4 py-3">
                    <button
                      onClick={() => toggleSort('name')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors"
                    >
                      Client <SortIcon field="name" active={sortField === 'name'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 hidden md:table-cell">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</span>
                  </th>
                  <th className="text-left px-4 py-3 hidden lg:table-cell">
                    <button
                      onClick={() => toggleSort('last_visit_date')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors"
                    >
                      Last Visit <SortIcon field="last_visit_date" active={sortField === 'last_visit_date'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3">
                    <button
                      onClick={() => toggleSort('status')}
                      className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hover:text-gray-800 transition-colors"
                    >
                      Status <SortIcon field="status" active={sortField === 'status'} dir={sortDir} />
                    </button>
                  </th>
                  <th className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Source</span>
                  </th>
                  <th className="w-10 px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {enriched.map((client) => {
                  const cfg = STATUS_CONFIG[client.status];
                  const isSelected = selected.has(client.id);
                  return (
                    <tr
                      key={client.id}
                      className={`group transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-gray-50/50'}`}
                    >
                      <td className="px-4 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelected((s) => {
                              const next = new Set(s);
                              isSelected ? next.delete(client.id) : next.add(client.id);
                              return next;
                            });
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3.5 cursor-pointer" onClick={() => handleRowClick(client)}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {client.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{client.name}</div>
                            <div className="md:hidden text-xs text-gray-400 mt-0.5">
                              {client.email || client.phone || 'No contact info'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell cursor-pointer" onClick={() => handleRowClick(client)}>
                        <div className="space-y-0.5">
                          {client.email && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                              <Mail className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[180px]">{client.email}</span>
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Phone className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              {client.phone}
                            </div>
                          )}
                          {!client.email && !client.phone && (
                            <span className="text-xs text-gray-300">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell cursor-pointer" onClick={() => handleRowClick(client)}>
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span>{formatDate(client.last_visit_date)}</span>
                        </div>
                        {client.daysSince !== null && (
                          <div className="text-xs text-gray-400 mt-0.5 ml-5">
                            {client.daysSince === 0 ? 'Today' : `${client.daysSince}d ago`}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 cursor-pointer" onClick={() => handleRowClick(client)}>
                        <Badge className={`${cfg.bg} ${cfg.color} border ${cfg.border} text-xs font-semibold`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`} />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-gray-400 capitalize">{client.source ?? 'csv'}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleEditClick(client); }}
                          className="text-gray-300 hover:text-blue-600 transition-colors p-1 rounded"
                          title="Edit client"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer with pagination */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs text-gray-400">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount} clients
                {selected.size > 0 && ` · ${selected.size} selected`}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs text-gray-500 px-2">
                  Page {page + 1} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Edit dialog */}
      <Dialog open={!!editClient} onOpenChange={(v) => !v && setEditClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-gray-900">Edit Client</DialogTitle>
            <DialogDescription>Update this client's details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Name</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                className="h-10 border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Email</Label>
              <Input
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="No email"
                className="h-10 border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="No phone"
                className="h-10 border-gray-200"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Last Visit Date</Label>
              <input
                type="date"
                value={editForm.last_visit_date}
                onChange={(e) => setEditForm((p) => ({ ...p, last_visit_date: e.target.value }))}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-700">Notes</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                placeholder="Add a note..."
                rows={3}
                className="border-gray-200 resize-none text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditClient(null)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={editSaving || !editForm.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail drawer */}
      <Sheet open={!!detailClient} onOpenChange={(v) => !v && setDetailClient(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="text-lg font-bold text-gray-900">Client Details</SheetTitle>
          </SheetHeader>
          {detailClient && (
            <div className="space-y-6 mt-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xl font-bold flex-shrink-0">
                  {detailClient.name[0]?.toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-gray-900 text-lg">{detailClient.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge className={`${STATUS_CONFIG[clientStatus(detailClient.last_visit_date)].bg} ${STATUS_CONFIG[clientStatus(detailClient.last_visit_date)].color} border ${STATUS_CONFIG[clientStatus(detailClient.last_visit_date)].border} text-xs font-semibold`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[clientStatus(detailClient.last_visit_date)].dot} mr-1.5 inline-block`} />
                      {STATUS_CONFIG[clientStatus(detailClient.last_visit_date)].label}
                    </Badge>
                    <span className="text-xs text-gray-400">
                      {daysSinceVisit(detailClient.last_visit_date) !== null
                        ? `${daysSinceVisit(detailClient.last_visit_date)}d since last visit`
                        : 'No visit date'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact</h4>
                {detailClient.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{detailClient.email}</span>
                  </div>
                )}
                {detailClient.phone && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{detailClient.phone}</span>
                  </div>
                )}
                {!detailClient.email && !detailClient.phone && (
                  <p className="text-sm text-gray-400">No contact info on file.</p>
                )}
              </div>

              {/* Visit info */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Visit History</h4>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>Last visit: {formatDate(detailClient.last_visit_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span className="text-xs">Added: {formatDate(detailClient.created_at)}</span>
                </div>
                {detailClient.source && (
                  <div className="text-xs text-gray-400 capitalize">Source: {detailClient.source}</div>
                )}
              </div>

              {/* Review status */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Review Status</h4>
                <div className="flex items-center gap-2">
                  <Star className={`w-4 h-4 ${detailClient.review_requested ? 'text-amber-500' : 'text-gray-300'}`} />
                  <span className="text-sm text-gray-700">
                    {detailClient.review_requested ? 'Review requested' : 'No review requested'}
                  </span>
                </div>
                {detailClient.review_completed && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm text-emerald-700">Review completed</span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {detailClient.notes && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{detailClient.notes}</p>
                </div>
              )}

              {/* Campaign history */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign History</h4>
                {detailLoading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading...
                  </div>
                ) : detailRecipients.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Repeat className="w-4 h-4" />
                    No campaigns sent to this client yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {detailRecipients.map((r) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-gray-800 truncate">{r.campaign_name}</div>
                          <div className="text-xs text-gray-400">{formatDateTime(r.sent_at)}</div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.opened && (
                            <Badge className="bg-blue-50 text-blue-700 border border-blue-100 text-xs">Opened</Badge>
                          )}
                          {r.converted && (
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs">Converted</Badge>
                          )}
                          {!r.opened && !r.converted && (
                            <Badge className="bg-gray-100 text-gray-500 border border-gray-200 text-xs">Sent</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Edit button */}
              <Button
                onClick={() => { handleEditClick(detailClient); setDetailClient(null); }}
                variant="outline"
                className="w-full gap-2"
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit client
              </Button>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
