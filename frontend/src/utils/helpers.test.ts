import { describe, it, expect } from 'vitest';
import type { Guest, Payment } from '../types';
import {
  roomOccupiedBeds,
  hostelOccupiedBeds,
  guestTotalPaid,
  guestTotalDue,
  guestsInRoomOnDate,
  totalOccupiedOnDate,
} from './helpers';

const guest = (over: Partial<Guest>): Guest => ({
  id: 'g1',
  name: 'Test Guest',
  phone: '+48 123 456 789',
  email: 'g@example.com',
  passport: 'PL 1',
  roomId: 'r1',
  hostelId: 'h1',
  checkIn: '2026-07-01',
  checkOut: '2026-07-10',
  status: 'active',
  totalPaid: 0,
  totalDue: 0,
  ...over,
});

const payment = (over: Partial<Payment>): Payment => ({
  id: 'p1',
  guestId: 'g1',
  guestName: 'Test Guest',
  roomId: 'r1',
  amount: 100,
  dueDate: '2026-07-01',
  type: 'cash',
  status: 'pending',
  smsSent: false,
  ...over,
});

describe('roomOccupiedBeds', () => {
  it('counts only active guests in the room', () => {
    const guests = [
      guest({ id: 'a', roomId: 'r1' }),
      guest({ id: 'b', roomId: 'r1' }),
      guest({ id: 'c', roomId: 'r1', status: 'checked_out' }),
      guest({ id: 'd', roomId: 'r2' }),
    ];
    expect(roomOccupiedBeds('r1', guests)).toBe(2);
  });
});

describe('hostelOccupiedBeds', () => {
  it('counts active guests across the hostel', () => {
    const guests = [
      guest({ id: 'a', hostelId: 'h1' }),
      guest({ id: 'b', hostelId: 'h1' }),
      guest({ id: 'c', hostelId: 'h1', status: 'reserved' }),
      guest({ id: 'd', hostelId: 'h2' }),
    ];
    expect(hostelOccupiedBeds('h1', guests)).toBe(2);
  });
});

describe('guestTotalPaid / guestTotalDue', () => {
  it('sums paid payments and pending/overdue separately', () => {
    const payments = [
      payment({ amount: 200, status: 'paid' }),
      payment({ amount: 150, status: 'paid' }),
      payment({ amount: 80, status: 'pending' }),
      payment({ amount: 40, status: 'overdue' }),
      payment({ guestId: 'other', amount: 999, status: 'paid' }),
    ];
    expect(guestTotalPaid('g1', payments)).toBe(350);
    expect(guestTotalDue('g1', payments)).toBe(120);
  });
});

describe('guestsInRoomOnDate / totalOccupiedOnDate', () => {
  it('includes guests whose date range covers the given date', () => {
    const guests = [
      guest({ roomId: 'r1', checkIn: '2026-07-01', checkOut: '2026-07-10' }),
      guest({ roomId: 'r1', checkIn: '2026-07-01', checkOut: '2026-07-05' }),
      guest({ roomId: 'r1', checkIn: '2026-07-11', checkOut: '2026-07-20' }),
      guest({ roomId: 'r1', status: 'checked_out', checkIn: '2026-07-01', checkOut: '2026-07-10' }),
    ];
    expect(guestsInRoomOnDate('r1', '2026-07-07', guests)).toBe(1);
    expect(totalOccupiedOnDate('2026-07-07', guests)).toBe(1);
  });
});
