#!/usr/bin/env node
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';

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
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function fetchAll(token, path) {
  const out = [];
  let start = 0;
  const pageSize = 100;
  while (true) {
    const res = await api(token, 'GET', `${path}&pagination[start]=${start}&pagination[limit]=${pageSize}`);
    out.push(...res.data);
    if (out.length >= res.meta.pagination.total) break;
    start += pageSize;
  }
  return out;
}

async function main() {
  console.log(`🔑 Logging in to ${CMS}...`);
  const token = await login();
  console.log('  ✓ Token received\n');

  console.log('🏠 Migrating rooms -> pricePerWeek/pricePerMonth/pricingPer...');
  const rooms = await fetchAll(token, '/rooms?');
  let roomUpdated = 0;
  for (const r of rooms) {
    const weekly = r.pricePerWeek ?? r.pricePerBed * 7;
    const monthly = r.pricePerMonth ?? r.pricePerBed * 30;
    if (r.pricePerWeek === weekly && r.pricePerMonth === monthly && r.pricingPer === 'bed') continue;
    await api(token, 'PUT', `/rooms/${r.documentId}`, {
      data: { pricePerWeek: weekly, pricePerMonth: monthly, pricingPer: 'bed' },
    });
    roomUpdated++;
  }
  console.log(`  ✓ ${roomUpdated}/${rooms.length} rooms updated\n`);

  console.log('👤 Migrating guests -> paymentPeriod...');
  const guests = await fetchAll(token, '/guests?');
  let guestUpdated = 0;
  for (const g of guests) {
    if (g.paymentPeriod === 'month') continue;
    await api(token, 'PUT', `/guests/${g.documentId}`, { data: { paymentPeriod: 'month' } });
    guestUpdated++;
  }
  console.log(`  ✓ ${guestUpdated}/${guests.length} guests updated\n`);

  console.log('✅ Migration complete.');
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
