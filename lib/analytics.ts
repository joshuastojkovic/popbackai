import { ChurnTier, CHURN_TIER_CONFIG, daysSinceVisit } from './csvParser';

export type AnalyticsClient = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  last_visit_date: string | null;
  lifetime_spend: number | null;
  preferred_service: string | null;
  preferred_staff: string | null;
  churn_tier: string | null;
  review_requested: boolean;
  review_completed: boolean;
};

export type ChurnSegment = {
  tier: ChurnTier;
  count: number;
  totalSpend: number;
  estimatedRecoverable: number;
  clients: AnalyticsClient[];
};

export type AiStrategy = {
  id: string;
  tier: ChurnTier;
  title: string;
  priority: 'high' | 'medium' | 'low';
  clientCount: number;
  estimatedRevenue: string;
  insight: string;
  recommendation: string;
  offer: string;
  channels: string[];
  suggestedSubject: string;
  suggestedBody: string;
  suggestedSms: string;
  suggestedWhatsapp: string;
  whyExplanation: string;
};

const TIER_ORDER: ChurnTier[] = ['high_value_at_risk', 'slipping_away', 'lapsed', 'lost', 'active'];

export function computeChurnSegments(clients: AnalyticsClient[]): ChurnSegment[] {
  const spendValues = clients.map(c => c.lifetime_spend ?? 0);
  const sortedSpend = [...spendValues].sort((a, b) => b - a);
  const top20Threshold = sortedSpend[Math.floor(sortedSpend.length * 0.2)] ?? 0;

  const segments: Record<ChurnTier, ChurnSegment> = {
    active: { tier: 'active', count: 0, totalSpend: 0, estimatedRecoverable: 0, clients: [] },
    slipping_away: { tier: 'slipping_away', count: 0, totalSpend: 0, estimatedRecoverable: 0, clients: [] },
    high_value_at_risk: { tier: 'high_value_at_risk', count: 0, totalSpend: 0, estimatedRecoverable: 0, clients: [] },
    lapsed: { tier: 'lapsed', count: 0, totalSpend: 0, estimatedRecoverable: 0, clients: [] },
    lost: { tier: 'lost', count: 0, totalSpend: 0, estimatedRecoverable: 0, clients: [] },
  };

  for (const client of clients) {
    const days = daysSinceVisit(client.last_visit_date);
    const spend = client.lifetime_spend ?? 0;
    const isHighValue = spend >= top20Threshold && spend > 0;

    let tier: ChurnTier = 'active';
    if (!client.last_visit_date || days === null) {
      tier = 'active';
    } else if (days >= 180) {
      tier = 'lost';
    } else if (days >= 90) {
      tier = 'lapsed';
    } else if (days >= 60 && isHighValue) {
      tier = 'high_value_at_risk';
    } else if (days >= 30) {
      tier = 'slipping_away';
    }

    const seg = segments[tier];
    seg.count++;
    seg.totalSpend += spend;
    seg.clients.push({ ...client, churn_tier: tier });
  }

  // Recovery rates by tier
  const recoveryRates: Record<ChurnTier, number> = {
    active: 0,
    slipping_away: 0.35,
    high_value_at_risk: 0.28,
    lapsed: 0.18,
    lost: 0.10,
  };

  for (const tier of TIER_ORDER) {
    const seg = segments[tier];
    const avgSpend = seg.count > 0 ? seg.totalSpend / seg.count : 0;
    seg.estimatedRecoverable = Math.round(seg.count * avgSpend * recoveryRates[tier]);
  }

  return TIER_ORDER.map(t => segments[t]).filter(s => s.count > 0);
}

