import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Users, BedDouble, DollarSign, Edit3, Calendar, ChevronLeft, ChevronRight, X, Maximize2, Minimize2, ImagePlus, UserPlus } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useLanguage } from '../i18n/LanguageContext';
import { roomOccupiedBeds, GUEST_LANGUAGES } from '../utils/helpers';
import Modal from '../components/Modal';
import RoomDatePicker from '../components/RoomDatePicker';
import { PAYMENT_PERIODS } from '../components/RoomBillingSelect';
import type { GuestLanguage, Room, RoomPricePeriod } from '../types';

export default function RoomDetail() {
  const { id } = useParams<{ id: string }>();
  const { rooms, guests, hostels } = useData();
  const { t } = useLanguage();
  const room = rooms.find(r => r.id === id);

  const [photoIndex, setPhotoIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAddGuest, setShowAddGuest] = useState(false);

  const photos = room?.photos ?? [];

  const nextPhoto = useCallback(() => {
    if (photos.length > 0) setPhotoIndex(p => (p + 1) % photos.length);
  }, [photos.length]);

  const prevPhoto = useCallback(() => {
    if (photos.length > 0) setPhotoIndex(p => (p - 1 + photos.length) % photos.length);
  }, [photos.length]);

  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
      if (e.key === 'ArrowRight') nextPhoto();
      if (e.key === 'ArrowLeft') prevPhoto();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [fullscreen, nextPhoto, prevPhoto]);

  if (!room) return <div className="p-8 text-center text-gray-400">{t('Комната не найдена')}</div>;

  const hostel = hostels.find(h => h.id === room.hostelId);
  const roomGuests = guests.filter(g => g.roomId === id);
  const activeGuests = roomGuests.filter(g => g.status === 'active');
  const actualOccupied = roomOccupiedBeds(id!, guests);
  const monthlyRevenue = actualOccupied * room.pricePerBed;

  const typeStyles: Record<string, string> = {
    standard: 'bg-indigo-100 text-indigo-700',
    economy: 'bg-gray-100 text-gray-600',
    vip: 'bg-amber-100 text-amber-700',
  };
  const typeLabels: Record<string, string> = {
    standard: t('Стандарт'),
    economy: t('Эконом'),
    vip: 'VIP',
  };

  return (
    <div className="p-4 sm:p-8">
      <Link href={`/hostel/${room.hostelId}`} className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <ArrowLeft size={16} />
        {t('Вернуться в {hostel}', { hostel: hostel?.name ?? '' })}
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
        {photos.length > 0 && (
          <div className="relative h-72 w-full overflow-hidden bg-gray-100 group">
            <img
              src={photos[photoIndex]}
              alt={t('Фото {n}', { n: photoIndex + 1 })}
              className="w-full h-full object-cover transition-opacity duration-300"
            />

            {photos.length > 1 && (
              <>
                <button onClick={prevPhoto} className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-black/60">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={nextPhoto} className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 text-white flex items-center justify-center lg:opacity-0 lg:group-hover:opacity-100 transition-opacity hover:bg-black/60">
                  <ChevronRight size={20} />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 bg-black/40 rounded-full px-3 py-1.5">
                  {photos.map((_, i) => (
                    <button key={i} onClick={() => setPhotoIndex(i)} className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? 'bg-white scale-110' : 'bg-white/50 hover:bg-white/75'}`} />
                  ))}
                </div>
              </>
            )}

            <div className="absolute top-3 right-3 flex gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
              <button onClick={() => setFullscreen(true)} className="w-9 h-9 rounded-lg bg-black/40 text-white flex items-center justify-center hover:bg-black/60 transition-colors" title={t('Полный экран')}>
                <Maximize2 size={16} />
              </button>
            </div>

            {photos.length > 1 && (
              <div className="absolute top-3 left-3 bg-black/40 text-white text-xs font-medium px-2.5 py-1 rounded-lg">
                {photoIndex + 1} / {photos.length}
              </div>
            )}
          </div>
        )}

        {photos.length === 0 && (
          <div className="h-40 w-full bg-gray-50 flex items-center justify-center">
            <div className="text-center">
              <ImagePlus size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-400">{t('Нет фото')}</p>
            </div>
          </div>
        )}

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{t('Комната {n}', { n: room.number })}</h1>
                <span className={`px-3 py-1 rounded-lg text-sm font-medium ${typeStyles[room.type]}`}>{typeLabels[room.type]}</span>
                {room.hasBalcony && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-600">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> {t('Балкон')}
                  </span>
                )}
                {room.hasPrivateBathroom && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium bg-sky-50 text-sky-600">
                    <span className="w-2 h-2 rounded-full bg-sky-500 inline-block" /> {t('Свой санузел')}
                  </span>
                )}
              </div>
              <p className="text-gray-400">{hostel?.name} · {t('Этаж {n}', { n: room.floor })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button onClick={() => setShowAddGuest(true)} className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-medium hover:bg-emerald-600 transition-colors">
                  <UserPlus size={15} />
                  {t('Добавить гостя')}
                </button>
              <button onClick={() => setShowEdit(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition-colors">
                <Edit3 size={15} />
                {t('Редактировать')}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2"><BedDouble size={18} /><span className="text-sm">{t('Кровати')}</span></div>
              <p className="text-2xl font-bold text-gray-900">{actualOccupied}<span className="text-gray-300 font-normal">/{room.beds}</span></p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2"><Users size={18} /><span className="text-sm">{t('Жильцы')}</span></div>
              <p className="text-2xl font-bold text-gray-900">{activeGuests.length}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2"><DollarSign size={18} /><span className="text-sm">{t('Цена/кровать')}</span></div>
              <p className="text-2xl font-bold text-gray-900">{room.pricePerBed}<span className="text-gray-400 text-sm font-normal"> зл</span></p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2"><DollarSign size={18} /><span className="text-sm">{t('Доход/мес')}</span></div>
              <p className="text-2xl font-bold text-gray-900">{monthlyRevenue.toLocaleString()}<span className="text-gray-400 text-sm font-normal"> зл</span></p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-gray-400">{t('Заполнение')}</span>
              <span className="font-medium text-gray-700">{room.beds > 0 ? Math.round((actualOccupied / room.beds) * 100) : 0}%</span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div className={`h-2.5 rounded-full ${actualOccupied === room.beds ? 'bg-red-400' : 'bg-emerald-500'}`} style={{ width: `${room.beds > 0 ? (actualOccupied / room.beds) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      </div>

      {photos.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 text-sm mb-3">{t('Все фото ({n})', { n: photos.length })}</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
            {photos.map((url, i) => (
              <button
                key={i}
                onClick={() => { setPhotoIndex(i); setFullscreen(true); }}
                className={`relative aspect-video rounded-lg overflow-hidden border-2 transition-all hover:scale-[1.03] ${i === photoIndex ? 'border-indigo-500 ring-2 ring-indigo-200' : 'border-transparent'}`}
              >
                <img src={url} alt={t('Фото {n}', { n: i + 1 })} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      )}

      {activeGuests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">{t('Сейчас проживает')}</h2>
          <div className="space-y-3">
            {activeGuests.map(guest => (
              <Link key={guest.id} href={`/guest/${guest.id}`} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold text-sm">
                    {guest.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{guest.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{guest.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <Calendar size={12} />
                      {guest.checkIn} — {guest.checkOut || '—'}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {guest.checkOut
                        ? t('Остаётся {n} дн.', { n: Math.max(0, Math.ceil((new Date(guest.checkOut).getTime() - Date.now()) / (1000 * 60 * 60 * 24))) })
                        : t('Открытая бронь')}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <RoomCheckoutCalendar beds={room.beds} roomGuests={roomGuests} />
      </div>

      {roomGuests.length > activeGuests.length && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{t('История комнаты')}</h2>
          <div className="space-y-3">
            {roomGuests.filter(g => g.status !== 'active').map(guest => (
              <Link key={guest.id} href={`/guest/${guest.id}`} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all group">
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center font-semibold text-sm">
                    {guest.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{guest.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{guest.checkIn} — {guest.checkOut}</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                  {t('Выселен')}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {roomGuests.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">{t('Жильцы комнаты')}</h2>
          <p className="text-gray-400 text-center py-8">{t('Нет жильцов в комнате')}</p>
        </div>
      )}

      {fullscreen && photos.length > 0 && (
        <div className="fixed inset-0 z-[60] bg-black flex items-center justify-center" onClick={() => setFullscreen(false)}>
          <button onClick={() => setFullscreen(false)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10">
            {fullscreen ? <Minimize2 size={18} /> : <X size={18} />}
          </button>

          {photos.length > 1 && (
            <>
              <button onClick={e => { e.stopPropagation(); prevPhoto(); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                <ChevronLeft size={24} />
              </button>
              <button onClick={e => { e.stopPropagation(); nextPhoto(); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors z-10">
                <ChevronRight size={24} />
              </button>
            </>
          )}

          <img
            src={photos[photoIndex]}
            alt={t('Фото {n}', { n: photoIndex + 1 })}
            className="max-w-[90vw] max-h-[85vh] object-contain rounded-lg"
            onClick={e => e.stopPropagation()}
          />

          {photos.length > 1 && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-4 py-2 z-10">
              <span className="text-white/70 text-sm tabular-nums">{photoIndex + 1} / {photos.length}</span>
              <div className="flex gap-1 ml-2">
                {photos.map((_, i) => (
                  <button key={i} onClick={e => { e.stopPropagation(); setPhotoIndex(i); }} className={`w-2 h-2 rounded-full transition-all ${i === photoIndex ? 'bg-white scale-110' : 'bg-white/40 hover:bg-white/60'}`} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title={t('Редактировать комнату')}>
        <EditRoomForm room={room} onClose={() => setShowEdit(false)} />
      </Modal>

      <Modal isOpen={showAddGuest} onClose={() => setShowAddGuest(false)} title={t('Добавить гостя')}>
        <AddGuestRoomForm room={room} onClose={() => setShowAddGuest(false)} />
      </Modal>
    </div>
  );
}

function AddGuestRoomForm({ room, onClose }: {
  room: { id: string; number: string; hostelId: string; beds: number; pricePerBed: number };
  onClose: () => void;
}) {
  const { addGuestWithPayment, guests, rooms } = useData();
  const { t } = useLanguage();
  const fullRoom = (rooms.find(r => r.id === room.id) ?? room) as Room;
  const todayStr = new Date().toISOString().split('T')[0];
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passport, setPassport] = useState('');
  const [language, setLanguage] = useState<GuestLanguage | ''>('');
  const [period, setPeriod] = useState<RoomPricePeriod>('month');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const daily = fullRoom.pricePerBed;
  const weekly = fullRoom.pricePerWeek ?? daily * 7;
  const monthly = fullRoom.pricePerMonth ?? daily * 30;
  const totalCost = period === 'day' ? daily : period === 'week' ? weekly : monthly;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !checkIn) return;

    try {
      await addGuestWithPayment(
        {
          name,
          phone,
          email,
          passport,
          language: language || undefined,
          roomId: room.id,
          hostelId: room.hostelId,
          checkIn,
          checkOut: checkOut || undefined,
          paymentPeriod: period,
          status: 'active',
          totalPaid: 0,
          totalDue: totalCost,
        },
        {
          guestName: name,
          roomId: room.id,
          amount: totalCost,
          dueDate: checkIn,
          type: 'cash',
          status: 'pending',
          smsSent: false,
        }
      );
      onClose();
    } catch (err) {
      alert(t('Не удалось сохранить гостя: {err}', { err: err instanceof Error ? err.message : t('Ошибка сервера') }));
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Комната')}</label>
        <div className="px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-700 font-medium">{room.number}</div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Способ оплаты')}</label>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_PERIODS.map(p => {
            const price = p.value === 'day' ? daily : p.value === 'week' ? weekly : monthly;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-2.5 rounded-xl border text-center transition-colors ${
                  period === p.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700 ring-1 ring-indigo-500'
                    : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
              >
                <div className="text-xs font-medium">{t(p.label)}</div>
                <div className="text-sm font-bold mt-0.5">{price.toLocaleString()} зл</div>
              </button>
            );
          })}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Имя и фамилия')}</label>
        <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Jan Kowalski" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Телефон')}</label>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+48 501 234 567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Email')}</label>
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
          <option value="">{t('Не выбрано')}</option>
          {GUEST_LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{t(l.label)}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Заселение')}</label>
        <RoomDatePicker
          roomId={room.id}
          beds={room.beds}
          guests={guests}
          value={checkIn}
          onChange={setCheckIn}
          minDate={todayStr}
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Выселение (опционально)')}</label>
        <input type="date" min={checkIn || undefined} value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-indigo-600">{t('Оплата: {n}', { n: t(period === 'day' ? 'День' : period === 'week' ? 'Неделя' : 'Месяц') })}</span>
          <span className="font-bold text-indigo-700">{totalCost.toLocaleString()} зл</span>
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">{t('Отмена')}</button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">{t('Добавить')}</button>
      </div>
    </form>
  );
}

function RoomCheckoutCalendar({ beds, roomGuests }: { beds: number; roomGuests: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { t, monthFull, dayNames } = useLanguage();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const dateStr = (day: number) => `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const activeGuests = roomGuests.filter(g => g.status === 'active');
  const upcoming = activeGuests
    .filter(g => new Date(g.checkOut) >= today)
    .sort((a, b) => a.checkOut.localeCompare(b.checkOut));

  const occupiedOn = (date: string) => activeGuests.filter(g => g.checkIn <= date && g.checkOut > date).length;
  const freeOn = (date: string) => Math.max(0, beds - occupiedOn(date));

  const checkoutsOnDay = (day: number) => activeGuests.filter(g => g.checkOut === dateStr(day));
  const selectedGuests = selectedDate ? activeGuests.filter(g => g.checkOut === selectedDate) : [];

  const daysUntil = (checkOut: string) => Math.max(0, Math.ceil((new Date(checkOut).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const currentFree = freeOn(todayStr);
  const weekCheckouts = upcoming.filter(g => daysUntil(g.checkOut) <= 7).length;
  const nextCheckout = upcoming[0];

  const cellClass = (has: boolean, free: number) => {
    if (has) return 'bg-rose-100 text-rose-700 hover:bg-rose-200';
    if (free === 0) return 'bg-red-50 text-red-700 hover:bg-red-100';
    if (free === beds) return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return 'bg-amber-50 text-amber-700 hover:bg-amber-100';
  };
  const chipClass = (free: number) => {
    if (free === 0) return 'bg-red-500';
    if (free === beds) return 'bg-emerald-500';
    return 'bg-amber-500';
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            {t('Календарь выездов')}
          </h3>
          <p className="text-sm text-gray-400 mt-0.5">{t('Выезды и свободные места по дням')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors text-sm font-bold">{'<'}</button>
          <span className="font-semibold text-gray-900 text-sm min-w-[140px] text-center">{monthFull[month]} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors text-sm font-bold">{'>'}</button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-emerald-50 rounded-xl p-3">
          <p className="text-xs text-emerald-600 mb-0.5">{t('Свободно сейчас')}</p>
          <p className="text-xl font-bold text-emerald-700">{currentFree}<span className="text-sm font-normal text-emerald-500"> {t('из {n} мест', { n: beds })}</span></p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-400 mb-0.5">{t('Занято сейчас')}</p>
          <p className="text-xl font-bold text-gray-900">{beds - currentFree}<span className="text-sm font-normal text-gray-300"> {t('из {n} мест', { n: beds })}</span></p>
        </div>
        <div className="bg-rose-50 rounded-xl p-3">
          <p className="text-xs text-rose-500 mb-0.5">{t('Выездов на 7 дней')}</p>
          <p className="text-xl font-bold text-rose-600">{weekCheckouts}</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-3">
          <p className="text-xs text-indigo-500 mb-0.5">{t('Ближайший выезд')}</p>
          <p className="text-xl font-bold text-indigo-700 truncate">{nextCheckout ? nextCheckout.checkOut : '—'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-[11px] text-gray-500 mb-3">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" />{t('Свободно всё')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" />{t('Частично свободно')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" />{t('Нет мест')}</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-rose-400" />{t('Выезды')}</span>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-5">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const leaving = checkoutsOnDay(day);
          const has = leaving.length > 0;
          const free = freeOn(dateStr(day));
          const isToday = today.getFullYear() === year && today.getMonth() === month && day === today.getDate();
          return (
            <button
              key={day}
              onClick={() => setSelectedDate(dateStr(day))}
              className={`relative rounded-lg p-1.5 text-center transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 min-h-[54px] flex flex-col items-center justify-start ${cellClass(has, free)} ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
            >
              <span className={`text-sm font-semibold leading-none ${isToday ? 'text-indigo-600' : ''}`}>{day}</span>
              {has ? (
                <div className="flex items-center justify-center mt-1">
                  {leaving.slice(0, 3).map((g, gi) => (
                    <span key={g.id} className={`w-5 h-5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center ${gi > 0 ? '-ml-1.5' : ''}`}>
                      {g.name.split(' ').map((n: string) => n[0]).join('')}
                    </span>
                  ))}
                  {leaving.length > 3 && <span className="text-[9px] font-bold text-rose-600 ml-1">+{leaving.length - 3}</span>}
                </div>
              ) : (
                <span className={`mt-1 inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold text-white leading-none ${chipClass(free)}`}>
                  {free === 0 ? t('Нет мест') : t('своб. {n}', { n: free })}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-900 mb-3">{t('Следующие выезды')}</h4>
        {upcoming.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{t('Нет предстоящих выездов')}</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map(g => {
              const days = daysUntil(g.checkOut);
              return (
                <Link key={g.id} href={`/guest/${g.id}`} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                  <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-semibold text-xs shrink-0">
                    {g.name.split(' ').map((n: string) => n[0]).join('')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600 transition-colors">{g.name}</p>
                    <p className="text-xs text-gray-400">{g.checkIn} — {g.checkOut}</p>
                    <p className="text-xs text-emerald-600 mt-0.5">{t('После выезда свободно {n} из {m} мест', { n: freeOn(g.checkOut), m: beds })}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${days <= 3 ? 'bg-red-100 text-red-600' : days <= 7 ? 'bg-orange-100 text-orange-600' : days <= 14 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {days === 0 ? t('Сегодня') : t('Через {n} дн.', { n: days })}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <Modal isOpen={selectedDate !== null} onClose={() => setSelectedDate(null)} title={selectedDate ? `${Number(selectedDate.slice(8, 10))} ${monthFull[Number(selectedDate.slice(5, 7)) - 1]} ${selectedDate.slice(0, 4)}` : ''}>
        {selectedDate && (
          <p className="text-xs text-gray-400 mb-4">
            {t('Свободно {n} из {m} мест · выезжает {k} гостей', { n: freeOn(selectedDate), m: beds, k: selectedGuests.length })}
          </p>
        )}
        {selectedGuests.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{t('В этот день выездов нет')}</p>
        ) : (
          <div className="space-y-2">
            {selectedGuests.map(g => (
              <Link key={g.id} href={`/guest/${g.id}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 -mx-2 transition-colors">
                <div className="w-9 h-9 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-semibold text-xs shrink-0">
                  {g.name.split(' ').map((n: string) => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                  <p className="text-xs text-gray-400">{t('Выезд {date}', { date: g.checkOut })}</p>
                </div>
                <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">{t('Через {n} дн.', { n: daysUntil(g.checkOut) })}</span>
              </Link>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}

function EditRoomForm({ room, onClose }: { room: { id: string; number: string; floor: number; beds: number; type: string; pricePerBed: number; photos?: string[] }; onClose: () => void }) {
  const { updateRoom } = useData();
  const { t } = useLanguage();
  const [number, setNumber] = useState(room.number);
  const [floor, setFloor] = useState(room.floor);
  const [beds, setBeds] = useState(room.beds);
  const [type, setType] = useState(room.type);
  const [price, setPrice] = useState(room.pricePerBed);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRoom(room.id, { number, floor, beds, type: type as 'standard' | 'economy' | 'vip', pricePerBed: price });
    onClose();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Номер комнаты')}</label>
          <input required type="text" value={number} onChange={e => setNumber(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Этаж')}</label>
          <input required type="number" min={0} value={floor} onChange={e => setFloor(Number(e.target.value))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Кровати')}</label>
          <input required type="number" min={1} max={20} value={beds} onChange={e => setBeds(Number(e.target.value))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Тип')}</label>
          <select value={type} onChange={e => setType(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="economy">{t('Эконом')}</option>
            <option value="standard">{t('Стандарт')}</option>
            <option value="vip">VIP</option>
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Цена за кровать (зл/ночь)')}</label>
        <input required type="number" min={0} value={price} onChange={e => setPrice(Number(e.target.value))} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">{t('Отмена')}</button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">{t('Сохранить')}</button>
      </div>
    </form>
  );
}
