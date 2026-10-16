import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../server.mjs';

async function fixture(t) {
  const app = createApp();
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = `http://127.0.0.1:${app.server.address().port}`;
  async function client() {
    const response = await fetch(base + '/api/session');
    const cookie = response.headers.get('set-cookie').split(';')[0];
    const info = await response.json();
    return { ...info, cookie, async request(route, data, extra = {}) {
      const response = await fetch(base + route, { method: data === undefined ? 'GET' : 'POST',
        headers: { Cookie: cookie, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }), ...extra },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      return { status: response.status, body: await response.json() };
    } };
  }
  return { app, base, client };
}
test('serves the app, exposes health and never serves private source or traversal paths', async t => {
  const { base } = await fixture(t);
  for (const route of ['/', '/style.css', '/app.js', '/board.mjs', '/art.mjs', '/favicon.svg']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.ok(response.headers.get('content-security-policy'));
  }
  for (const route of ['/src/questions.mjs', '/server.mjs', '/package.json', '/%2e%2e%5csrc%5cquestions.mjs'])
    assert.equal((await fetch(base + route)).status, 404, route);
  assert.deepEqual(await (await fetch(base + '/health')).json(), { ok: true });
});
test('separate browsers share a real room and session resumes after refresh', async t => {
  const { client } = await fixture(t);
  const alice = await client(), bob = await client();
  assert.notEqual(alice.playerId, bob.playerId);
  const created = await alice.request('/api/rooms', { name: 'Alicja', rounds: 3 });
  assert.equal(created.status, 201);
  const code = created.body.room.code;
  const joined = await bob.request('/api/rooms/join', { name: 'Bartosz', code: code.toLowerCase() });
  assert.equal(joined.status, 200);
  assert.equal(joined.body.room.players.length, 2);
  const resumed = await alice.request('/api/session');
  assert.equal(resumed.body.playerId, alice.playerId);
  assert.equal(resumed.body.room.code, code);
  const denied = await bob.request('/api/room/action', { action: 'start' });
  assert.equal(denied.status, 403);
  const started = await alice.request('/api/room/action', { action: 'start' });
  assert.equal(started.body.room.answer, null);
  let room = started.body.room;
  for (let round = 0; round < 3; round++) {
    for (const c of [alice, bob].sort((a, b) => a.playerId === room.currentPlayerId ? -1 : 1)) {
      const response = await c.request('/api/room/action', { action: 'pass', turnId: room.turnId });
      assert.equal(response.status, 200);
      room = response.body.room;
    }
    assert.equal(room.phase, 'reveal');
    assert.ok(room.answer.sources.length > 0);
    const next = await alice.request('/api/room/action', { action: 'next' });
    room = next.body.room;
  }
  assert.equal(room.phase, 'finished');
  assert.equal(room.history.length, 3);
});
test('SSE delivers live room updates to another player', async t => {
  const { base, client } = await fixture(t);
  const alice = await client(), bob = await client();
  const created = await alice.request('/api/rooms', { name: 'Alicja' });
  const controller = new AbortController();
  t.after(() => controller.abort());
  const response = await fetch(base + '/api/events', { headers: { Cookie: alice.cookie }, signal: controller.signal });
  assert.equal(response.headers.get('content-type'), 'text/event-stream');
  const reader = response.body.getReader();
  let data = '';
  await bob.request('/api/rooms/join', { name: 'Bartosz', code: created.body.room.code });
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    while (!data.includes('Bartosz')) {
      const { value, done } = await reader.read();
      assert.equal(done, false);
      data += new TextDecoder().decode(value);
    }
    assert.ok(data.includes('Bartosz'));
  } finally { clearTimeout(timeout); controller.abort(); }
});
test('rejects cross-origin mutations, oversized bodies and invalid rooms', async t => {
  const { client, base } = await fixture(t);
  const alice = await client();
  assert.equal((await alice.request('/api/rooms', { name: 'Alicja' }, { Origin: 'https://other.example' })).status, 403);
  assert.equal((await alice.request('/api/rooms', { name: 'x'.repeat(5000) })).status, 413);
  assert.equal((await alice.request('/api/rooms/join', { name: 'Alicja', code: 'BAD234' })).status, 404);
  assert.equal((await fetch(base + '/api/rooms', { method: 'POST', body: '{}' })).status, 415);
  assert.equal((await alice.request('/api/rooms', { name: 'Alicja', rounds: 999 })).status, 400);
});
test('expired turns pass automatically and a disconnected host is replaced', async t => {
  const { app, client } = await fixture(t);
  const alice = await client(), bob = await client();
  const created = await alice.request('/api/rooms', { name: 'Alicja' });
  const code = created.body.room.code;
  await bob.request('/api/rooms/join', { name: 'Bartosz', code });
  await alice.request('/api/room/action', { action: 'start' });
  const room = app.rooms.get(code);
  room.deadline = Date.now() - 1;
  room.players[0].disconnectedAt = Date.now() - 31_000;
  room.players[1].connected = true;
  await new Promise(resolve => setTimeout(resolve, 1100));
  const snapshot = (await bob.request('/api/session')).body.room;
  assert.equal(snapshot.currentPlayerId, bob.playerId);
  assert.equal(snapshot.hostId, bob.playerId);
  assert.equal(snapshot.players[0].passed, true);
});
