const { BASE, request, login, getToken, unique } = require('./helpers');

describe('Auth API', () => {
  test('login with valid credentials returns jwt and user', async () => {
    const res = await request(BASE).post('/api/auth/local').send({
      identifier: 'admin@hostel.com',
      password: 'admin123',
    });
    expect(res.status).toBe(200);
    expect(res.body.jwt).toBeTruthy();
    expect(typeof res.body.jwt).toBe('string');
    expect(res.body.user.email).toBe('admin@hostel.com');
  });

  test('login with wrong password fails', async () => {
    const res = await request(BASE).post('/api/auth/local').send({
      identifier: 'admin@hostel.com',
      password: 'definitely-wrong',
    });
    expect([400, 401, 403]).toContain(res.status);
    expect(res.body.error).toBeTruthy();
  });

  test('login with unknown user fails', async () => {
    const res = await request(BASE).post('/api/auth/local').send({
      identifier: 'nobody@example.com',
      password: 'Test1234!',
    });
    expect([400, 401, 403]).toContain(res.status);
  });

  test('public registration is disabled', async () => {
    const res = await request(BASE).post('/api/auth/local/register').send({
      username: unique('reguser'),
      email: `${unique('reguser')}@example.com`,
      password: 'Test1234!',
    });
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body.error?.message || '')).toMatch(/Register action is currently disabled/i);
  });

  test('me returns the authenticated user', async () => {
    const token = await getToken();
    const res = await request(BASE).get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('admin@hostel.com');
  });

  test('me fails without token', async () => {
    const res = await request(BASE).get('/api/users/me');
    expect([401, 403]).toContain(res.status);
  });
});
