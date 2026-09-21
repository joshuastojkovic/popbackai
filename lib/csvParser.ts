export type ParsedClient = {
  name: string;
  email: string;
  phone: string;
  last_visit_date: string | null;
  lifetime_spend: number | null;
  preferred_service: string | null;
  preferred_staff: string | null;
};

export type ParseResult = {
  clients: ParsedClient[];
  warnings: string[];
  totalRows: number;
  skippedRows: number;
  detectedSource: string | null;
};

// Known column header aliases from Booksy, Mindbody, Phorest, Fresha, Square, and generic CSVs
const NAME_ALIASES = [
  'client name', 'customer name', 'full name', 'name', 'firstname', 'first name',
  'client', 'customer', 'contact name', 'guest name',
];
const EMAIL_ALIASES = [
  'email', 'email address', 'e-mail', 'client email', 'customer email',
];
const PHONE_ALIASES = [
  'phone', 'phone number', 'mobile', 'mobile number', 'telephone', 'tel',
  'cell', 'contact number', 'client phone', 'customer phone',
];
const DATE_ALIASES = [
  'last visit', 'last visit date', 'last appointment', 'last appointment date',
  'last seen', 'most recent visit', 'last booking', 'last booking date',
  'visit date', 'date of last visit', 'last service date',
];
const SPEND_ALIASES = [
  'lifetime spend', 'lifetime value', 'total spend', 'total revenue', 'total paid',
  'lifetime revenue', 'all time spend', 'total bookings value', 'revenue',
  'spend', 'customer value', 'ltv',
];
const SERVICE_ALIASES = [
  'preferred service', 'last service', 'service', 'most common service',
  'favourite service', 'favorite service', 'primary service', 'last treatment',
  'treatment', 'service type',
];
const STAFF_ALIASES = [
  'preferred staff', 'preferred barber', 'preferred stylist', 'preferred therapist',
  'last staff', 'staff member', 'barber', 'stylist', 'therapist', 'staff',
  'employee', 'professional', 'specialist', 'last booked with',
];

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(normalise(h)));
}

// Detect which POS system the CSV is from based on header patterns
function detectSource(headers: string[]): string | null {
  const norm = headers.map(normalise);
  if (norm.some(h => h.includes('booksy')) || norm.includes('booking id')) return 'booksy';
  if (norm.some(h => h.includes('mindbody')) || norm.includes('client id') || norm.includes('home location')) return 'mindbody';
  if (norm.some(h => h.includes('phorest')) || norm.includes('branch name')) return 'phorest';
  if (norm.some(h => h.includes('fresha')) || norm.includes('venue name')) return 'fresha';
  return null;
}

