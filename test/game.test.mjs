import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayer, startGame, place, pass, nextRound, restart, leave, scorePlacement, publicRoom, botMove, cleanName } from '../src/game.mjs';
import { QUESTIONS } from '../src/questions.mjs';
import { REGIONS, LAND_REGIONS, WATER_REGIONS, NEIGHBORS, YEAR_SCALE, NUMBER_SCALE, bucket } from '../public/board.mjs';

function game() {
  const room = createRoom('ABC234', 'alice', 'Alicja', 3);
  addPlayer(room, 'bob', 'Bartosz');
  startGame(room, 'alice');
  room.deck = [QUESTIONS[0], QUESTIONS[1], QUESTIONS[2]];
  return room;
}
function passAll(room) {
  while (room.phase === 'playing') pass(room, room.currentPlayerId, room.turnId);
}
test('only the host can start, and a game requires two players', () => {
  const room = createRoom('ABC234', 'a', 'Ania');
  assert.throws(() => startGame(room, 'other'), /gospodarz/);
  assert.throws(() => startGame(room, 'a'), /2 osób/);
});
test('lobby enforces capacity, unique names and no joining midgame', () => {
  const room = createRoom('ABC234', 'a', 'Ania');
  assert.throws(() => addPlayer(room, 'b', 'ANIA'), /zajęty/);
  for (let i = 0; i < 5; i++) addPlayer(room, String(i), `Gracz ${i}`);
  assert.throws(() => addPlayer(room, 'full', 'Kolejny'), /pełny/);
  startGame(room, 'a');
  assert.throws(() => addPlayer(room, 'late', 'Spóźniony'), /trwa/);
});
test('names are normalized and invalid input is rejected', () => {
  assert.equal(cleanName('  Łucja  Kowalska  '), 'Łucja Kowalska');
  for (const invalid of [null, {}, 'x', 'x'.repeat(21), '<script>', 'aa\0xx']) {
    assert.throws(() => cleanName(invalid));
  }
});
test('a placement consumes exactly one cube and rotates the turn', () => {
  const room = game();
  place(room, 'alice', 'map', 'eu-west', room.turnId);
  assert.equal(room.players[0].cubes, 4);
  assert.equal(room.currentPlayerId, 'bob');
  assert.equal(room.placements.length, 1);
});
test('out of turn, stale, invalid and occupied placements cannot change state', () => {
  const room = game(), turn = room.turnId;
  assert.throws(() => place(room, 'bob', 'map', 'eu-west', turn), /swoją turę/);
  assert.throws(() => place(room, 'alice', 'year', '4', turn), /przedział/);
  assert.throws(() => place(room, 'alice', 'map', '__proto__', turn), /region/);
  assert.throws(() => place(room, 'alice', 'year', 99, turn), /przedział/);
  assert.throws(() => place(room, 'alice', 'hack', 0, turn), /skalę/);
  place(room, 'alice', 'map', 'eu-west', turn);
  assert.throws(() => place(room, 'bob', 'map', 'eu-west', room.turnId), /zajęte/);
  place(room, 'bob', 'year', 3, room.turnId);
  assert.throws(() => place(room, 'alice', 'year', 4, turn), /zmieniła/);
  assert.equal(room.placements.length, 2);
});
test('answers, deck and points are not exposed before reveal', () => {
  const room = game();
  place(room, 'alice', 'map', 'eu-west', room.turnId);
  const view = publicRoom(room, 'bob');
  assert.equal(view.answer, null);
  assert.equal(view.deck, undefined);
  assert.equal(view.question.region, undefined);
  assert.equal(view.question.year, undefined);
  assert.equal(view.question.number, undefined);
  assert.equal(view.placements[0].points, undefined);
  assert.equal(view.players[0].score, 0);
  assert.throws(() => publicRoom(room, 'outsider'), /należysz/);
});
test('exact, adjacent and distant guesses score 7, 3 and 0', () => {
  const card = QUESTIONS[0];
  assert.equal(scorePlacement(card, 'map', 'eu-west'), 7);
  assert.equal(scorePlacement(card, 'map', 'eu-east'), 3);
  assert.equal(scorePlacement(card, 'map', 'oceania'), 0);
  const slot = bucket(card.year, YEAR_SCALE);
  assert.equal(scorePlacement(card, 'year', slot), 7);
  assert.equal(scorePlacement(card, 'year', slot + 1), 3);
  assert.equal(scorePlacement(card, 'year', 0), 0);
  assert.equal(scorePlacement(card, 'number', bucket(330, NUMBER_SCALE)), 7);
});
test('passing ends participation in the round; all pass reveals once', () => {
  const room = game();
  place(room, 'alice', 'map', 'eu-west', room.turnId);
  place(room, 'bob', 'year', 0, room.turnId);
  passAll(room);
  assert.equal(room.phase, 'reveal');
  assert.equal(room.result.alice.gained, 7);
  assert.equal(room.result.bob.lost, 1);
  assert.equal(room.players[0].cubes, 5);
  assert.equal(room.players[1].cubes, 4);
  assert.equal(publicRoom(room, 'bob').answer.year, 1889);
  assert.throws(() => pass(room, 'alice', room.turnId));
  assert.equal(room.history.length, 1);
});
test('three used categories end participation and replenishment guarantees three cubes', () => {
  const room = game();
  pass(room, 'alice', room.turnId);
  place(room, 'bob', 'map', 'oceania', room.turnId);
  place(room, 'bob', 'year', 0, room.turnId);
  place(room, 'bob', 'number', 0, room.turnId);
  assert.equal(room.phase, 'reveal');
  assert.equal(room.players[1].cubes, 2);
  nextRound(room, 'alice');
  assert.equal(room.players[1].cubes, 3);
  assert.equal(room.currentPlayerId, 'bob');
  place(room, 'bob', 'map', 'na-east', room.turnId);
  assert.equal(room.placements.length, 1);
});
test('each player can place only one marker in each category per round', () => {
  const room = game();
  place(room, 'alice', 'map', 'eu-west', room.turnId);
  place(room, 'bob', 'map', 'eu-east', room.turnId);
  let before = JSON.stringify(room);
  assert.throws(() => place(room, 'alice', 'map', 'oceania', room.turnId), /kategorii/);
  assert.equal(JSON.stringify(room), before);
  place(room, 'alice', 'year', 5, room.turnId);
  place(room, 'bob', 'year', 6, room.turnId);
  before = JSON.stringify(room);
  assert.throws(() => place(room, 'alice', 'year', 4, room.turnId), /kategorii/);
  assert.equal(JSON.stringify(room), before);
  place(room, 'alice', 'number', 5, room.turnId);
  assert.equal(room.currentPlayerId, 'bob');
  assert.throws(() => place(room, 'bob', 'year', 7, room.turnId), /kategorii/);
  place(room, 'bob', 'number', 6, room.turnId);
  assert.equal(room.phase, 'reveal');
  assert.equal(room.placements.length, 6);
  assert.equal(room.result.alice.gained, 21);
  assert.equal(room.result.bob.gained, 9);
});

