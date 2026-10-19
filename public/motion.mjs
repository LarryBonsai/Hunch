// Stable numbers match the six animation ideas in the project notes.
// Remove a number from this set to disable that effect independently.
const ENABLED = new Set([1, 2, 3, 4, 5, 6]);
const EASE = 'cubic-bezier(.22,1,.36,1)';
export const motionAllowed = number => ENABLED.has(number) && !matchMedia('(prefers-reduced-motion: reduce)').matches;

function play(element, frames, options, elapsed = 0) {
  if (!element) return;
  const animation = element.animate(frames, { easing: EASE, ...options });
  animation.currentTime = elapsed;
  animation.finished.catch(() => {});
  return animation;
}

// 4. One quiet ripple when the travelling card reaches its destination.
export function pulseCardStop(card, stop) {
  if (!motionAllowed(4)) return;
  const marker = card.closest('.hero-visual')?.querySelector(`[data-card-stop="${stop}"]`);
  if (!marker) return;
  const ring = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  for (const name of ['cx', 'cy']) ring.setAttribute(name, marker.getAttribute(name));
  ring.setAttribute('r', '8');
  ring.setAttribute('fill', 'none');
  ring.setAttribute('stroke', marker.getAttribute('fill'));
  ring.setAttribute('stroke-width', '1.2');
  ring.setAttribute('aria-hidden', 'true');
  ring.classList.add('card-stop-ripple');
  ring.dataset.motion = '4';
  marker.after(ring);
  const animation = play(ring, [{ opacity: .48, transform: 'scale(.8)' }, { opacity: 0, transform: 'scale(2.8)' }], { duration: 600 });
  animation.finished.then(() => ring.remove(), () => ring.remove());
}

