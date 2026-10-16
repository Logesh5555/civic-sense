import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startDb, stopDb, resetDb, makeUser, loginAs, submitComplaint } from './helpers.js';
import { Department, Complaint, User } from '../src/models/index.js';
import { resolutionRate, msToHours } from '../src/services/stats.js';
import { canTransition } from '../src/services/workflow.js';
import { detectImageType } from '../src/services/storage.js';
import { PNG } from './helpers.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

describe('pure helpers', () => {
  it('computes resolution rate excluding rejected', () => {
    expect(resolutionRate(10, 4, 2)).toBe(50);
    expect(resolutionRate(0, 0, 0)).toBe(0);
    expect(resolutionRate(3, 0, 3)).toBe(0);
    expect(msToHours(5400000)).toBe(1.5);
    expect(msToHours(null)).toBeNull();
  });
  it('defines the transition table', () => {
    expect(canTransition('submitted', 'resolved')).toBe(false);
    expect(canTransition('resolved', 'reopened')).toBe(true);
    expect(canTransition('rejected', 'reopened')).toBe(true);
    expect(canTransition('in_progress', 'resolved')).toBe(true);
  });
  it('detects image signatures', () => {
    expect(detectImageType(PNG).mime).toBe('image/png');
    expect(detectImageType(Buffer.from('GIF89a......'))).toBeNull();
    expect(detectImageType(Buffer.from('<svg xmlns="" onload=alert(1)>'))).toBeNull();
  });
});

describe('dashboards', () => {
  it('computes admin KPIs from real records', async () => {
    const citizen = await makeUser();
    const admin = await makeUser({ role: 'admin' });
    const ca = await loginAs(citizen); const aa = await loginAs(admin);
    for (let i = 0; i < 4; i++) await submitComplaint(ca, { title: `Complaint ${i} title` });
    const h = 36e5;
    const created = new Date(Date.now() - 10 * h);
    const all = await Complaint.find().sort({ createdAt: 1 });
    await Complaint.collection.updateOne({ _id: all[0]._id }, { $set: { status: 'resolved', createdAt: created, resolvedAt: new Date(created.getTime() + 4 * h) } });
    await Complaint.collection.updateOne({ _id: all[1]._id }, { $set: { status: 'resolved', createdAt: created, resolvedAt: new Date(created.getTime() + 8 * h) } });
    await Complaint.updateOne({ _id: all[2]._id }, { status: 'rejected' });
    const k = (await aa.get('/api/dashboard/admin')).body.data.kpis;
    expect(k).toMatchObject({ total: 4, new: 1, resolved: 2, rejected: 1 });
    expect(k.resolutionRate).toBe(66.7); // 2 / (4-1)
    expect(k.avgResolutionHours).toBe(6);
    expect((await ca.get('/api/dashboard/admin')).status).toBe(403);
  });

  it('computes citizen dashboard only from the citizen’s own complaints', async () => {
    const a = await makeUser(); const b = await makeUser();
    const aa = await loginAs(a); const ba = await loginAs(b);
    await submitComplaint(aa); await submitComplaint(aa); await submitComplaint(ba);
    const first = await Complaint.findOne({ citizenId: a._id });
    await Complaint.updateOne({ _id: first._id }, { status: 'in_progress' });
    const d = (await aa.get('/api/dashboard/citizen')).body.data;
    expect(d.totals).toMatchObject({ total: 2, pending: 1, inProgress: 1, resolved: 0 });
    expect(d.recent).toHaveLength(2);
    expect(d.notifications.unread).toBe(2);
  });


  it('analytics endpoints are admin-only and return aggregates', async () => {
    const citizen = await makeUser(); const admin = await makeUser({ role: 'admin' });
    const ca = await loginAs(citizen); const aa = await loginAs(admin);
    await submitComplaint(ca); await submitComplaint(ca, { category: 'garbage' });
    const r = (await aa.get('/api/analytics/complaints')).body.data;
    expect(r.byCategory).toHaveLength(2);
    expect(r.overTime[0].count).toBe(2);
    expect(r.locations[0].count).toBe(2);
    expect((await ca.get('/api/analytics/complaints')).status).toBe(403);
    expect((await aa.get('/api/analytics/departments')).status).toBe(200);
  });

  it('public stats are derived from the database (empty when no data)', async () => {
    const empty = (await request(app).get('/api/public/stats')).body.data;
    expect(empty.total).toBe(0);
    const ca = await loginAs(await makeUser());
    const c = await submitComplaint(ca);
    await Complaint.updateOne({ _id: c.id }, { status: 'resolved', resolvedAt: new Date() });
    const s = (await request(app).get('/api/public/stats')).body.data;
    expect(s).toMatchObject({ total: 1, resolved: 1 });
    const resolved = (await request(app).get('/api/public/resolved')).body.data.items;
    expect(resolved).toHaveLength(1);
    expect(JSON.stringify(resolved)).not.toMatch(/citizen|email/i);
  });
});

