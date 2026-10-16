import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startDb, stopDb, resetDb, makeUser, loginAs, PASSWORD } from './helpers.js';
import { User } from '../src/models/index.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

describe('registration & login', () => {
  it('registers a citizen, hashes the password and sets an HttpOnly cookie', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Asha K', email: 'Asha@Test.dev', password: 'Secret123' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('asha@test.dev');
    expect(res.body.data.user.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
    const u = await User.findOne({ email: 'asha@test.dev' }).select('+passwordHash');
    expect(u.passwordHash).not.toContain('Secret123');
    expect(u.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it('ignores a client-supplied role (no privilege escalation at registration)', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Evil', email: 'evil@test.dev', password: 'Secret123', role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('citizen');
  });

  it('validates input and rejects duplicates', async () => {
    const bad = await request(app).post('/api/auth/register').send({ name: 'A', email: 'nope', password: '123' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(['name', 'email', 'password']));
    await request(app).post('/api/auth/register').send({ name: 'Dup User', email: 'dup@test.dev', password: 'Secret123' });
    const dup = await request(app).post('/api/auth/register').send({ name: 'Dup User', email: 'dup@test.dev', password: 'Secret123' });
    expect(dup.status).toBe(409);
  });

  it('logs in with correct credentials and rejects wrong ones with a generic message', async () => {
    const u = await makeUser();
    const ok = await request(app).post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: u.email, password: 'wrongpass1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'x@test.dev', password: 'wrongpass1' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.message).toBe(unknown.body.error.message);
  });

  it('blocks deactivated accounts, including existing sessions', async () => {
    const u = await makeUser();
    const agent = await loginAs(u);
    await User.updateOne({ _id: u._id }, { isActive: false });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
    const res = await request(app).post('/api/auth/login').send({ email: u.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it('requires authentication, and logout clears the session', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
    const agent = await loginAs(await makeUser());
    expect((await agent.get('/api/auth/me')).status).toBe(200);
    await agent.post('/api/auth/logout');
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'ct_token=abc.def.ghi');
    expect(res.status).toBe(401);
  });

  it('changes password only with the correct current password', async () => {
    const agent = await loginAs(await makeUser());
    expect((await agent.post('/api/auth/change-password').send({ currentPassword: 'bad', newPassword: 'NewPass123' })).status).toBe(400);
    expect((await agent.post('/api/auth/change-password').send({ currentPassword: PASSWORD, newPassword: 'NewPass123' })).status).toBe(200);
  });

  it('supports password reset with a single-use token', async () => {
    const u = await makeUser();
    const f = await request(app).post('/api/auth/forgot-password').send({ email: u.email });
    const token = f.body.data._testToken;
    expect(token).toBeTruthy();
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'Another123' })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'Another123' })).status).toBe(400);
    expect((await request(app).post('/api/auth/login').send({ email: u.email, password: 'Another123' })).status).toBe(200);
  });

  it('does not reveal whether an email exists on forgot-password', async () => {
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ghost@test.dev' });
    expect(res.status).toBe(200);
    expect(res.body.data._testToken).toBeUndefined();
  });

  it('registers an administrator for a region and enforces one admin per region', async () => {
    const res1 = await request(app).post('/api/auth/register').send({
      name: 'North Admin',
      email: 'north.admin@test.dev',
      password: 'Secret123',
      role: 'admin',
      region: 'North Zone (Perambur)',
    });
    expect(res1.status).toBe(201);
    expect(res1.body.data.user.role).toBe('admin');
    expect(res1.body.data.user.region).toBe('North Zone (Perambur)');

    // Attempting to register another admin for the exact same region must fail
    const res2 = await request(app).post('/api/auth/register').send({
      name: 'Rival Admin',
      email: 'rival.admin@test.dev',
      password: 'Secret123',
      role: 'admin',
      region: 'North Zone (Perambur)',
    });
    expect(res2.status).toBe(409);
    expect(res2.body.error.message).toMatch(/Only one administrator is allowed per region/i);
  });

  it('verifies role matches during login when role is specified', async () => {
    const citizen = await makeUser({ role: 'citizen' });
    // Trying to log into admin login with citizen account gives 403
    const adminLoginAttempt = await request(app).post('/api/auth/login').send({
      email: citizen.email,
      password: PASSWORD,
      role: 'admin',
    });
    expect(adminLoginAttempt.status).toBe(403);
    expect(adminLoginAttempt.body.error.message).toMatch(/registered as a Citizen/i);

    // Logging in with correct role 'citizen' succeeds
    const citizenLoginAttempt = await request(app).post('/api/auth/login').send({
      email: citizen.email,
      password: PASSWORD,
      role: 'citizen',
    });
    expect(citizenLoginAttempt.status).toBe(200);
  });
});
