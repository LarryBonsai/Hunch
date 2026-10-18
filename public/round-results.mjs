import { createCardIntroController } from './card-intro.mjs';

export function createRoundResultsController(options) {
  return createCardIntroController({ ...options,
    autoDismissMs: null,
    shouldShow: room => room.mode === 'hidden' && room.phase === 'reveal' && room.result && room.question
  });
}

export function mountRoundResults({ renderResults, getTarget, getControls, onAdvance }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'round-results';
  dialog.className = 'card-intro round-results-intro';
  dialog.setAttribute('aria-labelledby', 'round-results-title');
  dialog.setAttribute('aria-describedby', 'round-results-instruction');
  document.body.append(dialog);
  let previousFocus = null, flight = null, revision = 0, advancing = false;
  function clearView(restoreFocus = false) {
    revision++;
    flight?.cancel(); flight = null; advancing = false;
    if (dialog.open) dialog.close();
    dialog.replaceChildren();
    if (restoreFocus) {
      const target = previousFocus?.isConnected && !previousFocus.disabled ? previousFocus : getTarget();
      target?.focus({ preventScroll: true });
    }
  }
  function refresh() {
    const button = dialog.querySelector('[data-results-next]');
    if (!button) return;
    const controls = getControls();
    button.disabled = advancing || !controls.enabled;
    button.querySelector('[data-results-next-label]').textContent = advancing ? 'Odkrywamy…' : controls.label;
    dialog.querySelector('#round-results-instruction').textContent = advancing ? 'Za chwilę kolejne odkrycie…' : controls.hint;
    const close = dialog.querySelector('[data-results-close]');
    if (close) close.disabled = advancing;
  }
  async function advance() {
    if (advancing || !getControls().enabled) return;
    advancing = true;
    refresh();
    const currentRevision = revision;
    const card = dialog.querySelector('.round-results-card');
    if (card && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      flight = card.animate([
        { opacity: 1, transform: 'translateX(0) scale(1)' },
        { opacity: 0, transform: 'translateX(-34px) scale(.97)' }
      ], { duration: 240, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
      try { await flight.finished; } catch { /* A newer room update cancels the transition. */ }
    }
    if (revision !== currentRevision) return;
    const succeeded = await onAdvance();
    if (!succeeded && revision === currentRevision) {
      flight?.cancel(); flight = null; advancing = false;
      refresh();
    }
  }
  const controller = createRoundResultsController({
    onShow(room) {
      clearView();
      previousFocus = document.activeElement;
      dialog.innerHTML = renderResults(room);
      refresh();
      dialog.showModal();
    },
    onDismiss() { clearView(true); },
    onCancel() { clearView(); }
  });
  dialog.addEventListener('click', event => {
    if (event.target.closest('[data-results-next]')) { advance(); return; }
    if (!advancing && (event.target === dialog || event.target.closest('[data-results-close]'))) controller.dismiss();
  });
  dialog.addEventListener('cancel', event => { event.preventDefault(); if (!advancing) controller.dismiss('escape'); });
  return { update(room) { controller.update(room); refresh(); }, refresh };
}
