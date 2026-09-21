'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  Zap,
  ArrowRight,
  CheckCircle,
  Menu,
  X,
  Sparkles,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Upload,
  Repeat,
  BarChart3,
  Mail,
  MessageSquare,
  Smartphone,
  Plug,
  Workflow,
  Send,
} from 'lucide-react';

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Nav */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'bg-white/95 backdrop-blur-sm shadow-sm border-b border-gray-100' : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <Brain className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PopbackAI</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How it works</a>
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#integrations" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Integrations</a>
              <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-gray-700 font-medium">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5">
                  Start free trial
                </Button>
              </Link>
            </div>

            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
            <a href="#how-it-works" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>How it works</a>
            <a href="#features" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#integrations" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Integrations</a>
            <a href="#pricing" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Pricing</a>
            <div className="pt-3 flex flex-col gap-2">
              <Link href="/login"><Button variant="outline" className="w-full">Log in</Button></Link>
              <Link href="/signup"><Button className="w-full bg-blue-600 hover:bg-blue-700">Start free trial</Button></Link>
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-44 lg:pb-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50 via-white to-white pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Copy */}
            <div className="text-center lg:text-left">
              <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-medium px-4 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                AI Retention Consultant
              </Badge>

              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6 text-balance">
                Your AI consultant
                <br />
                <span className="text-blue-600">wins back lost clients</span>
              </h1>

              <p className="text-xl text-gray-500 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed">
                Drop a CSV from Booksy, Mindbody, or Phorest. PopbackAI analyzes who's slipping away, builds a personalized win-back strategy, and writes the campaigns for you — all white-label, no POS switching required.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
                <Link href="/signup">
                  <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-13 text-base shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all">
                    Run your first analysis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </Link>
                <Link href="/login">
                  <Button size="lg" variant="outline" className="font-semibold px-8 h-13 text-base border-gray-200 hover:bg-gray-50">
                    Log in
                  </Button>
                </Link>
              </div>

              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
                {['No credit card required', 'Works with your existing POS', 'Cancel anytime'].map((item) => (
                  <div key={item} className="flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: AI Consultant mockup */}
            <div className="relative">
              <div className="rounded-2xl bg-white border border-gray-100 shadow-2xl shadow-gray-200 overflow-hidden">
                {/* Mockup header */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                    <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  </div>
                  <div className="flex items-center gap-1.5 ml-2">
                    <Brain className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-xs font-semibold text-gray-600">AI Consultant</span>
                  </div>
                </div>

                {/* Mockup body */}
                <div className="p-5 space-y-4">
                  {/* AI insight card */}
                  <div className="flex items-start gap-3 p-3.5 rounded-xl bg-blue-50 border border-blue-100">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-gray-900 mb-1">AI Analysis Complete</div>
                      <p className="text-xs text-gray-600 leading-relaxed">Analyzed 21 clients. Found 8 at-risk with £2,340 in recoverable revenue.</p>
                    </div>
                  </div>

                  {/* Strategy cards */}
                  <div className="space-y-2.5">
                    {[
                      { tier: 'High-Value At Risk', count: 3, revenue: '£1,890', priority: 'High', color: 'bg-orange-500' },
                      { tier: 'Slipping Away', count: 3, revenue: '£280', priority: 'High', color: 'bg-amber-500' },
                      { tier: 'Lapsed', count: 4, revenue: '£170', priority: 'Medium', color: 'bg-red-500' },
                    ].map((s) => (
                      <div key={s.tier} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
                        <span className={`w-2.5 h-2.5 rounded-full ${s.color} flex-shrink-0`} />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-gray-900">{s.tier}</div>
                          <div className="text-xs text-gray-400">{s.count} clients · ~{s.revenue}</div>
                        </div>
                        <Badge className="bg-red-50 text-red-700 border border-red-100 text-xs font-semibold">{s.priority}</Badge>
                      </div>
                    ))}
                  </div>

                  {/* Campaign preview */}
                  <div className="rounded-xl bg-gray-50 border border-gray-100 p-3.5">
                    <div className="flex items-center gap-1.5 mb-2">
                      <Mail className="w-3.5 h-3.5 text-blue-600" />
                      <span className="text-xs font-semibold text-gray-700">Email Preview</span>
                    </div>
                    <div className="text-xs text-gray-500 leading-relaxed">
                      "Hi <span className="font-semibold text-blue-600">James</span>, we've noticed it's been a while since your last <span className="font-semibold text-blue-600">Skin Fade</span> with <span className="font-semibold text-blue-600">Mike</span>..."
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 bg-white rounded-xl shadow-lg border border-gray-100 px-4 py-2.5 hidden sm:block">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <div>
                    <div className="text-sm font-bold text-gray-900">£2,340</div>
                    <div className="text-xs text-gray-400">recoverable</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* POS compatibility strip */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Works alongside your existing booking system</p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4">
            {['Booksy', 'Mindbody', 'Phorest', 'Fresha', 'Square'].map((pos) => (
              <span key={pos} className="text-gray-300 font-bold text-lg">{pos}</span>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-4">No switching required. Just export a CSV and drop it in.</p>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">How it works</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">From CSV to campaign in 3 steps</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">No technical knowledge needed. Your AI consultant does the heavy lifting.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Upload, title: 'Drop in your CSV', desc: 'Export your client list from Booksy, Mindbody, Phorest, or Fresha. PopbackAI auto-detects the columns — names, spend, services, staff, the lot.' },
              { step: '02', icon: Brain, title: 'AI analyzes & strategizes', desc: 'The AI consultant segments your clients by churn risk, identifies why they\'re lapsing, and builds a personalized win-back strategy for each group.' },
              { step: '03', icon: Send, title: 'Review & launch', desc: 'Edit the AI-generated email, SMS, or WhatsApp scripts if you want. Hit send — or copy-paste into Klaviyo, Twilio, or Mailchimp. Track results in real time.' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 h-full">
                <div className="text-5xl font-black text-blue-50 mb-4 select-none">{item.step}</div>
                <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center mb-4">
                  <item.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">Features</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">An intelligence layer for your business</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              PopbackAI doesn't replace your booking system — it makes it smarter. Here's what the AI consultant does for you.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI Strategy Generator', desc: 'Analyzes your client data and generates a custom retention strategy. Highlights why clients are lapsing — staff changes, service gaps, spending patterns.', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Users, title: 'Churn Segmentation', desc: 'Categorizes clients into tiers: Slipping Away, High-Value At Risk, Lapsed, and Lost. Each tier gets a different approach and offer.', color: 'text-amber-600', bg: 'bg-amber-50' },
              { icon: DollarSign, title: 'Recoverable Revenue', desc: 'Calculates exactly how much money you could recover from each at-risk segment, so you know where to focus first.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { icon: Mail, title: 'Multi-Channel Campaigns', desc: 'AI writes Email, SMS, and WhatsApp scripts tailored to each segment. 100% white-label — no third-party branding or ads in your copy.', color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: Target, title: 'Personalization Engine', desc: 'Dynamic tags like {{first_name}}, {{last_service}}, and {{favorite_barber}} make every message feel hand-written. Preview with real client data before sending.', color: 'text-orange-600', bg: 'bg-orange-50' },
              { icon: BarChart3, title: 'Conversion Tracking', desc: 'Track Sent, Opened, Clicked, and Re-booked metrics. ROI calculator shows revenue recovered vs. app cost.', color: 'text-emerald-600', bg: 'bg-emerald-50' },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group p-6 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className={`w-11 h-11 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5.5 h-5.5 ${feature.color}`} />
                </div>
                <h3 className="text-base font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations */}
      <section id="integrations" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">Integrations</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Export anywhere, send everywhere</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              PopbackAI writes the copy. You decide where it goes — copy-paste or automate.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Mail, name: 'Klaviyo', desc: 'Copy email scripts into your Klaviyo flows' },
              { icon: MessageSquare, name: 'Twilio', desc: 'Send SMS campaigns through your Twilio account' },
              { icon: Smartphone, name: 'WhatsApp', desc: 'Generate WhatsApp scripts for manual or API sending' },
              { icon: Workflow, name: 'Zapier & Webhooks', desc: 'Trigger automated sends via 5,000+ apps' },
            ].map((integration) => (
              <div key={integration.name} className="flex flex-col items-center text-center p-6 rounded-2xl border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all">
                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-4">
                  <integration.icon className="w-6 h-6 text-gray-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">{integration.name}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{integration.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">Pricing</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-500">Start free for 14 days. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                name: 'Starter',
                price: '£49',
                period: '/month',
                description: 'Perfect for solo operators and small studios',
                features: ['Up to 500 clients', 'AI Consultant analysis', 'Win-Back Campaigns', 'Email channel', 'Review Booster'],
                highlighted: false,
              },
              {
                name: 'Growth',
                price: '£99',
                period: '/month',
                description: 'For growing businesses ready to scale',
                features: ['Up to 2,000 clients', 'Everything in Starter', 'SMS + WhatsApp scripts', 'Advanced churn analytics', 'Zapier & Webhooks'],
                highlighted: true,
              },
              {
                name: 'Pro',
                price: '£199',
                period: '/month',
                description: 'For multi-location or high-volume businesses',
                features: ['Unlimited clients', 'Everything in Growth', 'Multi-location support', 'API access', 'Priority support'],
                highlighted: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-8 border-2 relative ${
                  plan.highlighted
                    ? 'border-blue-600 bg-blue-600 text-white shadow-2xl shadow-blue-200 scale-105'
                    : 'border-gray-100 bg-white'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <Badge className="bg-amber-400 text-amber-900 border-amber-300 font-semibold px-3">Most Popular</Badge>
                  </div>
                )}
                <div className={`text-sm font-semibold mb-1 ${plan.highlighted ? 'text-blue-200' : 'text-gray-500'}`}>{plan.name}</div>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className={`text-4xl font-black ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-blue-200' : 'text-gray-400'}`}>{plan.period}</span>
                </div>
                <p className={`text-sm mb-6 ${plan.highlighted ? 'text-blue-100' : 'text-gray-500'}`}>{plan.description}</p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlighted ? 'text-blue-200' : 'text-emerald-500'}`} />
                      <span className={plan.highlighted ? 'text-blue-50' : 'text-gray-700'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/signup">
                  <Button
                    className={`w-full font-semibold ${
                      plan.highlighted
                        ? 'bg-white text-blue-600 hover:bg-blue-50 border-0'
                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                    }`}
                  >
                    Start free trial
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-to-r from-slate-900 to-slate-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-6">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-4xl font-bold text-white mb-4">Let your AI consultant find your lost revenue</h2>
          <p className="text-xl text-gray-400 mb-10 max-w-xl mx-auto">
            Drop in a CSV and get a personalized retention strategy in under 60 seconds. No commitment, no credit card.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-gray-100 font-semibold px-8 shadow-lg gap-2">
              Run your first analysis
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center">
                <Brain className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">PopbackAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/support" className="hover:text-white transition-colors">Support</Link>
            </div>
            <div className="text-sm">© 2026 PopbackAI. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
