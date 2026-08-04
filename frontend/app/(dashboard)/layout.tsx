'use client';

import type { ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Layout from '@/components/Layout';
import Login from '@/views/Login';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const { loading, error, refetch } = useData();

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Загрузка данных...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-gray-50 p-8">
        <p className="text-red-500 font-medium text-center">{error}</p>
        <button onClick={refetch} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
          Повторить
        </button>
      </div>
    );
  }

  return <Layout>{children}</Layout>;
}
