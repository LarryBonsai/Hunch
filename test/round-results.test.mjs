import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoundResultsController } from '../public/round-results.mjs';

const room = (round = 1) => ({ code: 'SECRET', mode: 'hidden', phase: 'reveal', round,
  question: { title: 'Machu Picchu' }, result: { alice: { gained: 7 } } });
function fixture() {
  let now = 0, nextId = 0;
  const timers = new Map(), events = [];
  const controller = createRoundResultsController({
    onShow: value => events.push(['show', value.round]),
    onDismiss: reason => events.push(['dismiss', reason]),
    onCancel: () => events.push(['cancel']),
    setTimer(callback, delay) { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimer(id) { timers.delete(id); }
  });
  return { controller, timers, events, advance(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) { timers.delete(id); timer.callback(); }
  } };
}
test('round scores appear only after hidden-mode reveal and wait for a decision across live updates', () => {
  const f = fixture();
  for (const value of [{ ...room(), mode: 'classic' }, { ...room(), phase: 'playing' }, { ...room(), result: null }]) f.controller.update(value);
  assert.deepEqual(f.events, []);
  f.controller.update(room()); f.advance(3000);
  f.controller.update({ ...room(), version: 5 }); f.advance(1999);
  assert.deepEqual(f.events, [['show', 1]]);
  f.advance(30_000);
  assert.deepEqual(f.events, [['show', 1]]);
  assert.equal(f.timers.size, 0, 'the next-card button must not disappear on a timer');
  f.controller.update({ ...room(), version: 6 });
  assert.equal(f.events.length, 1, 'the same result must not reopen');
});
test('click or Escape dismisses scores once; later round scores get a new presentation', () => {
  for (const reason of ['click', 'escape']) {
    const f = fixture();
    f.controller.update(room());
    f.controller.dismiss(reason); f.controller.dismiss(reason); f.advance(5000);
    assert.deepEqual(f.events, [['show', 1], ['dismiss', reason]]);
    assert.equal(f.timers.size, 0);
    f.controller.update(room(2));
    assert.deepEqual(f.events.at(-1), ['show', 2]);
  }
});
test('starting another round or leaving removes the old score popup before the next presentation', () => {
  for (const next of [null, { ...room(2), phase: 'playing' }, { ...room(), phase: 'finished' }]) {
    const f = fixture(); f.controller.update(room());
    f.controller.update(next);
    assert.equal(f.timers.size, 0);
    f.controller.update(room(2));
    assert.deepEqual(f.events, [['show', 1], ['cancel'], ['show', 2]]);
    f.advance(5000);
    assert.deepEqual(f.events.at(-1), ['show', 2]);
  }
});
