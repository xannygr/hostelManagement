const { BASE, request, getToken, unique, authApi, recordCleanup } = require('./helpers');

let token;
let hostelId;
const createdHostels = [];
const createdRooms = [];

beforeAll(async () => {
  token = await getToken();
});

afterAll(() => recordCleanup(() => [
  ...createdRooms.map(id => `/api/rooms/${id}`),
  ...createdHostels.map(id => `/api/hostels/${id}`),
]));

async function makeHostel() {
  const name = unique('TEST-Hostel');
  const res = await authApi('post', '/api/hostels').send({ data: { name, address: 'RoomTest addr' } });
  const id = res.body.data.documentId;
  createdHostels.push(id);
  return id;
}

describe('Rooms API', () => {
  test('returns 401/403 without token', async () => {
    const res = await request(BASE).get('/api/rooms');
    expect([401, 403]).toContain(res.status);
  });

  test('lists rooms', async () => {
    const res = await authApi('get', '/api/rooms');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].documentId).toBeTruthy();
    expect(['standard', 'economy', 'vip']).toContain(res.body.data[0].type);
  });

  test('creates a room linked to a hostel', async () => {
    hostelId = await makeHostel();
    const res = await authApi('post', '/api/rooms?populate=hostel').send({
      data: {
        number: unique('R'),
        floor: 1,
        beds: 4,
        type: 'standard',
        pricePerBed: 100,
        hostel: { connect: [hostelId] },
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.documentId).toBeTruthy();
    expect(res.body.data.beds).toBe(4);
    expect(res.body.data.pricePerBed).toBe(100);
    expect(res.body.data.hostel.documentId).toBe(hostelId);
    createdRooms.push(res.body.data.documentId);
  });

  test('updates a room', async () => {
    const hid = await makeHostel();
    const created = await authApi('post', '/api/rooms').send({
      data: { number: unique('R'), floor: 1, beds: 2, type: 'economy', pricePerBed: 80, hostel: { connect: [hid] } },
    });
    const id = created.body.data.documentId;
    createdRooms.push(id);
    const res = await authApi('put', `/api/rooms/${id}`).send({ data: { pricePerBed: 95, beds: 3 } });
    expect(res.status).toBe(200);
    expect(res.body.data.pricePerBed).toBe(95);
    expect(res.body.data.beds).toBe(3);
  });

  test('deletes a room', async () => {
    const hid = await makeHostel();
    const created = await authApi('post', '/api/rooms').send({
      data: { number: unique('R'), floor: 1, beds: 2, type: 'standard', pricePerBed: 90, hostel: { connect: [hid] } },
    });
    const id = created.body.data.documentId;
    const del = await authApi('delete', `/api/rooms/${id}`);
    expect(del.status).toBe(204);
    const found = await authApi('get', `/api/rooms/${id}`);
    expect(found.status).toBe(404);
  });
});
