import { useState } from 'react';
import { Search, Phone, Send } from 'lucide-react';
import Link from 'next/link';
import { useData } from '../context/DataContext';
import Legend from '../components/Legend';

export default function AllPayments() {
  const { payments, rooms, guests } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const filtered = payments.filter(p => {
    const matchesSearch = p.guestName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const smsSentCount = payments.filter(p => p.status === 'overdue' && p.smsSent).length;

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Платежи</h1>
        <p className="text-gray-500 mt-1">Все платежи в хостелах</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-400 mb-1">Оплачено</p>
          <p className="text-2xl font-bold text-emerald-600">{totalPaid.toLocaleString()} zl</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-400 mb-1">Ожидает</p>
          <p className="text-2xl font-bold text-amber-500">{totalPending.toLocaleString()} zl</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-400 mb-1">Просрочено</p>
          <p className="text-2xl font-bold text-red-500">{totalOverdue.toLocaleString()} zl</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <p className="text-sm text-gray-400 mb-1">SMS отправлены</p>
          <p className="text-2xl font-bold text-blue-600">{smsSentCount}</p>
        </div>
      </div>

      <Legend
        className="mb-6"
        items={[
          { label: 'Оплачено', color: 'bg-emerald-500' },
          { label: 'Ожидает', color: 'bg-amber-500' },
          { label: 'Просрочено', color: 'bg-red-500' },
          { label: 'SMS отправлено', color: 'bg-blue-500' },
        ]}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input type="text" placeholder="Поиск по имени гостя..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-wrap">
          {[
            { key: 'all', label: 'Все' },
            { key: 'paid', label: 'Оплачено' },
            { key: 'pending', label: 'Ожидает' },
            { key: 'overdue', label: 'Просрочено' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-4 py-2.5 text-sm font-medium transition-colors ${statusFilter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-wrap">
          {[
            { key: 'all', label: 'Все' },
            { key: 'cash', label: 'Наличные' },
            { key: 'card', label: 'Карта' },
            { key: 'transfer', label: 'Перевод' },
          ].map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)} className={`px-4 py-2.5 text-sm font-medium transition-colors ${typeFilter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-6 py-3 font-medium text-gray-400">Гость</th>
              <th className="px-6 py-3 font-medium text-gray-400">Номер</th>
              <th className="px-6 py-3 font-medium text-gray-400">Сумма</th>
              <th className="px-6 py-3 font-medium text-gray-400">Срок</th>
              <th className="px-6 py-3 font-medium text-gray-400">Оплачено</th>
              <th className="px-6 py-3 font-medium text-gray-400">Тип</th>
              <th className="px-6 py-3 font-medium text-gray-400">Статус</th>
              <th className="px-6 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(payment => {
              const guest = guests.find(g => g.id === payment.guestId);
              return (
              <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/guest/${payment.guestId}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate">
                      {payment.guestName}
                    </Link>
                    {guest && (
                      <a
                        href={`tel:${guest.phone.replace(/\s/g, '')}`}
                        onClick={e => e.stopPropagation()}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 ${
                          payment.status === 'overdue'
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 opacity-0 group-hover:opacity-100'
                        }`}
                        title={`Позвонить: ${guest.phone}`}
                      >
                        <Phone size={13} />
                      </a>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-500">{rooms.find(r => r.id === payment.roomId)?.number}</td>
                <td className="px-6 py-4 font-semibold text-gray-900">{payment.amount.toLocaleString()} zl</td>
                <td className="px-6 py-4 text-gray-500 text-xs">{payment.dueDate}</td>
                <td className="px-6 py-4 text-gray-400 text-xs">{payment.paidDate || '-'}</td>
                <td className="px-6 py-4 text-gray-500">{payment.type === 'card' ? 'Карта' : payment.type === 'cash' ? 'Наличные' : 'Перевод'}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                      payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {payment.status === 'paid' ? 'Оплачено' : payment.status === 'pending' ? 'Ожидает' : 'Просрочено'}
                    </span>
                    {payment.smsSent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                        <Send size={9} />
                        SMS
                      </span>
                    )}
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
