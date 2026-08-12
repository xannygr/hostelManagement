import type { Core } from '@strapi/strapi';
import { readFileSync, mkdtempSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const mockData = () => {
  const file = path.join(process.cwd(), 'data', 'mock.json');
  return JSON.parse(readFileSync(file, 'utf8'));
};

const CONTENT_TYPES = ['api::hostel.hostel', 'api::room.room', 'api::guest.guest', 'api::payment.payment'];

async function downloadPhoto(url: string): Promise<Buffer> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (HostelHaven Seed)' },
  });
  if (!res.ok) throw new Error(`download failed ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function uploadPhotos(strapi: Core.Strapi, urls: string[], prefix = 'room'): Promise<number[]> {
  const fileIds: number[] = [];
  const tmpDir = mkdtempSync(path.join(os.tmpdir(), 'hostelhaven-photos-'));
  try {
    for (const url of urls) {
      const buf = await downloadPhoto(url);
      const ext = path.extname(new URL(url).pathname).split('?')[0] || '.jpg';
      const filename = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || '.jpg'}`;
      const filepath = path.join(tmpDir, filename);
      writeFileSync(filepath, buf);
      const mime = ext === '.png' ? 'image/png' : 'image/jpeg';
      const uploaded = await strapi.plugin('upload').service('upload').upload({
        data: { fileInfo: { name: filename } },
        files: {
          originalFilename: filename,
          mimetype: mime,
          size: buf.length,
          filepath,
        },
      });
      if (uploaded[0]?.id) fileIds.push(uploaded[0].id);
    }
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
  return fileIds;
}

async function isSeeded(strapi: Core.Strapi) {
  const count = await strapi.db.query('api::hostel.hostel').count();
  return count > 0;
}

const READ_ACTIONS = ['find', 'findOne'];
const WRITE_ACTIONS = ['create', 'update', 'delete'];
const ALL_ACTIONS = [...READ_ACTIONS, ...WRITE_ACTIONS];

const ADMIN_ROLE = { name: 'Administrator', type: 'admin', description: 'Полный доступ ко всем данным' };
const ADMIN_EMAIL = 'admin@hostel.com';

async function ensureRole(strapi: Core.Strapi, { name, type, description }: { name: string; type: string; description: string }) {
  const existing = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type } });
  if (existing) return existing;
  const role = await strapi.db.query('plugin::users-permissions.role').create({
    data: { name, type, description },
  });
  strapi.log.info(`[seed] created role "${name}"`);
  return role;
}

async function grantPermissions(strapi: Core.Strapi, role: { id: number }, actions: string[]) {
  const permissions = CONTENT_TYPES.flatMap((uid) =>
    actions.map((action) => ({ action: `${uid}.${action}`, role: role.id, enabled: true })),
  );
  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: { id: role.id }, action: { $in: permissions.map((p) => p.action) } },
  });
  const existingActions = new Set(existing.map((e) => e.action));
  for (const p of permissions) {
    if (existingActions.has(p.action)) continue;
    await strapi.db.query('plugin::users-permissions.permission').create({ data: p });
    strapi.log.info(`[seed] granted "${p.action}" to role ${role.id}`);
  }
}

async function grantRawPermissions(strapi: Core.Strapi, role: { id: number }, actions: string[]) {
  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: { id: role.id }, action: { $in: actions } },
  });
  const existingActions = new Set(existing.map((e) => e.action));
  for (const action of actions) {
    if (existingActions.has(action)) continue;
    await strapi.db.query('plugin::users-permissions.permission').create({
      data: { action, role: role.id, enabled: true },
    });
    strapi.log.info(`[seed] granted "${action}" to role ${role.id}`);
  }
}

async function revokePermissions(strapi: Core.Strapi, role: { id: number }, actions: string[]) {
  const actionsToDelete = CONTENT_TYPES.flatMap((uid) =>
    actions.map((action) => `${uid}.${action}`),
  );
  await strapi.db.query('plugin::users-permissions.permission').deleteMany({
    where: { role: { id: role.id }, action: { $in: actionsToDelete } },
  });
  strapi.log.info(`[seed] revoked ${actionsToDelete.length} permissions from role ${role.id}`);
}

