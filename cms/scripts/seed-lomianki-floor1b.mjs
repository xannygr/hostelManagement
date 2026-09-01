#!/usr/bin/env node
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'l5iu6amdro4a63l42hd69ujb';

const ROOMS = [
  { number: '105', floor: 1, beds: 1, type: 'vip',     pricePerBed: 2200, hasPrivateBathroom: true },
  { number: '106', floor: 1, beds: 1, type: 'standard', pricePerBed: 1000, hasPrivateBathroom: false },
  { number: '107', floor: 1, beds: 1, type: 'standard', pricePerBed: 1000, hasPrivateBathroom: true },
  { number: '108', floor: 1, beds: 1, type: 'standard', pricePerBed: 1000, hasPrivateBathroom: false },
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
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(`${method} ${path} failed (${res.status}): ${JSON.stringify(err)}`);
  }
  return res.json();
}

async function main() {
  console.log(`🔑 Logging in to ${CMS}...`);
  const token = await login();
  console.log('  ✓ Token received\n');

  const existing = await api(token, 'GET', `/rooms?filters[hostel][documentId][$eq]=${HOSTEL_DOC}&pagination[pageSize]=100`);
  const existingNums = new Set(existing.data.map(r => r.number));
  let added = 0;

  for (const r of ROOMS) {
    if (existingNums.has(r.number)) {
      console.log(`  ⚠️  ${r.number} already exists, skipping`);
      continue;
    }
    await api(token, 'POST', '/rooms', {
      data: { ...r, hasBalcony: false, hostel: { connect: [HOSTEL_DOC] } },
    });
    console.log(`  ✓ ${r.number} — ${r.beds} bed(s), ${r.type}, ${r.pricePerBed} zl${r.hasPrivateBathroom ? ' [bath]' : ''}`);
    added++;
  }

  console.log(`\n✅ Added ${added} rooms to "1 этаж с другой стороны" (105-108).`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
