'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/dashboard': { title: 'Dashboard', subtitle: 'Overview of your business' },
  '/dashboard/clients': { title: 'Client List', subtitle: 'Manage and view all your clients' },
  '/dashboard/campaigns': { title: 'Win-Back Campaigns', subtitle: 'Re-engage lapsed clients' },
  '/dashboard/reviews': { title: 'Review Booster', subtitle: 'Grow your online reputation' },
  '/dashboard/settings': { title: 'Settings', subtitle: 'Manage your account and preferences' },
};

export default function TopBar() {
  const pathname = usePathname();
  const { profile } = useAuth();
  const page = pageTitles[pathname] ?? { title: 'Dashboard', subtitle: '' };

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-8 flex-shrink-0">
      <div className="lg:block hidden">
        <h1 className="text-lg font-bold text-gray-900 leading-none">{page.title}</h1>
        <p className="text-xs text-gray-400 mt-0.5">{page.subtitle}</p>
      </div>

      <div className="flex items-center gap-3 ml-auto">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold">
          {profile?.full_name?.[0]?.toUpperCase() ?? profile?.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
      </div>
    </header>
  );
}
