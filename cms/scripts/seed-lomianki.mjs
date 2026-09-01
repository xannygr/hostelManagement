#!/usr/bin/env node
/**
 * Seed: Hostel Lomianki
 *
 * Floor 1:
 *   101 – VIP, 1 bed, private bathroom, 2200 zl
 *   102 – standard, 1 bed, 1000 zl
 *   103 – standard, 1 bed, private bathroom, 1000 zl
 *   104 – standard, 1 bed, 1000 zl
 *
 * Floor 2:
 *   201 – standard, 3 beds, 800 zl/month
 *   202 – standard, 2 beds, 800 zl/month
 *   203 – standard, 2 beds, 800 zl/month
 *   204 – standard, 2 beds, 800 zl/month
 *   205 – standard, 4 beds, 800 zl/month
 *   206 – standard, 3 beds, 800 zl/month
 *   207 – standard, 3 beds, 800 zl/month
 *   208 – standard, 1 bed, 600 zl/month
 *
 * Run: node cms/scripts/seed-lomianki.mjs
 */

const CMS = process.env.CMS_URL || 'http://localhost:1337';

const EMAIL = 'admin@hostel.com';
const PASSWORD = 'admin123';

const HOSTEL = {
  name: 'Lomianki',
  address: 'Łomianki',
  floors: 2,
};

const ROOMS = [
  { number: '101', floor: 1, beds: 1, type: 'vip',     pricePerBed: 2200, hasPrivateBathroom: true },
  { number: '102', floor: 1, beds: 1, type: 'standard', pricePerBed: 1000, hasPrivateBathroom: false },
  { number: '103', floor: 1, beds: 1, type: 'standard', pricePerBed: 1000, hasPrivateBathroom: true },
  { number: '104', floor: 1, beds: 1, type: 'standard', pricePerBed: 1000, hasPrivateBathroom: false },

  { number: '201', floor: 2, beds: 3, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '202', floor: 2, beds: 2, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '203', floor: 2, beds: 2, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '204', floor: 2, beds: 2, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '205', floor: 2, beds: 4, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '206', floor: 2, beds: 3, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '207', floor: 2, beds: 3, type: 'standard', pricePerBed: 800, hasPrivateBathroom: false },
  { number: '208', floor: 2, beds: 1, type: 'standard', pricePerBed: 600, hasPrivateBathroom: false },
];

async function login() {
  const res = await fetch(`${CMS}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: EMAIL, password: PASSWORD }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(body)}`);
  }
  const { jwt } = await res.json();
  return jwt;
}

async function api(token, method, path, body) {
  const res = await fetch(`${CMS}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
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

  const existing = await api(token, 'GET', '/hostels?filters[name][$eq]=Lomianki');
  const existingHostel = existing.data?.[0];
  if (existingHostel) {
    console.log(`⚠️  Hostel "Lomianki" already exists (${existingHostel.documentId}). Skipping.`);
    return;
  }

  const roomsUrl = '/rooms?pagination[pageSize]=1';
  console.log(`🏠 Creating hostel "${HOSTEL.name}"...`);
  const { data: hostel } = await api(token, 'POST', '/hostels', { data: HOSTEL });
  console.log(`  ✓ ${hostel.name} (${hostel.documentId})\n`);

  console.log(`🛏️  Creating ${ROOMS.length} rooms...`);
  for (const r of ROOMS) {
    const { data: created } = await api(token, 'POST', '/rooms', {
      data: {
        ...r,
        hasBalcony: false,
        hostel: { connect: [hostel.documentId] },
      },
    });
    const bath = created.hasPrivateBathroom ? ' [bath]' : '';
    console.log(`  ✓ ${created.number} — ${created.beds} bed(s), ${created.type}, ${created.pricePerBed} zl${bath}`);
  }

  const totalBeds = ROOMS.reduce((s, r) => s + r.beds, 0);
  console.log(`\n✅ Done! ${HOSTEL.name}: ${ROOMS.length} rooms, ${totalBeds} beds.`);
}

main().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
