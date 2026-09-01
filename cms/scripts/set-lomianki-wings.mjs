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

  const wingFor = (num) => {
    const n = Number(num);
    if ([1, 2, 3, 4].includes(n)) return 1;
    if ([105, 106, 107, 108].includes(n)) return 2;
    return 1;
  };

  let updated = 0;
  for (const r of rooms) {
    const wing = wingFor(r.number);
    if (r.wing === wing) continue;
    await api(token, 'PUT', `/rooms/${r.documentId}`, { data: { wing } });
    console.log(`  ✓ room ${r.number}: wing=${wing}`);
    updated++;
  }
  console.log(`\n✅ Lomianki: ${updated} rooms updated (wing 1: rooms 1-4, wing 2: rooms 105-108).`);
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });