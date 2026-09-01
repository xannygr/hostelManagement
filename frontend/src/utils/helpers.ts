import type { Guest, GuestLanguage, Payment, Room, RoomPricePeriod } from '../types';

export const GUEST_LANGUAGES: { value: GuestLanguage | ''; label: string }[] = [
  { value: 'ru', label: 'Русский' },
  { value: 'uk', label: 'Украинский' },
  { value: 'pl', label: 'Польский' },
  { value: 'en', label: 'Английский' },
  { value: 'de', label: 'Немецкий' },
  { value: 'es', label: 'Испанский' },
  { value: 'fr', label: 'Французский' },
  { value: 'other', label: 'Другой' },
];

export function guestLanguageLabel(lang: GuestLanguage | '' | null | undefined, t?: (key: string) => string): string {
  const label = GUEST_LANGUAGES.find((l) => l.value === lang)?.label ?? 'Не указан';
  return t ? t(label) : label;
}

export function roomOccupiedBeds(roomId: string, guests: Guest[]): number {
  return guests.filter(g => g.roomId === roomId && g.status === 'active').length;
}

export function hostelOccupiedBeds(hostelId: string, guests: Guest[]): number {
  return guests.filter(g => g.hostelId === hostelId && g.status === 'active').length;
}

export function guestTotalPaid(guestId: string, payments: Payment[]): number {
  return payments.filter(p => p.guestId === guestId && p.status === 'paid').reduce((s, p) => s + p.amount, 0);
}

export function paymentIsDue(p: Payment, today: string): boolean {
  return p.status !== 'paid' && p.dueDate <= today;
}

export function paymentStatus(p: Payment, today = new Date().toISOString().split('T')[0]): Payment['status'] {
  if (p.status === 'paid') return 'paid';
  if (p.status === 'pending' && p.dueDate <= today) return 'overdue';
  return p.status;
}

export function guestTotalDue(guestId: string, payments: Payment[], today = new Date().toISOString().split('T')[0]): number {
  return payments.filter(p => p.guestId === guestId && paymentIsDue(p, today)).reduce((s, p) => s + p.amount, 0);
}

export function guestsInRoomOnDate(roomId: string, dateStr: string, guests: Guest[]): number {
  return guests.filter(g =>
    g.roomId === roomId && g.status === 'active' &&
    g.checkIn <= dateStr &&
    (!g.checkOut || g.checkOut > dateStr)
  ).length;
}

export function totalOccupiedOnDate(dateStr: string, guests: Guest[]): number {
  return guests.filter(g =>
    g.status === 'active' &&
    g.checkIn <= dateStr &&
    (!g.checkOut || g.checkOut > dateStr)
  ).length;
}

/**
 * Возвращает цену комнаты за выбранный период (сутки/неделя/месяц).
 * Если отдельная цена периода не задана — рассчитывается из pricePerBed.
 */
export function roomPriceForPeriod(room: Pick<Room, 'pricePerBed' | 'pricePerWeek' | 'pricePerMonth'>, period: RoomPricePeriod): number {
  if (period === 'week' && (room.pricePerWeek ?? 0) > 0) return room.pricePerWeek!;
  if (period === 'month' && (room.pricePerMonth ?? 0) > 0) return room.pricePerMonth!;
  if (period === 'day') return room.pricePerBed;
  if (period === 'week') return Math.round(room.pricePerBed * 7);
  return Math.round(room.pricePerBed * 30);
}
