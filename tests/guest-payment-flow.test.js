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
  const res = await authApi('post', '/api/hostels').send({ data: { name: unique('TEST-Flow-Hostel'), address: 'addr' } });
  const id = res.body.data.documentId;
  createdHostels.push(id);
  return id;
}

async function makeRoom(hostelId) {
  const res = await authApi('post', '/api/rooms').send({
    data: { number: unique('F'), floor: 1, beds: 2, type: 'standard', pricePerBed: 100, hostel: { connect: [hostelId] } },
  });
  const id = res.body.data.documentId;
  createdRooms.push(id);
  return id;
}

async function makeGuest(hostelId, roomId) {
  const res = await authApi('post', '/api/guests?populate[room]=true').send({
    data: {
      name: unique('Flow Guest'),
      phone: '+48 600 111 222',
      checkIn: '2026-08-10',
      checkOut: '2026-08-20',
      status: 'active',
      hostel: { connect: [hostelId] },
      room: { connect: [roomId] },
    },
  });
  const id = res.body.data.documentId;
  createdGuests.push(id);
  return res.body.data;
}

describe('Guest + linked payment flow (frontend "add guest" form)', () => {
  test('payment created after guest references the real guest documentId', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const guest = await makeGuest(hid, rid);

    const nights = 10;
    const totalCost = nights * 100;
    const res = await authApi('post', '/api/payments?populate[guest]=true').send({
      data: {
        amount: totalCost,
        dueDate: guest.checkIn,
        type: 'cash',
        status: 'pending',
        smsSent: false,
        guest: { connect: [guest.documentId] },
      },
    });

    expect(res.status).toBe(201);
    expect(res.body.data.guest.documentId).toBe(guest.documentId);
    createdPayments.push(res.body.data.documentId);

    const list = await authApi('get', `/api/payments?filters[guest][documentId][$eq]=${guest.documentId}`);
    const matched = list.body.data.filter(p => p.documentId === res.body.data.documentId);
    expect(matched.length).toBe(1);
    expect(matched[0].amount).toBe(totalCost);
  });

  test('payment cannot be linked to a non-existent guest documentId (regression of fake-id bug)', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);

    const res = await authApi('post', '/api/payments').send({
      data: {
        amount: 500,
        dueDate: '2026-08-10',
        type: 'cash',
        status: 'pending',
        smsSent: false,
        guest: { connect: [String(Date.now())] },
      },
    });

    expect([400, 500]).toContain(res.status);
  });

  test('change-password rejects weak/invalid passwords', async () => {
    const res = await authApi('post', '/api/auth/change-password').send({
      currentPassword: 'wrong-password',
      password: 'short',
      passwordConfirmation: 'short',
    });
    expect([400, 401]).toContain(res.status);
  });

  test('unauthenticated SMS flag update is rejected', async () => {
    const hid = await makeHostel();
    const rid = await makeRoom(hid);
    const guest = await makeGuest(hid, rid);
    const created = await authApi('post', '/api/payments').send({
      data: {
        amount: 100, dueDate: '2026-08-10', type: 'cash', status: 'overdue', smsSent: false,
        guest: { connect: [guest.documentId] },
      },
    });
    createdPayments.push(created.body.data.documentId);

    const noAuth = await request(BASE).put(`/api/payments/${created.body.data.documentId}`).send({ data: { smsSent: true } });
    expect([401, 403]).toContain(noAuth.status);
  });
});
