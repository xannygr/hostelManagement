import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Users, BedDouble, DollarSign,
  Plus, Search, Phone, Calendar, AlertTriangle,
  ChevronRight, DoorOpen, LayoutGrid, Clock, ArrowDownToLine, ArrowUpFromLine, Send, Filter, BarChart3, Edit3, X, UserPlus
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { roomOccupiedBeds, hostelOccupiedBeds, guestTotalPaid, guestTotalDue } from '../utils/helpers';
import Modal from '../components/Modal';

type Tab = 'map' | 'schedule' | 'guests' | 'residents' | 'debtors' | 'payments' | 'analytics';

export default function HostelDetail() {
  const { id } = useParams<{ id: string }>();
  const { hostels, rooms, guests, payments, updateHostel } = useData();
  const hostel = hostels.find(h => h.id === id);
  const [activeTab, setActiveTab] = useState<Tab>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddGuest, setShowAddGuest] = useState(false);
  const [showEditHostel, setShowEditHostel] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [guestStatusFilter, setGuestStatusFilter] = useState<string>('all');
  const [guestPaymentFilter, setGuestPaymentFilter] = useState<string>('all');
  const [residentPaymentFilter, setResidentPaymentFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>('all');

  if (!hostel) return <div className="p-8 text-center text-gray-400">Hostel not found</div>;

  const hostelRooms = rooms.filter(r => r.hostelId === id);
  const hostelGuests = guests.filter(g => g.hostelId === id);
  const activeGuests = hostelGuests.filter(g => g.status === 'active');
  const debtors = hostelGuests.filter(g => guestTotalDue(g.id, payments) > 0);
  const hostelPayments = payments.filter(p => hostelGuests.some(g => g.id === p.guestId));
  const computedOccupiedBeds = hostelOccupiedBeds(hostel.id, guests);

  const tabs: { key: Tab; label: string; count?: number; icon: React.ReactNode }[] = [
    { key: 'map', label: 'Карта комнат', icon: <LayoutGrid size={16} /> },
    { key: 'schedule', label: 'Расписание', icon: <Clock size={16} /> },
    { key: 'guests', label: 'Гости', count: hostelGuests.length, icon: <Users size={16} /> },
    { key: 'residents', label: 'Жильцы', count: activeGuests.length, icon: <Users size={16} /> },
    { key: 'debtors', label: 'Должники', count: debtors.length, icon: <AlertTriangle size={16} /> },
    { key: 'payments', label: 'Платежи', count: hostelPayments.length, icon: <DollarSign size={16} /> },
    { key: 'analytics', label: 'Аналитика', icon: <BarChart3 size={16} /> },
  ];

  const occupancy = hostel.totalBeds > 0 ? Math.round((computedOccupiedBeds / hostel.totalBeds) * 100) : 0;

  return (
    <div className="p-4 sm:p-8">
      <Link href="/" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 mb-6 transition-colors">
        <        ArrowLeft size={16} />
        Назад к списку
      </Link>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            {hostel.image ? (
              <img src={hostel.image} alt={hostel.name} className="w-14 h-14 rounded-2xl object-cover shrink-0" />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <DoorOpen size={28} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{hostel.name}</h1>
              <p className="text-gray-400 mt-0.5">{hostel.address}</p>
              {(hostel.floors !== undefined || hostel.kitchens !== undefined || hostel.parking || hostel.showers !== undefined || hostel.toilets !== undefined) && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {hostel.floors !== undefined && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">
                      <LayoutGrid size={14} /> {hostel.floors} этажа
                    </span>
                  )}
                  {hostel.kitchens !== undefined && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                      <DoorOpen size={14} /> Кухня: {hostel.kitchens}
                    </span>
                  )}
                  {hostel.parking && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                      <ArrowDownToLine size={14} /> {hostel.parking}
                    </span>
                  )}
                  {hostel.showers !== undefined && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                      <Users size={14} /> Душ: {hostel.showers}
                    </span>
                  )}
                  {hostel.toilets !== undefined && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg">
                      <DoorOpen size={14} /> Туалет: {hostel.toilets}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <button onClick={() => { setEditName(hostel.name); setEditAddress(hostel.address); setShowEditHostel(true); }} className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">
            <            Edit3 size={16} />
            Редактировать
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6">
          <MiniStat icon={<BedDouble size={18} />} label="Кровати" value={`${computedOccupiedBeds}/${hostel.totalBeds}`} />
          <MiniStat icon={<DoorOpen size={18} />} label="Комнаты" value={hostel.totalRooms} />
          <MiniStat icon={<Users size={18} />} label="Жильцы" value={activeGuests.length} />
          <MiniStat icon={<DollarSign size={18} />} label="Доход" value={`${(hostel.monthlyRevenue / 1000).toFixed(1)}к зл`} />
          <MiniStat icon={<AlertTriangle size={18} />} label="Должники" value={debtors.length} danger={debtors.length > 0} />
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-1.5">
            <span className="text-gray-400">Заполнение</span>
            <span className="font-medium text-gray-700">{occupancy}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div className={`h-2.5 rounded-full transition-all ${occupancy > 80 ? 'bg-emerald-500' : occupancy > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${occupancy}%` }} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto border-b border-gray-100">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all relative whitespace-nowrap ${
                activeTab === tab.key ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${activeTab === tab.key ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                  {tab.count}
                </span>
              )}
              {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'map' && <RoomMap rooms={hostelRooms} guests={hostelGuests} roomTypeFilter={roomTypeFilter} setRoomTypeFilter={setRoomTypeFilter} />}
          {activeTab === 'schedule' && <Schedule rooms={hostelRooms} guests={hostelGuests} payments={hostelPayments} hostel={hostel} />}
          {activeTab === 'guests' && (
            <>
              <TabActions search={searchQuery} onSearch={setSearchQuery} onAdd={() => setShowAddGuest(true)} />
              <GuestFilterBar filter={guestStatusFilter} onFilter={setGuestStatusFilter} paymentFilter={guestPaymentFilter} onPaymentFilter={setGuestPaymentFilter} />
              <GuestsList guests={hostelGuests} search={searchQuery} statusFilter={guestStatusFilter} paymentFilter={guestPaymentFilter} />
            </>
          )}
          {activeTab === 'residents' && <>
            <TabActions search={searchQuery} onSearch={setSearchQuery} />
            <ResidentFilterBar paymentFilter={residentPaymentFilter} onPaymentFilter={setResidentPaymentFilter} />
            <ResidentsList guests={activeGuests} search={searchQuery} paymentFilter={residentPaymentFilter} />
          </>}
          {activeTab === 'debtors' && <><TabActions search={searchQuery} onSearch={setSearchQuery} /><DebtorsList guests={debtors} search={searchQuery} /></>}
        </div>
        {activeTab === 'payments' && (
          <div>
            <div className="px-6 pb-4">
              <TabActions search={searchQuery} onSearch={setSearchQuery} />
              <PaymentFilterBar statusFilter={paymentStatusFilter} onStatusFilter={setPaymentStatusFilter} typeFilter={paymentTypeFilter} onTypeFilter={setPaymentTypeFilter} />
            </div>
            <PaymentsList payments={hostelPayments} search={searchQuery} statusFilter={paymentStatusFilter} typeFilter={paymentTypeFilter} />
          </div>
        )}
        {activeTab !== 'payments' && activeTab !== 'map' && activeTab !== 'schedule' && activeTab !== 'guests' && activeTab !== 'debtors' && activeTab !== 'residents' && (
          <div className="p-6">
            {activeTab === 'analytics' && <Analytics rooms={hostelRooms} guests={hostelGuests} payments={hostelPayments} totalBeds={hostel.totalBeds} />}
          </div>
        )}
      </div>

      <Modal isOpen={showAddGuest} onClose={() => setShowAddGuest(false)} title="Добавить гостя">
        <AddGuestForm onClose={() => setShowAddGuest(false)} hostelId={hostel.id} />
      </Modal>

      <Modal isOpen={showEditHostel} onClose={() => setShowEditHostel(false)} title="Редактировать хостел">
        <form className="space-y-4" onSubmit={e => { e.preventDefault(); updateHostel(hostel.id, { name: editName, address: editAddress }); setShowEditHostel(false); }}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Название хостела</label>
            <input required type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Адрес</label>
            <input required type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowEditHostel(false)} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Отмена</button>
            <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">Сохранить</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function RoomMap({ rooms, guests, roomTypeFilter, setRoomTypeFilter }: { rooms: any[]; guests: any[]; roomTypeFilter: string; setRoomTypeFilter: (v: string) => void }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const today = now.toISOString().split('T')[0];

  const filteredRooms = roomTypeFilter === 'all' ? rooms : rooms.filter(r => r.type === roomTypeFilter);
  const filteredFloors = [...new Set(filteredRooms.map(r => r.floor))].sort();

  const typeLabels: Record<string, string> = { all: 'Все', standard: 'Стандарт', economy: 'Эконом', vip: 'VIP' };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Карта комнат</h3>
          <p className="text-sm text-gray-400 mt-0.5">Визуализация доступности комнат в реальном времени</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="tabular-nums font-medium">{now.toLocaleTimeString('ru-RU')}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        {(['all', 'standard', 'economy', 'vip'] as const).map(t => (
          <button
            key={t}
            onClick={() => setRoomTypeFilter(t)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              roomTypeFilter === t
                ? t === 'vip' ? 'bg-indigo-600 text-white' : 'bg-indigo-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {typeLabels[t]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">Свободно</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-gray-500">Частично занято</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-gray-500">Занято</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-indigo-400" /><span className="text-xs text-gray-500">VIP</span></div>
      </div>

      <div className="space-y-6">
        {filteredFloors.map(floor => {
          const floorRooms = filteredRooms.filter(r => r.floor === floor);
          return (
            <div key={floor}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-bold text-gray-300 uppercase tracking-widest">Этаж {floor}</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {floorRooms.map(room => {
                  const actualOccupied = roomOccupiedBeds(room.id, guests);
                  const isFull = actualOccupied === room.beds;
                  const isEmpty = actualOccupied === 0;
                  const roomGuests = guests.filter(g => g.roomId === room.id && g.status === 'active');
                  const todayCheckin = roomGuests.filter(g => g.checkIn === today);
                  const todayCheckout = roomGuests.filter(g => g.checkOut === today);

                  let borderColor = 'border-emerald-300 bg-emerald-50';
                  let bedColor = 'bg-emerald-400';
                  if (isFull) { borderColor = 'border-red-300 bg-red-50'; bedColor = 'bg-red-400'; }
                  else if (!isEmpty) { borderColor = 'border-amber-300 bg-amber-50'; bedColor = 'bg-amber-400'; }

                  if (room.type === 'vip') {
                    borderColor = 'border-indigo-300 bg-indigo-50';
                    bedColor = 'bg-indigo-400';
                    if (isFull) { borderColor = 'border-red-300 bg-red-50'; bedColor = 'bg-red-400'; }
                  }

                  return (
                    <Link href={`/room/${room.id}`} key={room.id} className={`relative border-2 rounded-xl overflow-hidden transition-all hover:shadow-md hover:scale-[1.02] cursor-pointer block ${borderColor}`}>
                      {room.photos?.[0] && (
                        <div className="h-16 w-full overflow-hidden">
                          <img src={room.photos[0]} alt={`Комната ${room.number}`} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-lg font-bold text-gray-900">{room.number}</span>
                        <div className="flex items-center gap-1.5">
                          {room.hasBalcony && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded" title="Балкон">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> балкон
                            </span>
                          )}
                          {room.hasPrivateBathroom && (
                            <span className="flex items-center gap-1 text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded" title="Свой санузел">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" /> санузел
                            </span>
                          )}
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${room.type === 'vip' ? 'bg-indigo-200 text-indigo-700' : room.type === 'economy' ? 'bg-gray-200 text-gray-600' : 'bg-emerald-200 text-emerald-700'}`}>
                            {room.type}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 mb-2">
                        {Array.from({ length: room.beds }).map((_, i) => (
                          <div key={i} className={`h-2.5 flex-1 rounded-full ${i < actualOccupied ? bedColor : 'bg-gray-200'}`} />
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">{actualOccupied}/{room.beds} мест</span>
                        <span className="text-gray-400">{room.pricePerBed} зл</span>
                      </div>
                      </div>
                      {(todayCheckin.length > 0 || todayCheckout.length > 0) && (
                        <div className="absolute -top-2 -right-2 bg-white rounded-full shadow-md border border-gray-100 p-1">
                          {todayCheckin.length > 0 && <ArrowDownToLine size={12} className="text-emerald-500" />}
                          {todayCheckout.length > 0 && <ArrowUpFromLine size={12} className="text-amber-500" />}
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Schedule({ rooms, guests, payments, hostel }: { rooms: any[]; guests: any[]; payments: any[]; hostel: any }) {
  const { addGuestWithPayment } = useData();
  const [now, setNow] = useState(new Date());
  const [range, setRange] = useState<7 | 14 | 30>(7);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAddGuest, setShowAddGuest] = useState(false);

  const [gName, setGName] = useState('');
  const [gPhone, setGPhone] = useState('');
  const [gEmail, setGEmail] = useState('');
  const [gPassport, setGPassport] = useState('');
  const [gCheckOut, setGCheckOut] = useState('');
  const [gRoomId, setGRoomId] = useState('');

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const startDate = new Date(now);
  startDate.setHours(0, 0, 0, 0);

  const days: Date[] = [];
  for (let i = -1; i < range; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }

  const dateStr = (d: Date) => d.toISOString().split('T')[0];
  const todayStr = dateStr(now);

  const totalBeds = rooms.reduce((s, r) => s + r.beds, 0);

  const getEvents = (date: Date) => {
    const ds = dateStr(date);
    const checkins = guests.filter(g => g.checkIn === ds);
    const checkouts = guests.filter(g => g.checkOut === ds);
    return { checkins, checkouts };
  };

  const getOccupiedOnDate = (date: Date) => {
    const ds = dateStr(date);
    return guests.filter(g => g.status === 'active' && g.checkIn <= ds && g.checkOut > ds).length;
  };

  const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  const monthNames = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

  const totalCheckins = days.reduce((s, d) => s + getEvents(d).checkins.length, 0);
  const totalCheckouts = days.reduce((s, d) => s + getEvents(d).checkouts.length, 0);

  const availableRooms = rooms.filter(r => roomOccupiedBeds(r.id, guests) < r.beds);
  const occupiedRooms = rooms.filter(r => roomOccupiedBeds(r.id, guests) > 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Расписание заселений и выселений</h3>
          <p className="text-sm text-gray-400 mt-0.5">
            {totalCheckins} заселений · {totalCheckouts} выселений в ближайшие {range} дней
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="tabular-nums font-medium">{now.toLocaleTimeString('ru-RU')}</span>
          </div>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            {[7, 14, 30].map(r => (
              <button key={r} onClick={() => setRange(r as 7 | 14 | 30)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${range === r ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
                {r} дн.
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2"><ArrowDownToLine size={14} className="text-emerald-500" /><span className="text-xs text-gray-500">Заселение</span></div>
        <div className="flex items-center gap-2"><ArrowUpFromLine size={14} className="text-amber-500" /><span className="text-xs text-gray-500">Выселение</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">Много мест</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-gray-500">Мало мест</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-400" /><span className="text-xs text-gray-500">Полностью</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded border border-red-300 bg-red-50" /><span className="text-xs text-gray-500">Есть долг</span></div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <div className="min-w-[700px]">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(100px, 1fr))` }}>
            {days.map((day, i) => {
              const ds = dateStr(day);
              const isToday = ds === todayStr;
              const events = getEvents(day);
              const hasEvents = events.checkins.length > 0 || events.checkouts.length > 0;
              const occupied = getOccupiedOnDate(day);
              const free = totalBeds - occupied;
              const occupancyPct = Math.round((occupied / totalBeds) * 100);
              const isFull = free === 0;
              const isLow = free > 0 && free <= 5;

              return (
                <div key={i} className={`rounded-xl border-2 p-3 transition-all flex flex-col overflow-hidden ${isToday ? 'border-indigo-400 bg-indigo-50 shadow-md' : hasEvents ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
                  <div className={`text-center mb-2 pb-2 border-b ${isToday ? 'border-indigo-200' : 'border-gray-100'}`}>
                    <p className={`text-xs font-medium ${isToday ? 'text-indigo-600' : 'text-gray-400'}`}>{dayNames[day.getDay()]}</p>
                    <p className={`text-lg font-bold ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>{day.getDate()}</p>
                    <p className={`text-xs ${isToday ? 'text-indigo-400' : 'text-gray-400'}`}>{monthNames[day.getMonth()]}</p>
                    {isToday && <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">СЕГОДНЯ</span>}
                  </div>

                  <div className={`mb-2 p-1.5 rounded-lg text-center ${isFull ? 'bg-red-100' : isLow ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                    <p className={`text-[10px] font-bold ${isFull ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {free} св.
                    </p>
                    <div className="w-full bg-white/60 rounded-full h-1 mt-1">
                      <div className={`h-1 rounded-full ${isFull ? 'bg-red-400' : isLow ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${occupancyPct}%` }} />
                    </div>
                  </div>

                  <div className="space-y-1.5 min-h-[80px] flex-1 overflow-hidden">
                    {events.checkins.map((g: any) => {
                      const room = rooms.find((r: any) => r.id === g.roomId);
                      const hasUnpaid = payments.some(p => p.guestId === g.id && p.status !== 'paid');
                      return (
                        <Link key={g.id} href={`/guest/${g.id}`} className={`block rounded-lg px-2 py-1.5 group transition-colors ${hasUnpaid ? 'bg-red-50 border border-red-300 hover:bg-red-100' : 'bg-emerald-100 border border-emerald-200 hover:bg-emerald-200'}`}>
                          <div className="flex items-center gap-1">
                            <ArrowDownToLine size={10} className={`${hasUnpaid ? 'text-red-500' : 'text-emerald-600'} shrink-0`} />
                            <p className={`text-[11px] font-semibold truncate ${hasUnpaid ? 'text-red-800 group-hover:text-red-900' : 'text-emerald-800 group-hover:text-emerald-900'}`}>{g.name}</p>
                            {hasUnpaid && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                          </div>
                          <p className={`text-[10px] ml-3.5 ${hasUnpaid ? 'text-red-500' : 'text-emerald-600'}`}>Ном. {room?.number}</p>
                        </Link>
                      );
                    })}
                    {events.checkouts.map((g: any) => {
                      const room = rooms.find((r: any) => r.id === g.roomId);
                      const hasUnpaid = payments.some(p => p.guestId === g.id && p.status !== 'paid');
                      return (
                        <Link key={g.id} href={`/guest/${g.id}`} className={`block rounded-lg px-2 py-1.5 group transition-colors ${hasUnpaid ? 'bg-red-50 border border-red-300 hover:bg-red-100' : 'bg-amber-100 border border-amber-200 hover:bg-amber-200'}`}>
                          <div className="flex items-center gap-1">
                            <ArrowUpFromLine size={10} className={`${hasUnpaid ? 'text-red-500' : 'text-amber-600'} shrink-0`} />
                            <p className={`text-[11px] font-semibold truncate ${hasUnpaid ? 'text-red-800 group-hover:text-red-900' : 'text-amber-800 group-hover:text-amber-900'}`}>{g.name}</p>
                            {hasUnpaid && <AlertTriangle size={10} className="text-red-500 shrink-0" />}
                          </div>
                          <p className={`text-[10px] ml-3.5 ${hasUnpaid ? 'text-red-500' : 'text-amber-600'}`}>Ном. {room?.number}</p>
                        </Link>
                      );
                    })}
                  </div>

                  {free > 0 && (
                    <button
                      onClick={() => { setSelectedDate(ds); setGRoomId(''); setGName(''); setGPhone(''); setGEmail(''); setGPassport(''); setGCheckOut(''); setShowAddGuest(true); }}
                      className="mt-2 py-1.5 px-2 mx-auto rounded-lg border border-dashed border-indigo-300 text-indigo-500 text-[11px] font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-colors inline-flex items-center gap-1 shrink-0 leading-none max-w-full"
                    >
                      <UserPlus size={12} strokeWidth={2} className="shrink-0" />
                      <span className="leading-none pt-px whitespace-nowrap overflow-hidden text-ellipsis">Добавить</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <DoorOpen size={16} className="text-indigo-500" />
            <h4 className="font-semibold text-gray-900 text-sm">Свободные комнаты</h4>
            <span className="ml-auto text-xs text-gray-400">{availableRooms.length} из {rooms.length}</span>
          </div>
          {availableRooms.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Нет свободных комнат</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {availableRooms.map(r => {
                const occ = roomOccupiedBeds(r.id, guests);
                const free = r.beds - occ;
                return (
                  <Link key={r.id} href={`/room/${r.id}`} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 w-10">{r.number}</span>
                      <div>
                        <p className="text-xs text-gray-500">{free} свободн.</p>
                        <p className="text-[10px] text-gray-400">{r.type} · этаж {r.floor} · {r.pricePerBed} зл</p>
                      </div>
                    </div>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${free >= 3 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      {free}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={16} className="text-amber-500" />
            <h4 className="font-semibold text-gray-900 text-sm">Ближайшие выселения</h4>
          </div>
          {occupiedRooms.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">Нет занятых комнат</p>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {occupiedRooms
                .map(r => {
                  const guest = guests.find(g => g.roomId === r.id && g.status === 'active');
                  if (!guest) return null;
                  const checkout = new Date(guest.checkOut);
                  const today = new Date(now);
                  today.setHours(0, 0, 0, 0);
                  const daysUntil = Math.ceil((checkout.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return { room: r, guest, daysUntil, checkout: guest.checkOut };
                })
                .filter((x): x is { room: any; guest: any; daysUntil: number; checkout: any } => x !== null)
                .sort((a, b) => a.daysUntil - b.daysUntil)
                .map(({ room: r, guest, daysUntil, checkout }) => (
                  <Link key={r.id} href={`/guest/${guest.id}`} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 hover:bg-amber-50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 w-10">{r.number}</span>
                      <div>
                        <p className="text-xs text-gray-500">{guest.name}</p>
                        <p className="text-[10px] text-gray-400">Выселение: {checkout}</p>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                      daysUntil <= 0 ? 'bg-red-100 text-red-600' :
                      daysUntil <= 2 ? 'bg-amber-100 text-amber-600' :
                      'bg-emerald-100 text-emerald-600'
                    }`}>
                      {daysUntil <= 0 ? 'Dzisiaj' : daysUntil === 1 ? 'Jutro' : `Za ${daysUntil} dni`}
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </div>
      </div>

      {showAddGuest && selectedDate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAddGuest(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Добавить гостя</h3>
                <p className="text-xs text-gray-400 mt-0.5">Заселение: {selectedDate}</p>
              </div>
              <button onClick={() => setShowAddGuest(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!gName || !gPhone || !gRoomId || !gCheckOut) return;
              const room = rooms.find((r: any) => r.id === gRoomId);
              if (!room) return;
              const nights = Math.max(1, Math.ceil((new Date(gCheckOut).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)));
              const totalCost = nights * room.pricePerBed;
              try {
                await addGuestWithPayment(
                  {
                    name: gName, phone: gPhone, email: gEmail, passport: gPassport,
                    roomId: gRoomId, hostelId: hostel.id, checkIn: selectedDate, checkOut: gCheckOut,
                    status: 'active', totalPaid: 0, totalDue: totalCost,
                  },
                  {
                    guestName: gName, roomId: gRoomId, amount: totalCost,
                    dueDate: selectedDate, type: 'cash', status: 'pending', smsSent: false,
                  }
                );
                setShowAddGuest(false);
              } catch (err) {
                alert('Не удалось сохранить гостя: ' + (err instanceof Error ? err.message : 'ошибка сервера'));
              }
            }} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Имя и фамилия *</label>
                <input type="text" required value={gName} onChange={e => setGName(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="напр. Ян Ковальски" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Телефон *</label>
                  <input type="tel" required value={gPhone} onChange={e => setGPhone(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="+48 ..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
                  <input type="email" value={gEmail} onChange={e => setGEmail(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="email@..." />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Номер паспорта</label>
                <input type="text" value={gPassport} onChange={e => setGPassport(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="AB1234567" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Комната *</label>
                <select required value={gRoomId} onChange={e => setGRoomId(e.target.value)} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent">
                  <option value="">Выберите комнату...</option>
                  {rooms.filter(r => roomOccupiedBeds(r.id, guests) < r.beds).map(r => {
                    const free = r.beds - roomOccupiedBeds(r.id, guests);
                    return <option key={r.id} value={r.id}>Ном. {r.number} — {free} св. ({r.pricePerBed} зл/ночь)</option>;
                  })}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Заселение *</label>
                  <input type="date" required value={selectedDate} readOnly className="w-full px-3 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm text-gray-600 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Выселение *</label>
                  <input type="date" required value={gCheckOut} onChange={e => setGCheckOut(e.target.value)} min={selectedDate} className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
                </div>
              </div>
              {gRoomId && selectedDate && gCheckOut && (() => {
                const room = rooms.find((r: any) => r.id === gRoomId);
                if (!room) return null;
                const nights = Math.max(1, Math.ceil((new Date(gCheckOut).getTime() - new Date(selectedDate).getTime()) / (1000 * 60 * 60 * 24)));
                return (
                  <div className="bg-indigo-50 rounded-xl p-3 text-center">
                    <p className="text-xs text-indigo-600">{nights} {nights === 1 ? 'ночь' : nights <= 4 ? 'ночи' : 'ночей'} × {room.pricePerBed} зл</p>
                    <p className="text-lg font-bold text-indigo-700">{(nights * room.pricePerBed).toLocaleString()} зл</p>
                  </div>
                );
              })()}
              <button type="submit" disabled={!gName || !gPhone || !gRoomId || !gCheckOut} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors">
                Добавить гостя
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabActions({ search, onSearch, onAdd }: { search: string; onSearch: (v: string) => void; onAdd?: () => void }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
      <div className="relative flex-1 max-w-sm">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
        <input type="text" placeholder="Поиск..." value={search} onChange={e => onSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all" />
      </div>
      {onAdd && (
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
          <Plus size={18} />
           Добавить гостя
        </button>
      )}
    </div>
  );
}

function MiniStat({ icon, label, value, danger }: { icon: React.ReactNode; label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3.5">
      <div className={`flex items-center gap-2 mb-1.5 ${danger ? 'text-red-500' : 'text-gray-400'}`}>
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className={`text-lg font-bold ${danger ? 'text-red-600' : 'text-gray-900'}`}>{value}</p>
    </div>
  );
}

function GuestFilterBar({ filter, onFilter, paymentFilter, onPaymentFilter }: { filter: string; onFilter: (v: string) => void; paymentFilter: string; onPaymentFilter: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Filter size={14} className="text-gray-400" />
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {[
          { key: 'all', label: 'Все' },
          { key: 'active', label: 'Активные' },
          { key: 'reserved', label: 'Забронированы' },
          { key: 'checked_out', label: 'Выселены' },
        ].map(f => (
          <button key={f.key} onClick={() => onFilter(f.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${filter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {[
          { key: 'all', label: 'Оплата: все' },
          { key: 'paid', label: 'Оплатили' },
          { key: 'unpaid', label: 'Не оплатили' },
          { key: 'debt', label: 'Должники' },
        ].map(f => (
          <button key={f.key} onClick={() => onPaymentFilter(f.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${paymentFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResidentFilterBar({ paymentFilter, onPaymentFilter }: { paymentFilter: string; onPaymentFilter: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      <Filter size={14} className="text-gray-400" />
      <div className="flex bg-gray-100 rounded-lg p-0.5">
        {[
          { key: 'all', label: 'Оплата: все' },
          { key: 'paid', label: 'Оплатили' },
          { key: 'unpaid', label: 'Не оплатили' },
          { key: 'debt', label: 'Должники' },
        ].map(f => (
          <button key={f.key} onClick={() => onPaymentFilter(f.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${paymentFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function GuestsList({ guests: g, search, statusFilter, paymentFilter }: { guests: any[]; search: string; statusFilter: string; paymentFilter: string }) {
  const { rooms, payments } = useData();
  const filtered = g.filter(x => {
    const matchesSearch = x.name.toLowerCase().includes(search.toLowerCase()) || x.phone.includes(search);
    const matchesStatus = statusFilter === 'all' || x.status === statusFilter;
    const due = guestTotalDue(x.id, payments);
    const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? due <= 0 : paymentFilter === 'unpaid' ? payments.some(p => p.guestId === x.id && p.status !== 'paid') : payments.some(p => p.guestId === x.id && p.status === 'overdue'));
    return matchesSearch && matchesStatus && matchesPayment;
  });
  if (filtered.length === 0) return <EmptyState text="Гости не найдены" />;

  return (
    <>
      <div className="block lg:hidden space-y-2">
        {filtered.map(guest => {
          const room = rooms.find(r => r.id === guest.roomId);
          return (
            <Link key={guest.id} href={`/guest/${guest.id}`} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 hover:bg-indigo-50 transition-colors group">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs shrink-0">{guest.name.split(' ').map((n: string) => n[0]).join('')}</div>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate text-sm">{guest.name}</p>
                   <p className="text-xs text-gray-400 truncate">Ном. {room?.number}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <StatusBadge status={guest.status} />
                <button
                  type="button"
                  onClick={e => {
                    e.stopPropagation();
                    window.location.href = `tel:${guest.phone.replace(/\s/g, '')}`;
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors shrink-0"
                  title={`Zadzwon: ${guest.phone}`}
                >
                  <Phone size={14} />
                </button>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="hidden lg:block rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th className="px-4 py-3 font-medium text-gray-400">Гость</th>
              <th className="px-4 py-3 font-medium text-gray-400">Комната</th>
              <th className="px-4 py-3 font-medium text-gray-400">Срок</th>
              <th className="px-4 py-3 font-medium text-gray-400 text-right">Status</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filtered.map(guest => {
              const room = rooms.find(r => r.id === guest.roomId);
              return (
                <tr key={guest.id} className="hover:bg-gray-50 transition-colors group cursor-pointer" onClick={() => window.location.href = `/guest/${guest.id}`}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-semibold text-xs shrink-0">{guest.name.split(' ').map((n: string) => n[0]).join('')}</div>
                      <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{guest.name}</p>
                    </div>
                  </td>
                   <td className="px-4 py-3 text-gray-600 whitespace-nowrap">Комната {room?.number}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">
                    <span className="flex items-center gap-1"><Calendar size={12} className="text-gray-300" />{guest.checkIn} — {guest.checkOut}</span>
                  </td>
                  <td className="px-4 py-3 text-right"><StatusBadge status={guest.status} /></td>
                  <td className="px-4 py-3">
                    <a
                      href={`tel:${guest.phone.replace(/\s/g, '')}`}
                      onClick={e => e.stopPropagation()}
                      className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors shrink-0"
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
  );
}

function DebtorsList({ guests: g, search }: { guests: any[]; search: string }) {
  const { rooms, payments } = useData();
  const filtered = g.filter(x => x.name.toLowerCase().includes(search.toLowerCase()));
  if (filtered.length === 0) return <EmptyState text="Нет должников" />;
  return (
    <div className="space-y-2">
      {filtered.map(guest => {
        const room = rooms.find(r => r.id === guest.roomId);
        const due = guestTotalDue(guest.id, payments);
        return (
          <div key={guest.id} className="flex items-center justify-between p-4 rounded-xl hover:bg-red-50 transition-all group">
            <Link href={`/guest/${guest.id}`} className="flex items-center gap-4 flex-1 min-w-0">
              <div className="w-11 h-11 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-semibold text-sm">{guest.name.split(' ').map((n: string) => n[0]).join('')}</div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-red-600 transition-colors">{guest.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Комната {room?.number} · {guest.phone}</p>
              </div>
            </Link>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="font-semibold text-red-500">{due.toLocaleString()} зл</p>
                <p className="text-xs text-gray-400">долг</p>
              </div>
              <a
                href={`tel:${guest.phone.replace(/\s/g, '')}`}
                onClick={e => e.stopPropagation()}
                className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center hover:bg-emerald-200 transition-colors"
                title={`Позвонить: ${guest.phone}`}
              >
                <Phone size={16} />
              </a>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ResidentsList({ guests: g, search, paymentFilter }: { guests: any[]; search: string; paymentFilter: string }) {
  const { rooms, payments } = useData();
  const filtered = g.filter(x => {
    const matchesSearch = x.name.toLowerCase().includes(search.toLowerCase());
    const due = guestTotalDue(x.id, payments);
    const matchesPayment = paymentFilter === 'all' || (paymentFilter === 'paid' ? due <= 0 : paymentFilter === 'unpaid' ? payments.some(p => p.guestId === x.id && p.status !== 'paid') : payments.some(p => p.guestId === x.id && p.status === 'overdue'));
    return matchesSearch && matchesPayment;
  });
  if (filtered.length === 0) return <EmptyState text="Нет жильцов" />;
  return (
    <div className="space-y-2">
      {filtered.map(guest => {
        const room = rooms.find(r => r.id === guest.roomId);
        const paid = guestTotalPaid(guest.id, payments);
        const due = guestTotalDue(guest.id, payments);
        return (
          <Link key={guest.id} href={`/guest/${guest.id}`} className="flex items-center justify-between p-4 rounded-xl hover:bg-gray-50 transition-all group">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-semibold text-sm">{guest.name.split(' ').map((n: string) => n[0]).join('')}</div>
              <div>
                <p className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">{guest.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">Комната {room?.number} · Заселение {guest.checkIn}</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-700">{paid.toLocaleString()} зл <span className="text-xs text-gray-400">оплачено</span></p>
                {due > 0 && <p className="text-sm text-red-500">{due.toLocaleString()} зл <span className="text-xs text-gray-400">долг</span></p>}
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function PaymentFilterBar({ statusFilter, onStatusFilter, typeFilter, onTypeFilter }: { statusFilter: string; onStatusFilter: (v: string) => void; typeFilter: string; onTypeFilter: (v: string) => void }) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
      <div className="flex items-center gap-2">
        <Filter size={14} className="text-gray-400" />
        <span className="text-xs text-gray-400">Status:</span>
      </div>
      <div className="flex bg-gray-100 rounded-lg p-0.5 flex-wrap">
        {[
          { key: 'all', label: 'Все' },
          { key: 'paid', label: 'Оплачено' },
          { key: 'pending', label: 'Ожидает' },
          { key: 'overdue', label: 'Просрочено' },
        ].map(f => (
          <button key={f.key} onClick={() => onStatusFilter(f.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${statusFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>
      <div className="w-px h-4 bg-gray-200 hidden sm:block" />
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Typ:</span>
      </div>
      <div className="flex bg-gray-100 rounded-lg p-0.5 flex-wrap">
        {[
          { key: 'all', label: 'Все' },
          { key: 'cash', label: 'Наличные' },
          { key: 'card', label: 'Карта' },
          { key: 'transfer', label: 'Перевод' },
        ].map(f => (
          <button key={f.key} onClick={() => onTypeFilter(f.key)} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${typeFilter === f.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}>
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function PaymentsList({ payments: p, search, statusFilter, typeFilter }: { payments: any[]; search: string; statusFilter: string; typeFilter: string }) {
  const { rooms, guests, hostels, updatePayment } = useData();
  const [smsPreview, setSmsPreview] = useState<{ text: string; guestName: string; guestPhone: string; paymentId: string } | null>(null);

  const getSmsText = (payment: any, guest: any) => {
    const hostel = hostels.find((h: any) => h.id === guest?.hostelId);
    return `Уважаемый/ая ${payment.guestName.split(' ')[0]}, напоминаем об оплате в размере ${payment.amount.toLocaleString()} зл, срок которой ${payment.dueDate}. Хостел ${hostel?.name || ''}.`;
  };

  const confirmSendSms = () => {
    if (!smsPreview) return;
    updatePayment(smsPreview.paymentId, { smsSent: true });
    setSmsPreview(null);
  };

  const filtered = p.filter((x: any) => {
    const matchesSearch = x.guestName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all' || x.status === statusFilter;
    const matchesType = typeFilter === 'all' || x.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
  if (filtered.length === 0) return <EmptyState text="Нет платежей" />;

  return (
    <>
    <div className="block lg:hidden space-y-2 px-4 pb-4">
      {filtered.map((payment: any) => {
        const guest = guests.find((g: any) => g.id === payment.guestId);
        return (
          <div key={payment.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link href={`/guest/${payment.guestId}`} className="font-medium text-gray-900 hover:text-indigo-600 transition-colors truncate">
                    {payment.guestName}
                  </Link>
                  {guest && (
                    <a href={`tel:${guest.phone.replace(/\s/g, '')}`} className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-600 hover:bg-emerald-200 flex items-center justify-center shrink-0 transition-colors" title={`Позвонить: ${guest.phone}`}>
                      <Phone size={13} />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-0.5">Ном. {rooms.find((r: any) => r.id === payment.roomId)?.number} · {payment.type === 'card' ? 'Карта' : payment.type === 'cash' ? 'Наличные' : 'Перевод'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Срок {payment.dueDate}{payment.paidDate ? ` · оплачено ${payment.paidDate}` : ''}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-semibold text-gray-900">{payment.amount.toLocaleString()} зл</p>
                <PaymentStatus status={payment.status} />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              {payment.smsSent && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">
                  <Send size={9} /> SMS
                </span>
              )}
              {(payment.status === 'overdue' || payment.status === 'pending') && guest && (
                <button
                  onClick={() => setSmsPreview({
                    text: getSmsText(payment, guest),
                    guestName: payment.guestName,
                    guestPhone: guest?.phone || '',
                    paymentId: payment.id,
                  })}
                  className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors"
                >
                  <Send size={12} /> SMS
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>

    <div className="hidden lg:block">
    <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
      <colgroup>
        <col style={{ width: '26%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '12%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '13%' }} />
        <col style={{ width: '10%' }} />
        <col style={{ width: '16%' }} />
      </colgroup>
      <thead>
        <tr className="bg-gray-50 text-left border-t border-gray-100">
          <th className="px-5 py-3 font-medium text-gray-400">Гость</th>
          <th className="px-5 py-3 font-medium text-gray-400">Комната</th>
          <th className="px-5 py-3 font-medium text-gray-400">Сумма</th>
          <th className="px-5 py-3 font-medium text-gray-400">Срок</th>
          <th className="px-5 py-3 font-medium text-gray-400">Оплачено</th>
          <th className="px-5 py-3 font-medium text-gray-400">Тип</th>
          <th className="px-5 py-3 font-medium text-gray-400">Статус</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {filtered.map((payment: any) => {
          const guest = guests.find((g: any) => g.id === payment.guestId);
          return (
          <tr key={payment.id} className="hover:bg-gray-50 transition-colors group">
            <td className="px-5 py-3">
              <div className="flex items-center gap-2">
                <Link href={`/guest/${payment.guestId}`} className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                  {payment.guestName}
                </Link>
                {guest && (
                  <>
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
                    {(payment.status === 'overdue' || payment.status === 'pending') && (
                      <button
                        onClick={() => setSmsPreview({
                          text: getSmsText(payment, guest),
                          guestName: payment.guestName,
                          guestPhone: guest?.phone || '',
                          paymentId: payment.id,
                        })}
                        className="w-7 h-7 rounded-full flex items-center justify-center transition-colors shrink-0 bg-blue-100 text-blue-600 hover:bg-blue-200"
                        title="Отправить SMS"
                      >
                        <Send size={13} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </td>
            <td className="px-5 py-3 text-gray-500">Ном. {rooms.find((r: any) => r.id === payment.roomId)?.number}</td>
            <td className="px-5 py-3 font-semibold text-gray-900">{payment.amount.toLocaleString()} зл</td>
            <td className="px-5 py-3 text-gray-500 text-xs">{payment.dueDate}</td>
            <td className="px-5 py-3 text-gray-400 text-xs">{payment.paidDate || '-'}</td>
            <td className="px-5 py-3 text-gray-500">{payment.type === 'card' ? 'Карта' : payment.type === 'cash' ? 'Наличные' : 'Перевод'}</td>
            <td className="px-5 py-3">
              <PaymentStatus status={payment.status} />
            </td>
          </tr>
          );
        })}
      </tbody>
    </table>
    </div>

    <Modal isOpen={!!smsPreview} onClose={() => setSmsPreview(null)} title="Отправка SMS">
      {smsPreview && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-200">
              <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center text-sm font-bold text-indigo-600">
                {smsPreview.guestName[0]}
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">{smsPreview.guestName}</p>
                <p className="text-xs text-gray-400">{smsPreview.guestPhone}</p>
              </div>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{smsPreview.text}</p>
            <p className="text-xs text-gray-400 mt-3 pt-3 border-t border-gray-200">{smsPreview.text.length} символов</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setSmsPreview(null)} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors text-sm">
              Отмена
            </button>
            <button onClick={confirmSendSms} className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors text-sm inline-flex items-center justify-center gap-2">
              <Send size={14} />
              Отправить
            </button>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { active: 'bg-emerald-100 text-emerald-700', checked_out: 'bg-gray-100 text-gray-500', reserved: 'bg-amber-100 text-amber-700' };
  const labels: Record<string, string> = { active: 'Активный', checked_out: 'Выселен', reserved: 'Забронирован' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || styles.active}`}>{labels[status] || status}</span>;
}

function PaymentStatus({ status }: { status: string }) {
  const styles: Record<string, string> = { paid: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', overdue: 'bg-red-100 text-red-700' };
  const labels: Record<string, string> = { paid: 'Oplacone', pending: 'Oczekuje', overdue: 'Zalegla' };
  return <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] || ''}`}>{labels[status] || status}</span>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search size={24} className="text-gray-300" /></div>
      <p className="text-gray-400">{text}</p>
    </div>
  );
}

function OccupancyCalendar({ rooms, guests }: { rooms: any[]; guests: any[] }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const totalBeds = rooms.reduce((s, r) => s + r.beds, 0);

  const getOccupancyForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const occupiedBeds = guests.filter(g => g.checkIn <= dateStr && g.checkOut > dateStr).reduce((s, g) => {
      const room = rooms.find(r => r.id === g.roomId);
      return s + (room ? 1 : 0);
    }, 0);
    return totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  };

  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const avgOccupancy = Math.round(
    Array.from({ length: daysInMonth }, (_, i) => getOccupancyForDate(i + 1)).reduce((s, v) => s + v, 0) / daysInMonth
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-semibold text-gray-900">Календарь загрузки</h3>
          <p className="text-sm text-gray-400 mt-0.5">Средняя загрузка: <span className="font-medium text-gray-600">{avgOccupancy}%</span></p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors text-sm font-bold">{'<'}</button>
          <span className="font-semibold text-gray-900 text-sm min-w-[140px] text-center">{monthNames[month]} {year}</span>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors text-sm font-bold">{'>'}</button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-emerald-400" /><span className="text-xs text-gray-500">&gt;80%</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-amber-400" /><span className="text-xs text-gray-500">50-80%</span></div>
        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded bg-red-300" /><span className="text-xs text-gray-500">&lt;50%</span></div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
        ))}
        {Array.from({ length: startOffset }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const occ = getOccupancyForDate(day);
          const isToday = isCurrentMonth && day === today.getDate();
          let color = 'bg-emerald-100 text-emerald-700';
          if (occ > 80) color = 'bg-emerald-200 text-emerald-800';
          else if (occ >= 50) color = 'bg-amber-100 text-amber-700';
          else if (occ > 0) color = 'bg-red-100 text-red-600';
          else color = 'bg-gray-50 text-gray-400';

          return (
            <button
              key={day}
              onClick={() => setSelectedDate(`${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`)}
              className={`relative rounded-lg p-2 text-center transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${color} ${isToday ? 'ring-2 ring-indigo-400' : ''}`}
            >
              <span className={`text-sm font-semibold ${isToday ? 'text-indigo-600' : ''}`}>{day}</span>
              {occ > 0 && <p className="text-[10px] font-bold mt-0.5">{occ}%</p>}
            </button>
          );
        })}
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h4 className="font-semibold text-gray-900 text-sm mb-4">Oblozenie wg pokoi</h4>
        <div className="space-y-3">
          {rooms.map(room => ({
            room,
            occ: roomOccupiedBeds(room.id, guests)
          })).sort((a, b) => b.occ - a.occ).map(({ room, occ }) => {
            const pct = room.beds > 0 ? Math.round((occ / room.beds) * 100) : 0;
            return (
              <div key={room.id} className="flex items-center gap-3">
                <span className="text-sm font-bold text-gray-900 w-12">{room.number}</span>
                <div className="flex-1">
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className={`h-2.5 rounded-full transition-all ${pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-400'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <span className="text-xs font-medium text-gray-500 w-16 text-right">{occ}/{room.beds}</span>
                <span className={`text-xs font-bold w-10 text-right ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <Modal isOpen={selectedDate !== null} onClose={() => setSelectedDate(null)} title={selectedDate ? `${Number(selectedDate.slice(8, 10))} ${monthNames[Number(selectedDate.slice(5, 7)) - 1]} ${selectedDate.slice(0, 4)}` : ''}>
        {selectedDate && (
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Заселения
              </h4>
              {(() => {
                const checkins = guests.filter(g => g.checkIn === selectedDate);
                if (checkins.length === 0) return <p className="text-sm text-gray-400">Нет заселений</p>;
                return (
                  <div className="space-y-2">
                    {checkins.map(g => {
                      const room = rooms.find(r => r.id === g.roomId);
                      return (
                        <Link key={g.id} href={`/guest/${g.id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-xs shrink-0">
                            {g.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                            <p className="text-xs text-gray-400">Номер {room?.number || '—'}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500" /> Выселения
              </h4>
              {(() => {
                const checkouts = guests.filter(g => g.checkOut === selectedDate);
                if (checkouts.length === 0) return <p className="text-sm text-gray-400">Нет выселений</p>;
                return (
                  <div className="space-y-2">
                    {checkouts.map(g => {
                      const room = rooms.find(r => r.id === g.roomId);
                      return (
                        <Link key={g.id} href={`/guest/${g.id}`} className="flex items-center gap-3 hover:bg-gray-50 rounded-lg p-2 -mx-2 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center font-semibold text-xs shrink-0">
                            {g.name.split(' ').map((n: string) => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{g.name}</p>
                            <p className="text-xs text-gray-400">Номер {room?.number || '—'}</p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function Analytics({ rooms, guests, payments, totalBeds }: { rooms: any[]; guests: any[]; payments: any[]; totalBeds: number }) {
  const [monthsCount, setMonthsCount] = useState<number>(12);
  const monthNamesShort = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];

  const allMonths = new Set<string>();
  payments.forEach(p => {
    allMonths.add(p.dueDate.substring(0, 7));
    if (p.paidDate) allMonths.add(p.paidDate.substring(0, 7));
  });
  guests.forEach(g => {
    allMonths.add(g.checkIn.substring(0, 7));
    allMonths.add(g.checkOut.substring(0, 7));
  });
  const sortedMonths = [...allMonths].filter(m => m <= new Date().toISOString().split('T')[0].substring(0, 7)).sort().slice(-monthsCount);

  const earningsByMonth: Record<string, { paid: number; pending: number; overdue: number; total: number; count: number }> = {};
  payments.forEach(p => {
    const dueMonth = p.dueDate.substring(0, 7);
    if (!earningsByMonth[dueMonth]) earningsByMonth[dueMonth] = { paid: 0, pending: 0, overdue: 0, total: 0, count: 0 };
    earningsByMonth[dueMonth].total += p.amount;
    earningsByMonth[dueMonth].count++;
    earningsByMonth[dueMonth][p.status as 'paid' | 'pending' | 'overdue'] += p.amount;
  });

  const occupancyByMonth: Record<string, { checkins: number; checkouts: number; guestNights: number; avgOccupancy: number; peakOccupancy: number; uniqueGuests: Set<string> }> = {};
  sortedMonths.forEach(m => {
    occupancyByMonth[m] = { checkins: 0, checkouts: 0, guestNights: 0, avgOccupancy: 0, peakOccupancy: 0, uniqueGuests: new Set() };
  });

  guests.forEach(g => {
    const inMonth = g.checkIn.substring(0, 7);
    const outMonth = g.checkOut.substring(0, 7);
    if (occupancyByMonth[inMonth]) {
      occupancyByMonth[inMonth].checkins++;
      occupancyByMonth[inMonth].uniqueGuests.add(g.id);
    }
    if (occupancyByMonth[outMonth]) {
      occupancyByMonth[outMonth].checkouts++;
    }
    sortedMonths.forEach(m => {
      const [y, mo] = m.split('-').map(Number);
      const monthStart = new Date(y, mo - 1, 1);
      const monthEnd = new Date(y, mo, 0);
      const gIn = new Date(g.checkIn);
      const gOut = new Date(g.checkOut);
      const stayStart = gIn > monthStart ? gIn : monthStart;
      const stayEnd = gOut < monthEnd ? gOut : monthEnd;
      if (stayStart <= stayEnd) {
        const nights = Math.ceil((stayEnd.getTime() - stayStart.getTime()) / (1000 * 60 * 60 * 24));
        occupancyByMonth[m].guestNights += nights;
        occupancyByMonth[m].uniqueGuests.add(g.id);
      }
    });
  });

  sortedMonths.forEach(m => {
    const [y, mo] = m.split('-').map(Number);
    const daysInMonth = new Date(y, mo, 0).getDate();
    const maxGuestNights = totalBeds * daysInMonth;
    occupancyByMonth[m].avgOccupancy = maxGuestNights > 0 ? Math.round((occupancyByMonth[m].guestNights / maxGuestNights) * 100) : 0;

    let peak = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const ds = `${m}-${String(d).padStart(2, '0')}`;
      const active = guests.filter(g => g.checkIn <= ds && g.checkOut > ds).length;
      if (active > peak) peak = active;
    }
    occupancyByMonth[m].peakOccupancy = peak;
  });

  const totalPaid = payments.filter(p => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const totalOverdue = payments.filter(p => p.status === 'overdue').reduce((s, p) => s + p.amount, 0);
  const totalRevenue = totalPaid + totalPending + totalOverdue;
  const totalGuests = guests.length;
  const totalNights = guests.reduce((s, g) => {
    const a = new Date(g.checkIn);
    const b = new Date(g.checkOut);
    return s + Math.max(1, Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24)));
  }, 0);
  const avgRate = totalNights > 0 ? Math.round(totalPaid / totalNights) : 0;
  const avgOccupancy = sortedMonths.length > 0 ? Math.round(sortedMonths.reduce((s, m) => s + occupancyByMonth[m].avgOccupancy, 0) / sortedMonths.length) : 0;
  const maxEarnings = Math.max(...sortedMonths.map(m => earningsByMonth[m]?.total || 0), 1);
  const maxGuestNights = Math.max(...sortedMonths.map(m => occupancyByMonth[m]?.guestNights || 0), 1);

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Аналитика</h3>
            <p className="text-sm text-gray-400 mt-0.5">Сводка доходов и размещения за {sortedMonths.length} мес.</p>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 size={16} className="text-gray-400" />
            <select value={monthsCount} onChange={e => setMonthsCount(Number(e.target.value))} className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value={3}>3 мес.</option>
              <option value={6}>6 мес.</option>
              <option value={12}>12 мес.</option>
              <option value={24}>24 мес.</option>
              <option value={999}>Все</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-xl p-4">
          <p className="text-xs text-emerald-600 font-medium mb-1">Оплачено</p>
          <p className="text-xl font-bold text-emerald-700">{totalPaid.toLocaleString()} зл</p>
          <p className="text-[10px] text-emerald-500 mt-1">{payments.filter(p => p.status === 'paid').length} платежей</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs text-amber-600 font-medium mb-1">Ожидает</p>
          <p className="text-xl font-bold text-amber-700">{totalPending.toLocaleString()} зл</p>
          <p className="text-[10px] text-amber-500 mt-1">{payments.filter(p => p.status === 'pending').length} платежей</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs text-red-600 font-medium mb-1">Просрочено</p>
          <p className="text-xl font-bold text-red-700">{totalOverdue.toLocaleString()} зл</p>
          <p className="text-[10px] text-red-500 mt-1">{payments.filter(p => p.status === 'overdue').length} платежей</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4">
          <p className="text-xs text-indigo-600 font-medium mb-1">Средняя цена за ночь</p>
          <p className="text-xl font-bold text-indigo-700">{avgRate} зл</p>
          <p className="text-[10px] text-indigo-500 mt-1">{totalNights} ночлегов</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 font-medium mb-1">Общий доход</p>
          <p className="text-lg font-bold text-gray-900">{totalRevenue.toLocaleString()} зл</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 font-medium mb-1">Средняя загрузка</p>
          <p className="text-lg font-bold text-gray-900">{avgOccupancy}%</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 font-medium mb-1">Всего гостей</p>
          <p className="text-lg font-bold text-gray-900">{totalGuests}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xs text-gray-400 font-medium mb-1">Кроватей</p>
          <p className="text-lg font-bold text-gray-900">{totalBeds}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-5">
        <div className="flex items-center gap-2 mb-5">
          <DollarSign size={16} className="text-emerald-500" />
          <h4 className="font-semibold text-gray-900 text-sm">Доходы по месяцам</h4>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" />Оплачено</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" />Ожидает</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-400" />Просрочено</span>
          <span className="flex items-center gap-1.5"><span className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-indigo-500" />Кумулятивно</span>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <div style={{ minWidth: Math.max(sortedMonths.length * 72 + 60, 400) }}>
            <svg viewBox={`0 0 ${sortedMonths.length * 72 + 60} 300`} className="w-full" style={{ height: 300 }} preserveAspectRatio="xMidYMid meet">
              {(() => {
                const chartLeft = 55;
                const chartBottom = 250;
                const chartH = 200;
                const ticks = 5;
                const maxVal = maxEarnings;
                const rows: React.ReactNode[] = [];
                for (let t = 0; t <= ticks; t++) {
                  const val = Math.round((maxVal / ticks) * t);
                  const y = chartBottom - (t / ticks) * chartH;
                  rows.push(
                    <g key={`tick-${t}`}>
                      <line x1={chartLeft - 5} y1={y} x2={chartLeft + sortedMonths.length * 72} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                      <text x={chartLeft - 8} y={y + 3} textAnchor="end" className="fill-gray-400" style={{ fontSize: 9 }}>{val >= 1000 ? `${(val / 1000).toFixed(val >= 10000 ? 0 : 1)}k` : val}</text>
                    </g>
                  );
                }
                sortedMonths.forEach((m, i) => {
                  const e = earningsByMonth[m] || { paid: 0, pending: 0, overdue: 0, total: 0 };
                  const [yr, mo] = m.split('-');
                  const cx = chartLeft + i * 72 + 36;
                  const barW = 28;
                  const paidH = maxVal > 0 ? (e.paid / maxVal) * chartH : 0;
                  const pendingH = maxVal > 0 ? (e.pending / maxVal) * chartH : 0;
                  const overdueH = maxVal > 0 ? (e.overdue / maxVal) * chartH : 0;
                  const totalH = paidH + pendingH + overdueH;
                  const monthLabel = `${monthNamesShort[parseInt(mo) - 1]} ${yr}`;
                  rows.push(
                    <g key={m} className="group">
                      <rect x={cx - barW / 2 - 6} y={chartBottom - chartH} width={barW + 12} height={chartH} fill="transparent" />
                      {e.overdue > 0 && <rect x={cx - barW / 2} y={chartBottom - totalH} width={barW} height={overdueH} rx={2} fill="#f87171" className="transition-opacity group-hover:opacity-80" />}
                      {e.pending > 0 && <rect x={cx - barW / 2} y={chartBottom - paidH - pendingH} width={barW} height={pendingH} rx={2} fill="#fbbf24" className="transition-opacity group-hover:opacity-80" />}
                      {e.paid > 0 && <rect x={cx - barW / 2} y={chartBottom - paidH} width={barW} height={paidH} rx={2} fill="#34d399" className="transition-opacity group-hover:opacity-80" />}
                      {e.total === 0 && <rect x={cx - barW / 2} y={chartBottom - 1} width={barW} height={1} rx={1} fill="#e5e7eb" />}
                      <text x={cx} y={chartBottom + 16} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>{monthNamesShort[parseInt(mo) - 1]}</text>
                      <text x={cx} y={chartBottom + 28} textAnchor="middle" className="fill-gray-300" style={{ fontSize: 8 }}>{yr}</text>
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ transition: 'opacity 0.15s' }}>
                        <rect x={cx - 85} y={Math.max(chartBottom - totalH - 64, 2)} width={170} height={e.paid > 0 && e.pending > 0 && e.overdue > 0 ? 72 : e.total === 0 ? 26 : 56} rx={6} fill="#1f2937" />
                        <text x={cx} y={Math.max(chartBottom - totalH - 64, 2) + 17} textAnchor="middle" fill="white" style={{ fontSize: 11, fontWeight: 600 }}>{monthLabel}</text>
                        {e.paid > 0 && <text x={cx} y={Math.max(chartBottom - totalH - 64, 2) + 34} textAnchor="middle" fill="#34d399" style={{ fontSize: 10 }}>Оплачено: {e.paid.toLocaleString()} зл</text>}
                        {e.pending > 0 && <text x={cx} y={Math.max(chartBottom - totalH - 64, 2) + (e.paid > 0 ? 51 : 34)} textAnchor="middle" fill="#fbbf24" style={{ fontSize: 10 }}>Ожидает: {e.pending.toLocaleString()} зл</text>}
                        {e.overdue > 0 && <text x={cx} y={Math.max(chartBottom - totalH - 64, 2) + (e.paid > 0 ? (e.pending > 0 ? 68 : 51) : (e.pending > 0 ? 51 : 34))} textAnchor="middle" fill="#f87171" style={{ fontSize: 10 }}>Просрочено: {e.overdue.toLocaleString()} зл</text>}
                      </g>
                    </g>
                  );
                });
                let cumPaid = 0;
                sortedMonths.forEach((m, i) => {
                  const e = earningsByMonth[m] || { paid: 0, pending: 0, overdue: 0, total: 0 };
                  const cx = chartLeft + i * 72 + 36;
                  const prevCum = cumPaid;
                  cumPaid += e.paid;
                  const cy = chartBottom - (cumPaid / Math.max(totalPaid, 1)) * chartH;
                  const prevCy = chartBottom - (prevCum / Math.max(totalPaid, 1)) * chartH;
                  if (i > 0) {
                    const prevCx = chartLeft + (i - 1) * 72 + 36;
                    rows.push(<line key={`cum-${m}`} x1={prevCx} y1={prevCy} x2={cx} y2={cy} stroke="#6366f1" strokeWidth={2} strokeDasharray="4 2" />);
                  }
                  rows.push(<circle key={`dot-${m}`} cx={cx} cy={cy} r={3.5} fill="#6366f1" stroke="white" strokeWidth={2} />);
                });
                rows.push(<line key="baseline" x1={chartLeft} y1={chartBottom} x2={chartLeft + sortedMonths.length * 72} y2={chartBottom} stroke="#e5e7eb" strokeWidth={1} />);
                return rows;
              })()}
            </svg>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
          <div className="bg-emerald-50 rounded-lg p-2"><p className="text-[10px] text-emerald-600">Оплачено</p><p className="text-sm font-bold text-emerald-700">{totalPaid.toLocaleString()} зл</p></div>
          <div className="bg-amber-50 rounded-lg p-2"><p className="text-[10px] text-amber-600">Ожидает</p><p className="text-sm font-bold text-amber-700">{totalPending.toLocaleString()} зл</p></div>
          <div className="bg-red-50 rounded-lg p-2"><p className="text-[10px] text-red-600">Просрочено</p><p className="text-sm font-bold text-red-700">{totalOverdue.toLocaleString()} зл</p></div>
          <div className="bg-indigo-50 rounded-lg p-2"><p className="text-[10px] text-indigo-600">Кумулятивно</p><p className="text-sm font-bold text-indigo-700">{totalPaid.toLocaleString()} зл</p></div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 mb-6 p-5">
        <div className="flex items-center gap-2 mb-5">
          <Users size={16} className="text-indigo-500" />
          <h4 className="font-semibold text-gray-900 text-sm">Размещение по месяцам</h4>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-indigo-400" />Ночлеги</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400" />Заселения</span>
          <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-amber-400" />Выселения</span>
          <span className="flex items-center gap-1.5"><span className="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-b-[8px] border-b-red-500" />Средняя загрузка</span>
        </div>

        <div className="overflow-x-auto -mx-5 px-5">
          <div style={{ minWidth: Math.max(sortedMonths.length * 72 + 60, 400) }}>
            <svg viewBox={`0 0 ${sortedMonths.length * 72 + 60} 300`} className="w-full" style={{ height: 300 }} preserveAspectRatio="xMidYMid meet">
              {(() => {
                const chartLeft = 55;
                const chartBottom = 250;
                const chartH = 200;
                const ticks = 5;
                const rows: React.ReactNode[] = [];
                for (let t = 0; t <= ticks; t++) {
                  const val = Math.round((maxGuestNights / ticks) * t);
                  const y = chartBottom - (t / ticks) * chartH;
                  rows.push(
                    <g key={`tick-${t}`}>
                      <line x1={chartLeft - 5} y1={y} x2={chartLeft + sortedMonths.length * 72} y2={y} stroke="#f3f4f6" strokeWidth={1} />
                      <text x={chartLeft - 8} y={y + 3} textAnchor="end" className="fill-gray-400" style={{ fontSize: 9 }}>{val}</text>
                    </g>
                  );
                }
                const occRight = chartLeft + sortedMonths.length * 72 + 8;
                rows.push(
                  <text key="occ-label" x={occRight} y={chartBottom - chartH + 3} textAnchor="start" className="fill-red-400" style={{ fontSize: 8 }}>100%</text>,
                  <text key="occ-mid" x={occRight} y={chartBottom - chartH / 2 + 3} textAnchor="start" className="fill-red-300" style={{ fontSize: 8 }}>50%</text>,
                  <text key="occ-zero" x={occRight} y={chartBottom + 3} textAnchor="start" className="fill-red-300" style={{ fontSize: 8 }}>0%</text>
                );
                sortedMonths.forEach((m, i) => {
                  const o = occupancyByMonth[m];
                  const [yr, mo] = m.split('-');
                  const cx = chartLeft + i * 72 + 36;
                  const barW = 24;
                  const nightsH = maxGuestNights > 0 ? (o.guestNights / maxGuestNights) * chartH : 0;
                  const checkinH = maxGuestNights > 0 ? (o.checkins / maxGuestNights) * chartH * 8 : 0;
                  const checkoutH = maxGuestNights > 0 ? (o.checkouts / maxGuestNights) * chartH * 8 : 0;
                  const occY = chartBottom - (o.avgOccupancy / 100) * chartH;
                  const monthLabel = `${monthNamesShort[parseInt(mo) - 1]} ${yr}`;
                  rows.push(
                    <g key={m} className="group">
                      <rect x={cx - barW / 2 - 8} y={chartBottom - chartH} width={barW + 16} height={chartH} fill="transparent" />
                      <rect x={cx - barW / 2} y={chartBottom - nightsH} width={barW} height={nightsH} rx={3} fill="#818cf8" className="transition-opacity group-hover:opacity-80" />
                      <rect x={cx - barW / 2 - 6} y={chartBottom - checkinH} width={5} height={Math.max(checkinH, 1)} rx={1} fill="#34d399" />
                      <rect x={cx + barW / 2 + 1} y={chartBottom - checkoutH} width={5} height={Math.max(checkoutH, 1)} rx={1} fill="#fbbf24" />
                      {i > 0 && (() => {
                        const prevOccY = chartBottom - (occupancyByMonth[sortedMonths[i - 1]].avgOccupancy / 100) * chartH;
                        return <line key={`occ-line-${m}`} x1={chartLeft + (i - 1) * 72 + 36} y1={prevOccY} x2={cx} y2={occY} stroke="#ef4444" strokeWidth={2} strokeDasharray="4 2" />;
                      })()}
                      <circle cx={cx} cy={occY} r={4} fill="#ef4444" stroke="white" strokeWidth={2} />
                      <text x={cx} y={chartBottom + 16} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 10 }}>{monthNamesShort[parseInt(mo) - 1]}</text>
                      <text x={cx} y={chartBottom + 28} textAnchor="middle" className="fill-gray-300" style={{ fontSize: 8 }}>{yr}</text>
                      <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ transition: 'opacity 0.15s' }}>
                        <rect x={cx - 60} y={Math.max(chartBottom - nightsH - 66, 2)} width={120} height={72} rx={6} fill="#1f2937" />
                        <text x={cx} y={Math.max(chartBottom - nightsH - 66, 2) + 17} textAnchor="middle" fill="white" style={{ fontSize: 11, fontWeight: 600 }}>{monthLabel}</text>
                        <text x={cx} y={Math.max(chartBottom - nightsH - 66, 2) + 34} textAnchor="middle" fill="#818cf8" style={{ fontSize: 10 }}>Ночлеги: {o.guestNights}</text>
                        <text x={cx} y={Math.max(chartBottom - nightsH - 66, 2) + 51} textAnchor="middle" fill="#34d399" style={{ fontSize: 10 }}>Заселения: {o.checkins}</text>
                        <text x={cx} y={Math.max(chartBottom - nightsH - 66, 2) + 68} textAnchor="middle" fill="#fbbf24" style={{ fontSize: 10 }}>Выселения: {o.checkouts}</text>
                      </g>
                    </g>
                  );
                });
                rows.push(<line key="baseline" x1={chartLeft} y1={chartBottom} x2={chartLeft + sortedMonths.length * 72} y2={chartBottom} stroke="#e5e7eb" strokeWidth={1} />);
                return rows;
              })()}
            </svg>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3 text-center">
          <div className="bg-indigo-50 rounded-lg p-2"><p className="text-[10px] text-indigo-600">Ночлеги</p><p className="text-sm font-bold text-indigo-700">{sortedMonths.reduce((s, m) => s + occupancyByMonth[m].guestNights, 0)}</p></div>
          <div className="bg-emerald-50 rounded-lg p-2"><p className="text-[10px] text-emerald-600">Заселения</p><p className="text-sm font-bold text-emerald-700">{sortedMonths.reduce((s, m) => s + occupancyByMonth[m].checkins, 0)}</p></div>
          <div className="bg-amber-50 rounded-lg p-2"><p className="text-[10px] text-amber-600">Выселения</p><p className="text-sm font-bold text-amber-700">{sortedMonths.reduce((s, m) => s + occupancyByMonth[m].checkouts, 0)}</p></div>
          <div className="bg-red-50 rounded-lg p-2"><p className="text-[10px] text-red-600">Средняя загрузка</p><p className="text-sm font-bold text-red-700">{avgOccupancy}%</p></div>
        </div>
      </div>

      <div className="mt-6">
        <OccupancyCalendar rooms={rooms} guests={guests} />
      </div>
    </div>
  );
}

function AddGuestForm({ onClose, hostelId }: { onClose: () => void; hostelId: string }) {
  const { rooms, guests, addGuest } = useData();
  const hostelRooms = rooms.filter(r => r.hostelId === hostelId && roomOccupiedBeds(r.id, guests) < r.beds);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passport, setPassport] = useState('');
  const [roomId, setRoomId] = useState(hostelRooms[0]?.id || '');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const selectedRoom = rooms.find(r => r.id === roomId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || !roomId || !checkIn || !checkOut) return;
    addGuest({ name, phone, email, passport, roomId, hostelId, checkIn, checkOut, status: 'active', totalPaid: 0, totalDue: selectedRoom ? selectedRoom.pricePerBed * Math.max(1, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24))) : 0 });
    onClose();
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Имя и фамилия</label>
        <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Ян Ковальски" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Телефон</label>
          <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="+48 501 234 567" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="jan@email.com" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Паспорт / ID</label>
        <input type="text" value={passport} onChange={e => setPassport(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="PL 1234567" />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Комната</label>
        <select required value={roomId} onChange={e => setRoomId(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          {hostelRooms.map(r => {
            const occ = roomOccupiedBeds(r.id, guests);
            return (
              <option key={r.id} value={r.id}>{r.number} · {r.type} · {r.beds - occ} свободных · {r.pricePerBed} зл/кровать</option>
            );
          })}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Заселение</label>
          <input required type="date" value={checkIn} onChange={e => setCheckIn(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Выселение</label>
          <input required type="date" value={checkOut} onChange={e => setCheckOut(e.target.value)} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        </div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-colors">Отмена</button>
        <button type="submit" className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors">Добавить</button>
      </div>
    </form>
  );
}
