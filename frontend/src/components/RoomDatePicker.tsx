import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface RoomDatePickerProps {
  roomId: string;
  beds: number;
  guests: { id: string; roomId: string; checkIn: string; checkOut: string; status: string }[];
  value: string;
  onChange: (date: string) => void;
  minDate?: string;
}

function dateStr(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function RoomDatePicker({ roomId, beds, guests, value, onChange, minDate }: RoomDatePickerProps) {
  const { t, monthFull, dayNames } = useLanguage();
  const initial = value ? new Date(value) : new Date();
  const [current, setCurrent] = useState<Date>(initial);
  const [open, setOpen] = useState(false);

  const year = current.getFullYear();
  const month = current.getMonth();

  const roomGuests = guests.filter(g => g.roomId === roomId && g.status === 'active');
  const occupiedOn = (ds: string) => roomGuests.filter(g => g.checkIn <= ds && g.checkOut > ds).length;
  const freeOn = (ds: string) => Math.max(0, beds - occupiedOn(ds));

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;

  const isDisabled = (ds: string) => {
    if (minDate && ds < minDate) return true;
    if (freeOn(ds) === 0) return true;
    return false;
  };

  const cellClass = (ds: string) => {
    if (ds === value) return 'bg-indigo-600 text-white ring-2 ring-indigo-300';
    if (isDisabled(ds)) return 'bg-gray-100 text-gray-300 cursor-not-allowed';
    const free = freeOn(ds);
    if (free === beds) return 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100';
    return 'bg-amber-50 text-amber-700 hover:bg-amber-100';
  };

  const freeLabel = (ds: string) => {
    if (ds === value) return t('Выбрано');
    if (isDisabled(ds)) return t('Занято');
    const free = freeOn(ds);
    if (free === beds) return t('Свободно всё');
    return t('Своб. {n}', { n: free });
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <Calendar size={16} className="text-gray-400 shrink-0" />
        <span className={value ? 'text-gray-900' : 'text-gray-400'}>{value || t('Выберите дату')}</span>
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 rounded-xl bg-white p-3">
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={() => setCurrent(new Date(year, month - 1, 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="font-semibold text-gray-900 text-sm">{monthFull[month]} {year}</span>
            <button type="button" onClick={() => setCurrent(new Date(year, month + 1, 1))} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(d => (
              <div key={d} className="text-center text-[10px] font-medium text-gray-400 py-1">{d}</div>
            ))}
            {Array.from({ length: startOffset }).map((_, i) => (
              <div key={`e-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds = dateStr(year, month, day);
              const disabled = isDisabled(ds);
              return (
                <button
                  key={day}
                  type="button"
                  disabled={disabled}
                  onClick={() => { onChange(ds); setOpen(false); }}
                  title={freeLabel(ds)}
                  className={`relative rounded-lg p-1 text-center text-xs font-medium transition-colors min-h-[34px] flex flex-col items-center justify-center ${cellClass(ds)}`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 pt-2 border-t border-gray-100">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-400" />{t('Свободно всё')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-400" />{t('Частично')}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-gray-200" />{t('Занято')}</span>
          </div>
        </div>
      )}
    </div>
  );
}