import crypto from 'node:crypto';
import type { Core } from '@strapi/strapi';

// Railway не передаёт секреты (entrypoint.sh может не выполняться), поэтому
// генерируем фолбэки в коде — как это делал entrypoint. Реальные значения
// задаются переменными Railway, когда они нужны (стабильные сессии/токены).
const sec = (env: Core.Config.Shared.ConfigParams['env'], key: string): string =>
  env(key, crypto.randomBytes(16).toString('base64'));

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Admin => ({
  auth: {
    secret: sec(env, 'ADMIN_JWT_SECRET'),
  },
  apiToken: {
    salt: sec(env, 'API_TOKEN_SALT'),
  },
  transfer: {
    token: {
      salt: sec(env, 'TRANSFER_TOKEN_SALT'),
    },
  },
  secrets: {
    encryptionKey: sec(env, 'ENCRYPTION_KEY'),
  },
  flags: {
    nps: env.bool('FLAG_NPS', true),
    promoteEE: env.bool('FLAG_PROMOTE_EE', true),
    docLinks: env.bool('FLAG_DOC_LINKS', true),
  },
});

export default config;