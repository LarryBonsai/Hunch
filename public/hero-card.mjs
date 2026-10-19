export function mountHeroCard(root, initialTab = 'create') {
  let stop = initialTab === 'join' ? 1 : 0, position = stop, frame = null, geometry = null, gesture = null, suppressClick = false;
  const findCard = target => target instanceof Element ? target.closest('[data-home-card]') : null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const transformPoint = (matrix, point) => ({
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f
  });
  function measure(card) {
    const stage = card.closest('.hero-visual');
    // Switching forms keeps the existing map and route at the same height.
    if (geometry?.viewportWidth === document.documentElement.clientWidth && geometry.stageWidth === stage.clientWidth)
      stage.style.minHeight = `${geometry.stageHeight}px`;
    const svg = stage.querySelector('.world-map');
    const matrix = svg?.getScreenCTM();
    if (!matrix) return null;
    const bounds = stage.getBoundingClientRect();
    const copy = root.querySelector('.entry-card')?.getBoundingClientRect();
    const width = card.offsetWidth, height = card.offsetHeight;
    const angle = 5 * Math.PI / 180;
    const halfWidth = (width * Math.cos(angle) + height * Math.sin(angle)) / 2;
    const halfHeight = (height * Math.cos(angle) + width * Math.sin(angle)) / 2;
    const besideForm = copy && copy.right <= bounds.left + 2;
    const minX = (besideForm ? copy.right + 18 : bounds.left + 12) + halfWidth;
    const maxX = (besideForm ? document.documentElement.clientWidth - 28 : bounds.right - 12) - halfWidth;
    const left = transformPoint(matrix, { x: 273, y: 132 });
    const right = transformPoint(matrix, { x: 827, y: 306 });
    left.x = clamp(left.x, minX, maxX);
    right.x = clamp(right.x, minX, maxX);
    const rise = clamp((right.x - left.x) * .13, 18, 72);
    const minY = bounds.top + halfHeight + rise / 2 + 14;
    const maxY = Math.max(minY, bounds.bottom - halfHeight - 35);
    left.y = clamp(left.y, minY, maxY);
    right.y = clamp(right.y, minY, maxY);
    const control = { x: (left.x + right.x) / 2, y: Math.min(left.y, right.y) - rise };
    // Keep the full dashed route; the card only travels along its inner section.
    const inverse = matrix.inverse();
    const a = transformPoint(inverse, left), b = transformPoint(inverse, control), c = transformPoint(inverse, right);
    svg.querySelector('[data-card-route]')?.setAttribute('d', `M${a.x} ${a.y}Q${b.x} ${b.y} ${c.x} ${c.y}`);
    for (const [name, point] of [['left', a], ['right', c]]) {
      const marker = svg.querySelector(`[data-card-stop="${name}"]`);
      marker?.setAttribute('cx', point.x);
      marker?.setAttribute('cy', point.y);
    }
    const local = point => ({ x: point.x - bounds.left, y: point.y - bounds.top });
    const curve = { left: local(left), control: local(control), right: local(right) };
    const project = point => point.x * Math.cos(angle) + point.y * Math.sin(angle);
    const origin = project(curve.left), span = project(curve.right) - origin;
    // Leave each marker partly under the card's edge, instead of its centre.
    const inset = Math.min(width / 2 - 1, Math.max(0, span * .42));
    function progressAt(distance) {
      let low = 0, high = 1;
      for (let i = 0; i < 14; i++) {
        const middle = (low + high) / 2;
        if (project(pointAt(curve, middle)) - origin < distance) low = middle;
        else high = middle;
      }
      return (low + high) / 2;
    }
    return { card, width, height, ...curve, from: progressAt(inset), to: progressAt(span - inset),
      viewportWidth: document.documentElement.clientWidth, stageWidth: stage.clientWidth, stageHeight: bounds.height };
  }
  function pointAt(curve, progress) {
    const p = progress, q = 1 - p;
    return {
      x: q * q * curve.left.x + 2 * q * p * curve.control.x + p * p * curve.right.x,
      y: q * q * curve.left.y + 2 * q * p * curve.control.y + p * p * curve.right.y
    };
  }
  function draw(card) {
    if (geometry?.card !== card) geometry = measure(card);
    if (!geometry) return;
    const { x, y } = pointAt(geometry, geometry.from + position * (geometry.to - geometry.from));
    card.style.setProperty('--card-turn', `${position * 180}deg`);
    card.style.setProperty('--card-x', `${x - geometry.width / 2}px`);
    card.style.setProperty('--card-y', `${y - geometry.height / 2}px`);
  }
  function refresh() {
    const card = root.querySelector('[data-home-card]');
    if (!card) return;
    const back = stop === 1;
    draw(card);
    card.dataset.stop = back ? 'right' : 'left';
    card.dataset.side = back ? 'back' : 'front';
    card.setAttribute('aria-pressed', String(back));
    card.setAttribute('aria-label', `Karta odkrywcy: ${back ? 'Piramidy w Gizie przy prawym punkcie. Przesuń mysz w lewo' : 'Wieża Eiffla przy lewym punkcie. Przesuń mysz w prawo'}, aby przenieść kartę po łuku.`);
    for (const face of card.querySelectorAll('[data-card-face]'))
      face.setAttribute('aria-hidden', String(face.dataset.cardFace !== (back ? 'back' : 'front')));
  }
  function turn(direction) {
    const target = direction > 0 ? 1 : 0;
    if (target === stop) return;
    stop = target;
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      position = stop;
      refresh();
      return;
    }
    const start = position, startedAt = performance.now();
    const duration = 1350 * Math.max(.35, Math.abs(target - start));
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
  function startGesture(card, event) {
    gesture = { card, low: event.clientX, high: event.clientX, direction: 0,
      threshold: Math.max(24, card.getBoundingClientRect().width * .23) };
  }
  root.addEventListener('pointerover', event => {
    const card = findCard(event.target);
    if (!card || card.contains(event.relatedTarget) || event.pointerType === 'touch') return;
    startGesture(card, event);
    if (!event.buttons) suppressClick = false;
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
    if (card && !card.contains(event.relatedTarget)) gesture = null;
  });
  root.addEventListener('pointerdown', event => {
    const card = findCard(event.target);
    if (!card) return;
    suppressClick = false;
    if (event.pointerType !== 'touch') startGesture(card, event);
  });
  root.addEventListener('click', event => {
    if (!findCard(event.target)) return;
    if (suppressClick && event.detail !== 0) { suppressClick = false; return; }
    turn(stop === 0 ? 1 : -1);
  });
  root.addEventListener('keydown', event => {
    if (!findCard(event.target) || !['Enter', ' ', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    if (!event.repeat) turn(event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : stop === 0 ? 1 : -1);
  });
  addEventListener('resize', () => {
    geometry = null;
    const stage = root.querySelector('.hero-visual');
    if (stage) stage.style.minHeight = '';
    refresh();
  });
  return { refresh, setTab: tab => turn(tab === 'join' ? 1 : -1) };
}
