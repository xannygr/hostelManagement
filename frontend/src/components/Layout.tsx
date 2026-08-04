'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, Users, CreditCard, Settings, LayoutDashboard, MessageSquare, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Дашборд' },
  { to: '/hostels', icon: Building2, label: 'Хостелы' },
  { to: '/guests', icon: Users, label: 'Гости' },
  { to: '/payments', icon: CreditCard, label: 'Оплаты' },
  { to: '/sms', icon: MessageSquare, label: 'SMS' },
];

function NavLink({ to, end, icon: Icon, label }: { to: string; end?: boolean; icon: React.ComponentType<{ size?: number }>; label: string }) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      href={to}
      className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        isActive
          ? 'bg-white/15 text-white shadow-lg shadow-black/20'
          : 'text-white/60 hover:bg-white/8 hover:text-white'
      }`}
    >
      <Icon size={20} />
      {label}
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-[#1e1b4b] text-white flex flex-col fixed h-screen">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold tracking-tight">HostelHaven</h1>
          <p className="text-sm text-white/50 mt-1">Управление хостелами</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} icon={icon} label={label} />
          ))}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1">
          <div className="px-4 py-2 text-xs text-white/40 truncate">{user?.username}</div>
          <NavLink to="/settings" icon={Settings} label="Настройки" />
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all"
          >
            <LogOut size={20} />
            Выйти
          </button>
        </div>
      </aside>

      <main className="flex-1 ml-64 min-w-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
}
