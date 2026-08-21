'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Zap,
  Users,
  Star,
  TrendingUp,
  ArrowRight,
  CheckCircle,
  BarChart3,
  Repeat,
  Menu,
  X,
  Sparkles,
  Clock,
  Shield,
  Upload,
} from 'lucide-react';

const features = [
  {
    icon: Repeat,
    title: 'Win-Back Campaigns',
    description: 'Automatically identify lapsed clients and send personalised AI-crafted messages that bring them back — without lifting a finger.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: Star,
    title: 'Review Booster',
    description: 'Turn happy clients into 5-star reviews. Smart follow-ups sent at exactly the right moment to maximise your Google rating.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
  },
  {
    icon: Users,
    title: 'Smart Client List',
    description: 'A unified view of every client — visit history, spend, risk of churn, and the best action to take next. All in one place.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: BarChart3,
    title: 'Revenue Analytics',
    description: 'See exactly how much revenue your campaigns are generating. Track retention rates, campaign ROI, and growth over time.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
];

const plans = [
  {
    name: 'Starter',
    price: '£49',
    period: '/month',
    description: 'Perfect for solo operators and small studios',
    features: ['Up to 500 clients', 'Win-Back Campaigns', 'Review Booster', 'Email support'],
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '£99',
    period: '/month',
    description: 'For growing businesses ready to scale',
    features: ['Up to 2,000 clients', 'Everything in Starter', 'Advanced analytics', 'SMS campaigns', 'Priority support'],
    highlighted: true,
  },
  {
    name: 'Pro',
    price: '£199',
    period: '/month',
    description: 'For multi-location or high-volume businesses',
    features: ['Unlimited clients', 'Everything in Growth', 'Multi-location', 'API access', 'Dedicated account manager'],
    highlighted: false,
  },
];

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
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">PopbackAI</span>
            </div>

            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How it works</a>
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
            <a href="#features" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#how-it-works" className="block text-sm font-medium text-gray-700 py-2" onClick={() => setMobileMenuOpen(false)}>How it works</a>
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
        <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-white to-white pointer-events-none" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-blue-100/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <Badge className="mb-6 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50 font-medium px-4 py-1.5">
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            AI-powered client retention
          </Badge>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-gray-900 leading-[1.08] mb-6 text-balance">
            Bring lapsed clients
            <br />
            <span className="text-blue-600">back through the door</span>
          </h1>

          <p className="text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed">
            PopbackAI automatically wins back clients who've stopped coming in, boosts your Google reviews, and gives you the insights to grow — built for salons, barbers, and aesthetic clinics.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link href="/signup">
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 h-13 text-base shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all">
                Start your free 14-day trial
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="font-semibold px-8 h-13 text-base border-gray-200 hover:bg-gray-50">
                Log in to your account
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            {['No credit card required', 'Setup in 2 minutes', 'Cancel anytime'].map((item) => (
              <div key={item} className="flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero image */}
        <div className="relative max-w-5xl mx-auto mt-20 px-4 sm:px-6 lg:px-8">
          <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-gray-200 border border-gray-100">
            <img
              src="https://images.pexels.com/photos/3993320/pexels-photo-3993320.jpeg?auto=compress&cs=tinysrgb&h=650&w=940"
              alt="Salon professional using PopbackAI"
              className="w-full h-[340px] object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/50 via-gray-900/10 to-transparent" />
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-14 bg-gray-900">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-8">Built for independent beauty &amp; wellness businesses</p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
            {['Hair Salons', 'Barber Studios', 'Aesthetic Clinics', 'Nail Studios', 'Brow & Lash', 'Massage & Wellness'].map((biz) => (
              <span key={biz} className="text-gray-300 font-medium text-base">{biz}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">Features</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything you need to grow</h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              One platform that handles client retention, review generation, and analytics — so you can focus on doing what you love.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group p-8 rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-lg transition-all duration-300 bg-white"
              >
                <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-5`}>
                  <feature.icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">How it works</Badge>
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Up and running in minutes</h2>
            <p className="text-lg text-gray-500 max-w-xl mx-auto">No complicated setup. No technical knowledge needed.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: Upload, title: 'Import your client list', desc: 'Upload a spreadsheet from your booking system. PopbackAI reads names, emails, and visit dates — nothing else required.' },
              { step: '02', icon: Sparkles, title: 'AI spots who to target', desc: "PopbackAI flags clients who haven't returned in a while and drafts a personalised re-engagement message for each one." },
              { step: '03', icon: TrendingUp, title: 'Launch and track results', desc: 'Send campaigns in one click and watch who comes back. Your dashboard shows opens, replies, and re-booked clients in real time.' },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl p-8 border border-gray-100 h-full">
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

      {/* Trust strip */}
      <section className="py-20 bg-white border-y border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            {[
              {
                icon: Shield,
                title: 'Your data stays yours',
                desc: 'We never sell or share your client data. It lives in your account and nowhere else.',
              },
              {
                icon: Clock,
                title: 'Two-minute setup',
                desc: 'Upload a CSV and you\'re ready to send your first campaign. No integrations, no IT department.',
              },
              {
                icon: CheckCircle,
                title: 'Cancel anytime',
                desc: 'No contracts, no lock-in. If it\'s not working for you, cancel with one click.',
              },
            ].map((item) => (
              <div key={item.title} className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-1">
                  <item.icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="font-bold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed max-w-xs">{item.desc}</p>
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
            {plans.map((plan) => (
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
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-white mb-4">Ready to win back your clients?</h2>
          <p className="text-xl text-blue-100 mb-10">
            Get started in two minutes. Import your client list and launch your first campaign today.
          </p>
          <Link href="/signup">
            <Button size="lg" className="bg-white text-blue-600 hover:bg-blue-50 font-semibold px-8 shadow-lg">
              Start free trial — no card needed
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">PopbackAI</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            <div className="text-sm">© 2025 PopbackAI. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}
