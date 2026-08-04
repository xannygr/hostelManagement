const { BASE, request, getToken, unique, authApi, recordCleanup } = require('./helpers');

let token;
const createdHostels = [];
const createdRooms = [];
const createdGuests = [];

beforeAll(async () => {
  token = await getToken();
});

afterAll(() => recordCleanup(() => [
  ...createdGuests.map(id => `/api/guests/${id}`),
  ...createdRooms.map(id => `/api/rooms/${id}`),
  ...createdHostels.map(id => `/api/hostels/${id}`),
]));

async function makeHostel() {
  const res = await authApi('post', '/api/hostels').send({ data: { name: unique('TEST-Hostel'), address: 'GuestTest addr' } });
  const id = res.body.data.documentId;
  createdHostels.push(id);
  return id;
}

async function makeRoom(hostelId) {
  const res = await authApi('post', '/api/rooms').send({
    data: { number: unique('R'), floor: 1, beds: 2, type: 'standard', pricePerBed: 100, hostel: { connect: [hostelId] } },
  });
  const id = res.body.data.documentId;
  createdRooms.push(id);
  return id;
}

describe('Guests API', () => {
  test('returns 401/403 without token', async () => {
    const res = await request(BASE).get('/api/guests');
    expect([401, 403]).toContain(res.status);
  });

  test('lists guests with room and hostel populated', async () => {
    const res = await authApi('get', '/api/guests?populate[hostel]=true&populate[room]=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].documentId).toBeTruthy();
    expect(res.body.data[0].checkIn).toBeTruthy();
  });

  test('creates a guest linked to room and hostel', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const res = await authApi('post', '/api/guests?populate[hostel]=true&populate[room]=true').send({
      data: {
        name: unique('Test Guest'),
        phone: '+48 600 000 000',
        email: `${unique('guest')}@example.com`,
        passport: 'PL 9999999',
        checkIn: '2026-08-10',
        checkOut: '2026-08-20',
        status: 'active',
        hostel: { connect: [hid] },
        room: { connect: [rid] },
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.documentId).toBeTruthy();
    expect(res.body.data.status).toBe('active');
    expect(res.body.data.room.documentId).toBe(rid);
    expect(res.body.data.hostel.documentId).toBe(hid);
    createdGuests.push(res.body.data.documentId);
  });

  test('updates a guest', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const created = await authApi('post', '/api/guests').send({
      data: {
        name: unique('Test Guest'), phone: '+48 600 000 001',
        checkIn: '2026-08-10', checkOut: '2026-08-20', status: 'active',
        hostel: { connect: [hid] }, room: { connect: [rid] },
      },
    });
    const id = created.body.data.documentId;
    createdGuests.push(id);
    const res = await authApi('put', `/api/guests/${id}`).send({ data: { status: 'checked_out' } });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('checked_out');
  });

  test('deletes a guest', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const created = await authApi('post', '/api/guests').send({
      data: {
        name: unique('Test Guest'), phone: '+48 600 000 002',
        checkIn: '2026-08-10', checkOut: '2026-08-20', status: 'active',
        hostel: { connect: [hid] }, room: { connect: [rid] },
      },
    });
    const id = created.body.data.documentId;
    const del = await authApi('delete', `/api/guests/${id}`);
    expect(del.status).toBe(204);
    const found = await authApi('get', `/api/guests/${id}`);
    expect(found.status).toBe(404);
  });
});
