export function createCardIntroController({ onShow, onDismiss, onCancel,
  setTimer = setTimeout, clearTimer = clearTimeout,
  shouldShow = room => room.phase === 'playing' && room.question }) {
  let seen = null, active = null, timer = null;
  function cancel() {
    if (timer !== null) clearTimer(timer);
    timer = null;
    if (active !== null) { active = null; onCancel(); }
  }
  function dismiss(reason = 'click') {
    if (active === null) return;
    if (timer !== null) clearTimer(timer);
    timer = null;
    active = null;
    onDismiss(reason);
  }
  return {
    update(room) {
      if (!room || room.phase === 'lobby') { cancel(); seen = null; return; }
      if (!shouldShow(room)) { cancel(); return; }
      const key = `${room.code}:${room.round}:${room.question.title}`;
      if (key === seen) return;
      cancel();
      seen = active = key;
      onShow(room);
      timer = setTimer(() => { if (active === key) dismiss('timeout'); }, 5000);
    },
    dismiss,
    destroy() { cancel(); seen = null; }
  };
}

export function mountCardIntro({ renderCard, getTarget }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'card-intro';
  dialog.className = 'card-intro';
  dialog.setAttribute('aria-labelledby', 'card-intro-title');
  dialog.setAttribute('aria-describedby', 'card-intro-instruction');
  document.body.append(dialog);
  let flight = null, revision = 0, previousFocus = null;
  function clearView(restoreFocus = false) {
    revision++;
    flight?.cancel();
    flight = null;
    if (dialog.open) dialog.close();
    dialog.replaceChildren();
    dialog.classList.remove('is-docking');
    document.body.classList.remove('card-is-presenting', 'card-is-docking');
    if (restoreFocus) {
      const focusTarget = previousFocus?.isConnected ? previousFocus : getTarget();
      focusTarget?.focus({ preventScroll: true });
    }
  }
  const controller = createCardIntroController({
    onShow(room) {
      clearView();
      previousFocus = document.activeElement;
      document.querySelector('.game-page')?.scrollIntoView({ block: 'start', behavior: 'instant' });
      dialog.innerHTML = renderCard(room);
      document.body.classList.add('card-is-presenting');
      dialog.showModal();
    },
    async onDismiss() {
      const target = getTarget(), card = dialog.querySelector('.card-reveal-card');
      if (!target || !card || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        clearView(true);
        return;
      }
      const from = card.getBoundingClientRect(), to = target.getBoundingClientRect();
      if (!from.width || !to.width || to.bottom < 0 || to.top > innerHeight) {
        clearView(true);
        return;
      }
      const currentRevision = ++revision;
      dialog.classList.add('is-docking');
      document.body.classList.add('card-is-docking');
      const dx = to.left + to.width / 2 - from.left - from.width / 2;
      const dy = to.top + to.height / 2 - from.top - from.height / 2;
      flight = card.animate([
        { transform: 'translate(0,0) scale(1,1)', opacity: 1 },
        { transform: `translate(${dx}px,${dy}px) scale(${to.width / from.width},${to.height / from.height})`, opacity: 0 }
      ], { duration: 560, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' });
      try { await flight.finished; } catch { /* A newer card or room change cancels the flight. */ }
      if (revision === currentRevision) clearView(true);
    },
    onCancel() { clearView(); }
  });
  dialog.addEventListener('click', () => controller.dismiss());
  dialog.addEventListener('cancel', event => { event.preventDefault(); controller.dismiss('escape'); });
  return {
    update(room) {
      // A phase change can arrive while a dismissed card is still flying home.
      if (!room || room.phase !== 'playing') clearView();
      controller.update(room);
    }
  };
}
