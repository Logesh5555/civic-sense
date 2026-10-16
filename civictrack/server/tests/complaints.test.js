import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startDb, stopDb, resetDb, makeUser, loginAs, submitComplaint, complaintPayload, PNG } from './helpers.js';
import { Department, Notification, Complaint } from '../src/models/index.js';

beforeAll(startDb);
afterAll(stopDb);
beforeEach(resetDb);

async function world() {
  const citizen = await makeUser({ name: 'Citizen One' });
  const other = await makeUser({ name: 'Citizen Two' });
  const admin = await makeUser({ role: 'admin', name: 'Admin', region: 'Central Zone (Anna Nagar)' });
  const dept = await Department.create({ name: 'Roads' });
  const dept2 = await Department.create({ name: 'Water' });
  return { citizen, other, admin, dept, dept2, ca: await loginAs(citizen), oa: await loginAs(other), aa: await loginAs(admin) };
}

describe('complaint submission', () => {
  it('creates a complaint with reference number, GeoJSON [lng,lat], history and notifications', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    expect(c.referenceNumber).toMatch(/^CT-\d{4}-\d{6}$/);
    expect(c.status).toBe('submitted');
    expect(c.location.coordinates).toEqual([80.27, 13.08]);
    expect(c.statusHistory).toHaveLength(1);
    expect(c.priority).toBe('high'); // suggested for potholes
    expect(await Notification.countDocuments({ userId: w.citizen._id })).toBe(1);
    expect(await Notification.countDocuments({ userId: w.admin._id })).toBe(1);
  });

  it('generates unique sequential reference numbers', async () => {
    const w = await world();
    const a = await submitComplaint(w.ca); const b = await submitComplaint(w.ca);
    expect(a.referenceNumber).not.toBe(b.referenceNumber);
  });

  it('validates fields and works without GPS', async () => {
    const w = await world();
    const bad = await w.ca.post('/api/complaints').send({ title: 'x', description: 'short', category: 'bogus' });
    expect(bad.status).toBe(400);
    expect(Object.keys(bad.body.error.details)).toEqual(expect.arrayContaining(['title', 'description', 'category', 'locationDescription']));
    const half = await w.ca.post('/api/complaints').send(complaintPayload({ longitude: undefined }));
    expect(half.status).toBe(400);
    const range = await w.ca.post('/api/complaints').send(complaintPayload({ latitude: '200' }));
    expect(range.status).toBe(400);
    const noGps = await w.ca.post('/api/complaints').send(complaintPayload({ latitude: undefined, longitude: undefined }));
    expect(noGps.status).toBe(201);
    expect(noGps.body.data.complaint.location).toBeUndefined();
  });

  it('ignores client-supplied citizenId, status, priority and department', async () => {
    const w = await world();
    const res = await w.ca.post('/api/complaints').send(complaintPayload({ citizenId: String(w.other._id), status: 'resolved', priority: 'critical', assignedDepartmentId: String(w.dept._id) }));
    expect(res.status).toBe(201);
    const c = await Complaint.findById(res.body.data.complaint.id);
    expect(String(c.citizenId)).toBe(String(w.citizen._id));
    expect(c.status).toBe('submitted');
    expect(c.priority).toBe('high');
    expect(c.assignedDepartmentId).toBeNull();
  });

  it('only citizens may submit; anonymous requests are rejected', async () => {
    const w = await world();
    expect((await request(app).post('/api/complaints').send(complaintPayload())).status).toBe(401);
    expect((await w.aa.post('/api/complaints').send(complaintPayload())).status).toBe(403);
  });
});

