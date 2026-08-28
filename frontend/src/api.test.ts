import { describe, it, expect } from 'vitest';
import { normalizeAllData } from './api';

type RawHostel = Parameters<typeof normalizeAllData>[0][number];
type RawRoom = Parameters<typeof normalizeAllData>[1][number];
type RawGuest = Parameters<typeof normalizeAllData>[2][number];
type RawPayment = Parameters<typeof normalizeAllData>[3][number];

const rawHostel = (over: Partial<RawHostel> = {}): RawHostel => ({
  id: 1,
  documentId: 'host1',
  name: 'Sun Hostel',
  address: 'ul. Testowa 1',
  floors: 2,
  image: { url: '/uploads/host1.jpg' },
  ...over,
});

const rawRoom = (over: Partial<RawRoom> = {}): RawRoom => ({
  id: 1,
  documentId: 'room1',
  hostel: { id: 1, documentId: 'host1' },
  number: '101',
  floor: 1,
  beds: 4,
  type: 'standard',
  pricePerBed: 100,
  hasPrivateBathroom: true,
  photos: [{ url: '/uploads/room1.jpg' }],
  ...over,
});

const rawGuest = (over: Partial<RawGuest> = {}): RawGuest => ({
  id: 1,
  documentId: 'guest1',
  name: 'John Doe',
  phone: '+48 111 222 333',
  email: 'john@example.com',
  passport: 'AA123',
  checkIn: '2026-07-01',
  checkOut: '2026-07-10',
  status: 'active',
  hostel: { id: 1, documentId: 'host1' },
  room: { id: 1, documentId: 'room1' },
  ...over,
});

const rawPayment = (over: Partial<RawPayment> = {}): RawPayment => ({
  id: 1,
  documentId: 'pay1',
  amount: 500,
  dueDate: '2026-07-01',
  paidDate: null,
  type: 'cash',
  status: 'pending',
  smsSent: false,
  guest: { ...rawGuest() },
  ...over,
});

describe('normalizeAllData — payments', () => {
  it('maps flat payment fields and flattens nested guest + guest room', () => {
    const p = rawPayment({ amount: 250, type: 'card', status: 'paid', paidDate: '2026-07-02' });
    const { payments } = normalizeAllData([], [], [], [p]);
    expect(payments[0]).toEqual({
      id: 'pay1',
      guestId: 'guest1',
      guestName: 'John Doe',
      roomId: 'room1',
      amount: 250,
      dueDate: '2026-07-01',
      paidDate: '2026-07-02',
      type: 'card',
      status: 'paid',
      smsSent: false,
    });
  });

  it('falls back to empty strings when payment has no guest', () => {
    const { payments } = normalizeAllData([], [], [], [rawPayment({ guest: null })]);
    expect(payments[0]).toMatchObject({ guestId: '', guestName: '', roomId: '' });
  });

  it('leaves paidDate undefined when it is null', () => {
    const { payments } = normalizeAllData([], [], [], [rawPayment({ paidDate: null })]);
    expect(payments[0].paidDate).toBeUndefined();
  });
});

describe('normalizeAllData — guests', () => {
  it('calculates totalPaid from paid payments only', () => {
    const guests = [rawGuest()];
    const payments = [
      rawPayment({ documentId: 'p1', amount: 100, status: 'paid' }),
      rawPayment({ documentId: 'p2', amount: 50, status: 'paid' }),
      rawPayment({ documentId: 'p3', amount: 30, status: 'pending', dueDate: '2026-07-01' }),
    ];
    const { guests: out } = normalizeAllData([], [], guests, payments);
    expect(out[0].totalPaid).toBe(150);
  });

  it('counts pending/overdue payments with due date <= today as totalDue', () => {
    const guests = [rawGuest()];
    const payments = [
      rawPayment({ documentId: 'p1', amount: 100, dueDate: '2026-07-01', status: 'overdue' }),
      rawPayment({ documentId: 'p2', amount: 50, dueDate: '2026-07-02', status: 'pending' }),
      rawPayment({ documentId: 'p3', amount: 40, dueDate: '2999-12-31', status: 'pending' }),
      rawPayment({ documentId: 'p4', amount: 10, dueDate: '2026-07-01', status: 'paid' }),
    ];
    const { guests: out } = normalizeAllData([], [], guests, payments, '2026-07-02');
    expect(out[0].totalDue).toBe(150);
  });

  it('defaults email/passport to empty and flattens host/room references', () => {
    const g = rawGuest({ email: null, passport: null, hostel: null, room: null });
    const { guests: out } = normalizeAllData([], [], [g], []);
    expect(out[0]).toMatchObject({ email: '', passport: '', hostelId: '', roomId: '' });
  });
});

