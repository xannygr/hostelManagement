#!/usr/bin/env node
/**
 * Пересборка хостела Józefosław на продакшене.
 *
 *  - удаляет все комнаты хостела;
 *  - создаёт комнаты по раскладке (цены «за место в месяц», pricingPer=bed;
 *    квартира-пристройка — за комнату, pricingPer=room):
 *      Пристройка (этаж 0): «Квартира» — 3100/мес за комнату
 *      Партер   (этаж 0):
 *          1  (3 места, по 800)
 *          2  (2 места, по 1000)
 *          3  (2 места, по 900)
 *          4  (2 места, по 700)
 *          11 (3 места, по 700)
 *          12 (3 места, по 800)
 *          0  (1 место, 1000)
 *  - без жильцов.
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/rebuild-jozefoslaw.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'raxe5nib6cvdczyantn7wxko';

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const ROOMS = [
  // Пристройка — квартира, за комнату целиком
  { number: 'Квартира', floor: 0, beds: 1, price: 3100, pricingPer: 'room' },
  // Партер — за место
  { number: '1', floor: 0, beds: 3, price: 800, pricingPer: 'bed' },
  { number: '2', floor: 0, beds: 2, price: 1000, pricingPer: 'bed' },
  { number: '3', floor: 0, beds: 2, price: 900, pricingPer: 'bed' },
  { number: '4', floor: 0, beds: 2, price: 700, pricingPer: 'bed' },
  { number: '11', floor: 0, beds: 3, price: 700, pricingPer: 'bed' },
  { number: '12', floor: 0, beds: 3, price: 800, pricingPer: 'bed' },
  { number: '0', floor: 0, beds: 1, price: 1000, pricingPer: 'bed' },
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
        hasBalcony: false,
        hasPrivateBathroom: false,
        hostel: { connect: [HOSTEL_DOC] },
      },
    });
    console.log(`  ✓ [floor ${r.floor}] "${r.number}" — ${r.beds} мест, ${r.price}/мес ${r.pricingPer === 'room' ? 'за комнату' : 'за место'}`);
  }

  console.log('\n✅ Done! Józefosław rebuilt (без жильцов).');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
