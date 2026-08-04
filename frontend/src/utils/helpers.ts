import type { Guest, Payment } from '../types';

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

export function guestTotalDue(guestId: string, payments: Payment[], today = new Date().toISOString().split('T')[0]): number {
  return payments.filter(p => p.guestId === guestId && paymentIsDue(p, today)).reduce((s, p) => s + p.amount, 0);
}

export function guestsInRoomOnDate(roomId: string, dateStr: string, guests: Guest[]): number {
  return guests.filter(g => g.roomId === roomId && g.status === 'active' && g.checkIn <= dateStr && g.checkOut > dateStr).length;
}

export function totalOccupiedOnDate(dateStr: string, guests: Guest[]): number {
  return guests.filter(g => g.status === 'active' && g.checkIn <= dateStr && g.checkOut > dateStr).length;
}