describe('user & department management', () => {
  it('prevents removing or deactivating the last administrator', async () => {
    const admin = await makeUser({ role: 'admin' });
    const aa = await loginAs(admin);
    expect((await aa.patch(`/api/users/${admin._id}/role`).send({ role: 'citizen' })).status).toBe(409);
    expect((await aa.patch(`/api/users/${admin._id}`).send({ isActive: false })).status).toBe(409);
    const second = await makeUser({ role: 'admin' });
    expect((await aa.patch(`/api/users/${second._id}/role`).send({ role: 'citizen' })).status).toBe(200);
    expect((await aa.patch(`/api/users/${admin._id}/role`).send({ role: 'citizen' })).status).toBe(409);
  });

  it('only admins manage users; validates role changes', async () => {
    const citizen = await makeUser(); const admin = await makeUser({ role: 'admin' });
    const ca = await loginAs(citizen); const aa = await loginAs(admin);
    expect((await ca.patch(`/api/users/${citizen._id}/role`).send({ role: 'admin' })).status).toBe(403);
    expect((await ca.get(`/api/users/${admin._id}`)).status).toBe(403);
    expect((await aa.patch(`/api/users/${citizen._id}/role`).send({ role: 'staff' })).status).toBe(400);
    const r = await aa.patch(`/api/users/${citizen._id}/role`).send({ role: 'admin' });
    expect(r.status).toBe(200);
    expect(r.body.data.user.role).toBe('admin');
    expect((await aa.get('/api/users?q=' + encodeURIComponent(citizen.email.slice(0, 4)))).body.data.items.length).toBeGreaterThan(0);
    const body = JSON.stringify((await aa.get('/api/users')).body);
    expect(body).not.toContain('passwordHash');
  });

  it('refuses to delete departments with active work unless reassigned safely', async () => {
    const admin = await makeUser({ role: 'admin' }); const aa = await loginAs(admin);
    const ca = await loginAs(await makeUser());
    const d1 = await Department.create({ name: 'Old' }); const d2 = await Department.create({ name: 'New' });
    const c = await submitComplaint(ca);
    await Complaint.updateOne({ _id: c.id }, { assignedDepartmentId: d1._id, status: 'in_progress' });
    expect((await aa.delete(`/api/departments/${d1._id}`)).status).toBe(409);
    expect((await aa.delete(`/api/departments/${d1._id}?reassignTo=${d1._id}`)).status).toBe(400);
    expect((await aa.delete(`/api/departments/${d1._id}?reassignTo=${d2._id}`)).status).toBe(200);
    expect(String((await Complaint.findById(c.id)).assignedDepartmentId)).toBe(String(d2._id));
    expect((await ca.post('/api/departments').send({ name: 'Nope' })).status).toBe(403);
  });

  it('creates departments with unique names', async () => {
    const aa = await loginAs(await makeUser({ role: 'admin' }));
    const d = await aa.post('/api/departments').send({ name: 'Parks' });
    expect(d.status).toBe(201);
    expect((await aa.post('/api/departments').send({ name: 'Parks' })).status).toBe(409);
  });
});

describe('security basics', () => {
  it('does not leak stack traces and handles malformed JSON', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad');
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).not.toMatch(/at .*\.js/);
    const nf = await request(app).get('/api/nope');
    expect(nf.status).toBe(404);
  });
  it('sets security headers', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
  });
  it('rejects NoSQL operator injection in login', async () => {
    await makeUser({ email: 'victim@test.dev' });
    const res = await request(app).post('/api/auth/login').send({ email: { $ne: null }, password: { $ne: null } });
    expect(res.status).toBe(400);
  });
});
