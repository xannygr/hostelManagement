#!/usr/bin/env node
/**
 * Józefosław: добавить две 6-местные комнаты (700 зл/мес за место) и заселить жильцов.
 *
 *  1 этаж (этаж 1): "1" — 6 мест, 700/мес за место -> Юсуф, Акбар, Джамал
 *  2 этаж (этаж 2): "1" — 6 мест, 700/мес за место -> Алишкер, Санат, Тучи
 *
 * Запуск: CMS_URL=https://cms-production-f6e6.up.railway.app node scripts/jozefoslaw-6bed-residents.mjs
 */
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'raxe5nib6cvdczyantn7wxko';
const PRICE = 700;

function monthPrice(monthly) {
  return {
    pricePerMonth: monthly,
    pricePerWeek: Math.round(monthly / 4),
    pricePerBed: Math.round(monthly / 30),
  };
}

const ROOMS = [
  { number: '1', floor: 1, residents: ['Юсуф', 'Акбар', 'Джамал'] },
  { number: '1', floor: 2, residents: ['Алишкер', 'Санат', 'Тучи'] },
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

  const today = new Date().toISOString().split('T')[0];

  for (const r of ROOMS) {
    console.log(`🛏️  Creating ${r.residents.length} beds room on floor ${r.floor}...`);
    const room = await api(token, 'POST', '/rooms', {
      data: {
        number: r.number,
        floor: r.floor,
        wing: 1,
        beds: 6,
        type: 'standard',
        pricingPer: 'bed',
        ...monthPrice(PRICE),
        hasBalcony: false,
        hasPrivateBathroom: false,
        hostel: { connect: [HOSTEL_DOC] },
      },
    });
    const roomDoc = room.data.documentId;
    console.log(`  ✓ [floor ${r.floor}] "${r.number}" — 6 мест, ${PRICE}/мес за место`);

    console.log(`👤  Заселяю на ${r.floor} этаж...`);
    for (const name of r.residents) {
      const guest = await api(token, 'POST', '/guests', {
        data: {
          name,
          status: 'active',
          paymentPeriod: 'month',
          checkIn: today,
          hostel: { connect: [HOSTEL_DOC] },
          room: { connect: [roomDoc] },
        },
      });
      await api(token, 'POST', '/payments', {
        data: {
          amount: PRICE,
          dueDate: today,
          paidDate: today,
          type: 'cash',
          status: 'paid',
          smsSent: false,
          guest: { connect: [guest.data.documentId] },
        },
      });
      console.log(`  ✓ ${name} -> "${r.number}" (f${r.floor}), оплата ${PRICE}/мес`);
    }
  }

  console.log('\n✅ Done! Józefosław 6-bed rooms + residents added.');
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