describe('image upload validation', () => {
  const post = (agent, file, name = 'a.png', type = 'image/png') =>
    agent.post('/api/complaints').field('title', 'Pothole with photo').field('description', 'Detailed description here.').field('category', 'potholes').field('locationDescription', 'Main St').attach('images', file, { filename: name, contentType: type });

  it('accepts a real PNG and stores it under a random name', async () => {
    const w = await world();
    const res = await post(w.ca, PNG, '../../evil name.png');
    expect(res.status).toBe(201);
    const rawImg = res.body.data.complaint.images[0];
    const url = typeof rawImg === 'object' && rawImg !== null ? rawImg.url : rawImg;
    expect(url).toMatch(/^\/uploads\/[a-f0-9]{32}\.png$/);
    const file = await request(app).get(url);
    expect(file.status).toBe(200);
    expect(file.headers['x-content-type-options']).toBe('nosniff');
  });

  it('rejects disallowed MIME types', async () => {
    const w = await world();
    const res = await post(w.ca, Buffer.from('<?php echo 1; ?>'), 'shell.php', 'application/x-php');
    expect(res.status).toBe(400);
  });

  it('rejects files whose signature does not match an image (spoofed MIME)', async () => {
    const w = await world();
    const res = await post(w.ca, Buffer.from('MZ this is an executable pretending to be a png'), 'fake.png');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/not a valid/);
    expect(await Complaint.countDocuments()).toBe(0);
  });

  it('rejects oversize files', async () => {
    const w = await world();
    const big = Buffer.concat([PNG, Buffer.alloc(1.2 * 1024 * 1024)]);
    expect((await post(w.ca, big)).status).toBe(400);
  });
});

describe('ownership & visibility', () => {
  it('citizens only list and read their own complaints', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    expect((await w.oa.get(`/api/complaints/${c.id}`)).status).toBe(404);
    expect((await w.oa.get('/api/complaints')).body.data.items).toHaveLength(0);
    expect((await w.ca.get('/api/complaints')).body.data.items).toHaveLength(1);
    expect((await w.oa.patch(`/api/complaints/${c.id}`).send({ title: 'Hijacked title' })).status).toBe(404);
    expect((await w.oa.delete(`/api/complaints/${c.id}`)).status).toBe(404);
    expect((await w.oa.post(`/api/complaints/${c.id}/reopen`).send({ reason: 'not mine at all' })).status).toBe(404);
  });

  it('hides internal notes and other citizens’ data from the citizen', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    await w.aa.post(`/api/complaints/${c.id}/notes`).send({ message: 'secret internal note', visibility: 'internal' });
    await w.aa.post(`/api/complaints/${c.id}/notes`).send({ message: 'public update for you', visibility: 'citizen' });
    const mine = (await w.ca.get(`/api/complaints/${c.id}`)).body.data.complaint;
    expect(mine.internalNotes).toBeUndefined();
    expect(mine.citizenVisibleUpdates).toHaveLength(1);
    const adminView = (await w.aa.get(`/api/complaints/${c.id}`)).body.data.complaint;
    expect(adminView.internalNotes).toHaveLength(1);
    expect(JSON.stringify(adminView)).not.toContain('passwordHash');
  });

  it('public reference tracking exposes no personal data', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    const res = await request(app).get(`/api/complaints/reference/${c.referenceNumber.toLowerCase()}`);
    expect(res.status).toBe(200);
    const body = JSON.stringify(res.body);
    expect(body).not.toContain(w.citizen.email);
    expect(body).not.toContain('Citizen One');
    expect(res.body.data.complaint.citizenId).toBeUndefined();
    expect(res.body.data.complaint.location).toBeUndefined();
    expect((await request(app).get('/api/complaints/reference/CT-0000-000000')).status).toBe(404);
  });

  it('allows withdrawal only before review', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    const d = await submitComplaint(w.ca);
    await Complaint.updateOne({ _id: d.id }, { status: 'under_review' });
    expect((await w.ca.delete(`/api/complaints/${c.id}`)).status).toBe(200);
    expect((await w.ca.delete(`/api/complaints/${d.id}`)).status).toBe(409);
  });

  it('citizens cannot edit priority or status', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    expect((await w.ca.patch(`/api/complaints/${c.id}`).send({ priority: 'critical' })).status).toBe(403);
    expect((await w.ca.patch(`/api/complaints/${c.id}/status`).send({ status: 'resolved' })).status).toBe(403);
    expect((await w.ca.patch(`/api/complaints/${c.id}/assign`).send({ departmentId: String(w.dept._id) })).status).toBe(403);
    expect((await w.ca.get('/api/users')).status).toBe(403);
    expect((await w.ca.get('/api/complaints/export')).status).toBe(403);
  });

  it('rejects malformed ids', async () => {
    const w = await world();
    expect((await w.ca.get('/api/complaints/not-an-id')).status).toBe(400);
  });
});

