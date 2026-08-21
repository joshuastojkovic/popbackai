export type ParsedClient = {
  name: string;
  email: string;
  phone: string;
  last_visit_date: string | null;
};

export type ParseResult = {
  clients: ParsedClient[];
  warnings: string[];
  totalRows: number;
  skippedRows: number;
};

// Known column header aliases from Fresha, Square, and generic CSVs
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

function normalise(s: string) {
  return s.trim().toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ');
}

function findColumn(headers: string[], aliases: string[]): number {
  return headers.findIndex((h) => aliases.includes(normalise(h)));
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

function cleanPhone(raw: string): string {
  if (!raw) return '';
  // Keep digits, +, spaces, hyphens, parens
  return raw.trim().replace(/[^\d+\s\-()]/g, '');
}

export function parseCSV(text: string): ParseResult {
  const warnings: string[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { clients: [], warnings: ['The file appears to be empty or has no data rows.'], totalRows: 0, skippedRows: 0 };
  }

  const headers = parseCSVLine(lines[0]);

  const nameIdx   = findColumn(headers, NAME_ALIASES);
  const emailIdx  = findColumn(headers, EMAIL_ALIASES);
  const phoneIdx  = findColumn(headers, PHONE_ALIASES);
  const dateIdx   = findColumn(headers, DATE_ALIASES);

  if (nameIdx === -1) {
    warnings.push("Couldn't find a 'Client Name' column. Tried columns: " + NAME_ALIASES.slice(0, 4).join(', ') + ', etc.');
  }
  if (emailIdx === -1) warnings.push("No 'Email' column found — email will be left blank.");
  if (phoneIdx === -1) warnings.push("No 'Phone' column found — phone will be left blank.");
  if (dateIdx === -1)  warnings.push("No 'Last Visit Date' column found — status will show as unknown.");

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
    });
  }

  return {
    clients,
    warnings,
    totalRows: dataLines.length,
    skippedRows,
  };
}

export function clientStatus(lastVisitDate: string | null): 'active' | 'lapsed' | 'unknown' {
  if (!lastVisitDate) return 'unknown';
  const last = new Date(lastVisitDate);
  const diffDays = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= 60 ? 'active' : 'lapsed';
}

export function daysSinceVisit(lastVisitDate: string | null): number | null {
  if (!lastVisitDate) return null;
  const last = new Date(lastVisitDate);
  return Math.floor((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
}
