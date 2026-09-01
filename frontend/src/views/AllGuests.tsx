import { useState } from 'react';
import { Search, Phone, Filter, Plus, Send } from 'lucide-react';
import Link from 'next/link';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { GuestLanguage, RoomPricePeriod } from '../types';
import { guestTotalPaid, guestTotalDue, roomOccupiedBeds, GUEST_LANGUAGES } from '../utils/helpers';
import RoomBillingSelect from '../components/RoomBillingSelect';
import Legend from '../components/Legend';
import Modal from '../components/Modal';

export default function AllGuests() {
  const { guests, rooms, hostels, payments, updatePayment } = useData();
  const { t, tp } = useLanguage();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [smsPreview, setSmsPreview] = useState<{ text: string; guestId: string; paymentId: string } | null>(null);

  const getSmsText = (guest: any, payment?: any) => {
    const hostel = hostels.find(h => h.id === guest.hostelId);
    const firstName = guest.name.split(' ')[0];
    if (payment) {
      return t('Уважаемый/ая {name}, напоминаем об оплате в размере {amount} зл, срок которой {date}. Хостел {hostel}.', { name: firstName, amount: payment.amount.toLocaleString(), date: payment.dueDate, hostel: hostel?.name || '' });
    }
    return t('Уважаемый/ая {name}, хостел {hostel}. По всем вопросам обращайтесь к администратору.', { name: firstName, hostel: hostel?.name || '' });
  };

  const openSmsPreview = (guest: any) => {
    const overdue = payments.find(p => p.guestId === guest.id && p.status === 'overdue');
    const payment = overdue || payments.find(p => p.guestId === guest.id && p.status === 'pending');
    setSmsPreview({ text: getSmsText(guest, payment), guestId: guest.id, paymentId: payment?.id || '' });
  };

  const confirmSendSms = () => {
    if (!smsPreview) return;
    if (smsPreview.paymentId) {
      updatePayment(smsPreview.paymentId, { smsSent: true });
    }
    setSmsPreview(null);
  };

  const filtered = guests.filter(g => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase()) || g.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const paid = guestTotalPaid(g.id, payments);
    const due = guestTotalDue(g.id, payments);
    const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? due <= 0 : paymentFilter === 'pending' ? payments.some(p => p.guestId === g.id && p.status === 'pending') : payments.some(p => p.guestId === g.id && p.status === 'overdue'));
    const matchesMin = minAmount === '' || paid >= Number(minAmount);
    const matchesMax = maxAmount === '' || paid <= Number(maxAmount);
    return matchesSearch && matchesStatus && matchesPayment && matchesMin && matchesMax;
  });

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('Все гости')}</h1>
          <p className="text-gray-500 mt-1">{tp(guests.length, ['{n} гость во всех хостелах', '{n} гостя во всех хостелах', '{n} гостей во всех хостелах'])}</p>
        </div>
        <button
          onClick={() => setShowAddGuest(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> {t('Добавить гостя')}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input type="text" placeholder={t('Поиск по имени или телефону...')} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{t('Сумма зл:')}</span>
          <input type="number" placeholder="min" value={minAmount} onChange={e => setMinAmount(e.target.value)} className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-gray-300">—</span>
          <input type="number" placeholder="max" value={maxAmount} onChange={e => setMaxAmount(e.target.value)} className="w-20 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6">
        <Filter size={14} className="text-gray-400" />
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-wrap">
          {[
            { key: 'all', label: t('Все') },
            { key: 'active', label: t('Активные') },
            { key: 'checked_out', label: t('Выселенные') },
            { key: 'reserved', label: t('Забронированные') },
          ].map(f => (
            <button key={f.key} onClick={() => setStatusFilter(f.key)} className={`px-4 py-2 text-sm font-medium transition-colors ${statusFilter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex bg-white border border-gray-200 rounded-xl overflow-hidden flex-wrap">
          {[
            { key: 'all', label: t('Оплата: все') },
            { key: 'paid', label: t('Оплатили') },
            { key: 'pending', label: t('В ожидании') },
            { key: 'unpaid', label: t('Не оплатили') },
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
          { label: t('Активный'), color: 'bg-emerald-500' },
          { label: t('Забронирован'), color: 'bg-amber-500' },
          { label: t('Выселен'), color: 'bg-gray-400' },
          { label: t('Долг'), color: 'bg-red-500' },
        ]}
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">{t('Гости не найдены')}</div>
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
                      <p className="text-xs text-gray-400 truncate">{hostel?.name} · {t('Ном. {n}', { n: room?.number ?? '' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-xs font-medium ${guest.totalDue > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {guest.totalDue > 0 ? `-${guest.totalDue.toLocaleString()}` : `${guest.totalPaid.toLocaleString()} zl`}
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-700' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                        {guest.status === 'active' ? t('Активный') : guest.status === 'reserved' ? t('Бронь') : t('Выселен')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        openSmsPreview(guest);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap shrink-0"
                      title={t('Отправить SMS')}
                    >
                      <Send size={12} /> {t('Отправить SMS')}
                    </button>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        window.location.href = `tel:${guest.phone.replace(/\s/g, '')}`;
                      }}
                      className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors shrink-0"
                      title={t('Позвонить: {phone}', { phone: guest.phone })}
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
                  <th className="px-6 py-3 font-medium text-gray-400">{t('Гость')}</th>
                  <th className="px-6 py-3 font-medium text-gray-400">{t('Хостел / Номер')}</th>
                  <th className="px-6 py-3 font-medium text-gray-400">{t('Срок')}</th>
                  <th className="px-6 py-3 font-medium text-gray-400 text-right">{t('Сумма')}</th>
                  <th className="px-6 py-3 font-medium text-gray-400 text-right">{t('Статус')}</th>
                  <th className="px-6 py-3 w-28"></th>
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
                      <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{hostel?.name} · {t('Ном. {n}', { n: room?.number ?? '' })}</td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap text-xs">{guest.checkIn} — {guest.checkOut}</td>
                      <td className="px-6 py-3 text-right whitespace-nowrap">
                        <p className={`font-medium ${guest.totalDue > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                          {guest.totalDue > 0 ? `-${guest.totalDue.toLocaleString()} zl` : `${guest.totalPaid.toLocaleString()} zl`}
                        </p>
                        <p className="text-xs text-gray-400">{guest.totalDue > 0 ? t('долг') : t('оплачено')}</p>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-700' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                          {guest.status === 'active' ? t('Активный') : guest.status === 'reserved' ? t('Забронирован') : t('Выселен')}
                        </span>
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${guest.phone.replace(/\s/g, '')}`}
                            onClick={e => e.stopPropagation()}
                            className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
title={t('Позвонить: {phone}', { phone: guest.phone })}
                          >
                            <Phone size={14} />
                          </a>
                          <button
                            type="button"
                            onClick={e => { e.stopPropagation(); openSmsPreview(guest); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors whitespace-nowrap"
                            title={t('Отправить SMS')}
                          >
                            <Send size={12} /> {t('Отправить SMS')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      <Modal isOpen={showAddGuest} onClose={() => setShowAddGuest(false)} title={t('Добавить гостя')}>
        <AddGuestForm onClose={() => setShowAddGuest(false)} />
      </Modal>

      <Modal isOpen={!!smsPreview} onClose={() => setSmsPreview(null)} title={t('Отправка SMS')}>
        {smsPreview && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
                <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                  {(guests.find(g => g.id === smsPreview.guestId)?.name || '')[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{guests.find(g => g.id === smsPreview.guestId)?.name}</p>
                  <p className="text-xs text-gray-400">{guests.find(g => g.id === smsPreview.guestId)?.phone}</p>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{smsPreview.text}</p>
              <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200">{t('{n} символов', { n: smsPreview.text.length })}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setSmsPreview(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm">
                {t('Отмена')}
              </button>
              <button onClick={confirmSendSms} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm inline-flex items-center justify-center gap-2">
                <Send size={14} />
                {t('Отправить')}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function AddGuestForm({ onClose }: { onClose: () => void }) {
  const { hostels, rooms, guests, addGuest } = useData();
  const { t } = useLanguage();
  const [hostelId, setHostelId] = useState(hostels[0]?.id || '');
  const [roomId, setRoomId] = useState('');
  const [period, setPeriod] = useState<RoomPricePeriod>('month');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passport, setPassport] = useState('');
  const [language, setLanguage] = useState<GuestLanguage | ''>('');
  const [checkIn, setCheckIn] = useState(new Date().toISOString().split('T')[0]);
  const [checkOut, setCheckOut] = useState('');

  const hostelRooms = rooms.filter(r => r.hostelId === hostelId && roomOccupiedBeds(r.id, guests) < r.beds);
  const activeRoom = roomId && hostelRooms.some(r => r.id === roomId) ? roomId : (hostelRooms[0]?.id || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !hostelId || !activeRoom || !checkIn) return;
    addGuest({ name, phone, email, passport, language: language || undefined, roomId: activeRoom, hostelId, checkIn, checkOut: checkOut || undefined, paymentPeriod: period, status: 'active', totalPaid: 0, totalDue: 0 });
    onClose();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Хостел')}</label>
        <select required value={hostelId} onChange={e => { setHostelId(e.target.value); setRoomId(''); }} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {hostels.map(h => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>
      <RoomBillingSelect
        rooms={rooms}
        guests={guests}
        hostelId={hostelId}
        value={{ roomId: activeRoom, period }}
        onChange={v => { setRoomId(v.roomId); setPeriod(v.period); }}
      />
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Имя и фамилия')}</label>
        <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ян Ковальски" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Телефон')}</label>
          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+48 501 234 567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="jan@email.com" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Паспорт / ID')}</label>
        <input type="text" value={passport} onChange={e => setPassport(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="PL 1234567" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Язык общения')}</label>
        <select value={language} onChange={e => setLanguage(e.target.value as GuestLanguage | '')} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">{t('Не указан')}</option>
          {GUEST_LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Заселение')}</label>
          <input required type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Выселение (опционально)')}</label>
          <input type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">{t('Отмена')}</button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">{t('Добавить')}</button>
      </div>
    </form>
  );
}
