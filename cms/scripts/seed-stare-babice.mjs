#!/usr/bin/env node
const CMS = process.env.CMS_URL || 'http://localhost:1337';
const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';
const HOSTEL_DOC = 'bxy866m3yq7jqmfg1qupg9ec';

const ROOMS = [
  { number: 'P1', floor: 0, beds: 2, type: 'standard', hasPrivateBathroom: false },
  { number: 'P2', floor: 0, beds: 4, type: 'standard', hasPrivateBathroom: false },
  { number: 'P3', floor: 0, beds: 3, type: 'standard', hasPrivateBathroom: false },
  { number: 'P4', floor: 0, beds: 2, type: 'standard', hasPrivateBathroom: false },

  { number: '1', floor: 1, beds: 2, type: 'standard', hasPrivateBathroom: false },
  { number: '2', floor: 1, beds: 4, type: 'standard', hasPrivateBathroom: false },
  { number: '3', floor: 1, beds: 3, type: 'standard', hasPrivateBathroom: false },
  { number: '4', floor: 1, beds: 3, type: 'standard', hasPrivateBathroom: false },

  { number: '5', floor: 2, beds: 2, type: 'standard', hasPrivateBathroom: false },
  { number: '6', floor: 2, beds: 4, type: 'standard', hasPrivateBathroom: false },
  { number: '7', floor: 2, beds: 3, type: 'standard', hasPrivateBathroom: false },
  { number: '8', floor: 2, beds: 3, type: 'standard', hasPrivateBathroom: false },
];

const PRICE = 85;

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

  console.log('🛏️  Creating 12 rooms for Stare_Babice...');
  for (const r of ROOMS) {
    await api(token, 'POST', '/rooms', {
      data: { ...r, type: 'standard', pricePerBed: PRICE, hasBalcony: false, hostel: { connect: [HOSTEL_DOC] } },
    });
    console.log(`  ✓ [floor ${r.floor}] ${r.number} — ${r.beds} beds`);
  }

  const totalBeds = ROOMS.reduce((s, r) => s + r.beds, 0);
  console.log(`\n✅ Done! Stare_Babice: ${ROOMS.length} rooms, ${totalBeds} beds.`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });
