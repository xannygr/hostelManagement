'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Building2, Users, CreditCard, Settings, LayoutDashboard, MessageSquare, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

function NavLink({ to, end, icon: Icon, label, onClick }: { to: string; end?: boolean; icon: React.ComponentType<{ size?: number }>; label: string; onClick?: () => void }) {
  const pathname = usePathname();
  const isActive = end ? pathname === to : pathname.startsWith(to);

  return (
    <Link
      href={to}
      onClick={onClick}
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
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('Дашборд') },
    { to: '/hostels', icon: Building2, label: t('Хостелы') },
    { to: '/guests', icon: Users, label: t('Гости') },
    { to: '/payments', icon: CreditCard, label: t('Оплаты') },
    { to: '/sms', icon: MessageSquare, label: 'SMS' },
  ];

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">HostelHaven</h1>
        <p className="text-sm text-white/50 mt-1">{t('Управление хостелами')}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ to, icon, label }) => (
          <NavLink key={to} to={to} end={to === '/'} icon={icon} label={label} onClick={closeMenu} />
        ))}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-1">
        <div className="px-4 py-2 text-xs text-white/40 truncate">{user?.username}</div>
        <NavLink to="/settings" icon={Settings} label={t('Настройки')} onClick={closeMenu} />
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-white/60 hover:bg-white/8 hover:text-white transition-all"
        >
          <LogOut size={20} />
          {t('Выйти')}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      <header className="lg:hidden sticky top-0 z-40 bg-[#1e1b4b] text-white flex items-center gap-3 px-4 py-3 shadow-lg">
        <button onClick={() => setMenuOpen(true)} aria-label={t('Открыть меню')} className="p-2 -ml-2 rounded-lg hover:bg-white/10 transition-colors">
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold tracking-tight">HostelHaven</h1>
        <span className="ml-auto text-xs text-white/50 truncate max-w-[40%]">{user?.username}</span>
        <button onClick={logout} aria-label={t('Выйти')} className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70">
          <LogOut size={20} />
        </button>
      </header>

      <aside className="hidden lg:flex w-64 bg-[#1e1b4b] text-white flex-col fixed h-screen">
        {sidebarContent}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeMenu} />
          <aside className="absolute left-0 top-0 h-full w-72 max-w-[85vw] bg-[#1e1b4b] text-white flex flex-col shadow-2xl">
            <button onClick={closeMenu} aria-label={t('Закрыть меню')} className="absolute top-4 right-4 p-2 rounded-lg hover:bg-white/10 transition-colors text-white/70">
              <X size={20} />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      <main className="lg:ml-64 min-w-0 overflow-x-hidden pb-8 lg:pb-0">
        {children}
      </main>
    </div>
  );
}
