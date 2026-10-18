import { createCardIntroController } from './card-intro.mjs';

export function createRoundResultsController(options) {
  return createCardIntroController({ ...options,
    shouldShow: room => room.mode === 'hidden' && room.phase === 'reveal' && room.result && room.question
  });
}

export function mountRoundResults({ renderResults, getTarget }) {
  const dialog = document.createElement('dialog');
  dialog.id = 'round-results';
  dialog.className = 'card-intro round-results-intro';
  dialog.setAttribute('aria-labelledby', 'round-results-title');
  dialog.setAttribute('aria-describedby', 'round-results-instruction');
  document.body.append(dialog);
  let previousFocus = null;
  function clearView(restoreFocus = false) {
    if (dialog.open) dialog.close();
    dialog.replaceChildren();
    if (restoreFocus) {
      const target = previousFocus?.isConnected && !previousFocus.disabled ? previousFocus : getTarget();
      target?.focus({ preventScroll: true });
    }
  }
  const controller = createRoundResultsController({
    onShow(room) {
      clearView();
      previousFocus = document.activeElement;
      dialog.innerHTML = renderResults(room);
      dialog.showModal();
    },
    onDismiss() { clearView(true); },
    onCancel() { clearView(); }
  });
  dialog.addEventListener('click', () => controller.dismiss());
  dialog.addEventListener('cancel', event => { event.preventDefault(); controller.dismiss('escape'); });
  return { update: room => controller.update(room) };
}