export function buildAiStrategies(clients: AnalyticsClient[], businessName: string): AiStrategy[] {
  const segments = computeChurnSegments(clients);
  const strategies: AiStrategy[] = [];

  for (const seg of segments) {
    if (seg.tier === 'active' || seg.count === 0) continue;

    const config = CHURN_TIER_CONFIG[seg.tier];
    const avgSpend = seg.totalSpend / seg.count;

    let priority: 'high' | 'medium' | 'low' = 'medium';
    let title = '';
    let insight = '';
    let recommendation = '';
    let offer = '';
    let channels: string[] = ['Email'];
    let suggestedSubject = '';
    let suggestedBody = '';
    let suggestedSms = '';
    let suggestedWhatsapp = '';
    let whyExplanation = '';

    // Analyze staff patterns
    const staffMap = new Map<string, number>();
    for (const c of seg.clients) {
      if (c.preferred_staff) staffMap.set(c.preferred_staff, (staffMap.get(c.preferred_staff) ?? 0) + 1);
    }
    const topStaff = Array.from(staffMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const staffInsight = topStaff && topStaff[1] > 1
      ? `${Math.round((topStaff[1] / seg.count) * 100)}% of these clients last saw ${topStaff[0]} — consider whether staff changes affect retention.`
      : '';

    // Analyze service patterns
    const serviceMap = new Map<string, number>();
    for (const c of seg.clients) {
      if (c.preferred_service) serviceMap.set(c.preferred_service, (serviceMap.get(c.preferred_service) ?? 0) + 1);
    }
    const topService = Array.from(serviceMap.entries()).sort((a, b) => b[1] - a[1])[0];
    const serviceInsight = topService && topService[1] > 1
      ? `${topService[0]} is the most common service among this group.`
      : '';

    switch (seg.tier) {
      case 'high_value_at_risk':
        priority = 'high';
        title = 'High-Value Client Recovery';
        insight = `${seg.count} top-tier clients (avg spend £${avgSpend.toFixed(0)}) haven't visited in 60+ days. ${staffInsight} These are your most profitable relationships — losing them has the highest revenue impact.`;
        recommendation = 'Reach out personally with a premium offer. A complimentary upgrade or priority booking makes them feel valued and addresses the gap before they switch to a competitor.';
        offer = 'Complimentary upgrade on next visit + priority booking';
        channels = ['Email'];
        whyExplanation = `These ${seg.count} clients are in your top 20% by lifetime spend (avg £${avgSpend.toFixed(0)}), but haven't visited in 60+ days. ${staffInsight ? staffInsight + ' ' : ''}Historically, high-value clients who lapse 60+ days have only a 28% recovery rate without intervention — but a premium, personalised offer lifts that to over 50%. The estimated recoverable revenue is £${seg.estimatedRecoverable.toLocaleString()}.`;
        suggestedSubject = `A special invitation from ${businessName}`;
        suggestedBody = `Hi {{first_name}},\n\nWe've noticed it's been a little while since your last visit, and we'd love to welcome you back.\n\nAs one of our most valued clients, we'd like to offer you a complimentary upgrade on your next appointment${topService ? ` — perhaps another ${topService[0].toLowerCase()}` : ''}${topStaff && topStaff[0] ? ` with ${topStaff[0]}` : ''}.\n\nSimply reply to this email or book online and mention this offer. We have priority slots available this week.\n\nWe can't wait to see you again.\n\n${businessName}`;
        suggestedSms = `Hi {{first_name}}, it's ${businessName}. We'd love to see you again! Enjoy a complimentary upgrade on your next visit${topStaff && topStaff[0] ? ` with ${topStaff[0]}` : ''}. Reply to book. See you soon!`;
        suggestedWhatsapp = `Hi {{first_name}}! 👋 It's ${businessName} here. We've missed seeing you! We'd love to treat you to a complimentary upgrade on your next visit${topService ? ` — your ${topService[0].toLowerCase()} is waiting` : ''}. Tap here to book: [booking link]`;
        break;

      case 'slipping_away':
        priority = 'high';
        title = 'Early Intervention Nudge';
        insight = `${seg.count} clients are 30–60 days overdue — the sweet spot where a gentle reminder has the highest conversion rate. ${serviceInsight} Acting now prevents them from sliding into full lapse.`;
        recommendation = 'Send a friendly, low-friction reminder with an easy booking link. No discount needed yet — these clients just need a nudge while their habit is still recent.';
        offer = 'Friendly reminder (no discount needed)';
        channels = ['Email'];
        whyExplanation = `These ${seg.count} clients are 30–60 days past their typical visit interval. At this stage, a simple reminder has a 35% re-booking rate — the highest of any segment. ${serviceInsight ? serviceInsight + ' ' : ''}No discount is needed because the habit hasn't fully lapsed yet. Waiting another 30 days drops recovery rates to 18%, so timing is critical here.`;
        suggestedSubject = `Time for your next visit, {{first_name}}?`;
        suggestedBody = `Hi {{first_name}},\n\nJust a friendly reminder that it might be time for your next appointment${topService ? ` — your last ${topService[0].toLowerCase()} was a while ago` : ''}.\n\nWe have availability this week${topStaff && topStaff[0] ? ` with ${topStaff[0]}` : ''}. Book online or give us a call — it only takes a minute.\n\nSee you soon!\n\n${businessName}`;
        suggestedSms = `Hi {{first_name}}, ${businessName} here! It's been a while — time for your next visit? Book here: [booking link]`;
        suggestedWhatsapp = `Hi {{first_name}}! ${businessName} here. It's been a little while since we last saw you. We've got slots open this week${topStaff && topStaff[0] ? ` with ${topStaff[0]}` : ''}. Tap to book: [booking link]`;
        break;

      case 'lapsed':
        priority = 'medium';
        title = 'Win-Back with Incentive';
        insight = `${seg.count} clients haven't visited in 3–6 months. ${staffInsight} At this stage, a discount or incentive is needed to overcome the inertia of switching elsewhere.`;
        recommendation = 'Offer a time-limited discount (15%) to create urgency. Pair with a clear call-to-action and a deadline to drive re-booking within 30 days.';
        offer = '15% off next visit (valid 30 days)';
        channels = ['Email'];
        whyExplanation = `These ${seg.count} clients haven't visited in 90–180 days. ${staffInsight ? staffInsight + ' ' : ''}At this stage, a bare reminder only converts at ~8%, but adding a 15% discount with a 30-day deadline lifts conversion to ~18%. The time limit creates urgency — without it, clients file the email away and forget. Estimated recoverable: £${seg.estimatedRecoverable.toLocaleString()}.`;
        suggestedSubject = `We miss you, {{first_name}} — here's 15% off`;
        suggestedBody = `Hi {{first_name}},\n\nIt's been a while since your last visit and we'd love to welcome you back.\n\nAs a valued client, we'd like to offer you 15% off your next appointment${topService ? ` — whether it's a ${topService[0].toLowerCase()} or something new` : ''}. Simply mention this email when you book.\n\nThis offer is valid for 30 days — book now to claim it.\n\nWe look forward to seeing you.\n\n${businessName}`;
        suggestedSms = `Hi {{first_name}}, we miss you at ${businessName}! Enjoy 15% off your next visit. Reply to book — offer valid 30 days. See you soon!`;
        suggestedWhatsapp = `Hi {{first_name}}! 👋 We've missed you at ${businessName}. We'd love to welcome you back with 15% off your next visit${topService ? ` — your ${topService[0].toLowerCase()} is calling` : ''}. Valid for 30 days. Tap to book: [booking link]`;
        break;

      case 'lost':
        priority = 'low';
        title = 'Bold Recovery Campaign';
        insight = `${seg.count} clients haven't visited in 6+ months. These relationships are at the highest risk of permanent loss. A bold, generous offer is the best chance to recover them.`;
        recommendation = 'Lead with a strong, no-conditions offer (20% off or a free add-on). Keep the message warm and personal — acknowledge the gap and make returning frictionless.';
        offer = '20% off + free add-on (valid 60 days)';
        channels = ['Email'];
        whyExplanation = `These ${seg.count} clients haven't visited in 180+ days — the hardest group to recover. Without intervention, only ~5% return naturally. A bold 20% off + free add-on offer lifts that to ~10%. The longer validity (60 days) accounts for the fact that these clients need more time to be ready to return. Estimated recoverable: £${seg.estimatedRecoverable.toLocaleString()}.`;
        suggestedSubject = `We'd love to have you back, {{first_name}}`;
        suggestedBody = `Hi {{first_name}},\n\nWe know it's been a while, and we've genuinely missed you.\n\nAs a special welcome back, we're offering 20% off your next appointment plus a complimentary add-on of your choice${topService ? ` — whether you'd like your usual ${topService[0].toLowerCase()} or something new` : ''}.\n\nNo conditions, no catch — just our way of saying we're glad you're back. This offer is valid for 60 days.\n\nBook online or reply to this email — we'll take care of the rest.\n\n${businessName}`;
        suggestedSms = `Hi {{first_name}}, it's ${businessName}. We'd love to have you back! 20% off + free add-on on your next visit. Reply to book — valid 60 days.`;
        suggestedWhatsapp = `Hi {{first_name}}! 👋 It's ${businessName}. It's been too long! We'd love to welcome you back with 20% off your next visit + a free add-on. No catch, just good to have you back. Valid 60 days. Tap to book: [booking link]`;
        break;

      default:
        continue;
    }

    strategies.push({
      id: seg.tier,
      tier: seg.tier,
      title,
      priority,
      clientCount: seg.count,
      estimatedRevenue: `£${seg.estimatedRecoverable.toLocaleString()}`,
      insight,
      recommendation,
      offer,
      channels,
      suggestedSubject,
      suggestedBody,
      suggestedSms,
      suggestedWhatsapp,
      whyExplanation,
    });
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  strategies.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return strategies;
}

export function totalRecoverableRevenue(segments: ChurnSegment[]): number {
  return segments.reduce((sum, s) => sum + s.estimatedRecoverable, 0);
}

export function applyPersonalization(
  text: string,
  client: { name: string; preferred_service: string | null; preferred_staff: string | null; last_visit_date: string | null }
): string {
  const firstName = client.name.split(' ')[0] ?? client.name;
  const days = daysSinceVisit(client.last_visit_date);
  return text
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{last_service\}\}/g, client.preferred_service ?? 'your appointment')
    .replace(/\{\{favorite_barber\}\}/g, client.preferred_staff ?? 'our team')
    .replace(/\{\{days_since_visit\}\}/g, days !== null ? String(days) : 'a while')
    .replace(/\[Name\]/g, firstName);
}

