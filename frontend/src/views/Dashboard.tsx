import { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, TrendingUp, ArrowUpRight, DoorOpen, Phone, AlertTriangle, Send, CalendarCheck, DollarSign, BarChart3, X, MessageSquare } from 'lucide-react';
import { useData } from '../context/DataContext';
import { hostelOccupiedBeds, roomOccupiedBeds, paymentIsDue, paymentStatus } from '../utils/helpers';
import Legend from '../components/Legend';

function todayStr() {
  return new Date().toISOString().split('T')[0];
}

export default function Dashboard() {
  const { hostels, guests, rooms, payments, updatePayment, stats } = useData();
  const [hostelFilter, setHostelFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const [smsPreview, setSmsPreview] = useState<{ text: string; guestId: string; guestName: string; paymentIds: string[] } | null>(null);
  const [hoverEarnings, setHoverEarnings] = useState<string | null>(null);
  const [hoverOcc, setHoverOcc] = useState<string | null>(null);
  const filteredGuests = guests.filter(g => {
    if (hostelFilter !== 'all' && g.hostelId !== hostelFilter) return false;
    if (dateFrom && g.checkIn < dateFrom) return false;
    if (dateTo && g.checkOut > dateTo) return false;
    return true;
  });

  const filteredPayments = payments.filter(p => {
    const guest = guests.find(g => g.id === p.guestId);
    if (!guest) return false;
    if (hostelFilter !== 'all' && guest.hostelId !== hostelFilter) return false;
    if (dateFrom && p.dueDate < dateFrom) return false;
    if (dateTo && p.dueDate > dateTo) return false;
    return true;
  });

  const filteredRooms = rooms.filter(r => {
    if (hostelFilter !== 'all' && r.hostelId !== hostelFilter) return false;
    return true;
  });

  const totalGuests = filteredGuests.filter(g => g.status === 'active').length;
  const totalRooms = filteredRooms.length;
  const occupiedRooms = filteredRooms.filter(r => filteredGuests.some(g => g.roomId === r.id && g.status === 'active')).length;
  const totalRevenue = filteredPayments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const today = todayStr();
  const overduePayments = filteredPayments.filter(p => p.status === 'overdue');
  const allUnpaidPayments = filteredPayments.filter(p => paymentIsDue(p, today));
  const unpaidByGuest = allUnpaidPayments.reduce<Record<string, { guestName: string; totalAmount: number; count: number; smsSent: boolean; guestId: string; hostelId: string; hasOverdue: boolean; paymentIds: string[] }>>((acc, p) => {
    if (!acc[p.guestId]) {
      acc[p.guestId] = { guestName: p.guestName, totalAmount: 0, count: 0, smsSent: false, guestId: p.guestId, hostelId: '', hasOverdue: false, paymentIds: [] };
    }
    acc[p.guestId].totalAmount += p.amount;
    acc[p.guestId].count += 1;
    acc[p.guestId].paymentIds.push(p.id);
    if (p.smsSent) acc[p.guestId].smsSent = true;
    if (p.status === 'overdue' || (p.status === 'pending' && p.dueDate <= today)) acc[p.guestId].hasOverdue = true;
    return acc;
  }, {});
  allUnpaidPayments.forEach(p => {
    const guest = guests.find(g => g.id === p.guestId);
    if (guest && unpaidByGuest[p.guestId]) unpaidByGuest[p.guestId].hostelId = guest.hostelId;
  });
  const checkoutsToday = filteredGuests.filter(g => g.checkOut === today);

  const totals = stats?.totals;
  const useServerStats = !!totals && hostelFilter === 'all' && !dateFrom && !dateTo;

  type Alert = { id: string; text: string; detail: string; severity: 'critical' | 'warning' };
  const alerts: Alert[] = [];

  filteredRooms.forEach(r => {
    const activeGuestsInRoom = filteredGuests.filter(g => g.roomId === r.id && g.status === 'active');
    if (activeGuestsInRoom.length > r.beds) {
      alerts.push({ id: `overbook-${r.id}`, text: `Пок. ${r.number} перебронирован`, detail: `${activeGuestsInRoom.length} гостей на ${r.beds} кроватях`, severity: 'critical' });
    }
  });

  const totalOverdue = overduePayments.reduce((s, p) => s + p.amount, 0);
  if (totalOverdue > 0) {
    const overdueGuestCount = new Set(overduePayments.map(p => p.guestId)).size;
    alerts.push({ id: 'overdue-total', text: `Гости имеют просроченные платежи`, detail: `${overdueGuestCount} гостей · ${totalOverdue.toLocaleString()} zl`, severity: 'critical' });
  }

  const dirtyRooms = filteredRooms.filter(r => {
    const occ = roomOccupiedBeds(r.id, filteredGuests);
    return occ > 0 && occ < r.beds;
  });
  if (dirtyRooms.length > 0) {
    alerts.push({ id: 'dirty', text: `${dirtyRooms.length} номеров нуждаются в уборке`, detail: dirtyRooms.map(r => r.number).join(', '), severity: 'warning' });
  }

  const missingPassport = filteredGuests.filter(g => g.status === 'active' && (!g.passport || g.passport.trim() === ''));
  missingPassport.forEach(g => {
    alerts.push({ id: `passport-${g.id}`, text: `Нет паспорта`, detail: `${g.name} · Пок. ${rooms.find(r => r.id === g.roomId)?.number}`, severity: 'warning' });
  });

  const checkoutsWithUnpaid = checkoutsToday.filter(g => {
    return filteredPayments.some(p => p.guestId === g.id && p.status !== 'paid');
  });
  checkoutsWithUnpaid.forEach(g => {
    const room = rooms.find(r => r.id === g.roomId);
    const unpaidAmount = filteredPayments.filter(p => p.guestId === g.id && p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
    alerts.push({ id: `checkout-unpaid-${g.id}`, text: `Выселение с неоплаченным счётом`, detail: `${g.name} · Ном. ${room?.number} · ${unpaidAmount.toLocaleString()} зл`, severity: 'critical' });
  });

  const getSmsText = (guestName: string, amount: number, dueDate: string, hostelName: string) => {
    return `Уважаемый/ая ${guestName.split(' ')[0]}, напоминаем об оплате в размере ${amount.toLocaleString()} зл, срок которой ${dueDate}. Хостел ${hostelName}.`;
  };

  const openSmsPreview = (entry: { guestId: string; guestName: string; totalAmount: number; paymentIds: string[] }) => {
    const guestPayments = filteredPayments.filter(p => entry.paymentIds.includes(p.id));
    const oldestDue = guestPayments.reduce((min, p) => p.dueDate < min ? p.dueDate : min, guestPayments[0].dueDate);
    const guest = guests.find(g => g.id === entry.guestId);
    const hostel = guest ? hostels.find(h => h.id === guest.hostelId) : null;
    setSmsPreview({
      text: getSmsText(entry.guestName, entry.totalAmount, oldestDue, hostel?.name || ''),
      guestId: entry.guestId,
      guestName: entry.guestName,
      paymentIds: entry.paymentIds,
    });
  };

  const confirmSendSms = () => {
    if (!smsPreview) return;
    smsPreview.paymentIds.forEach(pid => {
      const payment = filteredPayments.find(p => p.id === pid);
      if (payment && !payment.smsSent) {
        updatePayment(pid, { smsSent: true });
      }
    });
    setSmsPreview(null);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Главная</h1>
          <p className="text-gray-500 mt-1">Обзор всех хостелов</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={<Building2 size={22} />} label="Хостелы" value={useServerStats ? totals.hostelCount : (hostelFilter === 'all' ? hostels.length : 1)} color="indigo" />
        <StatCard icon={<Users size={22} />} label="Активные гости" value={useServerStats ? totals.occupiedBeds : totalGuests} color="emerald" />
        <StatCard icon={<DoorOpen size={22} />} label="Занятые номера" value={useServerStats ? `${totals.occupiedRooms}/${totals.totalRooms}` : `${occupiedRooms}/${totalRooms}`} color="amber" />
        <StatCard icon={<TrendingUp size={22} />} label="Доход" value={`${(useServerStats ? totals.totalRevenue : totalRevenue).toLocaleString()} zl`} color="rose" />
      </div>



      {allUnpaidPayments.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={16} className="text-red-500" />
            <h2 className="font-semibold text-gray-900">Неоплаченные счета</h2>
            <span className="text-sm text-gray-400 ml-auto">{Object.keys(unpaidByGuest).length} гостей · {allUnpaidPayments.reduce((s, p) => s + p.amount, 0).toLocaleString()} зл</span>
          </div>
          <Legend
            className="mb-4"
            items={[
              { label: 'Ожидает', color: 'bg-amber-100 border border-amber-200' },
              { label: 'Просрочка до 7 дн.', color: 'bg-amber-400' },
              { label: 'Просрочка 7–14 дн.', color: 'bg-orange-400' },
              { label: 'Просрочка > 14 дн.', color: 'bg-red-400' },
              { label: 'SMS отправлено', color: 'bg-blue-400' },
            ]}
          />
          <div className="block lg:hidden space-y-2">
            {Object.values(unpaidByGuest).sort((a, b) => b.totalAmount - a.totalAmount).map(entry => {
              const guestPayments = allUnpaidPayments.filter(p => p.guestId === entry.guestId);
              const oldestDue = guestPayments.reduce((min, p) => p.dueDate < min ? p.dueDate : min, guestPayments[0].dueDate);
              const overdueDays = Math.max(0, Math.ceil((new Date().getTime() - new Date(oldestDue).getTime()) / (1000 * 60 * 60 * 24)));
              return (
                <div key={entry.guestId} className="bg-white rounded-xl border border-gray-100 p-4">
                  <Link href={`/guest/${entry.guestId}`} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold text-xs shrink-0">
                      {entry.guestName.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{entry.guestName}</p>
                      <p className="text-xs text-gray-400 truncate">{hostels.find(h => h.id === entry.hostelId)?.name || '—'} · {entry.count} плат.</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-red-500">{entry.totalAmount.toLocaleString()} зл</p>
                      {entry.hasOverdue ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${overdueDays > 14 ? 'bg-red-100 text-red-700' : overdueDays > 7 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                          Просрочка {overdueDays} дн.
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700 whitespace-nowrap">Ожидает</span>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 mt-3">
                    {entry.smsSent && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                        <Send size={9} /> SMS
                      </span>
                    )}
                    <div className="flex gap-2 ml-auto">
                      <button onClick={() => openSmsPreview(entry)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                        <MessageSquare size={12} /> SMS
                      </button>
                      <a href={`tel:${guests.find(g => g.id === entry.guestId)?.phone?.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                        <Phone size={12} /> Позвонить
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 font-medium text-gray-400">Гость</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Хостел</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Сумма долга</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Платежей</th>
                  <th className="px-4 py-3 font-medium text-gray-400">Статус</th>
                  <th className="px-4 py-3 font-medium text-gray-400">SMS</th>
                  <th className="px-4 py-3 font-medium text-gray-400 text-right">Действие</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {Object.values(unpaidByGuest).sort((a, b) => b.totalAmount - a.totalAmount).map(entry => {
                  const guestPayments = allUnpaidPayments.filter(p => p.guestId === entry.guestId);
                  const oldestDue = guestPayments.reduce((min, p) => p.dueDate < min ? p.dueDate : min, guestPayments[0].dueDate);
                  const overdueDays = Math.max(0, Math.ceil((new Date().getTime() - new Date(oldestDue).getTime()) / (1000 * 60 * 60 * 24)));
                  return (
                    <tr key={entry.guestId} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/guest/${entry.guestId}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold text-xs shrink-0">
                            {entry.guestName.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className="font-medium text-gray-900 truncate">{entry.guestName}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 truncate">{hostels.find(h => h.id === entry.hostelId)?.name || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-red-500">{entry.totalAmount.toLocaleString()} зл</td>
                      <td className="px-4 py-3 text-gray-500">{entry.count}</td>
                      <td className="px-4 py-3">
                        {entry.hasOverdue ? (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${overdueDays > 14 ? 'bg-red-100 text-red-700' : overdueDays > 7 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                            Просрочка {overdueDays} дн.
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 whitespace-nowrap">Ожидает</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {entry.smsSent ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded whitespace-nowrap">
                            <Send size={9} /> Отправлено
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <button onClick={() => openSmsPreview(entry)} className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
                             <MessageSquare size={12} /> SMS
                          </button>
                          <a href={`tel:${guests.find(g => g.id === entry.guestId)?.phone?.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-medium hover:bg-emerald-100 transition-colors">
                             <Phone size={12} /> Позвонить
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="lg:sticky lg:top-0 z-10 bg-gray-50/95 backdrop-blur-sm -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 mb-6 -mt-2 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 size={16} className="text-gray-400" />
            <select value={hostelFilter} onChange={e => setHostelFilter(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="all">Все хостелы</option>
              {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <CalendarCheck size={16} className="text-gray-400" />
            <input type="month" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            <span className="text-gray-400 text-sm">—</span>
            <input type="month" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          {(hostelFilter !== 'all' || dateFrom || dateTo) && (
            <button onClick={() => { setHostelFilter('all'); setDateFrom(''); setDateTo(''); }} className="px-3 py-2 text-xs font-medium text-red-600 bg-red-50 rounded-xl hover:bg-red-100 transition-colors">
              Сбросить
            </button>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <BarChart3 size={16} className="text-gray-400" />
            <select value={monthsCount} onChange={e => setMonthsCount(Number(e.target.value))} className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value={3}>3 мес.</option>
              <option value={6}>6 мес.</option>
              <option value={12}>12 мес.</option>
              <option value={24}>24 мес.</option>
              <option value={999}>Все</option>
            </select>
          </div>
        </div>
      </div>

      {(() => {
        const currentMonth = new Date().toISOString().split('T')[0].substring(0, 7);
        const allMonths = new Set<string>();
        filteredPayments.forEach(p => {
          allMonths.add(p.dueDate.substring(0, 7));
          if (p.paidDate) allMonths.add(p.paidDate.substring(0, 7));
        });
        filteredGuests.forEach(g => { allMonths.add(g.checkIn.substring(0, 7)); allMonths.add(g.checkOut.substring(0, 7)); });
        const rawMonths = [...allMonths].filter(m => m <= currentMonth).sort();
        const sortedMonths: string[] = [];
        if (rawMonths.length > 0) {
          const [sy, sm] = rawMonths[0].split('-').map(Number);
          const [ey, em] = rawMonths[rawMonths.length - 1].split('-').map(Number);
          let y = sy, m = sm;
          while (y < ey || (y === ey && m <= em)) {
            sortedMonths.push(`${y}-${String(m).padStart(2, '0')}`);
            m++;
            if (m > 12) { m = 1; y++; }
          }
        }
        sortedMonths.splice(0, Math.max(0, sortedMonths.length - monthsCount));

        const earningsByMonth: Record<string, { paid: number; pending: number; overdue: number; total: number }> = {};
        filteredPayments.forEach(p => {
          const m = (p.status === 'paid' && p.paidDate ? p.paidDate : p.dueDate).substring(0, 7);
          if (!earningsByMonth[m]) earningsByMonth[m] = { paid: 0, pending: 0, overdue: 0, total: 0 };
          earningsByMonth[m].total += p.amount;
          earningsByMonth[m][p.status] += p.amount;
        });

        const occByMonth: Record<string, { guestNights: number; avgPct: number; checkins: number; checkouts: number; guests: number }> = {};
        sortedMonths.forEach(m => {
          const [y, mo] = m.split('-').map(Number);
          const daysInMonth = new Date(y, mo, 0).getDate();
          const totalBeds = filteredRooms.reduce((s, r) => s + r.beds, 0);
          const maxNights = totalBeds * daysInMonth;
          let guestNights = 0;
          let checkins = 0;
          let checkouts = 0;
          let guests = 0;
          filteredGuests.forEach(g => {
            const monthStart = new Date(y, mo - 1, 1);
            const monthEnd = new Date(y, mo, 0);
            const gIn = new Date(g.checkIn);
            const gOut = new Date(g.checkOut);
            const stayStart = gIn > monthStart ? gIn : monthStart;
            const stayEnd = gOut < monthEnd ? gOut : monthEnd;
            if (stayStart <= stayEnd) {
              guestNights += Math.ceil((stayEnd.getTime() - stayStart.getTime()) / (1000 * 60 * 60 * 24));
              guests++;
            }
            const inMonth = g.checkIn.substring(0, 7);
            const outMonth = g.checkOut.substring(0, 7);
            if (inMonth === m) checkins++;
            if (outMonth === m) checkouts++;
          });
          occByMonth[m] = { guestNights, avgPct: maxNights > 0 ? Math.round((guestNights / maxNights) * 100) : 0, checkins, checkouts, guests };
        });

        const monthShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
        const maxEarnings = Math.max(...sortedMonths.map(m => earningsByMonth[m]?.total || 0), 1);
        const statPaid = filteredPayments.filter(p => paymentStatus(p) === 'paid').reduce((s, p) => s + p.amount, 0);
        const statPending = filteredPayments.filter(p => paymentStatus(p) === 'pending').reduce((s, p) => s + p.amount, 0);
        const statOverdue = filteredPayments.filter(p => paymentStatus(p) === 'overdue').reduce((s, p) => s + p.amount, 0);
        const statTotal = statPaid + statPending + statOverdue;
        const statAvg = sortedMonths.length ? Math.round(statTotal / sortedMonths.length) : 0;
        const maxOccNights = Math.max(...sortedMonths.map(m => occByMonth[m]?.guestNights || 0), 1);

        if (sortedMonths.length === 0) return null;

        const chartLeft = 55;
        const chartBottom = 240;
        const chartH = 200;
        const barGap = 80;
        const svgW = sortedMonths.length * barGap + chartLeft + 20;

        return (
          <div className="mb-8 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign size={16} className="text-emerald-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Доходы по месяцам</h3>
                <span className="ml-auto text-xs text-gray-400">{sortedMonths.length} мес.</span>
              </div>
              <Legend
                className="mb-3"
                items={[
                  { label: 'Оплачено', color: 'bg-emerald-400' },
                  { label: 'Ожидает', color: 'bg-amber-400' },
                  { label: 'Просрочено', color: 'bg-red-400' },
                ]}
              />
              <div className="overflow-x-auto -mx-5 px-5">
                <div style={{ minWidth: Math.max(svgW, 360) }}>
                  <svg viewBox={`0 0 ${svgW} 310`} className="w-full" style={{ height: 310 }} preserveAspectRatio="xMidYMid meet">
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      const ticks = 4;
                      for (let t = 0; t <= ticks; t++) {
                        const val = Math.round((maxEarnings / ticks) * t);
                        const y = chartBottom - (t / ticks) * chartH;
                        rows.push(
                          <g key={`yt-${t}`}>
                            <line x1={chartLeft - 5} y1={y} x2={chartLeft + sortedMonths.length * barGap} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                            <text x={chartLeft - 8} y={y + 3} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>{val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : val}</text>
                          </g>
                        );
                      }
                      const monthShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
                      sortedMonths.forEach((m, i) => {
                        const e = earningsByMonth[m] || { paid: 0, pending: 0, overdue: 0, total: 0 };
                        const [yr, mo] = m.split('-');
                        const cx = chartLeft + i * barGap + barGap / 2;
                        const bw = 32;
                        const pH = maxEarnings > 0 ? (e.paid / maxEarnings) * chartH : 0;
                        const peH = maxEarnings > 0 ? (e.pending / maxEarnings) * chartH : 0;
                        const oH = maxEarnings > 0 ? (e.overdue / maxEarnings) * chartH : 0;
                        const totH = pH + peH + oH;
                        rows.push(
                          <g key={m} className="group" onMouseEnter={() => setHoverEarnings(m)} onMouseLeave={() => setHoverEarnings(null)}>
                            <rect x={cx - bw / 2 - 8} y={chartBottom - chartH} width={bw + 16} height={chartH} fill="transparent" />
                            {e.overdue > 0 && <rect x={cx - bw / 2} y={chartBottom - totH} width={bw} height={oH} rx={2} fill="#f87171" className="transition-opacity group-hover:opacity-80" />}
                            {e.pending > 0 && <rect x={cx - bw / 2} y={chartBottom - pH - peH} width={bw} height={peH} rx={2} fill="#fbbf24" className="transition-opacity group-hover:opacity-80" />}
                            {e.paid > 0 && <rect x={cx - bw / 2} y={chartBottom - pH} width={bw} height={pH} rx={2} fill="#34d399" className="transition-opacity group-hover:opacity-80" />}
                            {e.total === 0 && <rect x={cx - bw / 2} y={chartBottom - 1} width={bw} height={1} rx={1} fill="#e5e7eb" />}
                            <text x={cx} y={chartBottom + 16} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>{monthShort[parseInt(mo) - 1]}</text>
                            <text x={cx} y={chartBottom + 27} textAnchor="middle" className="fill-gray-300" style={{ fontSize: 8 }}>{yr}</text>
                          </g>
                        );
                      });
                      rows.push(<line key="bl" x1={chartLeft} y1={chartBottom} x2={chartLeft + sortedMonths.length * barGap} y2={chartBottom} stroke="#e5e7eb" strokeWidth={1} />);
                      if (hoverEarnings && sortedMonths.includes(hoverEarnings)) {
                        const mi = sortedMonths.indexOf(hoverEarnings);
                        const e = earningsByMonth[hoverEarnings] || { paid: 0, pending: 0, overdue: 0, total: 0 };
                        const [yr, mo] = hoverEarnings.split('-');
                        const cx = chartLeft + mi * barGap + barGap / 2;
                        const pH = maxEarnings > 0 ? (e.paid / maxEarnings) * chartH : 0;
                        const peH = maxEarnings > 0 ? (e.pending / maxEarnings) * chartH : 0;
                        const oH = maxEarnings > 0 ? (e.overdue / maxEarnings) * chartH : 0;
                        const totH = pH + peH + oH;
                        const monthLabel = `${monthShort[parseInt(mo) - 1]} ${yr}`;
                        const ttW = 170;
                        const ttH = e.paid > 0 && e.pending > 0 && e.overdue > 0 ? 72 : e.total === 0 ? 26 : 56;
                        const chartRight = chartLeft + sortedMonths.length * barGap;
                        const ttX = Math.min(Math.max(cx - ttW / 2, chartLeft), chartRight - ttW);
                        const ttCx = ttX + ttW / 2;
                        const ttY = Math.max(2, chartBottom - totH - ttH);
                        rows.push(
                          <g key="tt" className="transition-opacity" style={{ transition: 'opacity 0.15s' }}>
                            <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={6} fill="#1f2937" />
                            <text x={ttCx} y={ttY + 17} textAnchor="middle" fill="white" style={{ fontSize: 11, fontWeight: 600 }}>{monthLabel}</text>
                            {e.paid > 0 && <text x={ttCx} y={ttY + 34} textAnchor="middle" fill="#34d399" style={{ fontSize: 10 }}>Оплачено: {e.paid.toLocaleString()} зл</text>}
                            {e.pending > 0 && <text x={ttCx} y={ttY + (e.paid > 0 ? 51 : 34)} textAnchor="middle" fill="#fbbf24" style={{ fontSize: 10 }}>Ожидает: {e.pending.toLocaleString()} зл</text>}
                            {e.overdue > 0 && <text x={ttCx} y={ttY + (e.paid > 0 ? (e.pending > 0 ? 68 : 51) : (e.pending > 0 ? 51 : 34))} textAnchor="middle" fill="#f87171" style={{ fontSize: 10 }}>Просрочено: {e.overdue.toLocaleString()} зл</text>}
                          </g>
                        );
                      }
                      return rows;
                    })()}
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-gray-100">
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">Доход за период</div>
                  <div className="text-sm font-semibold text-gray-900">{statTotal.toLocaleString()} зл</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">Средний / мес</div>
                  <div className="text-sm font-semibold text-gray-900">{statAvg.toLocaleString()} зл</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">Оплачено</div>
                  <div className="text-sm font-semibold text-emerald-600">{statPaid.toLocaleString()} зл</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">Ожидает</div>
                  <div className="text-sm font-semibold text-amber-600">{statPending.toLocaleString()} зл</div>
                </div>
                <div>
                  <div className="text-[10px] text-gray-400 mb-0.5">Просрочено</div>
                  <div className="text-sm font-semibold text-red-600">{statOverdue.toLocaleString()} зл</div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 size={16} className="text-indigo-500" />
                <h3 className="font-semibold text-gray-900 text-sm">Размещение по месяцам</h3>
              </div>
              <Legend
                className="mb-3"
                items={[
                  { label: 'Ночлеги', color: 'bg-indigo-400' },
                  { label: 'Средняя загрузка', swatch: <span className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[7px] border-b-red-500" /> },
                ]}
              />
              <div className="overflow-x-auto -mx-5 px-5">
                <div style={{ minWidth: Math.max(svgW, 360) }}>
                  <svg viewBox={`0 0 ${svgW} 310`} className="w-full" style={{ height: 310 }} preserveAspectRatio="xMidYMid meet">
                    {(() => {
                      const rows: React.ReactNode[] = [];
                      const ticks = 4;
                      for (let t = 0; t <= ticks; t++) {
                        const val = Math.round((maxOccNights / ticks) * t);
                        const y = chartBottom - (t / ticks) * chartH;
                        rows.push(
                          <g key={`yt-${t}`}>
                            <line x1={chartLeft - 5} y1={y} x2={chartLeft + sortedMonths.length * barGap} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                            <text x={chartLeft - 8} y={y + 3} textAnchor="end" className="fill-gray-400" style={{ fontSize: 10 }}>{val}</text>
                          </g>
                        );
                      }
                      sortedMonths.forEach((m, i) => {
                        const o = occByMonth[m] || { guestNights: 0, avgPct: 0, checkins: 0, checkouts: 0, guests: 0 };
                        const [yr, mo] = m.split('-');
                        const cx = chartLeft + i * barGap + barGap / 2;
                        const bw = 32;
                        const nH = maxOccNights > 0 ? (o.guestNights / maxOccNights) * chartH : 0;
                        const occY = chartBottom - (o.avgPct / 100) * chartH;
                        const color = o.avgPct >= 80 ? '#34d399' : o.avgPct >= 50 ? '#fbbf24' : '#f87171';
                        rows.push(
                          <g key={m} className="group" onMouseEnter={() => setHoverOcc(m)} onMouseLeave={() => setHoverOcc(null)}>
                            <rect x={cx - bw / 2 - 8} y={chartBottom - chartH} width={bw + 16} height={chartH} fill="transparent" />
                            <rect x={cx - bw / 2} y={chartBottom - nH} width={bw} height={nH} rx={3} fill={color} className="transition-opacity group-hover:opacity-80" />
                            {i > 0 && (() => {
                              const prev = occByMonth[sortedMonths[i - 1]] || { avgPct: 0 };
                              const prevY = chartBottom - (prev.avgPct / 100) * chartH;
                              return <line key={`ol-${m}`} x1={chartLeft + (i - 1) * barGap + barGap / 2} y1={prevY} x2={cx} y2={occY} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />;
                            })()}
                            <circle cx={cx} cy={occY} r={4} fill="#ef4444" stroke="white" strokeWidth={2} />
                            <text x={cx} y={chartBottom + 16} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>{monthShort[parseInt(mo) - 1]}</text>
                            <text x={cx} y={chartBottom + 27} textAnchor="middle" className="fill-gray-300" style={{ fontSize: 8 }}>{yr}</text>
                          </g>
                        );
                      });
                      rows.push(<line key="bl" x1={chartLeft} y1={chartBottom} x2={chartLeft + sortedMonths.length * barGap} y2={chartBottom} stroke="#e5e7eb" strokeWidth={1} />);
                      if (hoverOcc && sortedMonths.includes(hoverOcc)) {
                        const mi = sortedMonths.indexOf(hoverOcc);
                        const o = occByMonth[hoverOcc] || { guestNights: 0, avgPct: 0, checkins: 0, checkouts: 0, guests: 0 };
                        const [yr, mo] = hoverOcc.split('-');
                        const cx = chartLeft + mi * barGap + barGap / 2;
                        const nH = maxOccNights > 0 ? (o.guestNights / maxOccNights) * chartH : 0;
                        const color = o.avgPct >= 80 ? '#34d399' : o.avgPct >= 50 ? '#fbbf24' : '#f87171';
                        const monthLabel = `${monthShort[parseInt(mo) - 1]} ${yr}`;
                        const ttW = 140;
                        const ttH = 72;
                        const chartRight = chartLeft + sortedMonths.length * barGap;
                        const ttX = Math.min(Math.max(cx - ttW / 2, chartLeft), chartRight - ttW);
                        const ttCx = ttX + ttW / 2;
                        const ttY = Math.max(2, chartBottom - nH - ttH);
                        rows.push(
                          <g key="tt" className="transition-opacity" style={{ transition: 'opacity 0.15s' }}>
                            <rect x={ttX} y={ttY} width={ttW} height={ttH} rx={6} fill="#1f2937" />
                            <text x={ttCx} y={ttY + 15} textAnchor="middle" fill="white" style={{ fontSize: 11, fontWeight: 600 }}>{monthLabel}</text>
                            <text x={ttCx} y={ttY + 31} textAnchor="middle" fill="#c4b5fd" style={{ fontSize: 10 }}>Ночлегов: {o.guestNights}</text>
                            <text x={ttCx} y={ttY + 45} textAnchor="middle" fill="#818cf8" style={{ fontSize: 10 }}>Среднее кол-во гостей: {o.guests}</text>
                            <text x={ttCx} y={ttY + 59} textAnchor="middle" fill={color} style={{ fontSize: 10 }}>Загрузка: {o.avgPct}%</text>
                          </g>
                        );
                      }
                      return rows;
                    })()}
                  </svg>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-3 pt-3 border-t border-gray-100">
                {(() => {
                  const totalCheckins = sortedMonths.reduce((s, m) => s + (occByMonth[m]?.checkins || 0), 0);
                  const totalCheckouts = sortedMonths.reduce((s, m) => s + (occByMonth[m]?.checkouts || 0), 0);
                  const totalGuests = sortedMonths.reduce((s, m) => s + (occByMonth[m]?.guests || 0), 0);
                  const avgGuests = sortedMonths.length > 0 ? Math.round((totalGuests / sortedMonths.length) * 10) / 10 : 0;
                  const avgOcc = sortedMonths.length > 0 ? Math.round(sortedMonths.reduce((s, m) => s + (occByMonth[m]?.avgPct || 0), 0) / sortedMonths.length) : 0;
                  return (
                    <>
                       <div className="text-center"><p className="text-xs text-gray-400">Среднее кол-во гостей</p><p className="font-bold text-gray-900">{avgGuests}<span className="text-[10px] text-gray-400 font-normal">/мес</span></p></div>
                       <div className="text-center"><p className="text-xs text-gray-400">Гостей за период</p><p className="font-bold text-gray-900">{filteredGuests.length}</p></div>
                       <div className="text-center"><p className="text-xs text-gray-400">Заселения</p><p className="font-bold text-gray-900">{totalCheckins}</p></div>
                       <div className="text-center"><p className="text-xs text-gray-400">Выселения</p><p className="font-bold text-gray-900">{totalCheckouts}</p></div>
                       <div className="text-center"><p className="text-xs text-gray-400">Средняя загрузка</p><p className={`font-bold ${avgOcc >= 80 ? 'text-emerald-600' : avgOcc >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avgOcc}%</p></div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        );
      })()}



      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Ваши хостелы</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {(hostelFilter === 'all' ? hostels : hostels.filter(h => h.id === hostelFilter)).map(h => {
            const stat = useServerStats ? stats?.hostels.find(s => s.documentId === h.id) : undefined;
            const hOcc = stat ? stat.occupiedBeds : hostelOccupiedBeds(h.id, filteredGuests);
            const totalRooms = stat ? stat.totalRooms : h.totalRooms;
            const totalBeds = stat ? stat.totalBeds : h.totalBeds;
            const revenue = stat ? stat.totalRevenue : h.monthlyRevenue;
            const occupancy = totalBeds > 0 ? Math.round((hOcc / totalBeds) * 100) : 0;
            return (
              <Link
                key={h.id}
                href={`/hostel/${h.id}`}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Building2 size={24} />
                  </div>
                  <ArrowUpRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{h.name}</h3>
                <p className="text-sm text-gray-400 mb-4">{h.address}</p>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Номера</p>
                    <p className="font-semibold text-gray-900">{totalRooms}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Загрузка</p>
                    <p className="font-semibold text-gray-900">{occupancy}%</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Гости</p>
                    <p className="font-semibold text-gray-900">{hOcc}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">Доход</p>
                    <p className="font-semibold text-gray-900">{(revenue / 1000).toFixed(1)}k</p>
                  </div>
                </div>

                  <div className="mt-4">
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          occupancy > 80 ? 'bg-emerald-500' : occupancy > 50 ? 'bg-amber-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  </div>
              </Link>
            );
          })}
        </div>
      </div>

      {smsPreview && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSmsPreview(null)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Предпросмотр SMS</h3>
              <button onClick={() => setSmsPreview(null)} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-gray-400 mb-2">Получатель: {smsPreview.guestName} ({guests.find(g => g.id === smsPreview.guestId)?.phone})</p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <MessageSquare size={14} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900 leading-relaxed">{smsPreview.text}</p>
                      <p className="text-[10px] text-gray-400 mt-2">{smsPreview.text.length} символов</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <button onClick={() => setSmsPreview(null)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
                Отмена
              </button>
              <button onClick={confirmSendSms} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium hover:bg-blue-600 transition-colors">
                <Send size={14} />
                Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    indigo: 'bg-indigo-100 text-indigo-600',
    emerald: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    rose: 'bg-rose-100 text-rose-600',
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-3 ${colors[color]}`}>
        {icon}
      </div>
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
