'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Repeat,
  Star,
  Settings,
  Zap,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/clients', label: 'Client List', icon: Users },
  { href: '/dashboard/campaigns', label: 'Win-Back Campaigns', icon: Repeat },
  { href: '/dashboard/reviews', label: 'Review Booster', icon: Star },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0', collapsed ? 'justify-center' : 'justify-between')}>
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
            <Zap className="w-4 h-4 text-white" />
          </div>
          {!collapsed && <span className="text-white font-bold text-lg truncate">PopbackAI</span>}
        </div>
        {!collapsed && (
          <button
            onClick={() => setCollapsed(true)}
            className="text-white/40 hover:text-white/80 transition-colors p-1 rounded hidden lg:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group',
                isActive
                  ? 'bg-white/15 text-white'
                  : 'text-white/60 hover:bg-white/8 hover:text-white/90',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('flex-shrink-0 transition-colors', isActive ? 'w-5 h-5' : 'w-5 h-5')} />
              {!collapsed && (
                <span className="font-medium text-sm truncate">{item.label}</span>
              )}
              {isActive && !collapsed && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User / Sign out */}
      <div className="px-3 pb-4 border-t border-white/10 pt-3 flex-shrink-0">
        {!collapsed && profile && (
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-500/30 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {profile.full_name?.[0]?.toUpperCase() ?? profile.email?.[0]?.toUpperCase() ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-white text-xs font-semibold truncate">{profile.full_name ?? 'Your account'}</div>
              <div className="text-white/50 text-xs truncate">{profile.business_name ?? profile.email}</div>
            </div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className={cn(
            'flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all w-full',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Sign out' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm font-medium">Sign out</span>}
        </button>
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center justify-center px-2 py-2.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all w-full mt-1"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 w-9 h-9 rounded-lg bg-gray-900 text-white flex items-center justify-center shadow-md"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="relative w-64 bg-[#0f172a] flex flex-col">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-white/50 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden lg:flex flex-col bg-[#0f172a] transition-all duration-300 ease-in-out flex-shrink-0',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
