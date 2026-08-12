import { useState } from 'react';
import Link from 'next/link';
import { Building2, ArrowUpRight, Plus, Trash2, Image } from 'lucide-react';
import { useData } from '../context/DataContext';
import { hostelOccupiedBeds } from '../utils/helpers';
import Modal from '../components/Modal';
import type { Room } from '../types';

type FormRoom = {
  number: string;
  floor: number;
  beds: number;
  type: Room['type'];
  pricePerBed: number;
};

function emptyRoom(): FormRoom {
  return { number: '', floor: 1, beds: 2, type: 'standard', pricePerBed: 85 };
}

export default function HostelsList() {
  const { hostels, guests, addHostel } = useData();
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [image, setImage] = useState('');
  const [rooms, setRooms] = useState<FormRoom[]>([emptyRoom()]);

  const resetForm = () => {
    setName('');
    setAddress('');
    setImage('');
    setRooms([emptyRoom()]);
  };

  const updateRoom = (i: number, field: keyof FormRoom, value: string | number) => {
    setRooms(prev => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
  };

  const addRoomRow = () => setRooms(prev => [...prev, emptyRoom()]);
  const removeRoomRow = (i: number) => setRooms(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    if (!name.trim()) return;
    const validRooms = rooms.filter(r => r.number.trim());
    addHostel(
      { name: name.trim(), address: address.trim(), image: image.trim() || undefined },
      validRooms.map(r => ({
        number: r.number.trim(),
        floor: r.floor,
        beds: r.beds,
        type: r.type,
        pricePerBed: r.pricePerBed,
        photos: [],
      }))
    );
    resetForm();
    setShowAdd(false);
  };

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Хостелы</h1>
          <p className="text-gray-500 mt-1">{hostels.length} хостелов</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} /> Добавить хостел
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {hostels.map(h => {
          const occupied = hostelOccupiedBeds(h.id, guests);
          const occupancy = h.totalBeds > 0 ? Math.round((occupied / h.totalBeds) * 100) : 0;
          const hostelGuests = guests.filter(g => g.hostelId === h.id && g.status === 'active');
          return (
            <Link key={h.id} href={`/hostel/${h.id}`} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-indigo-200 transition-all">
              <div className="flex items-start justify-between mb-4">
                {h.image ? (
                  <img src={h.image} alt={h.name} className="w-12 h-12 rounded-xl object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <Building2 size={24} />
                  </div>
                )}
                <ArrowUpRight size={18} className="text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-indigo-600 transition-colors">{h.name}</h3>
              <p className="text-sm text-gray-400 mb-4">{h.address}</p>
              {(h.floors !== undefined || h.parking) && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {h.floors !== undefined && (
                    <span className="text-[11px] font-medium bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">{h.floors} эт.</span>
                  )}
                  {h.parking && (
                    <span className="text-[11px] font-medium bg-gray-100 text-gray-500 px-2 py-0.5 rounded">Парковка</span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Номера</p>
                  <p className="font-semibold text-gray-900">{h.totalRooms}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Занятые кровати</p>
                  <p className="font-semibold text-gray-900">{occupied}/{h.totalBeds}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Гости</p>
                  <p className="font-semibold text-gray-900">{hostelGuests.length}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs text-gray-400 mb-1">Доход</p>
                  <p className="font-semibold text-gray-900">{(h.monthlyRevenue / 1000).toFixed(1)}k zl</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-400">Загрузка</span>
                  <span className="font-medium text-gray-600">{occupancy}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={`h-2 rounded-full transition-all ${occupancy > 80 ? 'bg-emerald-500' : occupancy > 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${occupancy}%` }} />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <Modal isOpen={showAdd} onClose={() => { resetForm(); setShowAdd(false); }} title="Добавить хостел">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="напр. Хостел Краков Центр"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Адрес</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="напр. ул. Флорианская 10, Краков"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Фото (URL)</label>
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl">
                <Image size={14} className="text-gray-400 shrink-0" />
                <input
                  type="text"
                  value={image}
                  onChange={e => setImage(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">Номера</h3>
              <button
                type="button"
                onClick={addRoomRow}
                className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
              >
                <Plus size={14} /> Добавить номер
              </button>
            </div>

            {rooms.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-3">Нет номеров — нажмите "Добавить номер" чтобы начать</p>
            )}

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {rooms.map((room, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Номер {i + 1}</span>
                    {rooms.length > 1 && (
                      <button type="button" onClick={() => removeRoomRow(i)} className="text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-0.5">Номер *</label>
                      <input
                        type="text"
                        value={room.number}
                        onChange={e => updateRoom(i, 'number', e.target.value)}
                        placeholder="np. 101"
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-0.5">Этаж</label>
                      <input
                        type="number"
                        value={room.floor}
                        onChange={e => updateRoom(i, 'floor', parseInt(e.target.value) || 1)}
                        min={0}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-0.5">Кровати</label>
                      <input
                        type="number"
                        value={room.beds}
                        onChange={e => updateRoom(i, 'beds', Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 mb-0.5">Тип</label>
                      <select
                        value={room.type}
                        onChange={e => updateRoom(i, 'type', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="economy">Economy</option>
                        <option value="standard">Standard</option>
                        <option value="vip">VIP</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-400 mb-0.5">Цена за кровать / сутки (zl)</label>
                    <input
                      type="number"
                      value={room.pricePerBed}
                      onChange={e => updateRoom(i, 'pricePerBed', Math.max(0, parseInt(e.target.value) || 0))}
                      min={0}
                      className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => { resetForm(); setShowAdd(false); }}
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleSave}
              disabled={!name.trim()}
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Сохранить
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
