import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openCatalog, validateSeed } from '../src/catalog.mjs';
import { ART_KINDS } from '../public/art.mjs';
import { createRoom, addPlayer, startGame, scorePlacement, publicRoom } from '../src/game.mjs';
const seed = JSON.parse(readFileSync(new URL('../data/known-places.json', import.meta.url)));

test('SQLite imports all 100 places, their map regions, 200 sourced questions and matching illustrations', () => {
  const db = openCatalog({ filename: ':memory:' });
  try {
    const cards = db.getCards(), info = db.summary();
    assert.equal(cards.length, 100);
    assert.deepEqual(cards.map(c => c.rank), Array.from({length:100}, (_,i) => i+1));
    assert.equal(new Set(cards.map(c => c.id)).size, 100);
    assert.equal(info.topics.length, 8);
    assert.equal(info.topics.reduce((n,t) => n+t.count, 0), 100);
    assert.equal(info.metrics.reduce((n,t) => n+t.count, 0), 100);
    for (const card of cards) {
      assert.ok(ART_KINDS.includes(card.art), card.id);
      assert.ok(card.sources.every(s => s.startsWith('https://')));
      assert.ok(card.regions.length && card.place && card.yearLabel && card.numberLabel);
      assert.ok(!('country' in card));
    }
    assert.ok(!JSON.stringify(info).includes('yearLabel'));
    assert.ok(!JSON.stringify(info).includes('sources'));
  } finally { db.close(); }
});

test('database survives reopening, imports changed seed once, and keeps last valid data on rejected seed', t => {
  const folder = mkdtempSync(join(tmpdir(), 'hunch-catalog-'));
  t.after(() => rmSync(folder, {recursive:true, force:true}));
  const filename = join(folder, 'catalog.sqlite');
  let db = openCatalog({filename});
  const hash = db.seedHash; db.close();
  const bytes = readFileSync(filename);
  assert.equal(bytes.subarray(0,16).toString(), 'SQLite format 3\0');
  db = openCatalog({filename});
  assert.equal(db.getCards().length, 100);
  assert.equal(db.seedHash, hash); db.close();
  assert.deepEqual(readFileSync(filename), bytes);
  const changed = structuredClone(seed);
  changed.places[0].note = 'Aktualizacja opisu.';
  db = openCatalog({filename, seed:changed});
  assert.notEqual(db.seedHash, hash);
  assert.equal(db.getCards()[0].fact, 'Aktualizacja opisu.'); db.close();
  const beforeFailure = readFileSync(filename);
  const invalid = structuredClone(changed);
  invalid.places[1].id = invalid.places[0].id;
  assert.throws(() => openCatalog({filename, seed:invalid}), /Powtórzony/);
  assert.deepEqual(readFileSync(filename), beforeFailure);
});

test('invalid facts, regions, question units and filters are rejected', () => {
  for (const edit of [s => s.places.pop(), s => s.places[0].regions=['unknown'],
    s => s.places[0].year.value=0, s => s.places[0].measure.value=-1,
    s => s.places[0].measure.kind='weight', s => s.places[0].measure.source='http://example.com']) {
    const invalid=structuredClone(seed); edit(invalid); assert.throws(() => validateSeed(invalid));
  }
  const db = openCatalog({filename:':memory:'});
  try {
    for(const filters of [{topic:"' OR 1=1 --"},{metric:'weight'},{collection:'unknown'}]) assert.throws(() => db.getCards(filters), RangeError);
    const areas=db.getCards({metric:'area'});
    assert.ok(areas.length>10 && areas.every(c => c.metric==='area'));
    assert.ok(db.getCards({topic:'engineering'}).every(c=>c.topic==='engineering'));
  } finally {db.close();}
});

test('both modes draw unique filtered cards; mixed games cover topics before repeating', () => {
  for(const mode of ['classic','hidden']) {
    const room=createRoom('ABC234','alice','Alicja',3,true,mode,{topic:'nature',metric:'area'});
    assert.equal(new Set(room.deck.map(c=>c.id)).size,3);
    assert.ok(room.deck.every(c=>c.topic==='nature' && c.metric==='area'));
    assert.equal(publicRoom(room,'alice').answer,null);
    const safe=JSON.stringify(publicRoom(room,'alice'));
    for(const forbidden of ['"regions":','"year":','"sources":','"rank":']) assert.ok(!safe.includes(forbidden),forbidden);
  }
  const mixed=createRoom('ABC235','a','Alicja',9);
  addPlayer(mixed,'b','Bartek'); startGame(mixed,'a');
  assert.equal(new Set(mixed.deck.map(c=>c.id)).size,9);
  assert.equal(new Set(mixed.deck.slice(0,8).map(c=>c.topic)).size,8);
  assert.throws(()=>createRoom('ABC236','a','Alicja',9,false,'classic',{topic:'engineering'}),/mniej rund/);
  assert.throws(()=>createRoom('ABC237','a','Alicja',3,false,'classic',{topic:'unknown'}),/Nieznany/);
});

test('border locations accept either mapped region and reveal both after the round', () => {
  const card = {regions:['asia-south','asia-east'],region:'asia-south',year:1953,number:8848.86};
  assert.equal(scorePlacement(card,'map','asia-south'),7);
  assert.equal(scorePlacement(card,'map','asia-east'),7);
  assert.equal(scorePlacement(card,'map','asia-north'),3);
  assert.equal(scorePlacement(card,'map','eu-west'),0);
});