async function seedPermissions(strapi: Core.Strapi) {
  const adminRole = await ensureRole(strapi, ADMIN_ROLE);
  await grantPermissions(strapi, adminRole, ALL_ACTIONS);
  await grantRawPermissions(strapi, adminRole, [
    'plugin::users-permissions.user.me',
    'plugin::users-permissions.auth.changePassword',
  ]);

  const roles = await strapi.db.query('plugin::users-permissions.role').findMany();
  const authenticated = roles.find((r) => r.type === 'authenticated');
  if (authenticated) {
    await revokePermissions(strapi, authenticated, WRITE_ACTIONS);
    await grantPermissions(strapi, authenticated, READ_ACTIONS);
  }

  const adminUser = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email: ADMIN_EMAIL },
  });
  if (adminUser && adminUser.role !== adminRole.id) {
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: adminUser.id },
      data: { role: adminRole.id },
    });
    strapi.log.info(`[seed] ${ADMIN_EMAIL} assigned to role "${ADMIN_ROLE.name}"`);
  }

  const pluginStore = strapi.store({ type: 'plugin', name: 'users-permissions' });
  const advanced = ((await pluginStore.get({ key: 'advanced' })) || {}) as { allow_register?: boolean };
  if (advanced.allow_register !== false) {
    await pluginStore.set({ key: 'advanced', value: { ...advanced, allow_register: false } });
    strapi.log.info('[seed] public registration disabled');
  }
}

// Пароль по умолчанию совпадает с подсказкой на странице входа фронтенда
// и с креденшелами в tests/helpers.js. В проде задайте ADMIN_PASSWORD.
const DEFAULT_ADMIN_PASSWORD = 'admin123';

async function ensureDefaultAdmin(strapi: Core.Strapi) {
  const userService = strapi.plugin('users-permissions').service('user');
  const role = await ensureRole(strapi, ADMIN_ROLE);
  const desiredPassword = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

  const existing = await strapi.db.query('plugin::users-permissions.user').findOne({
    where: { email: ADMIN_EMAIL },
  });

  if (!existing) {
    await userService.add({
      username: 'admin',
      email: ADMIN_EMAIL,
      password: desiredPassword,
      provider: 'local',
      confirmed: true,
      blocked: false,
      role: role.id,
    });
    strapi.log.warn(
      `[seed] created default dashboard user ${ADMIN_EMAIL} / ${desiredPassword}. ` +
        (process.env.ADMIN_PASSWORD
          ? 'For safety, set a strong ADMIN_PASSWORD on first deploy.'
          : 'Set the ADMIN_PASSWORD env var to change the default password.'),
    );
    return;
  }

  if (existing.role !== role.id) {
    await strapi.db.query('plugin::users-permissions.user').update({
      where: { id: existing.id },
      data: { role: role.id },
    });
    strapi.log.info(`[seed] ${ADMIN_EMAIL} assigned to role "${ADMIN_ROLE.name}"`);
  }

  try {
    const matches = await userService.validatePassword(desiredPassword, existing.password);
    if (matches) return;
  } catch {
    strapi.log.warn(`[seed] unreadable password hash for ${ADMIN_EMAIL}; resetting it`);
  }

  await userService.edit(existing.id, { password: desiredPassword });
  strapi.log.warn(
    `[seed] reset dashboard user ${ADMIN_EMAIL} password to ` +
      (process.env.ADMIN_PASSWORD ? 'the ADMIN_PASSWORD value' : `"${DEFAULT_ADMIN_PASSWORD}"`) +
      '. Control it via the ADMIN_PASSWORD env var.',
  );
}

const HEALTH_ROUTE = '/api/health';

function healthMiddleware(strapi: Core.Strapi) {
  strapi.server.use(async (ctx, next) => {
    if (ctx.method === 'GET' && ctx.path === HEALTH_ROUTE) {
      ctx.status = 200;
      ctx.body = { status: 'ok' };
      return;
    }
    await next();
  });
}

