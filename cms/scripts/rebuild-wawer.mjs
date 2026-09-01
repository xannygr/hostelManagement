#!/usr/bin/env node
/**
 * Пересборка хостела Wawer на продакшене.
 *
 *  - удаляет все комнаты хостела;
 *  - создаёт комнаты по раскладке (без жильцов):
 *      Партер (этаж 0): 1 (1 мест, 1500/мес за комнату), 2 (1 мест, 1600),
 *                        3 (1 мест, 1850), 4 (2 мест, 1600) — pricingPer=room
 *      1 этаж  (этаж 1): 1 (3 мест, 2000, балкон, room), 2 (2 мест, 2000, room),
 *                        3 (2 мест, по 900/мес за место, bed), 4 (2 мест, по 900/мес, bed)
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/rebuild-wawer.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'kd82gpdkhrsidqxda20avq58';

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const ROOMS = [
  // Партер — за комнату
  { number: '1', floor: 0, beds: 1, price: 1500, pricingPer: 'room' },
  { number: '2', floor: 0, beds: 1, price: 1600, pricingPer: 'room' },
  { number: '3', floor: 0, beds: 1, price: 1850, pricingPer: 'room' },
  { number: '4', floor: 0, beds: 2, price: 1600, pricingPer: 'room' },
  // 1 этаж
  { number: '1', floor: 1, beds: 3, price: 2000, pricingPer: 'room', balcony: true },
  { number: '2', floor: 1, beds: 2, price: 2000, pricingPer: 'room' },
  { number: '3', floor: 1, beds: 2, price: 900, pricingPer: 'bed' },
  { number: '4', floor: 1, beds: 2, price: 900, pricingPer: 'bed' },
];

async function login() {
  const res = await fetch(`${CMS}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed (${res.status})`);
  return (await res.json()).jwt;
}

async function api(token, method, path, body) {
  const res = await fetch(`${CMS}/api${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (res.status === 204) return null;
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} failed (${res.status}): ${text}`);
  return text ? JSON.parse(text) : null;
}

async function main() {
  console.log(`🔑 Logging in to ${CMS}...`);
  const token = await login();
  console.log('  ✓ Token received\n');

  const existing = await api(token, 'GET', `/rooms?filters[hostel][documentId][$eq]=${HOSTEL_DOC}&pagination[pageSize]=100`);
  console.log(`🗑️  Deleting ${existing.data.length} existing rooms...`);
  for (const r of existing.data) {
    await api(token, 'DELETE', `/rooms/${r.documentId}`);
  }
  console.log('  ✓ All existing rooms deleted\n');

  console.log('🛏️  Creating 8 rooms...');
  for (const r of ROOMS) {
    await api(token, 'POST', '/rooms', {
      data: {
        number: r.number,
        floor: r.floor,
        wing: 1,
        beds: r.beds,
        type: 'standard',
        pricingPer: r.pricingPer,
        ...monthPrice(r.price),
        hasBalcony: !!r.balcony,
        hasPrivateBathroom: false,
        hostel: { connect: [HOSTEL_DOC] },
      },
    });
    console.log(`  ✓ [floor ${r.floor}] "${r.number}" — ${r.beds} мест, ${r.price}/мес ${r.pricingPer === 'room' ? 'за комнату' : 'за место'}${r.balcony ? ' (балкон)' : ''}`);
  }

  console.log('\n✅ Done! Wawer rebuilt (без жильцов).');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
