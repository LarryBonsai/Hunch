import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoom, addPlayer, startGame, place, pass, submitAnswers, expireRound, nextRound, restart, leave, botMove, publicRoom, HIDDEN_ROUND_MS, CARD_PREVIEW_MS } from '../src/game.mjs';
import { QUESTIONS } from '../src/questions.mjs';
import { YEAR_SCALE, NUMBER_SCALE, bucket } from '../public/board.mjs';

function game(extraPlayer = false) {
  const room = createRoom('SECRET', 'alice', 'Alicja', 3, false, 'hidden');
  addPlayer(room, 'bob', 'Bartosz');
  if (extraPlayer) addPlayer(room, 'c', 'Celina');
  startGame(room, 'alice');
  room.deck = QUESTIONS.slice(0, 3);
  return room;
}
function correctPicks(room, id) {
  const card = room.deck[room.round - 1];
  for (const [axis, slot] of [['map', card.region], ['year', bucket(card.year, YEAR_SCALE)], ['number', bucket(card.number, NUMBER_SCALE)]])
    place(room, id, axis, slot, room.turnId);
}

test('classic stays default; hidden rounds have a shared 30 seconds after the card preview', () => {
  assert.equal(createRoom('ABC234', 'a', 'Ania').mode, 'classic');
  assert.throws(() => createRoom('ABC234', 'a', 'Ania', 3, false, 'other'), /tryb/);
  const before = Date.now(), room = game();
  assert.equal(room.currentPlayerId, null);
  assert.equal(room.deadline - room.answerStartsAt, HIDDEN_ROUND_MS);
  assert.ok(room.answerStartsAt >= before + CARD_PREVIEW_MS);
  assert.equal(expireRound(room, room.deadline - 1), false);
  assert.throws(() => pass(room, 'alice', room.turnId), /trzy/);
});
test('all players can edit one pick per category and share the same fields without revealing choices', () => {
  const room = game(), roundId = room.turnId;
  place(room, 'bob', 'map', 'oceania', roundId);
  correctPicks(room, 'bob');
  correctPicks(room, 'alice');
  assert.equal(room.placements.length, 6);
  assert.equal(room.placements.filter(p => p.playerId === 'bob' && p.axis === 'map').length, 1);
  assert.equal(room.turnId, roundId);
  assert.ok(room.players.every(p => p.cubes === 5 && p.score === 0));
  for (const id of ['alice', 'bob']) {
    const view = publicRoom(room, id);
    assert.equal(view.placements.length, 3);
    assert.ok(view.placements.every(p => p.playerId === id && p.points === undefined));
    assert.equal(view.answer, null);
    assert.equal(view.deck, undefined);
    assert.equal(view.result, null);
    assert.equal(view.question.year, undefined);
  }
  submitAnswers(room, 'alice', roundId);
  assert.equal(room.phase, 'playing', 'one unconfirmed player keeps the answers private');
  assert.throws(() => place(room, 'alice', 'map', 'oceania', roundId), /zatwierdzony/);
  assert.ok(publicRoom(room, 'alice').placements.every(p => p.playerId === 'alice'));
  submitAnswers(room, 'bob', roundId);
  assert.equal(room.phase, 'reveal');
  assert.equal(room.deadline, null);
  assert.throws(() => submitAnswers(room, 'bob', roundId));
  assert.equal(publicRoom(room, 'alice').placements.length, 6);
  assert.ok(room.players.every(p => p.score === 21 && p.cubes === 5));
  assert.equal(room.history.length, 1);
  assert.equal(expireRound(room, Date.now() + 100_000), false);
  assert.ok(room.players.every(p => p.score === 21));
});
test('timeout scores saved partial answers without confirmation; missing answers give no points', () => {
  const room = game();
  place(room, 'alice', 'map', room.deck[0].region, room.turnId);
  assert.throws(() => submitAnswers(room, 'alice', room.turnId), /region, rok i wielkość/);
  place(room, 'bob', 'map', 'oceania', room.turnId);
  expireRound(room, room.deadline);
  assert.equal(room.result.alice.gained, 7);
  assert.equal(room.result.bob.gained, 0);
  assert.equal(room.result.bob.lost, 1);
  assert.equal(room.players[0].cubes, 5);
  assert.equal(room.players[1].cubes, 4);
  assert.equal(room.placements.length, 2);
});
test('invalid, unauthorized, stale and late drafts do not change the hidden round', () => {
  const room = game(), before = JSON.stringify(room);
  for (const [id, axis, slot, turn] of [
    ['outsider', 'map', 'eu-west', room.turnId], ['alice', 'hack', 0, room.turnId],
    ['alice', 'map', '__proto__', room.turnId], ['alice', 'year', 999, room.turnId],
    ['alice', 'number', '5', room.turnId], ['alice', 'year', 5, room.turnId - 1]
  ]) assert.throws(() => place(room, id, axis, slot, turn));
  assert.equal(JSON.stringify(room), before);
  room.deadline = Date.now() - 1;
  assert.throws(() => place(room, 'alice', 'year', 5, room.turnId), /Czas/);
  assert.throws(() => submitAnswers(room, 'alice', room.turnId), /Czas/);
  assert.equal(room.placements.length, 0);
  const classic = createRoom('ABC234', 'a', 'Ania', 3, true);
  assert.throws(() => submitAnswers(classic, 'a', classic.turnId), /trybie/);
});
test('next rounds and rematches keep the chosen mode, reset readiness and reject old round requests', () => {
  const room = game();
  for (let round = 1; round <= 3; round++) {
    const oldId = room.turnId;
    correctPicks(room, 'alice');
    submitAnswers(room, 'alice', oldId);
    expireRound(room, room.deadline);
    nextRound(room, 'alice');
    if (round < 3) {
      assert.equal(room.placements.length, 0);
      assert.ok(room.players.every(p => !p.ready && p.cubes >= 3));
      assert.throws(() => place(room, 'alice', 'year', 0, oldId), /Runda/);
    }
  }
  assert.equal(room.phase, 'finished');
  restart(room, 'alice');
  assert.equal(room.mode, 'hidden');
  assert.equal(room.currentPlayerId, null);
  assert.equal(room.history.length, 0);
  assert.ok(room.players.every(p => !p.ready && p.score === 0 && p.cubes === 5));
});
test('Atlas answers privately and reveals as soon as the human also confirms', () => {
  const room = createRoom('ABC234', 'a', 'Ania', 3, true, 'hidden');
  botMove(room);
  assert.equal(room.placements.length, 3);
  assert.equal(new Set(room.placements.map(p => p.axis)).size, 3);
  assert.equal(room.players[1].ready, true);
  assert.equal(publicRoom(room, 'a').placements.length, 0);
  assert.equal(room.phase, 'playing');
  botMove(room);
  assert.equal(room.placements.length, 3);
  correctPicks(room, 'a');
  submitAnswers(room, 'a', room.turnId);
  assert.equal(room.phase, 'reveal');
  assert.equal(publicRoom(room, 'a').placements.length, 6);
  assert.equal(room.history.length, 1);
});
test('Atlas can be the last to confirm and resolves the round exactly once', () => {
  const room = createRoom('ABC234', 'a', 'Ania', 3, true, 'hidden');
  correctPicks(room, 'a');
  submitAnswers(room, 'a', room.turnId);
  assert.equal(room.phase, 'playing');
  botMove(room);
  assert.equal(room.phase, 'reveal');
  const scored = JSON.stringify(room);
  botMove(room);
  assert.equal(JSON.stringify(room), scored);
  assert.equal(room.history.length, 1);
});
test('an unconfirmed player leaving reveals once all remaining players have confirmed', () => {
  const room = game(true);
  for (const id of ['alice', 'bob']) { correctPicks(room, id); submitAnswers(room, id, room.turnId); }
  assert.equal(room.phase, 'playing');
  leave(room, 'c');
  assert.equal(room.phase, 'reveal');
  assert.equal(room.placements.length, 6);
  assert.equal(room.history.length, 1);
});
test('departures preserve the shared deadline and end the match when fewer than two remain', () => {
  const room = createRoom('SECRET', 'a', 'Ania', 3, false, 'hidden');
  addPlayer(room, 'b', 'Basia'); addPlayer(room, 'c', 'Celina'); startGame(room, 'a');
  const deadline = room.deadline;
  leave(room, 'a');
  assert.equal(room.phase, 'playing');
  assert.equal(room.hostId, 'b');
  assert.equal(room.deadline, deadline);
  leave(room, 'c');
  assert.equal(room.phase, 'finished');
  assert.ok(publicRoom(room, 'b').answer);
});
