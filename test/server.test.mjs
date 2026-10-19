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
  for (const route of ['/', '/style.css', '/app.js', '/board.mjs', '/art.mjs', '/card-intro.mjs', '/round-results.mjs', '/hero-card.mjs', '/motion.mjs', '/favicon.svg']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200, route);
    assert.ok(response.headers.get('content-security-policy'));
  }
  for (const route of ['/src/questions.mjs', '/src/catalog.mjs', '/data/known-places.json', '/data/hunch.sqlite', '/data/schema.sql', '/server.mjs', '/package.json', '/%2e%2e%5csrc%5cquestions.mjs'])
    assert.equal((await fetch(base + route)).status, 404, route);
  assert.deepEqual(await (await fetch(base + '/health')).json(), { ok: true });
});
test('catalog exposes only counts; room filters drive classic and hidden practice without leaking facts', async t => {
  const {client,base} = await fixture(t);
  // Metadata must not race the initial session request and overwrite its cookie.
  assert.equal((await fetch(base+'/api/catalog')).headers.get('set-cookie'),null);
  const alice=await client();
  const metadata=await alice.request('/api/catalog');
  assert.equal(metadata.status,200);
  assert.equal(metadata.body.collection.count,100);
  assert.equal(metadata.body.topics.length,8);
  assert.deepEqual(metadata.body.metrics.map(m=>m.id),['height','length','area']);
  assert.ok(!JSON.stringify(metadata.body).includes('yearLabel'));
  for (const catalog of [{topic:'unknown'},{metric:'weight'},{collection:'other'},'bad',{topic:'engineering',metric:'area'}]) {
    const result=await alice.request('/api/rooms',{name:'Alicja',rounds:3,catalog});
    assert.equal(result.status,400);
  }
  for(const mode of ['classic','hidden']) {
    const created=await alice.request('/api/rooms',{name:'Alicja',rounds:3,practice:true,mode,catalog:{topic:'nature',metric:'area'}});
    assert.equal(created.status,201);
    const room=created.body.room;
    assert.equal(room.catalog.topic,'nature');
    assert.equal(room.catalog.metric,'area');
    assert.equal(room.question.category,'Parki, wyspy i ogrody');
    assert.ok(['ha','km²','m²'].includes(room.question.unit));
    assert.equal(room.answer,null);
    assert.ok(!('regions' in room.question));
    assert.ok(!('sources' in room.question));
    await alice.request('/api/room/action',{action:'leave'});
  }
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
test('HTTP rejects a second marker in a category without consuming a cube', async t => {
  const { client } = await fixture(t);
  const alice = await client(), bob = await client();
  const created = await alice.request('/api/rooms', { name: 'Alicja' });
  await bob.request('/api/rooms/join', { name: 'Bartosz', code: created.body.room.code });
  let room = (await alice.request('/api/room/action', { action: 'start' })).body.room;
  room = (await alice.request('/api/room/action', { action: 'place', axis: 'map', slot: 'eu-west', turnId: room.turnId })).body.room;
  room = (await bob.request('/api/room/action', { action: 'pass', turnId: room.turnId })).body.room;
  const blocked = await alice.request('/api/room/action', { action: 'place', axis: 'map', slot: 'eu-east', turnId: room.turnId });
  assert.equal(blocked.status, 409);
  assert.match(blocked.body.error, /kategorii/);
  const resumed = (await alice.request('/api/session')).body.room;
  assert.equal(resumed.placements.length, 1);
  assert.equal(resumed.players[0].cubes, 4);
  assert.equal(resumed.turnId, room.turnId);
});
test('hidden choices stay private over HTTP and SSE until the server deadline', async t => {
  const { app, base, client } = await fixture(t);
  const alice = await client(), bob = await client();
  const room = (await alice.request('/api/rooms', { name: 'Alicja', mode: 'hidden', rounds: 3 })).body.room;
  const joined = await bob.request('/api/rooms/join', { name: 'Bartosz', code: room.code, mode: 'classic' });
  assert.equal(joined.body.room.mode, 'hidden', 'joining cannot change the host choice');
  const started = (await alice.request('/api/room/action', { action: 'start' })).body.room;
  const turnId = started.turnId;
  const controller = new AbortController();
  t.after(() => controller.abort());
  const stream = await fetch(base + '/api/events', { headers: { Cookie: alice.cookie }, signal: controller.signal });
  const reader = stream.body.getReader();
  const bobPick = await bob.request('/api/room/action', { action: 'place', axis: 'map', slot: 'oceania', turnId });
  assert.equal(bobPick.status, 200);
  assert.equal(bobPick.body.room.placements[0].slot, 'oceania');
  const revision = bobPick.body.room.version;
  let buffered = '', observed;
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    while (!observed) {
      const { value, done } = await reader.read();
      assert.equal(done, false);
      buffered += new TextDecoder().decode(value);
      const frames = buffered.split('\n\n');
      buffered = frames.pop();
      for (const frame of frames.filter(frame => frame.startsWith('data: '))) {
        const snapshot = JSON.parse(frame.slice(6)).room;
        assert.deepEqual(snapshot.placements, [], 'another player’s drafts must never enter the stream');
        assert.equal(snapshot.answer, null);
        assert.equal(snapshot.result, null);
        if (snapshot.version >= revision) observed = snapshot;
      }
    }
  } finally { clearTimeout(timeout); controller.abort(); }
  assert.deepEqual((await alice.request('/api/session')).body.room.placements, []);
  const own = await alice.request('/api/room/action', { action: 'place', axis: 'map', slot: 'oceania', turnId });
  assert.equal(own.status, 200, 'same field remains available to both players');
  assert.equal(own.body.room.placements.length, 1);
  app.rooms.get(room.code).deadline = Date.now() - 1;
  await new Promise(resolve => setTimeout(resolve, 1100));
  const revealed = (await alice.request('/api/session')).body.room;
  assert.equal(revealed.phase, 'reveal');
  assert.equal(revealed.placements.length, 2);
  assert.ok(revealed.placements.every(p => Number.isInteger(p.points)));
  assert.ok(revealed.answer.sources.length);
  assert.equal(revealed.history.length, 1);
});
test('late hidden HTTP mutations cannot race the timer and practice supports both modes', async t => {
  const { app, client } = await fixture(t);
  const alice = await client();
  assert.equal((await alice.request('/api/rooms', { name: 'Alicja', mode: 'invalid' })).status, 400);
  let room = (await alice.request('/api/rooms', { name: 'Alicja', mode: 'hidden', practice: true })).body.room;
  assert.equal(room.mode, 'hidden');
  app.rooms.get(room.code).deadline = Date.now() - 1;
  const late = await alice.request('/api/room/action', { action: 'place', axis: 'map', slot: 'eu-west', turnId: room.turnId });
  assert.equal(late.status, 409);
  room = (await alice.request('/api/session')).body.room;
  assert.equal(room.phase, 'reveal');
  assert.deepEqual(room.placements, []);
  await alice.request('/api/room/action', { action: 'leave' });
  room = (await alice.request('/api/rooms', { name: 'Alicja', practice: true })).body.room;
  assert.equal(room.mode, 'classic');
  assert.equal(room.currentPlayerId, alice.playerId);
});
test('the last confirmation reveals immediately over HTTP and SSE without waiting for the deadline', async t => {
  const { app, base, client } = await fixture(t);
  const alice = await client(), bob = await client(), celina = await client();
  const created = (await alice.request('/api/rooms', { name: 'Alicja', mode: 'hidden' })).body.room;
  for (const [player, name] of [[bob, 'Bartosz'], [celina, 'Celina']])
    await player.request('/api/rooms/join', { code: created.code, name });
  let room = (await alice.request('/api/room/action', { action: 'start' })).body.room;
  const turnId = room.turnId, deadline = room.deadline;
  for (const player of [alice, bob, celina]) {
    for (const [axis, slot] of [['map', 'eu-west'], ['year', 5], ['number', 5]]) {
      const response = await player.request('/api/room/action', { action: 'place', axis, slot, turnId });
      assert.equal(response.status, 200);
    }
    if (player !== celina) {
      room = (await player.request('/api/room/action', { action: 'submit', turnId })).body.room;
      assert.equal(room.phase, 'playing');
      assert.equal(room.placements.length, 3);
      assert.equal(room.answer, null);
    }
  }
  const controller = new AbortController(); t.after(() => controller.abort());
  const response = await fetch(base + '/api/events', { headers: { Cookie: alice.cookie }, signal: controller.signal });
  const reader = response.body.getReader();
  const confirmed = await celina.request('/api/room/action', { action: 'submit', turnId });
  assert.equal(confirmed.status, 200);
  assert.ok(Date.now() < deadline);
  assert.equal(confirmed.body.room.phase, 'reveal');
  assert.equal(confirmed.body.room.placements.length, 9);
  let buffered = '', revealed = false;
  const timeout = setTimeout(() => controller.abort(), 3000);
  try {
    while (!revealed) {
      const { value, done } = await reader.read(); assert.equal(done, false);
      buffered += new TextDecoder().decode(value);
      const frames = buffered.split('\n\n'); buffered = frames.pop();
      for (const frame of frames.filter(frame => frame.startsWith('data: '))) {
        const snapshot = JSON.parse(frame.slice(6)).room;
        if (snapshot.phase === 'playing') { assert.equal(snapshot.placements.length, 3); assert.equal(snapshot.answer, null); }
        else {
          assert.equal(snapshot.phase, 'reveal'); assert.equal(snapshot.placements.length, 9);
          assert.equal(snapshot.deadline, null); assert.equal(snapshot.history.length, 1);
          assert.ok(snapshot.answer); revealed = true;
        }
      }
    }
  } finally { clearTimeout(timeout); controller.abort(); }
  assert.equal((await celina.request('/api/room/action', { action: 'submit', turnId })).status, 409);
  assert.equal(app.rooms.get(created.code).history.length, 1);
  assert.equal((await bob.request('/api/room/action', { action: 'next' })).status, 403);
  const next = (await alice.request('/api/room/action', { action: 'next' })).body.room;
  assert.equal(next.phase, 'playing');
  assert.equal(next.round, 2);
  assert.equal(next.mode, 'hidden');
  assert.deepEqual(next.placements, []);
});
