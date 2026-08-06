# ---------- deps ----------
FROM node:22-alpine AS deps

# better-sqlite3 (dev sqlite) needs a compiler on alpine even when using Postgres
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---------- build ----------
FROM node:22-alpine AS build

WORKDIR /app
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/tsconfig.json ./tsconfig.json
COPY --from=build /app/src ./src
COPY --from=build /app/config ./config
COPY --from=build /app/data ./data
COPY --from=build /app/database ./database
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/public ./public
COPY --from=build /app/favicon.png ./favicon.png

# Media uploads land here; mount a Railway volume on /app/public/uploads
RUN mkdir -p /app/public/uploads

EXPOSE 1337
ENTRYPOINT ["sh", "/app/scripts/entrypoint.sh"]