export function mountMotion(root) {
  let roundKey = null, scoreRoom = null, answerSeen = false, reveal = null, scoreFrame = null;
  let seenTokens = new Set();
  const tokenEffects = new Map(), scores = new Map(), scoreEffects = new Map(), boundReveals = new WeakMap();
  const correctTargets = room => !room?.answer ? [] : [
    ...(room.answer.regions ?? [room.answer.region]).map(id => ({ key: `map-${id}`, selector: `[data-region="${id}"]`, delay: 0, properties: ['fill', 'stroke'] })),
    { key: 'year', selector: `[data-axis="year"][data-slot="${room.answer.yearSlot}"]`, delay: 150, properties: ['backgroundColor', 'boxShadow'] },
    { key: 'number', selector: `[data-axis="number"][data-slot="${room.answer.numberSlot}"]`, delay: 300, properties: ['backgroundColor', 'boxShadow'] }
  ];
  const colours = (element, properties) => {
    if (!element) return null;
    const style = getComputedStyle(element);
    return Object.fromEntries(properties.map(name => [name, style[name]]));
  };
  function capture(room) {
    const card = root.querySelector('.entry-card'), tabs = card?.querySelector('.tabs');
    const indicator = tabs?.querySelector('.tab-indicator');
    const rect = indicator?.getBoundingClientRect(), bounds = tabs?.getBoundingClientRect();
    return {
      tab: tabs?.querySelector('[aria-selected="true"]')?.dataset.tab,
      height: card?.getBoundingClientRect().height,
      indicator: rect && { left: rect.left - bounds.left, width: rect.width },
      answers: correctTargets(room).map(target => ({ ...target, from: colours(root.querySelector(target.selector), target.properties) }))
    };
  }
  function home(previous) {
    const card = root.querySelector('.entry-card'), active = card?.querySelector('.tab.active');
    const indicator = card?.querySelector('.tab-indicator');
    if (!active || !indicator) return;
    indicator.style.left = `${active.offsetLeft}px`;
    indicator.style.width = `${active.offsetWidth}px`;
    const changed = previous.tab && previous.tab !== active.dataset.tab;
    // 1. A single underline slides between the two room tabs.
    if (changed && previous.indicator && motionAllowed(1)) play(indicator, [
      { transform: `translateX(${previous.indicator.left - active.offsetLeft}px) scaleX(${previous.indicator.width / active.offsetWidth})` },
      { transform: 'translateX(0) scaleX(1)' }
    ], { duration: 320 });
    // 2. Resize the form panel and bring the new fields in by eight pixels.
    if (changed && motionAllowed(2)) {
      const height = card.getBoundingClientRect().height;
      card.classList.add('form-is-moving');
      const animation = play(card, [{ height: `${previous.height}px` }, { height: `${height}px` }], { duration: 340 });
      animation.finished.then(() => card.classList.remove('form-is-moving'), () => card.classList.remove('form-is-moving'));
      play(card.querySelector('form'), [
        { opacity: .3, transform: `translateX(${active.dataset.tab === 'join' ? 8 : -8}px)` },
        { opacity: 1, transform: 'translateX(0)' }
      ], { duration: 300 });
    }
  }
  // 3. A placed map token settles once, including after a hidden answer is saved.
  function tokens(now, freshRound) {
    const elements = [...root.querySelectorAll('[data-motion-token]')];
    if (freshRound) seenTokens = new Set(elements.map(element => element.dataset.motionToken));
    for (const element of elements) {
      const key = element.dataset.motionToken;
      if (!seenTokens.has(key)) { seenTokens.add(key); tokenEffects.set(key, now); }
      const started = tokenEffects.get(key);
      if (started === undefined || !motionAllowed(3)) continue;
      const elapsed = now - started;
      if (elapsed >= 300) { tokenEffects.delete(key); continue; }
      play(element, [
        { opacity: .6, transform: 'scale(.86)' },
        { opacity: 1, transform: 'scale(1.08)', offset: .6 },
        { opacity: 1, transform: 'scale(1)' }
      ], { duration: 300 }, elapsed);
    }
  }
  const scoreValue = (effect, now) => {
    const progress = Math.min(1, Math.max(0, (now - effect.started) / 500));
    return Math.round(effect.from + (effect.to - effect.from) * (1 - (1 - progress) ** 3));
  };
  // 5. Scores count up once. Replacing the DOM resumes the same animation.
  function paintScores(now) {
    const allowed = motionAllowed(5);
    for (const element of document.querySelectorAll('[data-score-player]')) {
      const effect = scoreEffects.get(element.dataset.scorePlayer);
      const elapsed = effect ? now - effect.started : 700;
      element.textContent = effect && allowed ? scoreValue(effect, now) : element.dataset.scoreValue;
      const parent = element.parentElement;
      let gain = parent.querySelector('.score-rise');
      if (effect && allowed && elapsed < 700 && parent.classList.contains('player-score')) {
        if (!gain) {
          gain = document.createElement('span'); gain.className = 'score-rise'; gain.setAttribute('aria-hidden', 'true'); parent.append(gain);
        }
        gain.textContent = `+${effect.gain}`;
        const progress = Math.max(0, elapsed / 700);
        gain.style.opacity = String(Math.min(1, progress * 7) * (1 - progress));
        gain.style.transform = `translateY(${-15 * progress}px)`;
      } else gain?.remove();
    }
    for (const [id, effect] of scoreEffects) if (!allowed || now - effect.started >= 700) scoreEffects.delete(id);
    scoreFrame = scoreEffects.size ? requestAnimationFrame(paintScores) : null;
  }
  function updateScores(room, now) {
    if (scoreFrame !== null) { cancelAnimationFrame(scoreFrame); scoreFrame = null; }
    if (scoreRoom !== room?.code) { scores.clear(); scoreEffects.clear(); scoreRoom = room?.code; }
    for (const player of room?.players ?? []) {
      const previous = scores.get(player.id);
      if (previous !== undefined && player.score > previous && motionAllowed(5)) scoreEffects.set(player.id, {
        from: scoreEffects.has(player.id) ? scoreValue(scoreEffects.get(player.id), now) : previous,
        to: player.score, gain: player.score - previous, started: now
      });
      else if (previous !== undefined && player.score < previous) scoreEffects.delete(player.id);
      scores.set(player.id, player.score);
    }
    paintScores(now);
  }
  // 6. Reveal the correct region, year and size in a gentle sequence.
  function revealAnswers() {
    if (!reveal || !motionAllowed(6) || document.querySelector('#round-results[open]')) return;
    const now = performance.now();
    reveal.started ??= now;
    for (const target of reveal.targets) {
      const element = root.querySelector(target.selector);
      if (!element || !target.from || boundReveals.get(element) === reveal.key) continue;
      const elapsed = now - reveal.started;
      if (elapsed >= target.delay + 420) continue;
      boundReveals.set(element, reveal.key);
      const to = colours(element, target.properties);
      play(element, [target.from, to], { duration: 420, delay: target.delay, fill: 'backwards' }, elapsed);
    }
  }
  document.addEventListener('close', event => {
    if (event.target.id === 'round-results') requestAnimationFrame(revealAnswers);
  }, true);
  return {
    capture,
    refresh(previous, room) {
      home(previous);
      const now = performance.now(), key = room ? `${room.code}:${room.round}` : null;
      const freshRound = key !== roundKey;
      if (freshRound) { roundKey = key; tokenEffects.clear(); reveal = null; answerSeen = Boolean(room?.answer); }
      else if (room?.answer && !answerSeen) {
        answerSeen = true;
        reveal = { key, started: null, targets: previous.answers };
      }
      tokens(now, freshRound);
      updateScores(room, now);
      requestAnimationFrame(revealAnswers);
    }
  };
}
