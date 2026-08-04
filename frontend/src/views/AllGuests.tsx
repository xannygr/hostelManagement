import { useState } from 'react';
import { Search, Phone, Filter } from 'lucide-react';
import Link from 'next/link';
import { useData } from '../context/DataContext';
import { guestTotalPaid, guestTotalDue } from '../utils/helpers';
import Legend from '../components/Legend';

export default function AllGuests() {
  const { guests, rooms, hostels, payments } = useData();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');

  const filtered = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const paid = guestTotalPaid(g.id, payments);
    const due = guestTotalDue(g.id, payments);
    const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? due <= 0 : paymentFilter === 'unpaid' ? payments.some(p => p.guestId === g.id && p.status !== 'paid') : payments.some(p => p.guestId === g.id && p.status === 'overdue'));
    const matchesMin = minAmount === '' || paid >= Number(minAmount);
    const matchesMax = maxAmount === '' || paid <= Number(maxAmount);
    return matchesSearch && matchesStatus && matchesPayment && matchesMin && matchesMax;
  });

  return (
    <div className="p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Все гости</h1>
          <p className="text-gray-500 mt-1">{guests.length} гостей во всех хостелах</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input type="text" placeholder="Поиск по имени или телефону..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Сумма зл:</span>
          <input type="number" placeholder="min" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-gray-300">—</span>
          <input type="number" placeholder="max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter size={14} className="text-gray-400" />
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-wrap">
          {[
            { key: 'all', label: 'Все' },
            { key: 'active', label: 'Активные' },
            { key: 'checked_out', label: 'Выселенные' },
            { key: 'reserved', label: 'Забронированные' },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-4 py-2 text-sm font-medium transition-colors ${statusFilter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-wrap">
          {[
            { key: 'all', label: 'Оплата: все' },
            { key: 'paid', label: 'Оплатили' },
            { key: 'unpaid', label: 'Не оплатили' },
            { key: 'debt', label: 'Должники' },
          ].map(f => (
            <button key={f.key} onClick={() => setPaymentFilter(f.key)} className={`px-4 py-2 text-sm font-medium transition-colors ${paymentFilter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <Legend
        className="mb-6"
        items={[
          { label: 'Активный', color: 'bg-emerald-500' },
          { label: 'Забронирован', color: 'bg-amber-500' },
          { label: 'Выселен', color: 'bg-gray-400' },
          { label: 'Долг', color: 'bg-red-500' },
        ]}
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">Гости не найдены</div>
      ) : (
        <>
          <div className="block lg:hidden space-y-2">
            {filtered.map(guest => {
              const room = rooms.find(r => r.id === guest.roomId);
              const hostel = hostels.find(h => h.id === guest.hostelId);
              return (
                <Link key={guest.id} href={`/guest/${guest.id}`} className="flex items-center justify-between p-3 rounded-xl bg-white border border-gray-100 hover:bg-indigo-50 hover:border-indigo-200 transition-colors group">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-600' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                      {guest.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate text-sm">{guest.name}</p>
                      <p className="text-xs text-gray-400 truncate">{hostel?.name} · Ном. {room?.number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-xs font-medium ${guest.totalDue > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {guest.totalDue > 0 ? `-${guest.totalDue.toLocaleString()}` : `${guest.totalPaid.toLocaleString()} zl`}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-700' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {guest.status === 'active' ? 'Активный' : guest.status === 'reserved' ? 'Бронь' : 'Выселен'}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        window.location.href = `tel:${guest.phone.replace(/\s/g, '')}`;
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors shrink-0"
                      title={`Позвонить: ${guest.phone}`}
                    >
                      <Phone size={14} />
                    </button>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 font-medium text-gray-400">Гость</th>
                  <th className="px-6 py-3 font-medium text-gray-400">Хостел / Номер</th>
                  <th className="px-6 py-3 font-medium text-gray-400">Срок</th>
                  <th className="px-6 py-3 font-medium text-gray-400 text-right">Сумма</th>
                  <th className="px-6 py-3 font-medium text-gray-400 text-right">Статус</th>
                  <th className="px-6 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(guest => {
                  const room = rooms.find(r => r.id === guest.roomId);
                  const hostel = hostels.find(h => h.id === guest.hostelId);
                  return (
                    <tr key={guest.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/guest/${guest.id}`}>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-600' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                            {guest.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{guest.name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{hostel?.name} · Ном. {room?.number}</td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap text-xs">{guest.checkIn} — {guest.checkOut}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <p className={`font-medium ${guest.totalDue > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {guest.totalDue > 0 ? `-${guest.totalDue.toLocaleString()} zl` : `${guest.totalPaid.toLocaleString()} zl`}
                        </p>
                        <p className="text-xs text-gray-400">{guest.totalDue > 0 ? 'долг' : 'оплачено'}</p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-700' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          {guest.status === 'active' ? 'Активный' : guest.status === 'reserved' ? 'Забронирован' : 'Выселен'}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <a
                          href={`tel:${guest.phone.replace(/\s/g, '')}`}
                          onClick={e => e.stopPropagation()}
                          className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                          title={`Позвонить: ${guest.phone}`}
                        >
                          <Phone size={14} />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