test('water fields support placement, occupancy, scoring and the shared map limit', () => {
  const room = game();
  room.deck[0] = { ...QUESTIONS[0], region: 'sea-mediterranean' };
  place(room, 'alice', 'map', 'sea-mediterranean', room.turnId);
  assert.throws(() => place(room, 'bob', 'map', 'sea-mediterranean', room.turnId), /zajęte/);
  place(room, 'bob', 'map', 'ocean-atlantic-north', room.turnId);
  assert.throws(() => place(room, 'alice', 'map', 'eu-west', room.turnId), /kategorii/);
  passAll(room);
  assert.equal(room.result.alice.gained, 7);
  assert.equal(room.result.bob.gained, 3);
  assert.equal(publicRoom(room, 'alice').answer.region, 'sea-mediterranean');
});
test('a player who has used all categories is skipped even with spare markers', () => {
  const room = game();
  for (const [axis, a, b] of [['map', 'eu-west', 'eu-east'], ['year', 5, 6]]) {
    place(room, 'alice', axis, a, room.turnId);
    place(room, 'bob', axis, b, room.turnId);
  }
  place(room, 'alice', 'number', 5, room.turnId);
  assert.equal(room.players[0].cubes, 2);
  pass(room, 'bob', room.turnId);
  assert.equal(room.phase, 'reveal');
});
test('only host can advance and a complete match supports a clean rematch', () => {
  const room = game();
  assert.throws(() => nextRound(room, 'alice'), /dokończ/);
  for (let i = 0; i < 3; i++) {
    passAll(room);
    assert.throws(() => nextRound(room, 'bob'), /gospodarz/);
    nextRound(room, 'alice');
  }
  assert.equal(room.phase, 'finished');
  assert.equal(room.history.length, 3);
  restart(room, 'alice');
  assert.equal(room.phase, 'playing');
  assert.equal(room.round, 1);
  assert.equal(room.history.length, 0);
  assert.equal(new Set(room.deck.map(c => c.id)).size, 3);
  assert.ok(room.players.every(p => p.score === 0 && p.cubes === 5));
});
test('host departure transfers control and removes seat in the lobby', () => {
  const room = createRoom('ABC234', 'a', 'Ania');
  addPlayer(room, 'b', 'Basia');
  leave(room, 'a');
  assert.equal(room.hostId, 'b');
  assert.equal(room.players.length, 1);
});
test('departure cannot stall a game; too few participants ends the match', () => {
  const room = game();
  leave(room, 'alice');
  assert.equal(room.phase, 'finished');
  assert.equal(room.hostId, 'bob');
  assert.equal(room.currentPlayerId, null);
  assert.throws(() => publicRoom(room, 'alice'));
});
test('practice bot can finish every round without illegal moves', () => {
  const room = createRoom('ABC234', 'a', 'Ania', 3, true);
  for (let round = 0; round < 3; round++) {
    let steps = 0;
    while (room.phase === 'playing') {
      if (room.currentPlayerId === 'a') pass(room, 'a', room.turnId);
      else botMove(room);
      assert.ok(++steps <= 20);
    }
    const botPlacements = room.placements.filter(p => p.playerId !== 'a');
    assert.ok(botPlacements.length <= 3);
    assert.equal(new Set(botPlacements.map(p => p.axis)).size, botPlacements.length);
    nextRound(room, 'a');
  }
  assert.equal(room.phase, 'finished');
});
test('all questions and map neighbors form valid game data', () => {
  assert.ok(QUESTIONS.length >= 9);
  assert.equal(LAND_REGIONS.length, 17);
  assert.equal(WATER_REGIONS.length, 31);
  assert.equal(new Set(REGIONS.map(r => r.id)).size, REGIONS.length);
  assert.ok(!NEIGHBORS['ocean-arctic'].includes('sea-mediterranean'));
  assert.ok(!NEIGHBORS['ocean-arctic'].includes('sea-caribbean'));
  assert.equal(new Set(QUESTIONS.map(q => q.id)).size, QUESTIONS.length);
  for (const q of QUESTIONS) {
    assert.ok(REGIONS.some(r => r.id === q.region));
    assert.ok(bucket(q.year, YEAR_SCALE) >= 0);
    assert.ok(bucket(q.number, NUMBER_SCALE) >= 0);
    assert.ok(q.sources.every(s => new URL(s).protocol === 'https:'));
  }
  for (const [id, neighbors] of Object.entries(NEIGHBORS)) {
    assert.ok(neighbors.length > 0, id);
    assert.equal(new Set(neighbors).size, neighbors.length, id);
    for (const other of neighbors) {
      assert.notEqual(other, id);
      assert.ok(NEIGHBORS[other]?.includes(id), `${id} / ${other}`);
    }
  }
  assert.equal(bucket(250, NUMBER_SCALE), 5);
  assert.equal(bucket(499, NUMBER_SCALE), 5);
  assert.equal(bucket(500, NUMBER_SCALE), 6);
  assert.equal(bucket(1056006, NUMBER_SCALE), NUMBER_SCALE.length - 1);
});
