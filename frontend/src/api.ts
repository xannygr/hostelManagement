import type { Hostel, Room, Guest, Payment } from './types';

const BASE = '/api';
const TOKEN_KEY = 'hostelhaven_token';

function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...init,
  });
  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      message = body?.error?.message || body?.message || message;
    } catch {
      /* keep default */
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function mediaUrl(media: unknown): string | undefined {
  const m = media as { url?: string } | null | undefined;
  return m?.url ? m.url : undefined;
}

// --- normalization: Strapi entries -> flat frontend types ---

interface RawHostel {
  id: number;
  documentId: string;
  name: string;
  address: string;
  floors?: number | null;
  kitchens?: number | null;
  parking?: string | null;
  showers?: number | null;
  toilets?: number | null;
  image?: { url: string } | null;
}

interface RawRoom {
  id: number;
  documentId: string;
  number: string;
  floor: number;
  beds: number;
  type: Room['type'];
  pricePerBed: number;
  hasBalcony?: boolean | null;
  hasPrivateBathroom?: boolean | null;
  photos?: { url: string }[];
  hostel: RawRef | null;
}

interface RawGuest {
  id: number;
  documentId: string;
  name: string;
  phone: string;
  email: string | null;
  passport: string | null;
  checkIn: string;
  checkOut: string;
  status: Guest['status'];
  hostel: RawRef | null;
  room: RawRef | null;
}

interface RawRef {
  id: number;
  documentId: string;
}

interface RawPayment {
  id: number;
  documentId: string;
  amount: number;
  dueDate: string;
  paidDate: string | null;
  type: Payment['type'];
  status: Payment['status'];
  smsSent: boolean;
  guest: (RawGuest & { room: RawRef | null }) | null;
}

export interface AllData {
  hostels: Hostel[];
  rooms: Room[];
  guests: Guest[];
  payments: Payment[];
}

export interface HostelStat {
  documentId: string;
  name: string;
  address: string;
  totalRooms: number;
  totalBeds: number;
  occupiedBeds: number;
  occupiedRooms: number;
  totalRevenue: number;
  totalDue: number;
}

export interface HostelStatsData {
  hostels: HostelStat[];
  totals: {
    hostelCount: number;
    totalRooms: number;
    totalBeds: number;
    occupiedBeds: number;
    occupiedRooms: number;
    totalRevenue: number;
    totalDue: number;
  };
}

function normalizeHostel(h: RawHostel, rooms: Room[], guests: Guest[], payments: Payment[]): Hostel {
  const hostelRooms = rooms.filter((r) => r.hostelId === h.documentId);
  const active = guests.filter((g) => g.hostelId === h.documentId && g.status === 'active');
  const guestIds = new Set(guests.filter((g) => g.hostelId === h.documentId).map((g) => g.id));
  const revenue = payments
    .filter((p) => p.status === 'paid' && guestIds.has(p.guestId))
    .reduce((s, p) => s + p.amount, 0);
  return {
    id: h.documentId,
    name: h.name,
    address: h.address,
    totalRooms: hostelRooms.length,
    totalBeds: hostelRooms.reduce((s, r) => s + r.beds, 0),
    occupiedBeds: active.length,
    monthlyRevenue: revenue,
    floors: h.floors ?? undefined,
    kitchens: h.kitchens ?? undefined,
    parking: h.parking ?? undefined,
    showers: h.showers ?? undefined,
    toilets: h.toilets ?? undefined,
    image: mediaUrl(h.image),
  };
}

async function fetchAllPages<T>(path: string, pageSize = 500): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const sep = path.includes('?') ? '&' : '?';
    const res = await request<{ data: T[] }>(`${path}${sep}pagination[page]=${page}&pagination[pageSize]=${pageSize}`);
    out.push(...res.data);
    if (res.data.length < pageSize) break;
    page += 1;
  }
  return out;
}