describe('workflow & resolution', () => {
  it('admin directly updates complaint to in_progress with notifications and history', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    const res = await w.aa.patch(`/api/complaints/${c.id}/status`).send({ status: 'in_progress', message: 'Repair team moving to location' });
    expect(res.status).toBe(200);
    expect(res.body.data.complaint.status).toBe('in_progress');
    expect(res.body.data.complaint.statusHistory.at(-1).to).toBe('in_progress');
    expect(await Notification.countDocuments({ userId: w.citizen._id, title: /in progress/i })).toBe(1);
  });

  it('enforces valid status transitions on the backend', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    const s = (agent, status, extra = {}) => agent.patch(`/api/complaints/${c.id}/status`).send({ status, ...extra });
    expect((await s(w.aa, 'resolved', { resolutionDetails: 'jumped ahead' })).status).toBe(409);
    expect((await s(w.aa, 'under_review')).status).toBe(200);
    expect((await s(w.aa, 'rejected')).status).toBe(400); // reason required
    expect((await s(w.aa, 'rejected', { reason: 'Duplicate report of CT-1' })).status).toBe(200);
    expect((await s(w.aa, 'in_progress')).status).toBe(409); // rejected -> in_progress invalid
    const n = await Notification.findOne({ userId: w.citizen._id, title: /Rejected/ });
    expect(n.message).toMatch(/Duplicate report/);
  });

  it('requires a reason to reopen and only owners/admins may reopen', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    await w.aa.patch(`/api/complaints/${c.id}/status`).send({ status: 'in_progress' });
    expect((await w.ca.post(`/api/complaints/${c.id}/reopen`).send({ reason: 'not yet resolved ok' })).status).toBe(409);
    const done = await w.aa.patch(`/api/complaints/${c.id}/status`).send({ status: 'resolved' });
    expect(done.status).toBe(200);
    expect(done.body.data.complaint.resolvedAt).toBeTruthy();
    expect((await w.ca.post(`/api/complaints/${c.id}/reopen`).send({ reason: '' })).status).toBe(400);
    const re = await w.ca.post(`/api/complaints/${c.id}/reopen`).send({ reason: 'The hole has reappeared' });
    expect(re.status).toBe(200);
    expect(re.body.data.complaint.status).toBe('reopened');
    expect(re.body.data.complaint.resolvedAt).toBeUndefined();
    expect((await w.oa.post(`/api/complaints/${c.id}/reopen`).send({ reason: 'I am not allowed' })).status).toBe(404);
  });

  it('progress notes notify the citizen only when citizen-visible', async () => {
    const w = await world();
    const c = await submitComplaint(w.ca);
    const before = await Notification.countDocuments({ userId: w.citizen._id });
    await w.aa.post(`/api/complaints/${c.id}/notes`).send({ message: 'internal only', visibility: 'internal' });
    expect(await Notification.countDocuments({ userId: w.citizen._id })).toBe(before);
    await w.aa.post(`/api/complaints/${c.id}/notes`).send({ message: 'Crew arrives tomorrow', visibility: 'citizen' });
    expect(await Notification.countDocuments({ userId: w.citizen._id })).toBe(before + 1);
    await w.aa.post(`/api/complaints/${c.id}/notes`).send({ message: 'Please add a landmark', visibility: 'citizen', requestInfo: true });
    expect(await Notification.findOne({ userId: w.citizen._id, title: /More information/ })).toBeTruthy();
  });

  it('notification endpoints are scoped to the owner', async () => {
    const w = await world();
    await submitComplaint(w.ca);
    const list = (await w.ca.get('/api/notifications')).body.data;
    expect(list.unread).toBe(1);
    expect((await w.oa.patch(`/api/notifications/${list.items[0].id}/read`)).status).toBe(404);
    expect((await w.ca.patch(`/api/notifications/${list.items[0].id}/read`)).status).toBe(200);
    expect((await w.ca.patch('/api/notifications/read-all')).status).toBe(200);
    expect((await w.ca.get('/api/notifications')).body.data.unread).toBe(0);
  });
});

