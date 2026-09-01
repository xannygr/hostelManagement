#!/usr/bin/env node
/**
 * Пересборка хостела Białołęka на продакшене.
 *
 *  - удаляет все комнаты хостела;
 *  - создаёт комнаты по раскладке (цена «за комнату в месяц», pricingPer=room):
 *      Партер (этаж 0): Комната 1 (1 мест, 1200/мес), 2 (2 мест, 1600/мес)
 *      1 этаж  (этаж 1): 1 (3 мест, 2000), 2 (2 мест, 1800), 3 (2 мест, 1400)
 *      2 этаж  (этаж 2): 1 (3 мест, 2200, балкон), 2 (3 мест, 2000),
 *                        3 (2 мест, 1600), 4 (1 мест, 1200)
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/rebuild-bialoleka.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'hknpe61nvarwk8q2szhu1te0';

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const ROOMS = [
  // Партер
  { number: '1', floor: 0, beds: 1, price: 1200 },
  { number: '2', floor: 0, beds: 2, price: 1600 },
  // 1 этаж
  { number: '1', floor: 1, beds: 3, price: 2000 },
  { number: '2', floor: 1, beds: 2, price: 1800 },
  { number: '3', floor: 1, beds: 2, price: 1400 },
  // 2 этаж
  { number: '1', floor: 2, beds: 3, price: 2200, balcony: true },
  { number: '2', floor: 2, beds: 3, price: 2000 },
  { number: '3', floor: 2, beds: 2, price: 1600 },
  { number: '4', floor: 2, beds: 1, price: 1200 },
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

  console.log('🛏️  Creating 9 rooms...');
  for (const r of ROOMS) {
    await api(token, 'POST', '/rooms', {
      data: {
        number: r.number,
        floor: r.floor,
        wing: 1,
        beds: r.beds,
        type: 'standard',
        pricingPer: 'room',
        ...monthPrice(r.price),
        hasBalcony: !!r.balcony,
        hasPrivateBathroom: false,
        hostel: { connect: [HOSTEL_DOC] },
      },
    });
    console.log(`  ✓ [floor ${r.floor}] "${r.number}" — ${r.beds} мест, ${r.price}/мес за комнату${r.balcony ? ' (балкон)' : ''}`);
  }

  console.log('\n✅ Done! Białołęka rebuilt (без жильцов).');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
