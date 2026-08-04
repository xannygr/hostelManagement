/**
 * guest controller
 *
 * Серверная валидация бизнес-правил:
 *  - дата выезда не раньше даты заезда;
 *  - комната должна относиться к указанному хостелу;
 *  - нельзя заселить больше гостей, чем кроватей в комнате (только active).
 */

import { factories } from '@strapi/strapi';
import type { Core } from '@strapi/strapi';

type Data = Record<string, unknown>;

function extractDocumentId(value: unknown): string | undefined {
  if (!value) return undefined;
  const v = value as { connect?: unknown[] };
  if (Array.isArray(v.connect)) {
    const first = v.connect[0];
    if (typeof first === 'string') return first;
    return (first as { documentId?: string } | null)?.documentId;
  }
  return undefined;
}

async function validateGuest(strapi: Core.Strapi, data: Data | undefined, excludeDocumentId: string | null): Promise<string | null> {
  if (!data) return null;

  const checkIn = data.checkIn as string | undefined;
  const checkOut = data.checkOut as string | undefined;
  if (checkIn && checkOut && checkOut < checkIn) {
    return 'Дата выезда не может быть раньше даты заезда';
  }

  const roomDocumentId = extractDocumentId(data.room);
  const hostelDocumentId = extractDocumentId(data.hostel);
  const status = (data.status as string | undefined) ?? 'active';

  if (!roomDocumentId) return null;

  const room = await strapi.documents('api::room.room').findOne({
    documentId: roomDocumentId,
    populate: { hostel: true },
  });
  if (!room) {
    return `Комната не найдена: ${roomDocumentId}`;
  }

  if (hostelDocumentId && room.hostel?.documentId !== hostelDocumentId) {
    return 'Комната не относится к указанному хостелу';
  }

  if (status === 'active') {
    const active = await strapi.documents('api::guest.guest').count({
      filters: {
        room: { documentId: roomDocumentId },
        status: 'active',
        ...(excludeDocumentId ? { documentId: { $ne: excludeDocumentId } } : {}),
      },
    });
    if (active >= (room.beds ?? 0)) {
      return `В комнате «${room.number}» нет свободных кроватей (вместимость ${room.beds ?? 0})`;
    }
  }

  return null;
}

export default factories.createCoreController('api::guest.guest', ({ strapi }) => ({
  async create(ctx) {
    const message = await validateGuest(strapi, ctx.request.body?.data as Data | undefined, null);
    if (message) return ctx.badRequest(message);
    return super.create(ctx);
  },

  async update(ctx) {
    const message = await validateGuest(strapi, ctx.request.body?.data as Data | undefined, ctx.params.id as string);
    if (message) return ctx.badRequest(message);
    return super.update(ctx);
  },
}));
