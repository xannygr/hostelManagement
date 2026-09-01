import { useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { roomOccupiedBeds } from '../utils/helpers';
import type { Guest, Room, RoomPricePeriod } from '../types';

export const PAYMENT_PERIODS: { value: RoomPricePeriod; label: string }[] = [
  { value: 'day', label: 'День' },
  { value: 'week', label: 'Неделя' },
  { value: 'month', label: 'Месяц' },
];

interface RoomBillingSelectProps {
  rooms: Room[];
  guests: Guest[];
  hostelId: string;
  value: {
    roomId: string;
    period: RoomPricePeriod;
  };
  onChange: (v: { roomId: string; period: RoomPricePeriod }) => void;
}

/**
 * Компонент выбора комнаты и способа оплаты (день/неделя/месяц).
 * Показывает комнаты с доступностью и ценой за выбранный период.
 */
export default function RoomBillingSelect({ rooms, guests, hostelId, value, onChange }: RoomBillingSelectProps) {
  const { t } = useLanguage();
  const hostelRooms = useMemo(() => rooms.filter(r => r.hostelId === hostelId), [rooms, hostelId]);
  const selectedRoom = hostelRooms.find(r => r.id === value.roomId);

  const priceFor = (room: Room, period: RoomPricePeriod): number => {
    const base = period === 'day' ? room.pricePerBed
      : period === 'week' ? (room.pricePerWeek ?? room.pricePerBed * 7)
      : (room.pricePerMonth ?? room.pricePerBed * 30);
    return base;
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Комната *')}</label>
        <select
          required
          value={value.roomId}
          onChange={e => onChange({ ...value, roomId: e.target.value })}
          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">{t('Выберите комнату')}</option>
          {hostelRooms.map(r => {
            const occ = roomOccupiedBeds(r.id, guests);
            const free = r.beds - occ;
            return (
              <option key={r.id} value={r.id} disabled={free === 0}>
                {r.number} — {free === 0 ? t('полностью занята') : `${t('своб. {n}', { n: free })} · ${r.pricePerBed} зл/день`}
              </option>
            );
          })}
        </select>
      </div>

      {selectedRoom && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('Способ оплаты')}</label>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_PERIODS.map(p => {
              const price = priceFor(selectedRoom, p.value);
              return (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => onChange({ ...value, period: p.value })}
                  className={`px-3 py-2.5 rounded-xl border text-center transition-colors ${
                    value.period === p.value
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
          {selectedRoom.pricingPer === 'room' && (
            <p className="text-[11px] text-gray-400 mt-1.5">{t('Цена за комнату целиком')}</p>
          )}
          {selectedRoom.pricingPer !== 'room' && (
            <p className="text-[11px] text-gray-400 mt-1.5">{t('Цена за 1 кровать')}</p>
          )}
        </div>
      )}
    </div>
  );
}
