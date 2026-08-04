/**
 * hostel controller
 *
 * Кастомные эндпоинты:
 *  - GET /api/metrics/hostels — агрегированные метрики по хостелам
 *    (занятость, доход, долги) считаются на сервере.
 */

import { factories } from '@strapi/strapi';

interface Ref {
  documentId?: string;
}

const todayStr = new Date().toISOString().split('T')[0];

export default factories.createCoreController('api::hostel.hostel', ({ strapi }) => ({
  async stats() {
    const [hostels, rooms, guests, payments] = await Promise.all([
      strapi.documents('api::hostel.hostel').findMany(),
      strapi.documents('api::room.room').findMany({ populate: { hostel: true } }),
      strapi.documents('api::guest.guest').findMany({ populate: { hostel: true, room: true } }),
      strapi.documents('api::payment.payment').findMany({ populate: { guest: true } }),
    ]);

    const roomsByHostel = new Map<string, Array<{ documentId: string; beds: number }>>();
    for (const r of rooms) {
      const hid = (r.hostel as Ref | null)?.documentId;
      if (!hid) continue;
      if (!roomsByHostel.has(hid)) roomsByHostel.set(hid, []);
      roomsByHostel.get(hid)!.push({ documentId: r.documentId, beds: Number(r.beds ?? 0) });
    }

    const activeByRoom = new Map<string, number>();
    const guestsByHostel = new Map<string, { active: number; ids: Set<string> }>();
    for (const g of guests) {
      const roomId = (g.room as Ref | null)?.documentId;
      const hostelId = (g.hostel as Ref | null)?.documentId;
      if (g.status === 'active' && roomId) {
        activeByRoom.set(roomId, (activeByRoom.get(roomId) ?? 0) + 1);
      }
      if (hostelId) {
        if (!guestsByHostel.has(hostelId)) guestsByHostel.set(hostelId, { active: 0, ids: new Set() });
        const rec = guestsByHostel.get(hostelId)!;
        if (g.status === 'active') rec.active += 1;
        rec.ids.add(g.documentId);
      }
    }

    const sumsByGuest = new Map<string, { revenue: number; due: number }>();
    for (const p of payments) {
      const guestId = (p.guest as Ref | null)?.documentId;
      if (!guestId) continue;
      const cur = sumsByGuest.get(guestId) ?? { revenue: 0, due: 0 };
      const amount = Number(p.amount ?? 0);
      if (p.status === 'paid') cur.revenue += amount;
      else if ((p.status === 'pending' || p.status === 'overdue') && String(p.dueDate ?? '') <= todayStr) cur.due += amount;
      sumsByGuest.set(guestId, cur);
    }

    const stats = hostels.map((h) => {
      const hs = roomsByHostel.get(h.documentId) ?? [];
      const g = guestsByHostel.get(h.documentId);
      let totalRevenue = 0;
      let totalDue = 0;
      if (g) {
        for (const guestId of g.ids) {
          const s = sumsByGuest.get(guestId);
          if (s) {
            totalRevenue += s.revenue;
            totalDue += s.due;
          }
        }
      }
      return {
        documentId: h.documentId,
        name: h.name,
        address: h.address,
        totalRooms: hs.length,
        totalBeds: hs.reduce((s, r) => s + r.beds, 0),
        occupiedBeds: g?.active ?? 0,
        occupiedRooms: hs.filter((r) => (activeByRoom.get(r.documentId) ?? 0) > 0).length,
        totalRevenue,
        totalDue,
      };
    });

    const totals = stats.reduce(
      (acc, s) => ({
        hostelCount: stats.length,
        totalRooms: acc.totalRooms + s.totalRooms,
        totalBeds: acc.totalBeds + s.totalBeds,
        occupiedBeds: acc.occupiedBeds + s.occupiedBeds,
        occupiedRooms: acc.occupiedRooms + s.occupiedRooms,
        totalRevenue: acc.totalRevenue + s.totalRevenue,
        totalDue: acc.totalDue + s.totalDue,
      }),
      { hostelCount: 0, totalRooms: 0, totalBeds: 0, occupiedBeds: 0, occupiedRooms: 0, totalRevenue: 0, totalDue: 0 },
    );

    return { data: { hostels: stats, totals } };
  },
}));
