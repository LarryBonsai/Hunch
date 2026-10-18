import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardIntroController } from '../public/card-intro.mjs';

const room = (round = 1) => ({ code: 'ABC234', phase: 'playing', round, question: { title: 'Machu Picchu' } });
function fixture() {
  let now = 0, nextId = 0;
  const timers = new Map(), events = [];
  const controller = createCardIntroController({
    onShow: value => events.push(['show', value.round]),
    onDismiss: reason => events.push(['dismiss', reason]),
    onCancel: () => events.push(['cancel']),
    setTimer(callback, delay) { const id = ++nextId; timers.set(id, { callback, at: now + delay }); return id; },
    clearTimer(id) { timers.delete(id); }
  });
  return { controller, timers, events, advance(ms) {
    now += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= now) {
      timers.delete(id);
      timer.callback();
    }
  } };
}

test('a card stays centered for five seconds, even across live room updates', () => {
  const f = fixture();
  f.controller.update(room());
  f.advance(3000);
  f.controller.update({ ...room(), turnId: 2, version: 5 });
  f.advance(1999);
  assert.deepEqual(f.events, [['show', 1]]);
  f.advance(1);
  assert.deepEqual(f.events, [['show', 1], ['dismiss', 'timeout']]);
  f.controller.update({ ...room(), version: 6 });
  assert.equal(f.events.length, 2);
});

test('clicking or pressing Escape dismisses once and clears the auto-dismiss timer', () => {
  for (const reason of ['click', 'escape']) {
    const f = fixture();
    f.controller.update(room());
    f.advance(1200);
    f.controller.dismiss(reason);
    f.controller.dismiss(reason);
    f.advance(5000);
    assert.equal(f.timers.size, 0);
    assert.deepEqual(f.events, [['show', 1], ['dismiss', reason]]);
  }
});

test('a new round gets a fresh presentation, including when the title repeats', () => {
  const f = fixture();
  f.controller.update(room());
  const staleTimeout = [...f.timers.values()][0].callback;
  f.advance(2000);
  f.controller.update(room(2));
  staleTimeout();
  assert.deepEqual(f.events, [['show', 1], ['cancel'], ['show', 2]]);
  f.advance(4999);
  assert.equal(f.events.length, 3);
  f.advance(1);
  assert.deepEqual(f.events.at(-1), ['dismiss', 'timeout']);
});

test('reveal, leaving and destruction remove pending card presentations', () => {
  for (const next of [null, { ...room(), phase: 'reveal' }, { ...room(), phase: 'finished' }, { ...room(), phase: 'lobby' }]) {
    const f = fixture();
    f.controller.update(room());
    f.controller.update(next);
    f.advance(5000);
    assert.equal(f.timers.size, 0);
    assert.deepEqual(f.events, [['show', 1], ['cancel']]);
  }
  const f = fixture();
  f.controller.update(room());
  f.controller.destroy();
  f.advance(5000);
  assert.deepEqual(f.events, [['show', 1], ['cancel']]);
});