describe('normalizeAllData — rooms', () => {
  it('counts occupiedBeds as active guests in the room', () => {
    const rooms = [rawRoom()];
    const guests = [
      rawGuest({ documentId: 'g1', status: 'active' }),
      rawGuest({ documentId: 'g2', status: 'active' }),
      rawGuest({ documentId: 'g3', status: 'checked_out' }),
      rawGuest({ documentId: 'g4', room: { id: 2, documentId: 'room2' } }),
    ];
    const { rooms: out } = normalizeAllData([], rooms, guests, []);
    expect(out[0].occupiedBeds).toBe(2);
  });

  it('maps boolean and photo fields', () => {
    const { rooms: out } = normalizeAllData([], [rawRoom()], [], []);
    expect(out[0]).toMatchObject({
      hostelId: 'host1',
      hasBalcony: false,
      hasPrivateBathroom: true,
      photos: ['/uploads/room1.jpg'],
    });
  });
});

describe('normalizeAllData — hostels', () => {
  it('computes totalRooms, totalBeds, occupiedBeds and revenue for a hostel', () => {
    const hostels = [rawHostel()];
    const rooms = [
      rawRoom({ beds: 4 }),
      rawRoom({ documentId: 'room2', beds: 2, hostel: { id: 99, documentId: 'other' } }),
    ];
    const inThisHostel = (docId: string, status: RawGuest['status']) =>
      rawGuest({ documentId: docId, status, hostel: { id: 1, documentId: hostels[0].documentId } });
    const guests = [
      inThisHostel('g1', 'active'),
      inThisHostel('g2', 'active'),
      inThisHostel('g3', 'reserved'),
      inThisHostel('g4', 'checked_out'),
      rawGuest({ documentId: 'gOut', hostel: { id: 99, documentId: 'other' }, room: { id: 99, documentId: 'roomX' } }),
    ];
    const payments = [
      rawPayment({ amount: 100, status: 'paid' }),
      rawPayment({ documentId: 'p2', amount: 50, status: 'paid' }),
      rawPayment({ documentId: 'p3', amount: 20, status: 'pending' }),
    ];
    payments[0].guest!.documentId = 'g1';
    payments[1].guest!.documentId = 'g2';
    payments[2].guest!.documentId = 'g3';
    const { hostels: out } = normalizeAllData(hostels, rooms, guests, payments);
    expect(out[0].totalRooms).toBe(1);
    expect(out[0].totalBeds).toBe(4);
    expect(out[0].occupiedBeds).toBe(2);
    expect(out[0].monthlyRevenue).toBe(150);
    expect(out[0]).toMatchObject({ name: 'Sun Hostel', address: 'ul. Testowa 1', image: '/uploads/host1.jpg' });
  });

  it('leaves optional fields undefined when not present', () => {
    const { hostels: out } = normalizeAllData([rawHostel({ floors: null, image: null })], [], [], []);
    expect(out[0].floors).toBeUndefined();
    expect(out[0].image).toBeUndefined();
  });

  it('excludes payments whose guest belongs to another hostel from revenue', () => {
    const hostels = [rawHostel()];
    const guestInHostel = rawGuest();
    const outsideGuest = rawGuest({
      documentId: 'gOut',
      hostel: { id: 2, documentId: 'other' },
      room: { id: 2, documentId: 'roomOther' },
    });
    const paidHere = rawPayment({ amount: 100, status: 'paid' });
    const paidOutside = rawPayment({ documentId: 'pOut', amount: 999, status: 'paid' });
    paidOutside.guest = { ...outsideGuest };
    const { hostels: out } = normalizeAllData(hostels, [], [guestInHostel, outsideGuest], [paidHere, paidOutside]);
    expect(out[0].monthlyRevenue).toBe(100);
  });

  it('maps hostel rent when present', () => {
    const { hostels: out } = normalizeAllData([rawHostel({ rent: 6000 })], [], [], []);
    expect(out[0].rent).toBe(6000);
  });
});

describe('normalizeAllData — expenses', () => {
  const rawExpense = (over: Partial<NonNullable<Parameters<typeof normalizeAllData>[5]>[number]> = {}) => ({
    id: 1,
    documentId: 'exp1',
    month: '2026-08',
    rentPaid: 6000,
    gasDue: 500,
    gasPaid: 300,
    lightsDue: 0,
    lightsPaid: 0,
    internetDue: 0,
    internetPaid: 0,
    waterDue: 0,
    waterPaid: 0,
    hostel: { id: 1, documentId: 'host1' },
    ...over,
  });

  it('maps fields and flattens the hostel reference with default zeroes', () => {
    const { expenses } = normalizeAllData([], [], [], [], '2026-08-28', [rawExpense({ hostel: null, rentPaid: null })]);
    expect(expenses[0]).toEqual({
      id: 'exp1',
      hostelId: '',
      month: '2026-08',
      rentPaid: 0,
      gasDue: 500,
      gasPaid: 300,
      lightsDue: 0,
      lightsPaid: 0,
      internetDue: 0,
      internetPaid: 0,
      waterDue: 0,
      waterPaid: 0,
    });
  });

  it('returns empty arrays when no expenses provided', () => {
    const { expenses } = normalizeAllData([], [], [], []);
    expect(expenses).toEqual([]);
  });
});