// Parse a CSV string safely (handles quoted fields with commas inside)
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((v) => v.trim());
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;

  // Try ISO first
  if (/^\d{4}-\d{2}-\d{2}/.test(cleaned)) {
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const d = new Date(`${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // MM/DD/YYYY
  const mdy = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (mdy) {
    const d = new Date(`${mdy[3]}-${mdy[1].padStart(2, '0')}-${mdy[2].padStart(2, '0')}`);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }

  // Natural language / JS Date fallback
  const d = new Date(cleaned);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];

  return null;
}

function parseSpend(raw: string): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^0-9.]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) ? null : val;
}

function cleanPhone(raw: string): string {
  if (!raw) return '';
  return raw.trim().replace(/[^\d+\s\-()]/g, '');
}

export function parseCSV(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { clients: [], warnings: ['The file appears to be empty or has no data rows.'], totalRows: 0, skippedRows: 0, detectedSource: null };
  }

  const headers = parseCSVLine(lines[0]);
  const detectedSource = detectSource(headers);

  const nameIdx    = findColumn(headers, NAME_ALIASES);
  const emailIdx   = findColumn(headers, EMAIL_ALIASES);
  const phoneIdx   = findColumn(headers, PHONE_ALIASES);
  const dateIdx    = findColumn(headers, DATE_ALIASES);
  const spendIdx   = findColumn(headers, SPEND_ALIASES);
  const serviceIdx = findColumn(headers, SERVICE_ALIASES);
  const staffIdx   = findColumn(headers, STAFF_ALIASES);

  if (nameIdx === -1) {
    warnings.push("Couldn't find a 'Client Name' column. Tried columns: " + NAME_ALIASES.slice(0, 4).join(', ') + ', etc.');
  }
  if (emailIdx === -1) warnings.push("No 'Email' column found — email will be left blank.");
  if (phoneIdx === -1) warnings.push("No 'Phone' column found — phone will be left blank.");
  if (dateIdx === -1)  warnings.push("No 'Last Visit Date' column found — status will show as unknown.");
  if (spendIdx === -1) warnings.push("No 'Lifetime Spend' column found — revenue analytics will be limited.");
  if (serviceIdx === -1) warnings.push("No 'Preferred Service' column found — service personalization will be limited.");
  if (staffIdx === -1) warnings.push("No 'Preferred Staff' column found — staff personalization will be limited.");

  if (detectedSource) {
    warnings.push(`Detected ${detectedSource.charAt(0).toUpperCase() + detectedSource.slice(1)} export format — columns auto-mapped.`);
  }

  const clients: ParsedClient[] = [];
  let skippedRows = 0;
  const dataLines = lines.slice(1);

  for (let i = 0; i < dataLines.length; i++) {
    const cols = parseCSVLine(dataLines[i]);
    const name = nameIdx !== -1 ? cols[nameIdx]?.trim() ?? '' : '';

    if (!name) {
      skippedRows++;
      continue;
    }

    clients.push({
      name,
      email: emailIdx !== -1 ? cols[emailIdx]?.trim() ?? '' : '',
      phone: phoneIdx !== -1 ? cleanPhone(cols[phoneIdx] ?? '') : '',
      last_visit_date: dateIdx !== -1 ? parseDate(cols[dateIdx] ?? '') : null,
      lifetime_spend: spendIdx !== -1 ? parseSpend(cols[spendIdx] ?? '') : null,
      preferred_service: serviceIdx !== -1 ? cols[serviceIdx]?.trim() ?? null : null,
      preferred_staff: staffIdx !== -1 ? cols[staffIdx]?.trim() ?? null : null,
    });
  }

  return {
    clients,
    warnings,
    totalRows: dataLines.length,
    skippedRows,
    detectedSource,
  };
}

export type ClientStatus = 'active' | 'lapsed' | 'unknown';

export function clientStatus(lastVisitDate: string | null): ClientStatus {
  if (!lastVisitDate) return 'unknown';
  const last = new Date(lastVisitDate);
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 60 ? 'active' : 'lapsed';
}

export type ChurnTier = 'active' | 'slipping_away' | 'high_value_at_risk' | 'lapsed' | 'lost';

export function computeChurnTier(
  lastVisitDate: string | null,
  lifetimeSpend: number | null,
  allClientsSpend: number[]
): ChurnTier {
  if (!lastVisitDate) return 'active';

  const days = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / 86400000);

  // Determine if this client is in the top 20% of spenders
  const sortedSpend = [...allClientsSpend].sort((a, b) => b - a);
  const top20Threshold = sortedSpend[Math.floor(sortedSpend.length * 0.2)] ?? 0;
  const isHighValue = (lifetimeSpend ?? 0) >= top20Threshold && (lifetimeSpend ?? 0) > 0;

  if (days >= 180) return 'lost';
  if (days >= 90) return 'lapsed';
  if (days >= 60 && isHighValue) return 'high_value_at_risk';
  if (days >= 30) return 'slipping_away';
  return 'active';
}

export function daysSinceVisit(lastVisitDate: string | null): number | null {
  if (!lastVisitDate) return null;
  const last = new Date(lastVisitDate);
  return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}

export const CHURN_TIER_CONFIG: Record<ChurnTier, { label: string; color: string; bg: string; border: string; dot: string; description: string }> = {
  active: {
    label: 'Active',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    dot: 'bg-emerald-500',
    description: 'Visited within the last 30 days',
  },
  slipping_away: {
    label: 'Slipping Away',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    dot: 'bg-amber-500',
    description: '30–60 days since last visit',
  },
  high_value_at_risk: {
    label: 'High-Value At Risk',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    dot: 'bg-orange-500',
    description: 'Top 20% spender, 60+ days since last visit',
  },
  lapsed: {
    label: 'Lapsed',
    color: 'text-red-700',
    bg: 'bg-red-50',
    border: 'border-red-200',
    dot: 'bg-red-500',
    description: '90–180 days since last visit',
  },
  lost: {
    label: 'Lost',
    color: 'text-gray-700',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    dot: 'bg-gray-500',
    description: '180+ days since last visit',
  },
};
