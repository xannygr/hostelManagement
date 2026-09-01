#!/usr/bin/env node
/**
 * Создать хостел Narwik на продакшене и наполнить комнатами.
 *
 *  - создаёт хостел «Narwik», если его ещё нет;
 *  - создаёт комнаты:
 *      1 этаж (этаж 1): 4 комнаты (1,2,3,4) по 1 месту, 900 зл/мес за место (pricingPer=bed)
 *      2 этаж (этаж 2): 3 комнаты двухместные (1,2,3) по 2000 зл/мес за комнату (pricingPer=room)
 *  - без жильцов.
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/create-narwik.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const HOSTEL_NAME = 'Narwik';

const ROOMS = [
  // 1 этаж — за место
  { number: '1', floor: 1, beds: 1, price: 900, pricingPer: 'bed' },
  { number: '2', floor: 1, beds: 1, price: 900, pricingPer: 'bed' },
  { number: '3', floor: 1, beds: 1, price: 900, pricingPer: 'bed' },
  { number: '4', floor: 1, beds: 1, price: 900, pricingPer: 'bed' },
  // 2 этаж — двухместные, за комнату
  { number: '1', floor: 2, beds: 2, price: 2000, pricingPer: 'room' },
  { number: '2', floor: 2, beds: 2, price: 2000, pricingPer: 'room' },
  { number: '3', floor: 2, beds: 2, price: 2000, pricingPer: 'room' },
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

  const hostels = (await api(token, 'GET', '/hostels?pagination[limit]=100')).data;
  let hostel = hostels.find(h => h.name === HOSTEL_NAME);
  if (hostel) {
    console.log(`🏨 Hostel "${HOSTEL_NAME}" already exists (${hostel.documentId})`);
  } else {
    const created = await api(token, 'POST', '/hostels', { data: { name: HOSTEL_NAME, address: 'Narwik' } });
    hostel = created.data;
    console.log(`🏨 Hostel "${HOSTEL_NAME}" created (${hostel.documentId})`);
  }
  const hostelDoc = hostel.documentId;

  const existing = (await api(token, 'GET', `/rooms?filters[hostel][documentId][$eq]=${hostelDoc}&pagination[pageSize]=100`)).data;
  console.log(`🗑️  Deleting ${existing.length} existing rooms...`);
  for (const r of existing) {
    await api(token, 'DELETE', `/rooms/${r.documentId}`);
  }

  console.log('🛏️  Creating 7 rooms...');
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
        hostel: { connect: [hostelDoc] },
      },
    });
    console.log(`  ✓ [floor ${r.floor}] "${r.number}" — ${r.beds} мест, ${r.price}/мес ${r.pricingPer === 'room' ? 'за комнату' : 'за место'}`);
  }

  console.log('\n✅ Done! Narwik created (без жильцов).');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
