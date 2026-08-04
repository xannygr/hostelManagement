const { BASE, request, getToken, unique, authApi, recordCleanup } = require('./helpers');

let token;
const created = [];

beforeAll(async () => {
  token = await getToken();
});

afterAll(() => recordCleanup(() => created.map(id => `/api/hostels/${id}`)));

describe('Hostels API', () => {
  test('returns 401/403 without token', async () => {
    const res = await request(BASE).get('/api/hostels');
    expect([401, 403]).toContain(res.status);
  });

  test('lists hostels', async () => {
    const res = await authApi('get', '/api/hostels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].documentId).toBeTruthy();
    expect(res.body.data[0].name).toBeTruthy();
  });

  test('creates a hostel', async () => {
    const name = unique('TEST-Hostel');
    const res = await authApi('post', '/api/hostels').send({ data: { name, address: 'Test Address 1' } });
    expect(res.status).toBe(201);
    expect(res.body.data.documentId).toBeTruthy();
    expect(res.body.data.name).toBe(name);
    expect(res.body.data.address).toBe('Test Address 1');
    created.push(res.body.data.documentId);
  });

  test('finds one hostel by id', async () => {
    const name = unique('TEST-Hostel');
    const createdRes = await authApi('post', '/api/hostels').send({ data: { name, address: 'Test Address' } });
    const id = createdRes.body.data.documentId;
    created.push(id);
    const res = await authApi('get', `/api/hostels/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdRes.body.data.id);
    expect(res.body.data.name).toBe(name);
  });

  test('updates a hostel', async () => {
    const name = unique('TEST-Hostel');
    const createdRes = await authApi('post', '/api/hostels').send({ data: { name, address: 'Test Address' } });
    const id = createdRes.body.data.documentId;
    created.push(id);
    const newName = `${name}-UPD`;
    const res = await authApi('put', `/api/hostels/${id}`).send({ data: { name: newName } });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe(newName);
  });

  test('deletes a hostel', async () => {
    const name = unique('TEST-Hostel');
    const createdRes = await authApi('post', '/api/hostels').send({ data: { name, address: 'Test Address' } });
    const id = createdRes.body.data.documentId;
    const del = await authApi('delete', `/api/hostels/${id}`);
    expect(del.status).toBe(204);
    const found = await authApi('get', `/api/hostels/${id}`);
    expect(found.status).toBe(404);
  });
});
