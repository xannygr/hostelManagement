const request = require('supertest');

const BASE = process.env.API_URL || 'http://localhost:1337';
const ADMIN_IDENTIFIER = process.env.API_IDENTIFIER || 'admin@hostel.com';
const ADMIN_PASSWORD = process.env.API_PASSWORD || 'admin123';

let token = null;

async function login(identifier = ADMIN_IDENTIFIER, password = ADMIN_PASSWORD) {
  const res = await request(BASE).post('/api/auth/local').send({ identifier, password });
  if (!res.body.jwt) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

async function getToken() {
  if (!token) {
    token = (await login()).jwt;
  }
  return token;
}

function unique(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

function api(method, path) {
  return request(BASE)[method](path);
}

function authApi(method, path) {
  if (!token) throw new Error('Call getToken() in beforeAll before using authApi()');
  return request(BASE)[method](path).set('Authorization', `Bearer ${token}`);
}

async function recordCleanup(getPaths) {
  const t = await getToken();
  for (const p of getPaths()) {
    await request(BASE).delete(p).set('Authorization', `Bearer ${t}`).catch(() => {});
  }
}

module.exports = {
  BASE,
  request,
  login,
  getToken,
  unique,
  api,
  authApi,
  recordCleanup,
};