describe('search, filters, pagination, export, duplicates', () => {
  async function many(w) {
    const cats = ['potholes', 'garbage', 'water', 'potholes', 'streetlights'];
    for (let i = 0; i < 5; i++) await submitComplaint(w.ca, { category: cats[i], title: `Issue number ${i} ${cats[i]}`, latitude: '13.08', longitude: String(80.27 + i * 0.0001) });
    await Complaint.updateOne({ title: /number 0/ }, { status: 'resolved', resolvedAt: new Date() });
  }
  it('paginates on the server', async () => {
    const w = await world(); await many(w);
    const r = await w.aa.get('/api/complaints?limit=2&page=3');
    expect(r.body.data.items).toHaveLength(1);
    expect(r.body.meta).toMatchObject({ total: 5, pages: 3, page: 3, limit: 2 });
  });
  it('filters by status/category/priority and searches', async () => {
    const w = await world(); await many(w);
    expect((await w.aa.get('/api/complaints?status=resolved')).body.meta.total).toBe(1);
    expect((await w.aa.get('/api/complaints?category=potholes')).body.meta.total).toBe(2);
    expect((await w.aa.get('/api/complaints?q=garbage')).body.meta.total).toBe(1);
    expect((await w.aa.get('/api/complaints?q=.*')).body.meta.total).toBe(0); // regex is escaped
    expect((await w.aa.get('/api/complaints?priority=high')).body.meta.total).toBeGreaterThan(0);
    expect((await w.aa.get('/api/complaints?sort=priority&limit=5')).status).toBe(200);
    expect((await w.aa.get('/api/complaints?sort=title')).body.data.items[0].title).toMatch(/number 0/);
    expect((await w.aa.get('/api/complaints?status=bogus')).status).toBe(400);
    const future = new Date(Date.now() + 864e5).toISOString().slice(0, 10);
    expect((await w.aa.get(`/api/complaints?from=${future}`)).body.meta.total).toBe(0);
  });
  it('citizen filters never leak other users’ data', async () => {
    const w = await world(); await many(w);
    await submitComplaint(w.oa, { title: 'Other persons complaint' });
    expect((await w.ca.get('/api/complaints?limit=50')).body.meta.total).toBe(5);
    expect((await w.ca.get('/api/complaints?q=Other persons')).body.meta.total).toBe(0);
  });
  it('exports CSV for admins only, neutralizing formula injection', async () => {
    const w = await world();
    await submitComplaint(w.ca, { title: '=HYPERLINK("http://evil","x")' });
    const r = await w.aa.get('/api/complaints/export');
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.text).toContain(`"'=HYPERLINK(""http://evil"",""x"")"`);
    expect((await w.ca.get('/api/complaints/export')).status).toBe(403);
  });
  it('finds nearby duplicates and serves map data to admins only', async () => {
    const w = await world(); await many(w);
    const first = await Complaint.findOne({ title: /number 0/ });
    const dup = await w.aa.get(`/api/complaints/${first._id}/duplicates`);
    expect(dup.status).toBe(200);
    expect(dup.body.data.items.length).toBe(1); // other pothole within 100m
    expect((await w.aa.get('/api/complaints/map')).body.data.items).toHaveLength(5);
    expect((await w.ca.get('/api/complaints/map')).status).toBe(403);
  });
});