// ── Open-ended AI Chatbot query engine ───────────────────────────────────────

export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  id: string;
  // Optional: context for follow-up queries (e.g., last filtered client list)
  context?: { lastFilteredClients?: AnalyticsClient[]; lastIntent?: string };
};

const PROMPT_CHIPS = [
  'Show my top 5 VIP lapsed clients',
  'Which clients spent over £100 but haven\'t visited in 60 days?',
  'Which barber has the highest lost client rate?',
  'Calculate average visit interval',
  'Draft a quick SMS for clients who only get beard trims',
];

export { PROMPT_CHIPS };

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

function fmtDate(iso: string | null): string {
  if (!iso) return 'unknown';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function extractNumber(query: string, patterns: RegExp[]): number | null {
  for (const p of patterns) {
    const m = query.match(p);
    if (m && m[1]) {
      const n = parseInt(m[1].replace(/[,£]/g, ''), 10);
      if (!isNaN(n)) return n;
    }
  }
  return null;
}

function extractDays(query: string): number | null {
  // "haven't visited in 60 days", "lapsed 90 days", "in 3 months", "6 months"
  const dayMatch = query.match(/(\d+)\s*day/i);
  if (dayMatch) return parseInt(dayMatch[1], 10);

  const monthMatch = query.match(/(\d+)\s*month/i);
  if (monthMatch) return parseInt(monthMatch[1], 10) * 30;

  const weekMatch = query.match(/(\d+)\s*week/i);
  if (weekMatch) return parseInt(weekMatch[1], 10) * 7;

  // "over a year", "over 1 year"
  const yearMatch = query.match(/(\d+)\s*year/i);
  if (yearMatch) return parseInt(yearMatch[1], 10) * 365;

  return null;
}

function extractStaffName(query: string, clients: AnalyticsClient[]): string | null {
  const staffNames = new Set<string>();
  for (const c of clients) {
    if (c.preferred_staff) staffNames.add(c.preferred_staff);
  }
  if (staffNames.size === 0) return null;
  const q = query.toLowerCase();
  for (const name of Array.from(staffNames)) {
    if (q.includes(name.toLowerCase())) return name;
  }
  // Also check for partial first name matches
  for (const name of Array.from(staffNames)) {
    const parts = name.toLowerCase().split(/\s+/);
    for (const part of parts) {
      if (part.length > 3 && q.includes(part)) return name;
    }
  }
  return null;
}

function extractServiceName(query: string, clients: AnalyticsClient[]): string | null {
  const serviceNames = new Set<string>();
  for (const c of clients) {
    if (c.preferred_service) serviceNames.add(c.preferred_service);
  }
  if (serviceNames.size === 0) return null;
  const q = query.toLowerCase();
  for (const name of Array.from(serviceNames)) {
    if (q.includes(name.toLowerCase())) return name;
  }
  // Partial match
  for (const name of Array.from(serviceNames)) {
    const lower = name.toLowerCase();
    if (q.includes(lower.substring(0, Math.min(5, lower.length)))) return name;
  }
  return null;
}

function isLapsed(c: AnalyticsClient, minDays: number): boolean {
  const days = daysSinceVisit(c.last_visit_date);
  return days !== null && days >= minDays;
}

// ── Main query engine ────────────────────────────────────────────────────────

export function answerClientQuery(
  query: string,
  clients: AnalyticsClient[],
  history?: ChatMessage[]
): ChatMessage {
  const q = query.toLowerCase().trim();
  const lastAssistant = history?.filter(m => m.role === 'assistant').pop();
  const lastContext = lastAssistant?.context;
  let contextClients: AnalyticsClient[] | undefined;
  let intent = '';

  // ── Intent: Draft SMS / message for a specific service ──
  if (q.match(/draft.*sms|write.*sms|create.*sms|draft.*message|write.*message|draft.*whatsapp/) || q.match(/quick.*sms/)) {
    intent = 'draft_sms';
    const serviceName = extractServiceName(query, clients);
    const targetService = serviceName ?? (q.includes('beard') ? 'Beard Trim' : null);

    if (targetService) {
      const matching = clients.filter(c => c.preferred_service?.toLowerCase().includes(targetService.toLowerCase()));
      if (matching.length === 0) {
        return { role: 'assistant', id: uid(), content: `I couldn't find any clients who get ${targetService}. Make sure your CSV has a 'Preferred Service' column with this value.` };
      }
      const lapsedMatching = matching.filter(c => isLapsed(c, 60));
      const sms = `Hi {{first_name}}, it's your favourite barbershop! 👋 Time for your ${targetService.toLowerCase()}? We've got slots this week. Tap here to book: [link]`;
      return {
        role: 'assistant',
        id: uid(),
        content: `Here's a quick SMS draft for clients who get **${targetService}** (${matching.length} clients, ${lapsedMatching.length} currently lapsed 60+ days):\n\n---\n${sms}\n---\n\nWant me to create a campaign with this message? Just say "create a campaign for these clients".`,
        context: { lastFilteredClients: matching, lastIntent: intent },
      };
    }
    // Generic SMS draft
    const sms = `Hi {{first_name}}, we miss you at our shop! 👋 Time for your next visit? We've got slots open this week. Tap to book: [link]`;
    return {
      role: 'assistant',
      id: uid(),
      content: `Here's a general win-back SMS draft:\n\n---\n${sms}\n---\n\nYou can personalise this by specifying a service (e.g., "Draft an SMS for clients who get haircuts").`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: Create campaign from last filtered clients ──
  if (q.match(/create.*campaign|make.*campaign|build.*campaign|launch.*campaign/) && lastContext?.lastFilteredClients) {
    intent = 'create_campaign';
    const targetClients = lastContext.lastFilteredClients;
    return {
      role: 'assistant',
      id: uid(),
      content: `I can create a campaign targeting those ${targetClients.length} clients. Go to the **Campaigns** page and click "New Campaign" — I'll pre-fill the targeting for you.\n\nAlternatively, I can save it as a draft right now if you say "save as draft". The target segment will be set to match these ${targetClients.length} clients' churn profile.`,
      context: { lastFilteredClients: targetClients, lastIntent: intent },
    };
  }

  // ── Intent: Clients who spent over X but haven't visited in Y days ──
  if ((q.includes('spent') || q.includes('spend')) && (q.includes('not visited') || q.includes("haven't visited") || q.includes('lapsed') || q.includes('overdue') || q.includes("haven't been"))) {
    intent = 'spend_and_lapse';
    const minSpend = extractNumber(q, [/spent over £?(\d+)/i, /spend.{0,10}£?(\d+)/i, /over £?(\d+)/i, /more than £?(\d+)/i]) ?? 0;
    const minDays = extractDays(query) ?? 60;

    const matching = clients.filter(c => {
      const spend = c.lifetime_spend ?? 0;
      const days = daysSinceVisit(c.last_visit_date);
      return spend > minSpend && days !== null && days >= minDays;
    });

    if (matching.length === 0) {
      return { role: 'assistant', id: uid(), content: `No clients found who spent over £${minSpend} and haven't visited in ${minDays}+ days. Try adjusting your thresholds.` };
    }

    const lines = matching
      .sort((a, b) => (b.lifetime_spend ?? 0) - (a.lifetime_spend ?? 0))
      .slice(0, 10)
      .map((c, i) => `${i + 1}. **${c.name}** — £${(c.lifetime_spend ?? 0).toLocaleString()} spend, last visited ${fmtDate(c.last_visit_date)} (${daysSinceVisit(c.last_visit_date)} days ago)${c.preferred_staff ? `, saw ${c.preferred_staff}` : ''}`);

    return {
      role: 'assistant',
      id: uid(),
      content: `Found **${matching.length} clients** who spent over £${minSpend} and haven't visited in ${minDays}+ days:\n\n${lines.join('\n')}${matching.length > 10 ? `\n\n...and ${matching.length - 10} more.` : ''}\n\nTotal spend from these clients: £${matching.reduce((s, c) => s + (c.lifetime_spend ?? 0), 0).toLocaleString()}\n\nWant me to create a campaign for them? Just say "create a campaign for these clients".`,
      context: { lastFilteredClients: matching, lastIntent: intent },
    };
  }

  // ── Intent: Most loyal client of a specific barber who lapsed ──
  if ((q.includes('loyal') || q.includes('best') || q.includes('top') || q.includes('vip')) && (q.includes('lapsed') || q.includes('lost') || q.includes("haven't") || q.includes('churn'))) {
    intent = 'loyal_lapsed';
    const staffName = extractStaffName(query, clients);
    const minDays = extractDays(query) ?? 60;

    let pool = clients.filter(c => isLapsed(c, minDays));
    if (staffName) {
      pool = pool.filter(c => c.preferred_staff?.toLowerCase() === staffName.toLowerCase());
    }

    if (pool.length === 0) {
      return { role: 'assistant', id: uid(), content: staffName
        ? `No lapsed clients found for ${staffName}. Try a different staff member or time range.`
        : `No lapsed clients found. Try importing more client data.` };
    }

    const sorted = pool.sort((a, b) => (b.lifetime_spend ?? 0) - (a.lifetime_spend ?? 0));
    const top = sorted.slice(0, 5);
    const lines = top.map((c, i) => `${i + 1}. **${c.name}** — £${(c.lifetime_spend ?? 0).toLocaleString()} lifetime spend, last visited ${fmtDate(c.last_visit_date)}${c.preferred_staff ? `, saw ${c.preferred_staff}` : ''}${c.preferred_service ? `, ${c.preferred_service}` : ''}`);

    return {
      role: 'assistant',
      id: uid(),
      content: `Here are your top ${top.length} highest-value lapsed clients${staffName ? ` who saw ${staffName}` : ''} (${minDays}+ days):\n\n${lines.join('\n')}\n\n${staffName ? `${staffName} has ${pool.length} total lapsed clients.` : `You have ${pool.length} total lapsed clients.`} These represent £${top.reduce((s, c) => s + (c.lifetime_spend ?? 0), 0).toLocaleString()} in lifetime spend.\n\nWant me to create a campaign for them?`,
      context: { lastFilteredClients: sorted, lastIntent: intent },
    };
  }

  // ── Intent: Average visit interval ──
  if (q.match(/average.*visit.*interval|visit.*frequency|how often.*visit|average.*between.*visit/)) {
    intent = 'avg_interval';
    const withDates = clients.filter(c => c.last_visit_date);
    if (withDates.length === 0) {
      return { role: 'assistant', id: uid(), content: "I don't have visit date data yet. Import a CSV with a 'Last Visit Date' column." };
    }
    // Estimate average interval from first to last visit — but we only have last_visit_date
    // So we'll estimate based on the distribution of days since last visit
    const now = Date.now();
    const daysSince = withDates.map(c => {
      const d = c.last_visit_date ? Math.floor((now - new Date(c.last_visit_date).getTime()) / 86400000) : 0;
      return d;
    });
    const avgDays = Math.round(daysSince.reduce((a, b) => a + b, 0) / daysSince.length);
    const median = [...daysSince].sort((a, b) => a - b)[Math.floor(daysSince.length / 2)];

    return {
      role: 'assistant',
      id: uid(),
      content: `Based on your ${withDates.length} clients with visit dates:\n\n• Average days since last visit: **${avgDays} days** (~${Math.round(avgDays / 7)} weeks)\n• Median: **${median} days**\n• Shortest gap: ${Math.min(...daysSince)} days\n• Longest gap: ${Math.max(...daysSince)} days\n\nThis suggests your clients typically visit every ~${Math.round(avgDays / 7)} weeks. Clients past this interval are candidates for a reminder campaign.`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: Top N VIP lapsed clients ──
  if (q.match(/top.*vip|vip.*lapsed|top.*lapsed|top.*lost|lost.*top|biggest.*spend.*lost|highest.*value.*lost/) || q.match(/top \d+.*lost|top \d+.*lapsed/)) {
    intent = 'top_vip_lapsed';
    const n = extractNumber(q, [/top (\d+)/i, /top (\d+)/i]) ?? 5;
    const minDays = extractDays(query) ?? 60;

    const lapsed = clients
      .filter(c => c.lifetime_spend && c.lifetime_spend > 0 && isLapsed(c, minDays))
      .sort((a, b) => (b.lifetime_spend ?? 0) - (a.lifetime_spend ?? 0))
      .slice(0, n);

    if (lapsed.length === 0) {
      return { role: 'assistant', id: uid(), content: `No clients with spend data found who are lapsed ${minDays}+ days. Import a CSV with 'Lifetime Spend' and 'Last Visit Date' columns.` };
    }

    const lines = lapsed.map((c, i) => `${i + 1}. **${c.name}** — £${(c.lifetime_spend ?? 0).toLocaleString()} lifetime spend, last visited ${fmtDate(c.last_visit_date)} (${daysSinceVisit(c.last_visit_date)} days ago)${c.preferred_staff ? `, saw ${c.preferred_staff}` : ''}${c.preferred_service ? `, ${c.preferred_service}` : ''}`);

    return {
      role: 'assistant',
      id: uid(),
      content: `Here are your top ${lapsed.length} highest-value lapsed clients (${minDays}+ days):\n\n${lines.join('\n')}\n\nTotal recoverable spend: £${lapsed.reduce((s, c) => s + (c.lifetime_spend ?? 0), 0).toLocaleString()}\n\nWant me to create a campaign for them? Just say "create a campaign for these clients".`,
      context: { lastFilteredClients: lapsed, lastIntent: intent },
    };
  }

  // ── Intent: Churn rate ──
  if (q.match(/churn rate|average churn|retention rate|overall.*churn/)) {
    intent = 'churn_rate';
    const segments = computeChurnSegments(clients);
    const atRisk = segments.filter(s => s.tier !== 'active').reduce((sum, s) => sum + s.count, 0);
    const rate = clients.length > 0 ? Math.round((atRisk / clients.length) * 100) : 0;
    const active = clients.length - atRisk;
    const breakdown = segments.filter(s => s.tier !== 'active').map(s => `• ${CHURN_TIER_CONFIG[s.tier].label}: ${s.count}`).join('\n');
    return {
      role: 'assistant',
      id: uid(),
      content: `Your current churn rate is **${rate}%** — ${atRisk} out of ${clients.length} clients are at-risk or lapsed.\n\n• Active: ${active} (${100 - rate}%)\n• At-risk/lapsed: ${atRisk} (${rate}%)\n\n${breakdown}\n\n${rate > 30 ? 'This is above the industry average of ~25% for service businesses. I\'d recommend prioritising the Slipping Away and High-Value At Risk segments.' : 'This is within a healthy range. Keep monitoring with regular check-ins.'}`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: Staff/barber lost client rate ──
  if (q.match(/barber|staff|stylist|therapist.*lost|which.*staff|staff.*rate|barber.*rate/)) {
    intent = 'staff_rate';
    const staffName = extractStaffName(query, clients);
    const staffMap = new Map<string, { total: number; lost: number; lapsedSpend: number }>();
    for (const c of clients) {
      if (!c.preferred_staff) continue;
      const entry = staffMap.get(c.preferred_staff) ?? { total: 0, lost: 0, lapsedSpend: 0 };
      entry.total++;
      if (isLapsed(c, 60)) {
        entry.lost++;
        entry.lapsedSpend += c.lifetime_spend ?? 0;
      }
      staffMap.set(c.preferred_staff, entry);
    }
    if (staffMap.size === 0) {
      return { role: 'assistant', id: uid(), content: "I don't have staff data for your clients yet. Import a CSV with a 'Preferred Staff' or 'Barber' column and I'll be able to break this down." };
    }
    const sorted = Array.from(staffMap.entries()).sort((a, b) => {
      const rateA = a[1].total > 0 ? a[1].lost / a[1].total : 0;
      const rateB = b[1].total > 0 ? b[1].lost / b[1].total : 0;
      return rateB - rateA;
    });
    const lines = sorted.map(([name, data]) => {
      const rate = data.total > 0 ? Math.round((data.lost / data.total) * 100) : 0;
      return `• **${name}**: ${data.lost}/${data.total} clients lost (${rate}%) — £${data.lapsedSpend.toLocaleString()} at risk`;
    });

    let extra = '';
    if (staffName && staffMap.has(staffName)) {
      const data = staffMap.get(staffName)!;
      extra = `\n\nSpecifically for **${staffName}**: ${data.lost} of ${data.total} clients have lapsed (60+ days), representing £${data.lapsedSpend.toLocaleString()} in lifetime spend.`;
    }

    return {
      role: 'assistant',
      id: uid(),
      content: `Here's the lost client rate by staff member:\n\n${lines.join('\n')}${extra}\n\n${sorted[0] && sorted[0][1].lost / sorted[0][1].total > 0.3 ? `**${sorted[0][0]}** has the highest loss rate. This could indicate a scheduling issue, a change in availability, or client satisfaction concerns.` : 'Loss rates are relatively even across your team.'}`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: Recoverable revenue ──
  if (q.match(/recover.*revenue|how much.*recover|recoverable|revenue.*recover|how much.*lost/)) {
    intent = 'recoverable';
    const segments = computeChurnSegments(clients);
    const total = totalRecoverableRevenue(segments);
    const breakdown = segments
      .filter(s => s.estimatedRecoverable > 0)
      .map(s => `• ${CHURN_TIER_CONFIG[s.tier].label}: £${s.estimatedRecoverable.toLocaleString()} (${s.count} clients)`)
      .join('\n');
    return {
      role: 'assistant',
      id: uid(),
      content: `Your total estimated recoverable revenue is **£${total.toLocaleString()}**.\n\n${breakdown}\n\nThis is based on historical recovery rates for each churn tier. The High-Value At Risk segment offers the best ROI per client reached.`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: Service lapsed rate ──
  if (q.match(/service.*lapsed|lapsed.*service|which.*service|service.*churn|service.*lost/)) {
    intent = 'service_lapsed';
    const serviceName = extractServiceName(query, clients);
    const serviceMap = new Map<string, { total: number; lapsed: number; lapsedSpend: number }>();
    for (const c of clients) {
      if (!c.preferred_service) continue;
      const entry = serviceMap.get(c.preferred_service) ?? { total: 0, lapsed: 0, lapsedSpend: 0 };
      entry.total++;
      if (isLapsed(c, 60)) {
        entry.lapsed++;
        entry.lapsedSpend += c.lifetime_spend ?? 0;
      }
      serviceMap.set(c.preferred_service, entry);
    }
    if (serviceMap.size === 0) {
      return { role: 'assistant', id: uid(), content: "I don't have service data for your clients yet. Import a CSV with a 'Preferred Service' or 'Last Service' column." };
    }
    const sorted = Array.from(serviceMap.entries()).sort((a, b) => b[1].lapsed - a[1].lapsed);
    const lines = sorted.map(([service, data]) => `• **${service}**: ${data.lapsed}/${data.total} lapsed (${data.total > 0 ? Math.round((data.lapsed / data.total) * 100) : 0}%) — £${data.lapsedSpend.toLocaleString()} at risk`);

    let extra = '';
    if (serviceName && serviceMap.has(serviceName)) {
      const data = serviceMap.get(serviceName)!;
      const matching = clients.filter(c => c.preferred_service?.toLowerCase() === serviceName.toLowerCase() && isLapsed(c, 60));
      extra = `\n\nSpecifically for **${serviceName}**: ${data.lapsed} of ${data.total} clients have lapsed, representing £${data.lapsedSpend.toLocaleString()} in lifetime spend.`;
      return {
        role: 'assistant',
        id: uid(),
        content: `Here's the lapsed rate by service:\n\n${lines.join('\n')}${extra}\n\nI found ${matching.length} lapsed clients who get ${serviceName}. Want me to draft a message for them?`,
        context: { lastFilteredClients: matching, lastIntent: intent },
      };
    }

    return {
      role: 'assistant',
      id: uid(),
      content: `Here's the lapsed rate by service:\n\n${lines.join('\n')}\n\n${sorted[0] && sorted[0][1].lapsed > 0 ? `**${sorted[0][0]}** has the most lapsed clients. Consider a targeted campaign for this service.` : 'No significant service-level churn patterns detected.'}`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: How many at-risk ──
  if (q.match(/how many.*at.risk|at.risk.*how many|at risk count|how many.*lapsed/)) {
    intent = 'at_risk_count';
    const segments = computeChurnSegments(clients);
    const atRisk = segments.filter(s => s.tier !== 'active').reduce((sum, s) => sum + s.count, 0);
    const breakdown = segments.filter(s => s.tier !== 'active').map(s => `• ${CHURN_TIER_CONFIG[s.tier].label}: ${s.count}`).join('\n');
    return {
      role: 'assistant',
      id: uid(),
      content: `You have **${atRisk} at-risk clients** out of ${clients.length} total.\n\n${breakdown}\n\nVisit the AI Consultant page to get personalised win-back strategies for each segment.`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: List all clients / show me everyone ──
  if (q.match(/list.*all|show.*all|everyone|all.*clients|how many.*client/)) {
    intent = 'list_all';
    const allSegments = computeChurnSegments(clients);
    return {
      role: 'assistant',
      id: uid(),
      content: `You have **${clients.length} clients** in total.\n\n${allSegments.map(s => `• ${CHURN_TIER_CONFIG[s.tier].label}: ${s.count}`).join('\n')}\n\nYou can see the full list on the Clients page. Ask me to filter by spend, days lapsed, staff, or service for a more targeted view.`,
      context: { lastIntent: intent },
    };
  }

  // ── Intent: Greeting / help ──
  if (q.match(/^(hi|hello|hey|help|what can you|what do you)/)) {
    intent = 'help';
    return {
      role: 'assistant',
      id: uid(),
      content: `Hi! I'm your AI Retention Consultant. I've analyzed your ${clients.length} clients. I can answer questions like:\n\n• "Which clients spent over £100 but haven't visited in 60 days?"\n• "Show my top 5 VIP lapsed clients"\n• "Which barber has the highest lost client rate?"\n• "How much revenue can I recover?"\n• "Draft a quick SMS for clients who only get beard trims"\n• "Calculate average visit interval"\n\nAsk me anything about your client data, or try a suggested prompt below.`,
      context: { lastIntent: intent },
    };
  }

  // ── Fallback: try to extract any filter criteria and show results ──
  const minSpend = extractNumber(q, [/spent over £?(\d+)/i, /spend.{0,10}£?(\d+)/i, /over £?(\d+)/i, /more than £?(\d+)/i]);
  const minDays = extractDays(query);
  const staffName = extractStaffName(query, clients);
  const serviceName = extractServiceName(query, clients);

  if (minSpend !== null || minDays !== null || staffName || serviceName) {
    intent = 'filtered';
    let matching = [...clients];
    if (minSpend !== null) matching = matching.filter(c => (c.lifetime_spend ?? 0) > minSpend);
    if (minDays !== null) matching = matching.filter(c => isLapsed(c, minDays));
    if (staffName) matching = matching.filter(c => c.preferred_staff?.toLowerCase() === staffName.toLowerCase());
    if (serviceName) matching = matching.filter(c => c.preferred_service?.toLowerCase() === serviceName.toLowerCase());

    if (matching.length === 0) {
      return { role: 'assistant', id: uid(), content: `No clients match those criteria. Try widening your filters — for example, a lower spend threshold or fewer days.` };
    }

    const lines = matching
      .sort((a, b) => (b.lifetime_spend ?? 0) - (a.lifetime_spend ?? 0))
      .slice(0, 10)
      .map((c, i) => `${i + 1}. **${c.name}** — £${(c.lifetime_spend ?? 0).toLocaleString()} spend, last visited ${fmtDate(c.last_visit_date)}${c.preferred_staff ? `, ${c.preferred_staff}` : ''}${c.preferred_service ? `, ${c.preferred_service}` : ''}`);

    const filters: string[] = [];
    if (minSpend !== null) filters.push(`spend > £${minSpend}`);
    if (minDays !== null) filters.push(`${minDays}+ days lapsed`);
    if (staffName) filters.push(`staff: ${staffName}`);
    if (serviceName) filters.push(`service: ${serviceName}`);

    return {
      role: 'assistant',
      id: uid(),
      content: `Found **${matching.length} clients** matching: ${filters.join(', ')}\n\n${lines.join('\n')}${matching.length > 10 ? `\n\n...and ${matching.length - 10} more.` : ''}\n\nWant me to create a campaign for these clients?`,
      context: { lastFilteredClients: matching, lastIntent: intent },
    };
  }

  // ── Default fallback ──
  return {
    role: 'assistant',
    id: uid(),
    content: `I'm not sure how to answer that yet, but I'm learning! I can answer questions about:\n\n• **Client filtering** — "Which clients spent over £100 but haven't visited in 60 days?"\n• **VIP lapsed** — "Show my top 5 VIP lapsed clients"\n• **Staff analysis** — "Which barber has the highest lost client rate?"\n• **Revenue** — "How much revenue can I recover?"\n• **Service insights** — "Which service has the most lapsed clients?"\n• **Message drafting** — "Draft a quick SMS for clients who only get beard trims"\n• **Visit patterns** — "Calculate average visit interval"\n\nTry one of these, or ask your own question using similar phrasing.`,
    context: { lastIntent: 'fallback' },
  };
}
