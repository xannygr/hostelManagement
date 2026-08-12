import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Phone, Mail, CreditCard, Calendar, MapPin, Edit3, AlertTriangle, CheckCircle2, Send, MessageSquare, X } from 'lucide-react';
import { useData } from '../context/DataContext';
import { guestTotalPaid, guestTotalDue } from '../utils/helpers';
import Modal from '../components/Modal';

export default function GuestDetail() {
  const { id } = useParams<{ id: string }>();
  const { guests, rooms, hostels, payments, updateGuest, updatePayment } = useData();
  const guest = guests.find(g => g.id === id);
  const [showEdit, setShowEdit] = useState(false);
  const [smsSent, setSmsSent] = useState(false);
  const [smsPreview, setSmsPreview] = useState<{ text: string; paymentId?: string } | null>(null);

  if (!guest) return <div className="p-8 text-center text-gray-400">Гость не найден</div>;

  const room = rooms.find(r => r.id === guest.roomId);
  const hostel = hostels.find(h => h.id === guest.hostelId);
  const guestPayments = payments.filter(p => p.guestId === id).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const overduePayments = guestPayments.filter(p => p.status === 'overdue');
  const computedTotalPaid = guestTotalPaid(guest.id, payments);
  const computedTotalDue = guestTotalDue(guest.id, payments);

  const getSmsText = (payment?: any) => {
    const p = payment || overduePayments[0];
    const dueDate = p ? p.dueDate : '';
    const amount = p ? p.amount : computedTotalDue;
    const firstName = guest.name.split(' ')[0];
    if (!p) {
      return `Уважаемый/ая ${firstName}, хостел ${hostel?.name || ''}. По всем вопросам обращайтесь к администратору.`;
    }
    return `Уважаемый/ая ${firstName}, напоминаем об оплате в размере ${amount.toLocaleString()} зл, срок которой ${dueDate}. Хостел ${hostel?.name || ''}.`;
  };

  const confirmSendSms = () => {
    if (smsPreview?.paymentId) {
      updatePayment(smsPreview.paymentId, { smsSent: true });
    } else {
      overduePayments.forEach(p => {
        if (!p.smsSent) updatePayment(p.id, { smsSent: true });
      });
    }
    setSmsSent(true);
    setSmsPreview(null);
    setTimeout(() => setSmsSent(false), 3000);
  };

  const sendSmsForOverdue = () => {
    setSmsPreview({ text: getSmsText() });
  };

  const sendSmsForPayment = (paymentId: string) => {
    const payment = payments.find(p => p.id === paymentId);
    setSmsPreview({ text: getSmsText(payment), paymentId });
  };

  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const monthNamesShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const stayMonths: { key: string; label: string; shortLabel: string; year: number; month: number; status: 'paid' | 'overdue' | 'pending' | 'none'; payment?: any }[] = [];
  const checkInDate = new Date(guest.checkIn);
  const checkOutDate = new Date(guest.checkOut);
  const cur = new Date(checkInDate.getFullYear(), checkInDate.getMonth(), 1);
  const end = new Date(checkOutDate.getFullYear(), checkOutDate.getMonth(), 1);

  while (cur <= end) {
    const y = cur.getFullYear();
    const m = cur.getMonth();
    const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
    const payment = guestPayments.find(p => {
      const pd = new Date(p.dueDate);
      return pd.getFullYear() === y && pd.getMonth() === m;
    });
    const status = payment ? (payment.status as 'paid' | 'overdue' | 'pending') : 'none';
    stayMonths.push({
      key: monthKey,
      label: `${monthNames[m]} ${y}`,
      shortLabel: monthNamesShort[m],
      year: y,
      month: m,
      status,
      payment,
    });
    cur.setMonth(cur.getMonth() + 1);
  }

  return (
    <div className="p-4 sm:p-8">
      <Link href={`/hostel/${guest.hostelId}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft size={16} />
        Вернуться в {hostel?.name}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-end mb-2">
              <button onClick={() => setShowEdit(true)} className="w-9 h-9 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center hover:bg-indigo-100 hover:text-indigo-600 transition-colors" title="Редактировать">
                <Edit3 size={16} />
              </button>
            </div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center text-2xl font-bold mx-auto mb-3">
                {guest.name.split(' ').map(n => n[0]).join('')}
              </div>
              <h1 className="text-xl font-bold text-gray-900">{guest.name}</h1>
              <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${guest.status === 'active' ? 'bg-emerald-100 text-emerald-700' : guest.status === 'reserved' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                {guest.status === 'active' ? 'Активный жилец' : guest.status === 'reserved' ? 'Забронирован' : 'Выселен'}
              </span>
            </div>
            <div className="space-y-4">
              <InfoRow icon={<Phone size={18} />} label="Телефон" value={guest.phone || '-'} />
              <InfoRow icon={<Mail size={18} />} label="Email" value={guest.email || '-'} />
              <InfoRow icon={<CreditCard size={18} />} label="Паспорт" value={guest.passport || '-'} />
            </div>
            <div className="flex gap-3 mt-6">
              {guest.phone ? (
                <a href={`tel:${guest.phone.replace(/\s/g, '')}`} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200 transition-colors">
                  <Phone size={16} />
                  Позвонить
                </a>
              ) : (
                <span className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium" title="Телефон не указан">
                  <Phone size={16} />
                  Позвонить
                </span>
              )}
              <button
                onClick={sendSmsForOverdue}
                disabled={smsSent}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  smsSent
                    ? 'bg-blue-100 text-blue-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                {smsSent ? <CheckCircle2 size={16} /> : <MessageSquare size={16} />}
                {smsSent ? 'Отправлено!' : 'Отправить SMS'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Размещение</h3>
            <div className="space-y-4">
              <InfoRow icon={<MapPin size={18} />} label="Хостел" value={hostel?.name || '-'} />
              <InfoRow icon={<MapPin size={18} />} label="Номер" value={`${room?.number} · ${room?.type === 'standard' ? 'Standard' : room?.type === 'vip' ? 'VIP' : 'Economy'}`} />
              <InfoRow icon={<Calendar size={18} />} label="Заезд" value={guest.checkIn} />
              <InfoRow icon={<Calendar size={18} />} label="Выезд" value={guest.checkOut} />
            </div>
          </div>
        </div>

        <div className="col-span-2 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-400 mb-1">Оплачено</p>
              <p className="text-2xl font-bold text-emerald-600">{computedTotalPaid.toLocaleString()} zl</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-400 mb-1">Задолженность</p>
              <p className={`text-2xl font-bold ${computedTotalDue > 0 ? 'text-red-500' : 'text-gray-900'}`}>{computedTotalDue.toLocaleString()} zl</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-sm text-gray-400 mb-1">До выезда</p>
              <p className="text-2xl font-bold text-gray-900">
                {Math.max(0, Math.ceil((new Date(guest.checkOut).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} дн.
              </p>
            </div>
          </div>

          {guestPayments.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">История платежей</h2>
                {overduePayments.length > 0 && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 px-3 py-1 rounded-full">
                    <AlertTriangle size={13} />
                    {overduePayments.length}x просрочено
                  </span>
                )}
              </div>

              {stayMonths.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-gray-400 mb-3 font-medium uppercase tracking-wider">Календарь проживания</p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                    {stayMonths.map(m => {
                      const isCurrentMonth = m.year === new Date().getFullYear() && m.month === new Date().getMonth();
                      const isFuture = m.year > new Date().getFullYear() || (m.year === new Date().getFullYear() && m.month > new Date().getMonth());

                      let bg = 'bg-gray-50 border-gray-200';
                      let textColor = 'text-gray-400';
                      let dotColor = 'bg-gray-300';
                      let label = 'Нет данных';

                      if (m.status === 'paid') {
                        bg = 'bg-emerald-50 border-emerald-200';
                        textColor = 'text-emerald-700';
                        dotColor = 'bg-emerald-400';
                        label = 'Оплачено';
                      } else if (m.status === 'overdue') {
                        bg = 'bg-red-50 border-red-200';
                        textColor = 'text-red-700';
                        dotColor = 'bg-red-400';
                        label = 'Просрочено';
                      } else if (m.status === 'pending') {
                        bg = 'bg-amber-50 border-amber-200';
                        textColor = 'text-amber-700';
                        dotColor = 'bg-amber-400';
                        label = 'Ожидает';
                      } else if (isFuture) {
                        bg = 'bg-gray-50 border-gray-100';
                        textColor = 'text-gray-300';
                        dotColor = 'bg-gray-200';
                        label = 'Предстоящий';
                      }

                      return (
                        <div
                          key={m.key}
                          className={`relative rounded-xl border-2 p-3 text-center transition-all ${bg} ${isCurrentMonth ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                          title={`${m.label} · ${label}${m.payment ? ` · ${m.payment.amount.toLocaleString()} zl` : ''}`}
                        >
                          {isCurrentMonth && (
                            <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[8px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded-full whitespace-nowrap">СЕЙЧАС</span>
                          )}
                          <div className={`w-2 h-2 rounded-full ${dotColor} mx-auto mb-1.5 ${m.status === 'overdue' ? 'animate-pulse' : ''}`} />
                          <p className={`text-[10px] font-bold uppercase ${textColor}`}>{m.shortLabel}</p>
                          <p className={`text-[10px] ${textColor} opacity-60`}>{m.year}</p>
                          {m.payment && (
                            <p className={`text-[9px] mt-1 font-medium ${textColor}`}>
                              {m.payment.amount.toLocaleString()} zl
                            </p>
                          )}
                          {m.payment?.smsSent && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center">
                              <Send size={7} className="text-white" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">Оплачено</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-gray-500">Ожидает</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-gray-500">Просрочено</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-gray-200" /><span className="text-xs text-gray-500">Предстоящий</span></div>
                <div className="flex items-center gap-1.5"><Send size={12} className="text-blue-500" /><span className="text-xs text-gray-500">SMS отправлены</span></div>
              </div>

              <div className="space-y-3">
                {guestPayments.map(payment => (
                  <div key={payment.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        payment.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                        'bg-red-100 text-red-600'
                      }`}>
                        {payment.status === 'paid' ? <CheckCircle2 size={18} /> :
                         payment.status === 'overdue' ? <AlertTriangle size={18} /> :
                         <CreditCard size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{payment.amount.toLocaleString()} zl</p>
                        <p className="text-xs text-gray-400">
                          {payment.type === 'card' ? 'Карта' : payment.type === 'cash' ? 'Наличные' : 'Перевод'} · {payment.dueDate}
                          {payment.paidDate && ` → ${payment.paidDate}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {payment.smsSent ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          <Send size={9} />
                          SMS
                        </span>
                      ) : payment.status === 'overdue' ? (
                        <button
                          onClick={() => sendSmsForPayment(payment.id)}
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-white bg-blue-500 px-2 py-0.5 rounded hover:bg-blue-600 transition-colors"
                        >
                          <MessageSquare size={9} />
                           Отправить SMS
                        </button>
                      ) : null}
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                        payment.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                        payment.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {payment.status === 'paid' ? 'Оплачено' : payment.status === 'pending' ? 'Ожидает' : 'Просрочено'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {guestPayments.length === 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">История платежей</h2>
              <p className="text-gray-400 text-center py-8">Нет платежей</p>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Редактировать гостя">
        <EditGuestForm guest={guest} onClose={() => setShowEdit(false)} onSave={(data) => {
          updateGuest(guest.id, data);
          setShowEdit(false);
        }} />
      </Modal>

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
              <p className="text-xs text-gray-400 mb-2">Получатель: {guest.name} ({guest.phone})</p>
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <p className="text-sm text-gray-900 leading-relaxed">{smsPreview.text}</p>
              </div>
              <p className="text-xs text-gray-400 mt-2">{smsPreview.text.length} символов</p>
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

function EditGuestForm({ guest, onClose, onSave }: { guest: any; onClose: () => void; onSave: (data: Partial<any>) => void }) {
  const [name, setName] = useState(guest.name);
  const [phone, setPhone] = useState(guest.phone);
  const [email, setEmail] = useState(guest.email);
  const [passport, setPassport] = useState(guest.passport);
  const [checkIn, setCheckIn] = useState(guest.checkIn);
  const [checkOut, setCheckOut] = useState(guest.checkOut);
  const [status, setStatus] = useState(guest.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, phone, email, passport, checkIn, checkOut, status });
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя и фамилия</label>
        <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Паспорт / ID</label>
        <input type="text" value={passport} onChange={e => setPassport(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Заезд</label>
          <input required type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Выезд</label>
          <input required type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Статус</label>
        <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="active">Активный</option>
          <option value="reserved">Забронирован</option>
          <option value="checked_out">Выселен</option>
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Отмена</button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">Сохранить</button>
      </div>
    </form>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-gray-300">{icon}</div>
      <div>
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