// Strapi 5 has a known bug (dual-package hazard with @strapi/utils) where
// ApplicationError/ValidationError are not recognised via `instanceof` and get
// serialised as a generic 500 instead of their proper 4xx status. This is
// registered last (innermost), so it catches thrown errors before the stock
// `strapi::errors` middleware and normalises them by `error.name`.
const STATUS_BY_NAME: Record<string, number> = {
  YupValidationError: 400,
  ValidationError: 400,
  ApplicationError: 400,
  UnauthorizedError: 401,
  ForbiddenError: 403,
  PolicyError: 403,
  NotFoundError: 404,
  PayloadTooLargeError: 413,
  RateLimitError: 429,
  NotImplementedError: 501,
};

function errorNormalizerMiddleware(strapi: Core.Strapi) {
  strapi.server.use(async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      const err = error as Error & { status?: number; details?: unknown };
      const status = STATUS_BY_NAME[err.name] ?? err.status;
      if (status && err.message) {
        ctx.status = status;
        ctx.body = {
          data: null,
          error: { status, name: err.name, message: err.message, details: err.details ?? {} },
        };
        return;
      }
      throw error;
    }
  });
}

async function seed(strapi: Core.Strapi) {
  if (await isSeeded(strapi)) return;

  const { hostels, rooms, guests, payments } = mockData();
  const hostelIds: Record<string, number> = {};
  const roomIds: Record<string, number> = {};
  const guestIdByMockId = new Map<string, number>();
  const photoCache = new Map<string, number[]>();

  const fetchPhotoIds = async (urls: string[] | undefined) => {
    if (!urls || urls.length === 0) return [];
    const ids: number[] = [];
    for (const url of urls) {
      if (!photoCache.has(url)) {
        try {
          photoCache.set(url, await uploadPhotos(strapi, [url]));
        } catch (err) {
          strapi.log.warn(`[seed] photo skip ${url}: ${(err as Error).message}`);
          photoCache.set(url, []);
        }
      }
      ids.push(...(photoCache.get(url) ?? []));
    }
    return ids;
  };

  for (const h of hostels) {
    const [imageId] = h.image ? await fetchPhotoIds([h.image]) : [];
    const created = await strapi.documents('api::hostel.hostel').create({
      data: {
        name: h.name,
        address: h.address,
        floors: h.floors,
        kitchens: h.kitchens,
        parking: h.parking,
        showers: h.showers,
        toilets: h.toilets,
        image: imageId,
      },
      status: 'published',
    });
    hostelIds[h.id] = Number(created.id);
  }

  for (const r of rooms) {
    const photoIds = await fetchPhotoIds(r.photos);
    const created = await strapi.documents('api::room.room').create({
      data: {
        number: r.number,
        floor: r.floor,
        beds: r.beds,
        type: r.type,
        pricePerBed: r.pricePerBed,
        hasBalcony: r.hasBalcony,
        hasPrivateBathroom: r.hasPrivateBathroom,
        photos: photoIds.length > 0 ? photoIds : undefined,
        hostel: hostelIds[r.hostelId],
      },
      status: 'published',
    });
    roomIds[r.id] = Number(created.id);
  }

  for (const g of guests) {
    const created = await strapi.documents('api::guest.guest').create({
      data: {
        name: g.name,
        phone: g.phone,
        email: g.email,
        passport: g.passport,
        checkIn: g.checkIn,
        checkOut: g.checkOut,
        status: g.status,
        hostel: hostelIds[g.hostelId],
        room: roomIds[g.roomId],
      },
      status: 'published',
    });
    guestIdByMockId.set(g.id, Number(created.id));
  }

  for (const p of payments) {
    const guestId = guestIdByMockId.get(p.guestId);
    if (!guestId) continue;
    await strapi.documents('api::payment.payment').create({
      data: {
        amount: p.amount,
        dueDate: p.dueDate,
        paidDate: p.paidDate,
        type: p.type,
        status: p.status,
        smsSent: p.smsSent,
        guest: guestId,
      },
      status: 'published',
    });
  }

  strapi.log.info('[seed] demo data imported from mock.json');
}