export function loadAll(): Promise<AllData> {
  return Promise.all([
    fetchAllPages<RawHostel>('/hostels?populate=image'),
    fetchAllPages<RawRoom>('/rooms?populate[hostel]=true&populate[photos]=true'),
    fetchAllPages<RawGuest>('/guests?populate[hostel]=true&populate[room]=true'),
    fetchAllPages<RawPayment>('/payments?populate[guest][populate][room]=true'),
  ]).then(([rawHostels, rawRooms, rawGuests, rawPayments]) => {
    const payments: Payment[] = rawPayments.map((p) => ({
      id: p.documentId,
      guestId: p.guest?.documentId ?? '',
      guestName: p.guest?.name ?? '',
      roomId: p.guest?.room?.documentId ?? '',
      amount: p.amount,
      dueDate: p.dueDate,
      paidDate: p.paidDate ?? undefined,
      type: p.type,
      status: p.status,
      smsSent: p.smsSent,
    }));

    const guests: Guest[] = rawGuests.map((g) => {
      const paid = payments
        .filter((p) => p.guestId === g.documentId && p.status === 'paid')
        .reduce((s, p) => s + p.amount, 0);
      const due = payments
        .filter((p) => p.guestId === g.documentId && (p.status === 'pending' || p.status === 'overdue') && p.dueDate <= todayStr())
        .reduce((s, p) => s + p.amount, 0);
      return {
        id: g.documentId,
        name: g.name,
        phone: g.phone,
        email: g.email ?? '',
        passport: g.passport ?? '',
        roomId: g.room?.documentId ?? '',
        hostelId: g.hostel?.documentId ?? '',
        checkIn: g.checkIn,
        checkOut: g.checkOut,
        status: g.status,
        totalPaid: paid,
        totalDue: due,
      };
    });

    const rooms: Room[] = rawRooms.map((r) => ({
      id: r.documentId,
      hostelId: r.hostel?.documentId ?? '',
      number: r.number,
      floor: r.floor,
      beds: r.beds,
      occupiedBeds: guests.filter((g) => g.roomId === r.documentId && g.status === 'active').length,
      type: r.type,
      pricePerBed: r.pricePerBed,
      hasBalcony: r.hasBalcony ?? false,
      hasPrivateBathroom: r.hasPrivateBathroom ?? false,
      photos: r.photos?.map((ph) => ph.url),
    }));

    const hostels: Hostel[] = rawHostels.map((h) => normalizeHostel(h, rooms, guests, payments));

    return { hostels, rooms, guests, payments };
  });
}

export function fetchHostelStats(): Promise<HostelStatsData> {
  return request<{ data: HostelStatsData }>('/metrics/hostels').then((d) => d.data);
}

function fetchRoomsByHostel(hostelId: string): Promise<RawRoom[]> {
  return fetchAllPages<RawRoom>(
    `/rooms?populate[hostel]=true&filters[hostel][documentId][$eq]=${encodeURIComponent(hostelId)}`
  );
}

// --- auth ---

export interface AuthUser {
  id: number;
  username: string;
  email: string;
}

export interface AuthResult {
  jwt: string;
  user: AuthUser;
}

export async function login(identifier: string, password: string): Promise<AuthResult> {
  const res = await request<AuthResult>('/auth/local', {
    method: 'POST',
    body: JSON.stringify({ identifier, password }),
  });
  setToken(res.jwt);
  return res;
}

export function logout() {
  setToken(null);
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ ok: boolean }> {
  await request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({
      currentPassword,
      password: newPassword,
      passwordConfirmation: newPassword,
    }),
  });
  return { ok: true };
}

// --- mutations ---

