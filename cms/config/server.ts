import crypto from 'node:crypto';
import type { Core } from '@strapi/strapi';

// Railway не всегда передаёт APP_KEYS/JWT_SECRET (entrypoint.sh может не
// выполняться). Падение strapi::session без app.keys роняло весь деплой на
// healthcheck. Поэтому генерируем запасные ключи прямо в коде — приложение
// boot'ится всегда, а при желании ключи фиксируются Railway-переменными.
const appKeys = (env: Core.Config.Shared.ConfigParams['env']): string[] => {
  const keys = env.array('APP_KEYS', []) as string[];
  if (keys.length > 0) return keys;
  console.warn('[config] APP_KEYS не заданы — генерируем случайные ключи сессий');
  return [crypto.randomBytes(32).toString('base64'), crypto.randomBytes(32).toString('base64')];
};

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Server => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  app: {
    keys: appKeys(env),
  },
  ...({ proxy: { koa: env.bool('APP_PROXY', true) } } as Record<string, unknown>),
  webhooks: {
    populateRelations: env.bool('WEBHOOKS_POPULATE_RELATIONS', false),
  },
});

export default config;