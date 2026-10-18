export function mountHeroCard(root) {
  let turns = 0, position = 0, frame = null, gesture = null, suppressClick = false;
  const findCard = target => target instanceof Element ? target.closest('[data-home-card]') : null;
  function draw(card) {
    const phase = ((position % 4) + 4) % 4;
    const travel = phase <= 1 ? phase : phase <= 3 ? 2 - phase : phase - 4;
    const progress = Math.abs(travel);
    const width = card.offsetWidth;
    // A shallow, continuous parabola joins the two resting positions.
    const x = travel * width * .11;
    const y = -4 * width * .045 * progress * (1 - progress);
    card.style.setProperty('--card-turn', `${position * 180}deg`);
    card.style.setProperty('--card-x', `${x}px`);
    card.style.setProperty('--card-y', `${y}px`);
  }
  function refresh() {
    const card = root.querySelector('[data-home-card]');
    if (!card) return;
    const back = Math.abs(turns) % 2 === 1;
    draw(card);
    card.dataset.side = back ? 'back' : 'front';
    card.setAttribute('aria-pressed', String(back));
    card.setAttribute('aria-label', `Karta odkrywcy: ${back ? 'Piramidy w Gizie' : 'Wieża Eiffla'}. Przesuń mysz w poprzek lub kliknij, aby odwrócić kartę.`);
    for (const face of card.querySelectorAll('[data-card-face]'))
      face.setAttribute('aria-hidden', String(face.dataset.cardFace !== (back ? 'back' : 'front')));
  }
  function turn(direction) {
    turns += direction;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      position = turns;
      refresh();
      return;
    }
    const start = position, target = turns, startedAt = performance.now();
    const duration = 1000 * Math.min(1.25, Math.max(.4, Math.abs(target - start)));
    function animate(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = progress * progress * (3 - 2 * progress);
      position = start + (target - start) * eased;
      const card = root.querySelector('[data-home-card]');
      if (progress === 1 || !card) {
        position = target;
        frame = null;
        if (card) draw(card);
        return;
      }
      draw(card);
      frame = requestAnimationFrame(animate);
    }
    refresh();
    frame = requestAnimationFrame(animate);
  }
  root.addEventListener('pointerover', event => {
    const card = findCard(event.target);
    if (!card || card.contains(event.relatedTarget) || event.pointerType === 'touch') return;
    gesture = { card, low: event.clientX, high: event.clientX, direction: 0,
      threshold: Math.max(24, card.getBoundingClientRect().width * .23) };
    suppressClick = false;
  });
  root.addEventListener('pointermove', event => {
    if (!gesture || findCard(event.target) !== gesture.card || event.pointerType === 'touch') return;
    gesture.low = Math.min(gesture.low, event.clientX);
    gesture.high = Math.max(gesture.high, event.clientX);
    const direction = gesture.direction !== 1 && event.clientX - gesture.low >= gesture.threshold ? 1
      : gesture.direction !== -1 && gesture.high - event.clientX >= gesture.threshold ? -1 : 0;
    if (!direction) return;
    turn(direction);
    suppressClick = event.buttons !== 0;
    gesture.direction = direction;
    gesture.low = gesture.high = event.clientX;
  });
  root.addEventListener('pointerout', event => {
    const card = findCard(event.target);
    if (card && !card.contains(event.relatedTarget)) { gesture = null; suppressClick = false; }
  });
  root.addEventListener('click', event => {
    if (!findCard(event.target)) return;
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    turn(1);
  });
  root.addEventListener('keydown', event => {
    if (!findCard(event.target) || !['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat) turn(event.key === 'ArrowLeft' ? -1 : 1);
  });
  return { refresh };
}