export const api = {
  addHostel: (
    hostel: Omit<Hostel, 'id' | 'totalRooms' | 'totalBeds' | 'occupiedBeds' | 'monthlyRevenue'>,
    rooms: Omit<Room, 'id' | 'hostelId' | 'occupiedBeds'>[]
  ): Promise<{ hostel: Hostel; rooms: Room[] }> =>
    request<{ data: RawHostel }>('/hostels', {
      method: 'POST',
      body: JSON.stringify({ data: { name: hostel.name, address: hostel.address } }),
    }).then(async ({ data: h }) => {
      const created = await Promise.all(
        rooms.map((r) =>
          request<{ data: RawRoom }>('/rooms', {
            method: 'POST',
            body: JSON.stringify({
              data: {
                number: r.number,
                floor: r.floor,
                beds: r.beds,
                type: r.type,
                pricePerBed: r.pricePerBed,
                hostel: { connect: [h.documentId] },
              },
            }),
          }).then((res) => ({
            id: res.data.documentId,
            hostelId: h.documentId,
            number: res.data.number,
            floor: res.data.floor,
            beds: res.data.beds,
            occupiedBeds: 0,
            type: res.data.type,
            pricePerBed: res.data.pricePerBed,
          }))
        )
      );
      const hostel: Hostel = {
        id: h.documentId,
        name: h.name,
        address: h.address,
        totalRooms: created.length,
        totalBeds: created.reduce((s, r) => s + r.beds, 0),
        occupiedBeds: 0,
        monthlyRevenue: 0,
      };
      return { hostel, rooms: created };
    }),

  updateHostel: (id: string, data: Partial<Hostel>): Promise<Hostel> =>
    request<{ data: RawHostel }>(`/hostels/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: { name: data.name, address: data.address } }),
    }).then(({ data: h }) =>
      normalizeHostel(h, [], [], [])
    ),

  addGuest: (guest: Omit<Guest, 'id'> & { id?: string }): Promise<Guest> =>
    request<{ data: RawGuest }>('/guests', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          name: guest.name,
          phone: guest.phone,
          email: guest.email || undefined,
          passport: guest.passport || undefined,
          checkIn: guest.checkIn,
          checkOut: guest.checkOut,
          status: guest.status,
          hostel: { connect: [guest.hostelId] },
          room: { connect: [guest.roomId] },
        },
      }),
    }).then(({ data: g }) => ({
      id: g.documentId,
      name: g.name,
      phone: g.phone,
      email: g.email ?? '',
      passport: g.passport ?? '',
      roomId: g.room?.documentId ?? guest.roomId,
      hostelId: g.hostel?.documentId ?? guest.hostelId,
      checkIn: g.checkIn,
      checkOut: g.checkOut,
      status: g.status,
      totalPaid: 0,
      totalDue: 0,
    })),

  updateGuest: (id: string, data: Partial<Guest>): Promise<Guest> => {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.email !== undefined) payload.email = data.email || undefined;
    if (data.passport !== undefined) payload.passport = data.passport || undefined;
    if (data.checkIn !== undefined) payload.checkIn = data.checkIn;
    if (data.checkOut !== undefined) payload.checkOut = data.checkOut;
    if (data.status !== undefined) payload.status = data.status;
    if (data.roomId !== undefined) payload.room = { connect: [data.roomId] };
    if (data.hostelId !== undefined) payload.hostel = { connect: [data.hostelId] };
    return request<{ data: RawGuest }>(`/guests/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: payload }),
    }).then(({ data: g }) => ({
      id: g.documentId,
      name: g.name,
      phone: g.phone,
      email: g.email ?? '',
      passport: g.passport ?? '',
      roomId: g.room?.documentId ?? '',
      hostelId: g.hostel?.documentId ?? '',
      checkIn: g.checkIn,
      checkOut: g.checkOut,
      status: g.status,
      totalPaid: 0,
      totalDue: 0,
    }));
  },

  deleteGuest: (id: string): Promise<Guest> =>
    request<{ data: RawGuest }>(`/guests/${id}`, { method: 'DELETE' }).then(({ data: g }) => ({
      id: g.documentId,
      name: g.name,
      phone: g.phone,
      email: g.email ?? '',
      passport: g.passport ?? '',
      roomId: g.room?.documentId ?? '',
      hostelId: g.hostel?.documentId ?? '',
      checkIn: g.checkIn,
      checkOut: g.checkOut,
      status: g.status,
      totalPaid: 0,
      totalDue: 0,
    })),

  addPayment: (payment: Omit<Payment, 'id'> & { id?: string }): Promise<Payment> =>
    request<{ data: RawPayment }>('/payments', {
      method: 'POST',
      body: JSON.stringify({
        data: {
          amount: payment.amount,
          dueDate: payment.dueDate,
          paidDate: payment.paidDate || undefined,
          type: payment.type,
          status: payment.status,
          smsSent: payment.smsSent,
          guest: { connect: [payment.guestId] },
        },
      }),
    }).then(({ data: p }) => ({
      id: p.documentId,
      guestId: p.guest?.documentId ?? payment.guestId,
      guestName: p.guest?.name ?? '',
      roomId: p.guest?.room?.documentId ?? '',
      amount: p.amount,
      dueDate: p.dueDate,
      paidDate: p.paidDate ?? undefined,
      type: p.type,
      status: p.status,
      smsSent: p.smsSent,
    })),

  addGuestWithPayment: async (
    guest: Omit<Guest, 'id'> & { id?: string },
    payment: Omit<Payment, 'id' | 'guestId'> & { guestId?: string; id?: string }
  ): Promise<{ guest: Guest; payment: Payment }> => {
    const createdGuest = await api.addGuest(guest);
    const createdPayment = await api.addPayment({ ...payment, guestId: createdGuest.id });
    return { guest: createdGuest, payment: createdPayment };
  },

  updatePayment: (id: string, data: Partial<Payment>): Promise<Payment> => {
    const payload: Record<string, unknown> = {};
    if (data.amount !== undefined) payload.amount = data.amount;
    if (data.dueDate !== undefined) payload.dueDate = data.dueDate;
    if (data.paidDate !== undefined) payload.paidDate = data.paidDate || undefined;
    if (data.type !== undefined) payload.type = data.type;
    if (data.status !== undefined) payload.status = data.status;
    if (data.smsSent !== undefined) payload.smsSent = data.smsSent;
    if (data.guestId !== undefined) payload.guest = { connect: [data.guestId] };
    return request<{ data: RawPayment }>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: payload }),
    }).then(({ data: p }) => ({
      id: p.documentId,
      guestId: p.guest?.documentId ?? data.guestId ?? '',
      guestName: p.guest?.name ?? '',
      roomId: p.guest?.room?.documentId ?? '',
      amount: p.amount,
      dueDate: p.dueDate,
      paidDate: p.paidDate ?? undefined,
      type: p.type,
      status: p.status,
      smsSent: p.smsSent,
    }));
  },

  updateRoom: (id: string, data: Partial<Room>): Promise<Room> => {
    const payload: Record<string, unknown> = {};
    if (data.number !== undefined) payload.number = data.number;
    if (data.floor !== undefined) payload.floor = data.floor;
    if (data.beds !== undefined) payload.beds = data.beds;
    if (data.type !== undefined) payload.type = data.type;
    if (data.pricePerBed !== undefined) payload.pricePerBed = data.pricePerBed;
    return request<{ data: RawRoom }>(`/rooms/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ data: payload }),
    }).then(({ data: r }) => ({
      id: r.documentId,
      hostelId: r.hostel?.documentId ?? '',
      number: r.number,
      floor: r.floor,
      beds: r.beds,
      occupiedBeds: 0,
      type: r.type,
      pricePerBed: r.pricePerBed,
    }));
  },

  updateRoomPrices: async (hostelId: string, type: Room['type'], pricePerBed: number): Promise<{ ok: boolean }> => {
    const raw = await fetchRoomsByHostel(hostelId);
    const matches = raw.filter((r) => r.type === type);
    await Promise.all(matches.map((r) => api.updateRoom(r.documentId, { pricePerBed })));
    return { ok: true };
  },
};
