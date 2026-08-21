'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { parseCSV, clientStatus, daysSinceVisit, ParsedClient, ParseResult } from '@/lib/csvParser';
import CSVDropZone from '@/components/dashboard/CSVDropZone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from 'lucide-react';

type Client = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  last_visit_date: string | null;
  source: string | null;
  created_at: string;
};

type SortField = 'name' | 'last_visit_date' | 'status';
type SortDir = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'lapsed' | 'unknown';

// ── helpers ──────────────────────────────────────────────────────────────────

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

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
  return dir === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-blue-600" />
    : <ChevronDown className="w-3.5 h-3.5 text-blue-600" />;
}

// ── main component ────────────────────────────────────────────────────────────

export default function ClientListPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [pendingClients, setPendingClients] = useState<ParsedClient[]>([]);
  const [importSuccess, setImportSuccess] = useState<{ count: number } | null>(null);
  const [importError, setImportError] = useState('');
  const [showUploadPanel, setShowUploadPanel] = useState(false);

  // table state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('last_visit_date');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // ── data fetching ──────────────────────────────────────────────────────────

  const fetchClients = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clients')
      .select('id, name, email, phone, last_visit_date, source, created_at')
      .order('created_at', { ascending: false });
    if (!error && data) setClients(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // ── CSV handling ───────────────────────────────────────────────────────────

  const handleFileParsed = (text: string, _filename: string) => {
    const result = parseCSV(text);
    setParseResult(result);
    setPendingClients(result.clients);
    setImportError('');
    setImportSuccess(null);
  };

  const handleConfirmImport = async () => {
    if (pendingClients.length === 0) return;
    setUploading(true);
    setImportError('');

    const rows = pendingClients.map((c) => ({
      name: c.name,
      email: c.email || null,
      phone: c.phone || null,
      last_visit_date: c.last_visit_date || null,
      source: 'csv',
    }));

    // batch in chunks of 500 to avoid payload limits
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

    setImportSuccess({ count: totalInserted });
    setPendingClients([]);
    setParseResult(null);
    setShowUploadPanel(false);
    await fetchClients();
    setUploading(false);
  };

  const handleCancelImport = () => {
    setPendingClients([]);
    setParseResult(null);
  };

  // ── delete ─────────────────────────────────────────────────────────────────

  const handleDeleteSelected = async () => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const { error } = await supabase.from('clients').delete().in('id', ids);
    if (!error) {
      setClients((prev) => prev.filter((c) => !ids.includes(c.id)));
      setSelected(new Set());
    }
  };

  // ── sort ───────────────────────────────────────────────────────────────────

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // ── derived data ───────────────────────────────────────────────────────────

  const enriched = clients.map((c) => ({
    ...c,
    status: clientStatus(c.last_visit_date),
    daysSince: daysSinceVisit(c.last_visit_date),
  }));

  const filtered = enriched
    .filter((c) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q);
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else {
        const da = a.last_visit_date ?? '';
        const db = b.last_visit_date ?? '';
        cmp = da < db ? -1 : da > db ? 1 : 0;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const counts = {
    all: enriched.length,
    active: enriched.filter((c) => c.status === 'active').length,
    lapsed: enriched.filter((c) => c.status === 'lapsed').length,
    unknown: enriched.filter((c) => c.status === 'unknown').length,
  };

  const allSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelected((s) => { const next = new Set(s); filtered.forEach((c) => next.delete(c.id)); return next; });
    } else {
      setSelected((s) => { const next = new Set(s); filtered.forEach((c) => next.add(c.id)); return next; });
    }
  };

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-screen-xl">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Client List</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {loading ? 'Loading...' : `${counts.all} clients · ${counts.lapsed} lapsed · ${counts.active} active`}
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
            size="sm"
            onClick={() => { setShowUploadPanel((v) => !v); setParseResult(null); setPendingClients([]); }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </Button>
        </div>
      </div>

      {/* Import success toast */}
      {importSuccess && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-medium">
          <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{importSuccess.count} clients imported successfully.</span>
          <button onClick={() => setImportSuccess(null)} className="ml-auto text-emerald-400 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload panel */}
      {showUploadPanel && (
        <Card className="border-blue-100 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-gray-900">Import Clients from CSV</CardTitle>
                <p className="text-xs text-gray-400 mt-0.5">
                  Supports exports from Fresha, Square, and any standard CSV format
                </p>
              </div>
              <button onClick={() => { setShowUploadPanel(false); setParseResult(null); setPendingClients([]); }}
                className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
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
                      <Users className="w-4.5 h-4.5 text-blue-600 w-5 h-5" />
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
      )}

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {([
          { key: 'all',     label: 'All clients',   icon: Users,      count: counts.all },
          { key: 'active',  label: 'Active',         icon: UserCheck,  count: counts.active },
          { key: 'lapsed',  label: 'Lapsed',         icon: UserX,      count: counts.lapsed },
          { key: 'unknown', label: 'No visit date',  icon: HelpCircle, count: counts.unknown },
        ] as const).map(({ key, label, icon: Icon, count }) => (
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
            <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${
              statusFilter === key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
            }`}>
              {count}
            </span>
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
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-8">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-base font-bold text-gray-700 mb-1">No clients yet</h3>
            <p className="text-sm text-gray-400 max-w-xs mb-5">
              Import your first client list by uploading a CSV exported from Fresha, Square, or any booking platform.
            </p>
            <Button
              onClick={() => setShowUploadPanel(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1.5"
              size="sm"
            >
              <Upload className="w-4 h-4" /> Import CSV
            </Button>
          </div>
        ) : filtered.length === 0 ? (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((client) => {
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
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                            {client.name[0]?.toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-sm">{client.name}</div>
                            {/* Mobile contact line */}
                            <div className="md:hidden text-xs text-gray-400 mt-0.5">
                              {client.email || client.phone || 'No contact info'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
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
                      <td className="px-4 py-3.5 hidden lg:table-cell">
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
                      <td className="px-4 py-3.5">
                        <Badge className={`${cfg.bg} ${cfg.color} border ${cfg.border} text-xs font-semibold`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1.5 inline-block`} />
                          {cfg.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className="text-xs text-gray-400 capitalize">{client.source ?? 'csv'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Table footer */}
            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs text-gray-400">
                Showing {filtered.length} of {clients.length} clients
                {selected.size > 0 && ` · ${selected.size} selected`}
              </span>
              <span className="text-xs text-gray-400">
                Active: 60 days · Lapsed: &gt;60 days
              </span>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
