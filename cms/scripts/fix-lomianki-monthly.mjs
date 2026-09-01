#!/usr/bin/env node
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'l5iu6amdro4a63l42hd69ujb';

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
  if (!res.ok) { const err = await res.json().catch(() => null); throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(err)}`); }
  return res.json();
}

async function main() {
  const token = await login();
  const rooms = (await api(token, 'GET', `/rooms?filters[hostel][documentId][$eq]=${HOSTEL_DOC}&pagination[limit]=100`)).data;

  const targets = [2200, 1000, 800, 600];
  let updated = 0;
  for (const r of rooms) {
    if (!targets.includes(r.pricePerBed)) continue;    const monthly = r.pricePerBed;
    const weekly = Math.round(monthly / 4);
    const daily = Math.round(monthly / 30);
    if (r.pricePerMonth === monthly && r.pricePerWeek === weekly && r.pricePerBed === daily) continue;
    await api(token, 'PUT', `/rooms/${r.documentId}`, {
      data: { pricePerBed: daily, pricePerWeek: weekly, pricePerMonth: monthly },
    });
    console.log(`  ✓ ${r.number} (${r.type}): day=${daily} week=${weekly} month=${monthly} (was bed ${r.pricePerBed}, month ${r.pricePerMonth})`);
    updated++;
  }
  console.log(`\n✅ Lomianki: ${updated} rooms updated to monthly pricing.`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
