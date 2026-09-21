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
        channels = ['Email', 'SMS', 'WhatsApp'];
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
        channels = ['Email', 'SMS'];
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
        channels = ['Email', 'SMS', 'WhatsApp'];
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
        channels = ['Email', 'WhatsApp'];
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