// «Самолечение» медиа. На Railway файлы в /app/public/uploads не переживают
// рестарт контейнера (эфемерный диск), хотя записи в БД остаются. На каждом
// старте проверяем наличие файлов на диске и перезаливаем недостающие из
// mock.json — и для комнат, и для хостелов. Идемпотентно: если файлы на месте,
// ничего не делает.
type MediaUpload = { url?: string };
type HostelRow = { id: number; name: string; image?: MediaUpload | null };
type RoomRow = { id: number; number: string; hostel?: { name?: string } | null; photos?: MediaUpload[] | null };

function uploadsFilePath(url?: string): string {
  return path.join(process.cwd(), 'public', (url || '').replace(/^\//, ''));
}

async function healMissingMedia(strapi: Core.Strapi) {
  const { rooms, hostels } = mockData();
  const hostelNameById = new Map<string, string>(
    hostels.map((h: { id: string; name: string }) => [h.id, h.name]),
  );

  const fileExists = (u?: MediaUpload | null) => Boolean(u?.url && existsSync(uploadsFilePath(u.url)));
  const urlCache = new Map<string, number[]>();
  const ensureIds = async (url?: string) => {
    if (!url) return [];
    if (!urlCache.has(url)) {
      try {
        urlCache.set(url, await uploadPhotos(strapi, [url]));
      } catch (err) {
        strapi.log.warn(`[media] photo skip ${url}: ${(err as Error).message}`);
        urlCache.set(url, []);
      }
    }
    return urlCache.get(url) ?? [];
  };

  const healHostels = async () => {
    const dbHostels = (await strapi.db.query('api::hostel.hostel').findMany({
      populate: { image: true },
    })) as HostelRow[];
    for (const h of dbHostels) {
      const mock = hostels.find((m: { name: string }) => m.name === h.name);
      if (!mock?.image || fileExists(h.image)) continue;
      try {
        const [imageId] = await ensureIds(mock.image);
        if (imageId) {
          await strapi.db.query('api::hostel.hostel').update({
            where: { id: h.id },
            data: { image: imageId },
          });
          strapi.log.info(`[media] hostel "${h.name}" image restored`);
        }
      } catch (err) {
        strapi.log.warn(`[media] hostel "${h.name}" image skip: ${(err as Error).message}`);
      }
    }
  };

  const healRooms = async () => {
    const dbRooms = (await strapi.db.query('api::room.room').findMany({
      populate: { photos: true, hostel: true },
    })) as RoomRow[];
    for (const r of dbRooms) {
      const mock = rooms.find(
        (m: { hostelId: string; number: string }) =>
          m.number === r.number && hostelNameById.get(m.hostelId) === r.hostel?.name,
      );
      if (!mock?.photos?.length) continue;
      const currentPhotos = r.photos ?? [];
      if (currentPhotos.length > 0 && currentPhotos.every(fileExists)) continue;
      try {
        const ids = (
          await Promise.all(mock.photos.map((url: string) => ensureIds(url)))
        ).flat();
        if (ids.length > 0) {
          await strapi.db.query('api::room.room').update({
            where: { id: r.id },
            data: { photos: ids },
          });
          strapi.log.info(`[media] room "${r.hostel?.name ?? '?'} / ${r.number}" restored ${ids.length} photos`);
        }
      } catch (err) {
        strapi.log.warn(`[media] room "${r.number}" photos skip: ${(err as Error).message}`);
      }
    }
  };

  const started = Date.now();
  await healHostels();
  await healRooms();
  strapi.log.info(`[media] media check finished in ${Date.now() - started}ms`);
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  bootstrap({ strapi }: { strapi: Core.Strapi }) {
    healthMiddleware(strapi);
    errorNormalizerMiddleware(strapi);
    return (async () => {
      await seedPermissions(strapi);
      await ensureDefaultAdmin(strapi);
      await seed(strapi);
      await healMissingMedia(strapi);
    })();
  },
};
