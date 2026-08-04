const { BASE, request, getToken, unique, authApi, recordCleanup } = require('./helpers');

let token;
const createdHostels = [];
const createdRooms = [];
const createdGuests = [];
const createdPayments = [];

beforeAll(async () => {
  token = await getToken();
});

afterAll(() => recordCleanup(() => [
  ...createdPayments.map(id => `/api/payments/${id}`),
  ...createdGuests.map(id => `/api/guests/${id}`),
  ...createdRooms.map(id => `/api/rooms/${id}`),
  ...createdHostels.map(id => `/api/hostels/${id}`),
]));

async function makeHostel() {
  const res = await authApi('post', '/api/hostels').send({ data: { name: unique('TEST-Hostel'), address: 'PaymentTest addr' } });
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

async function makeGuest(hostelId, roomId) {
  const res = await authApi('post', '/api/guests').send({
    data: {
      name: unique('Test Guest'), phone: '+48 600 000 003',
      checkIn: '2026-08-10', checkOut: '2026-08-20', status: 'active',
      hostel: { connect: [hostelId] }, room: { connect: [roomId] },
    },
  });
  const id = res.body.data.documentId;
  createdGuests.push(id);
  return id;
}

describe('Payments API', () => {
  test('returns 401/403 without token', async () => {
    const res = await request(BASE).get('/api/payments');
    expect([401, 403]).toContain(res.status);
  });

  test('lists payments with guest populated', async () => {
    const res = await authApi('get', '/api/payments?populate[guest]=true');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].documentId).toBeTruthy();
    expect(res.body.data[0].amount).toBeGreaterThan(0);
  });

  test('creates a payment linked to a guest', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const gid = await makeGuest(hid, rid);
    const res = await authApi('post', '/api/payments?populate=guest').send({
      data: {
        amount: 500,
        dueDate: '2026-08-10',
        type: 'card',
        status: 'paid',
        smsSent: false,
        guest: { connect: [gid] },
      },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.documentId).toBeTruthy();
    expect(res.body.data.amount).toBe(500);
    expect(res.body.data.status).toBe('paid');
    expect(res.body.data.guest.documentId).toBe(gid);
    createdPayments.push(res.body.data.documentId);
  });

  test('updates a payment status', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const gid = await makeGuest(hid, rid);
    const created = await authApi('post', '/api/payments').send({
      data: {
        amount: 300, dueDate: '2026-08-11', type: 'transfer',
        status: 'pending', smsSent: false, guest: { connect: [gid] },
      },
    });
    const id = created.body.data.documentId;
    createdPayments.push(id);
    const res = await authApi('put', `/api/payments/${id}`).send({ data: { status: 'overdue' } });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('overdue');
  });

  test('deletes a payment', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const gid = await makeGuest(hid, rid);
    const created = await authApi('post', '/api/payments').send({
      data: {
        amount: 200, dueDate: '2026-08-12', type: 'cash',
        status: 'pending', smsSent: false, guest: { connect: [gid] },
      },
    });
    const id = created.body.data.documentId;
    const del = await authApi('delete', `/api/payments/${id}`);
    expect(del.status).toBe(204);
    const found = await authApi('get', `/api/payments/${id}`);
    expect(found.status).toBe(404);
  });
});
