#!/usr/bin/env node
/**
 * Пересборка хостела Stare_Babice на продакшене.
 *
 *  - удаляет все комнаты хостела;
 *  - создаёт комнаты по раскладке (цена «за место в месяц», pricingPer=bed):
 *      Партер (этаж 0): Комната 1 (2), 2 (4), 3 (3), 4 (2)   — 800/мес за место
 *      1 этаж  (этаж 1): 1 (2), 2 (4), 3 (3), 4 (3)            — 800/мес за место
 *      2 этаж  (этаж 2): 5 (2, 1800/мес за место), 6 (4), 7 (3), 8 (3) — 800/мес за место
 *  - заселяет текущих жильцов:
 *      Кристина -> 1 этаж, комната 1 (оплата 800/мес)
 *      Ира      -> 2 этаж, комната 5 (оплата 1800/мес)
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/rebuild-stare-babice.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'bxy866m3yq7jqmfg1qupg9ec';

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const ROOMS = [
  // Партер
  { number: '1', floor: 0, beds: 2, price: 800 },
  { number: '2', floor: 0, beds: 4, price: 800 },
  { number: '3', floor: 0, beds: 3, price: 800 },
  { number: '4', floor: 0, beds: 2, price: 800 },
  // 1 этаж
  { number: '1', floor: 1, beds: 2, price: 800 },
  { number: '2', floor: 1, beds: 4, price: 800 },
  { number: '3', floor: 1, beds: 3, price: 800 },
  { number: '4', floor: 1, beds: 3, price: 800 },
  // 2 этаж
  { number: '5', floor: 2, beds: 2, price: 1800 },
  { number: '6', floor: 2, beds: 4, price: 800 },
  { number: '7', floor: 2, beds: 3, price: 800 },
  { number: '8', floor: 2, beds: 3, price: 800 },
];

// (floor, number) -> имя жильца (если заселяем)
const RESIDENTS = {
  '1:1': { name: 'Кристина' },
  '2:5': { name: 'Ира' },
};

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

  console.log('🛏️  Creating 12 rooms...');
  const created = {};
  for (const r of ROOMS) {
    const resp = await api(token, 'POST', '/rooms', {
      data: {
        number: r.number,
        floor: r.floor,
        wing: 1,
        beds: r.beds,
        type: 'standard',
        pricingPer: 'bed',
        ...monthPrice(r.price),
        hasBalcony: false,
        hasPrivateBathroom: false,
        hostel: { connect: [HOSTEL_DOC] },
      },
    });
    const createdRoom = resp.data;
    created[`${r.floor}:${r.number}`] = createdRoom;
    console.log(`  ✓ [floor ${r.floor}] "${r.number}" — ${r.beds} beds, ${r.price}/мес за место`);
  }

  console.log('\n👤 Creating residents...');
  const today = new Date().toISOString().split('T')[0];
  for (const key of Object.keys(RESIDENTS)) {
    const room = created[key];
    if (!room) throw new Error(`Room not found for key ${key}`);
    const resident = RESIDENTS[key];
    const monthly = ROOMS.find(r => `${r.floor}:${r.number}` === key).price;
    const guest = await api(token, 'POST', '/guests', {
      data: {
        name: resident.name,
        status: 'active',
        paymentPeriod: 'month',
        checkIn: today,
        hostel: { connect: [HOSTEL_DOC] },
        room: { connect: [room.documentId] },
      },
    });
    await api(token, 'POST', '/payments', {
      data: {
        amount: monthly,
        dueDate: today,
        paidDate: today,
        type: 'cash',
        status: 'paid',
        smsSent: false,
        guest: { connect: [guest.data.documentId] },
      },
    });
    console.log(`  ✓ ${resident.name} -> "${room.number}" (f${room.floor}), оплата ${monthly}/мес`);
  }

  console.log('\n✅ Done! Stare_Babice rebuilt.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
