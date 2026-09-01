#!/usr/bin/env node
/**
 * Пересборка хостела Piaseczno на продакшене.
 *
 *  - удаляет все комнаты хостела;
 *  - создаёт комнаты по раскладке:
 *      1 этаж (этаж 1): комнаты 1, 2, 3 (по 5 мест) — 750 зл/мес за место (pricingPer=bed)
 *      2 этаж (этаж 2): «Квартира» — 3000 зл/мес за комнату целиком (pricingPer=room)
 *  - без жильцов.
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/rebuild-piaseczno.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'e78eqx91lhemeikg3jkdm0ao';

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const ROOMS = [
  // 1 этаж — за место (bed)
  { number: '1', floor: 1, beds: 5, price: 750, pricingPer: 'bed' },
  { number: '2', floor: 1, beds: 5, price: 750, pricingPer: 'bed' },
  { number: '3', floor: 1, beds: 5, price: 750, pricingPer: 'bed' },
  // 2 этаж — квартира, за комнату целиком (room)
  { number: 'Квартира', floor: 2, beds: 1, price: 3000, pricingPer: 'room' },
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

  console.log('🛏️  Creating 4 rooms...');
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

  console.log('\n✅ Done! Piaseczno rebuilt (без жильцов).');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
