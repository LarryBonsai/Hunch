export function mountHeroCard(root) {
  let turns = 0, gesture = null, suppressClick = false;
  const findCard = target => target instanceof Element ? target.closest('[data-home-card]') : null;
  function refresh() {
    const card = root.querySelector('[data-home-card]');
    if (!card) return;
    const back = Math.abs(turns) % 2 === 1;
    card.style.setProperty('--card-turn', `${turns * 180}deg`);
    card.dataset.side = back ? 'back' : 'front';
    card.setAttribute('aria-pressed', String(back));
    card.setAttribute('aria-label', `Karta odkrywcy: ${back ? 'Piramidy w Gizie' : 'Wieża Eiffla'}. Przesuń mysz w poprzek lub kliknij, aby odwrócić kartę.`);
    for (const face of card.querySelectorAll('[data-card-face]'))
      face.setAttribute('aria-hidden', String(face.dataset.cardFace !== (back ? 'back' : 'front')));
  }
  function turn(direction) {
    turns += direction;
    refresh();
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
