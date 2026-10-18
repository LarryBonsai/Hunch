import { REGIONS, LAND_REGIONS, WATER_REGIONS, COASTLINE, OCEAN_BORDERS, NEIGHBORS, YEAR_SCALE, NUMBER_SCALE, CATEGORIES, usedCategories, fmt, intervalLabel } from './board.mjs';
import { icon, illustration } from './art.mjs';
import { mountCardIntro } from './card-intro.mjs';
import { mountRoundResults } from './round-results.mjs';
import { mountHeroCard } from './hero-card.mjs';

const app = document.querySelector('#app');
const rules = document.querySelector('#rules');
const invite = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
const saved = key => { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } };
const state = { id: null, room: null, tab: invite ? 'join' : 'create', name: saved('hunch:name'), code: invite,
  rounds: 6, mode: 'classic', busy: false, connected: false, loaded: false, selection: null, offset: 0 };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mine = () => state.room?.players.find(p => p.id === state.id);
const hiddenMode = () => state.room?.mode === 'hidden';
const myTurn = () => state.connected && !state.busy && state.room?.phase === 'playing' && (hiddenMode()
  ? !mine()?.ready && Date.now() + state.offset < state.room.deadline : state.room?.currentPlayerId === state.id);
const categoryUsed = axis => usedCategories(state.room, state.id).includes(axis);
const canSelectCategory = axis => myTurn() && (hiddenMode() || !categoryUsed(axis));
const ownPick = axis => state.room?.placements.find(p => p.playerId === state.id && p.axis === axis);
const selectedSlot = axis => hiddenMode() ? ownPick(axis)?.slot : state.selection?.axis === axis ? state.selection.slot : null;
const categoryLimit = axis => `<span class="category-limit ${categoryUsed(axis) ? 'used' : ''}">${categoryUsed(axis) ? icon('check') : ''}Twój typ: ${categoryUsed(axis) ? '1' : '0'}/1</span>`;
const isHost = () => state.room?.hostId === state.id;
let toastTimer;
const cardIntro = mountCardIntro({ renderCard: introCard, getTarget: () => document.querySelector('.game-sidebar .question-card') });
const roundResults = mountRoundResults({ renderResults: roundResultsCard,
  getTarget: () => document.querySelector('.next-controls button:not(:disabled)') ?? document.querySelector('.game-sidebar .question-card'),
  getControls: roundAdvanceState, onAdvance: () => action('next') });
const heroCard = mountHeroCard(app);
function toast(message, error = false) {
  const el = document.querySelector('#toast');
  el.textContent = message;
  el.className = `visible${error ? ' error' : ''}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 5000);
}
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error ?? 'Nie udało się połączyć z serwerem.');
  return value;
}
function updateRoom(room) {
  const previous = state.room;
  if (room && previous?.code === room.code && room.version < previous.version) return;
  if (previous?.turnId !== room?.turnId || previous?.code !== room?.code) state.selection = null;
  if (state.selection && room?.placements.some(p => p.axis === state.selection.axis && p.slot === state.selection.slot)) state.selection = null;
  state.room = room;
  if (room && !room.practice) history.replaceState(null, '', `?room=${room.code}`);
  if (!room && previous) history.replaceState(null, '', location.pathname);
  render();
  // Rejoining an active timed round should return straight to the answers.
  const answering = room?.mode === 'hidden' && room.phase === 'playing' && Date.now() + state.offset >= room.answerStartsAt;
  const nextCard = previous?.mode === 'hidden' && previous.phase === 'reveal' && previous.code === room?.code && room.phase === 'playing' && room.round > previous.round;
  cardIntro.update(answering ? null : nextCard ? { ...room, fromResults: true } : room);
  roundResults.update(room);
}
async function mutate(path, body) {
  if (state.busy) return false;
  state.busy = true;
  render();
  try {
    const value = await api(path, body);
    updateRoom(value.room);
    try { sessionStorage.setItem('hunch:name', state.name); } catch { /* Storage is optional. */ }
    return true;
  } catch (error) { toast(error.message || 'Połączenie przerwane. Spróbuj ponownie.', true); return false; }
  finally { state.busy = false; render(); }
}
const action = (name, extra = {}) => mutate('/api/room/action', { action: name, turnId: state.room?.turnId, ...extra });
function header() {
  return `<header class="site-header"><a class="brand" href="/" aria-label="Hunch — strona główna">${icon('globe')}hunch<span class="brand-dot">.</span></a><div class="nav-right"><span class="online"><i class="status-dot ${state.connected ? 'on' : ''}"></i><span>${state.connected ? 'Gotowi na odkrycia' : 'Łączymy z serwerem…'}</span></span><button class="button quiet" data-action="rules">Jak grać ${icon('compass')}</button>${state.room ? `<button class="icon-button leave-button" data-action="leave" aria-label="Opuść pokój" title="Opuść pokój">${icon('door')}</button>` : ''}</div></header>`;
}
function footer() {
  return '<footer class="site-footer"><span>hunch. <span class="muted">Małe przeczucia. Wielki świat.</span></span><span>Autorska gra inspirowana TERRA <span class="footer-star">✳</span></span></footer>';
}
function worldMap(preview = false) {
  const room = state.room;
  const selected = selectedSlot('map');
  return `<svg class="world-map ${preview ? 'preview' : ''}" viewBox="25 15 920 445" ${preview ? 'aria-hidden="true"' : 'role="group" aria-label="Mapa świata — wybierz region"'}>
    <defs><pattern id="map-grid" width="46" height="44" patternUnits="userSpaceOnUse"><path d="M46 0H0V44" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-width=".6"/></pattern></defs>
    <rect x="25" y="15" width="920" height="445" fill="url(#map-grid)"/>
    <path d="M25 242.22H945" stroke="currentColor" stroke-opacity=".15" stroke-dasharray="4 6"/>
    <text x="43" y="236" class="map-coordinate">0°</text><text x="43" y="89" class="map-coordinate">60° N</text><text x="43" y="396" class="map-coordinate">60° S</text>
    ${[...(preview ? [] : WATER_REGIONS), ...LAND_REGIONS].map(r => {
      const placements = preview ? [] : room?.placements.filter(p => p.axis === 'map' && p.slot === r.id) ?? [];
      const placed = placements[0];
      const player = placed && room.players.find(p => p.id === placed.playerId);
      const correct = !preview && room?.answer?.region === r.id;
      const available = !preview && canSelectCategory('map') && (hiddenMode() || !placed);
      const tokens = placements.map((p, i) => {
        const owner = room.players.find(player => player.id === p.playerId);
        const x = r.x + (i - (placements.length - 1) / 2) * 19;
        return `<g class="map-token" style="--player:${owner.color}" aria-hidden="true"><rect x="${x - 9}" y="${r.y - 9}" width="18" height="18" rx="4"/><text x="${x}" y="${r.y + 4}">${esc(owner.name[0].toUpperCase())}</text></g>`;
      }).join('');
      const names = placements.map(p => room.players.find(player => player.id === p.playerId).name).join(', ');
      return `<path d="${r.path}" fill-rule="evenodd" class="region ${r.kind === 'land' ? 'land' : 'water'} ${selected === r.id ? 'selected' : ''} ${correct ? 'correct' : ''} ${placed ? 'occupied' : ''} ${available ? 'available' : ''}" ${preview ? '' : `data-region="${r.id}" tabindex="${available ? 0 : -1}" role="button" aria-label="${esc(r.name)}${placed ? ` — ${hiddenMode() ? 'typy' : 'zajęte'}: ${esc(names)}` : ''}${correct ? ' — poprawna odpowiedź' : ''}" aria-disabled="${!available}" aria-pressed="${selected === r.id}"`}><title>${esc(r.name)}${player ? ` — ${esc(names)}` : ''}</title></path>${tokens}`;
    }).join('')}
    ${preview ? '' : `<path d="${OCEAN_BORDERS}" class="ocean-boundary" aria-hidden="true"/>`}
    <path d="${COASTLINE}" class="coastline" aria-hidden="true"/>
    ${preview ? '<text x="144" y="27" class="ocean-name">ARKTYKA</text><text x="344" y="213" class="ocean-name ocean-vertical">ATLANTYK</text><text x="80" y="330" class="ocean-name">PACYFIK</text><text x="615" y="350" class="ocean-name">OCEAN INDYJSKI</text>' : WATER_REGIONS.filter(r => r.kind === 'ocean').map(r => `<text x="${r.x}" y="${r.y + (r.id === 'ocean-arctic' ? 6 : -12)}" class="ocean-name water-label" text-anchor="middle">${esc(r.short)}</text>`).join('')}
    <g transform="translate(903 417)" class="compass-rose"><path d="M0-21 5-5 21 0 5 5 0 21-5 5-21 0-5-5Z" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M0-21 5-5 0 0Z" fill="currentColor"/><text y="-29" text-anchor="middle">N</text></g>
    ${preview ? '<path d="M273 132Q550 64 827 306" fill="none" stroke="#b65c3e" stroke-width="1.2" opacity=".4"/><circle cx="500" cy="129" r="7" fill="#b65c3e" stroke="#f6f4ec" stroke-width="3"/><circle cx="273" cy="132" r="6" fill="#386d69" stroke="#f6f4ec" stroke-width="3"/><circle cx="827" cy="306" r="6" fill="#b18b2c" stroke="#f6f4ec" stroke-width="3"/>' : ''}
  </svg>`;
}
function home() {
  return `<main class="home"><section class="hero-copy"><div class="eyebrow"><span class="tiny-star">✳</span> Dla ciekawych świata</div><h1>Świat jest wielki.<br>Zaufaj <em>przeczuciu.</em></h1><p class="hero-description">Wiesz, gdzie? Pamiętasz, kiedy? Zgadniesz, ile?<br>Zbierz znajomych i sprawdźcie, dokąd zaprowadzi was intuicja.</p><div class="hero-badges"><span>${icon('users')} 2–6 odkrywców</span><span>${icon('time')} 15–25 minut</span><span>${icon('globe')} Bez konta</span></div>
    <div class="entry-card"><div class="tabs" role="tablist" aria-label="Wybierz sposób gry"><button class="tab ${state.tab === 'create' ? 'active' : ''}" role="tab" aria-selected="${state.tab === 'create'}" data-tab="create">Stwórz pokój</button><button class="tab ${state.tab === 'join' ? 'active' : ''}" role="tab" aria-selected="${state.tab === 'join'}" data-tab="join">Dołącz do znajomych</button></div>
    <form id="room-form"><label for="player-name">Twój pseudonim</label><input id="player-name" name="name" autocomplete="nickname" placeholder="Jak mamy cię nazywać?" required minlength="2" maxlength="20" value="${esc(state.name)}">
      ${state.tab === 'create' ? setupPicker('rounds', 'Długość wyprawy', 'time', state.rounds, [
        { value: 3, title: '3 rundy', detail: 'Szybki wypad', badge: 'Na rozgrzewkę' },
        { value: 6, title: '6 rund', detail: 'Mała wyprawa', badge: 'W sam raz' },
        { value: 9, title: '9 rund', detail: 'Dookoła świata', badge: 'Dłuższa przygoda' }
      ]) : `<label for="room-code">Kod pokoju</label><input id="room-code" name="code" class="code-input" placeholder="NP. K7X9PQ" minlength="6" maxlength="6" pattern="[a-zA-Z2-9]{6}" required autocapitalize="characters" spellcheck="false" value="${esc(state.code)}">`}
      ${state.tab === 'create' ? setupPicker('mode', 'Tryb rozgrywki', 'compass', state.mode, [
        { value: 'classic', title: 'Klasyczny', detail: 'Ruchy na zmianę · 45 s na ruch', badge: 'Wspólna plansza' },
        { value: 'hidden', title: 'Ukryte odpowiedzi', detail: 'Wszyscy jednocześnie · do 30 s', badge: 'Tajne typy' }
      ]) : ''}
      <button class="button primary full" type="submit" ${state.busy || !state.loaded ? 'disabled' : ''}>${state.busy ? 'Chwileczkę…' : state.tab === 'create' ? 'Zaczynamy przygodę' : 'Dołącz do wyprawy'} ${icon('arrow')}</button></form>
      <button class="practice-link" data-action="practice" ${state.busy || !state.loaded ? 'disabled' : ''}>${icon('spark')} Najpierw spróbuj treningu z Atlasem ${icon('arrow')}</button>${state.tab === 'create' && state.mode === 'hidden' ? '<p class="practice-mode-note">Test nowego trybu: ukryte odpowiedzi z Atlasem.</p>' : ''}
    </div></section>
    <section class="hero-visual" aria-label="Odkrywaj świat na mapie"><div class="visual-note"><span class="mini-line"></span> WIELKI ŚWIAT, DOBRE TOWARZYSTWO</div><div class="hero-map">${worldMap(true)}</div>${homeDiscoveryCard()}<div class="floating-note">${icon('spark')} Blisko też się liczy.<span>+3 pkt za dobry trop</span></div><span class="map-caption">CAŁY ŚWIAT JEST TWOJĄ PLANSZĄ ↗</span></section>
    <section class="how-strip"><div><span class="step-number">01</span><p><strong>Zbierz swoją ekipę</strong><span>Jeden kod. Wspólny stół.</span></p></div><div><span class="step-number">02</span><p><strong>Postaw na intuicję</strong><span>Mapa, daty i wielkie liczby.</span></p></div><div><span class="step-number">03</span><p><strong>Odkryj coś nowego</strong><span>Każda runda to małe „aha!”.</span></p></div></section>
  </main>`;
}
function homeDiscoveryCard() {
  const faces = [
    { side: 'front', art: 'eiffel', index: '01', category: 'Wielkie konstrukcje', title: 'Wieża Eiffla', note: 'Nie musisz znać odpowiedzi.' },
    { side: 'back', art: 'pyramids', index: '02', category: 'Cuda dawnego świata', title: 'Piramidy w Gizie', note: 'Świat ma wiele do odkrycia.' }
  ];
  return `<div class="sample-flip" data-home-card data-side="front" role="button" tabindex="0" aria-pressed="false" aria-describedby="home-card-hint"><div class="sample-card-turner">${faces.map(face => `<div class="sample-card sample-card-${face.side}" data-card-face="${face.side}" aria-hidden="${face.side === 'back'}"><span class="sample-stamp">KARTA ODKRYWCY <span>${face.index} / 10</span></span>${illustration(face.art)}<span class="eyebrow">${face.category}</span><h2>${face.title}</h2><div class="sample-questions"><span>${icon('pin')} Gdzie?</span><span>${icon('time')} Kiedy?</span><span>${icon('chart')} Jak wysoko?</span></div><div class="sample-bottom"><span class="sample-dots"><i></i><i></i><i></i></span>${face.note}</div></div>`).join('')}</div><span class="home-card-hint" id="home-card-hint">Przesuń mysz w poprzek karty ↔</span></div>`;
}
function setupPicker(key, label, symbol, value, options) {
  const selected = options.find(option => option.value === value);
  return `<div class="setup-field"><span class="setup-label" id="${key}-label">${label}</span><details class="setup-picker" name="room-settings" id="setup-${key}"><summary id="${key}-control" aria-labelledby="${key}-label ${key}-value" aria-haspopup="listbox" aria-controls="${key}-options"><span class="setup-symbol">${icon(symbol)}</span><span class="setup-value" id="${key}-value"><strong>${selected.title}</strong><small>${selected.detail}</small></span><span class="setup-chevron" aria-hidden="true"></span></summary><div class="setup-options" id="${key}-options" role="listbox" aria-labelledby="${key}-label">${options.map(option => `<button type="button" role="option" aria-selected="${option.value === value}" tabindex="${option.value === value ? 0 : -1}" data-room-choice="${key}" data-value="${option.value}"><span class="setup-option-copy"><strong>${option.title}</strong><small>${option.detail}</small></span><span class="setup-option-badge">${option.badge}</span><span class="setup-option-check" aria-hidden="true">${option.value === value ? icon('check') : ''}</span></button>`).join('')}</div></details></div>`;
}
function playerList(final = false) {
  const room = state.room;
  const players = final ? [...room.players].sort((a, b) => b.score - a.score) : room.players;
  return `<ol class="player-list ${final ? 'final-players' : ''}">${players.map((p, i) => {
    const current = room.currentPlayerId === p.id;
    const result = room.result?.[p.id];
    const hiddenStatus = hiddenMode() && room.phase === 'playing' ? p.ready ? 'Zestaw zatwierdzony' : 'Odpowiada w tajemnicy' : null;
    return `<li class="player-row ${current ? 'current' : ''} ${p.left ? 'left' : ''}" style="--player:${p.color}">${final ? `<span class="rank">${players.filter(other => other.score > p.score).length + 1}</span>` : ''}<span class="avatar">${esc(p.name[0].toUpperCase())}<i class="presence ${p.connected && !p.left ? 'on' : ''}"></i></span><div class="player-info"><strong>${esc(p.name)}${p.id === state.id ? ' <span>(ty)</span>' : ''}</strong><span>${p.left ? 'Opuścił pokój' : hiddenStatus ?? (p.bot ? 'Towarzysz treningu' : room.phase === 'lobby' ? (p.id === room.hostId ? 'Gospodarz wyprawy' : 'Gotowy na przygodę') : final ? `${room.history.length} rozegranych rund` : current ? 'Teraz obstawia' : p.passed || p.cubes === 0 || usedCategories(room, p.id).length === CATEGORIES.length ? 'Koniec ruchów' : `${p.cubes} znaczników`)}</span></div><div class="player-score"><strong>${p.score}</strong><span>${['reveal', 'finished'].includes(room.phase) && result && !final ? `+${result.gained} w rundzie` : 'pkt'}</span></div></li>`;
  }).join('')}</ol>`;
}
function roomTop() {
  const room = state.room;
  return `<div class="room-top"><div><span class="eyebrow">${room.practice ? 'Spokojnie, to tylko trening' : 'Wspólny stół'}${hiddenMode() ? ' · Ukryte odpowiedzi · 30 s' : ''}</span><h1>${room.practice ? 'Ty, Atlas i cały świat.' : room.phase === 'lobby' ? 'Przygoda zaczyna się tutaj.' : 'Kierunek: dobre przeczucie.'}</h1></div><div class="room-code-block"><span>${room.practice ? 'Tryb' : 'Kod pokoju'}</span>${room.practice ? '<strong>Trening</strong>' : `<button class="code-copy" data-action="copy-code" title="Kopiuj kod pokoju">${room.code} ${icon('copy')}</button>`}</div></div>`;
}
function lobby() {
  const room = state.room;
  const count = room.players.length;
  return `<main class="room-page">${roomTop()}<div class="lobby-layout"><section class="lobby-card paper"><div class="section-label">${icon('users')} Ekipa odkrywców <span>${count} / 6</span></div>${playerList()}${Array.from({ length: Math.max(0, 3 - count) }, () => '<div class="empty-seat"><span>+</span> Miejsce dla kolejnego przeczucia</div>').join('')}<div class="invite-panel"><span class="eyebrow">Dobre rzeczy warto dzielić</span><p>Wyślij znajomym zaproszenie.<br>Dołączą bez zakładania konta.</p><button class="button secondary full" data-action="invite">${icon('copy')} Kopiuj zaproszenie</button></div><div class="lobby-start"><span>${room.rounds} rund · ${hiddenMode() ? 'ukryte odpowiedzi · 30 sekund na rundę' : '45 sekund na ruch'}</span>${isHost() ? `<button class="button primary full" data-action="start" ${count < 2 || state.busy || !state.connected ? 'disabled' : ''}>${count < 2 ? 'Czekamy na drugiego gracza' : 'Wyruszamy!'} ${icon('arrow')}</button>` : '<div class="waiting-text"><i class="status-dot on"></i> Gospodarz za chwilę rozpocznie grę</div>'}</div></section><section class="lobby-map"><div class="eyebrow">Zanim ruszycie w świat</div><h2>Wiedza pomaga.<br><em>Intuicja wygrywa.</em></h2>${worldMap(true)}<div class="score-explainer"><span><b>7</b>Trafienie w punkt</span><span><b>3</b>Bliski strzał</span><span><b>∞</b>Nowe odkrycia</span></div></section></div></main>`;
}
function scale(axis, title, label, unit, values) {
  const room = state.room;
  const answerSlot = room.answer?.[axis === 'year' ? 'yearSlot' : 'numberSlot'];
  const status = room.answer ? 'Odpowiedź odkryta' : hiddenMode() ? mine()?.ready ? 'Zestaw zatwierdzony' : categoryUsed(axis) ? 'Zapisano · możesz zmienić' : 'Wybierz swój tajny typ' : categoryUsed(axis) ? 'Twój typ zapisany'
    : state.selection?.axis === axis ? 'Gotowe do zatwierdzenia' : canSelectCategory(axis) ? 'Wybierz przedział' : 'Czekaj na swoją turę';
  return `<section class="scale-panel paper scale-${axis} ${categoryUsed(axis) ? 'category-used' : ''}"><div class="scale-heading"><div class="scale-title"><span class="section-label">${icon(axis === 'year' ? 'time' : 'chart')}${title}</span><span class="scale-question">${esc(label)}${unit ? ` <b>(${esc(unit)})</b>` : ''}</span></div><div class="scale-meta">${categoryLimit(axis)}<span class="scale-status" aria-live="polite">${status}</span></div></div><div class="scale-ruler" data-scale-scroll="${axis}"><div class="scale-track" role="group" aria-label="${esc(label)}">${values.map((value, slot) => {
    const placements = room.placements.filter(p => p.axis === axis && p.slot === slot);
    const placed = placements[0];
    const player = placed && room.players.find(p => p.id === placed.playerId);
    const selected = selectedSlot(axis) === slot;
    const correct = answerSlot === slot;
    const names = placements.map(p => room.players.find(player => player.id === p.playerId).name).join(', ');
    const markers = placements.map(p => {
      const owner = room.players.find(player => player.id === p.playerId);
      return `<i style="--player:${owner.color}">${esc(owner.name[0].toUpperCase())}</i>`;
    }).join('');
    const range = `${intervalLabel(values, slot)}${unit ? ` ${esc(unit)}` : ''}`;
    const bounds = `<span>${fmt(value)}</span>${slot === values.length - 1 ? '<span>+</span>' : `<span>–${fmt(values[slot + 1])}</span>`}`;
    return `<button class="scale-slot ${selected ? 'selected' : ''} ${correct ? 'correct' : ''} ${player ? 'occupied' : ''}" ${!canSelectCategory(axis) || (!hiddenMode() && placed) ? 'disabled' : ''} data-axis="${axis}" data-slot="${slot}" aria-pressed="${selected}" aria-label="${range}${player ? ` — ${esc(names)}` : ''}${correct ? ' — poprawna odpowiedź' : ''}" title="${range}${player ? ` — ${esc(names)}` : ''}" ${player ? `style="--player:${player.color}"` : ''}><span class="slot-marker ${placements.length > 1 ? 'multiple-markers' : ''}" aria-hidden="true">${player ? markers : correct || selected ? icon('check') : ''}</span><span class="slot-copy"><span class="slot-label">${bounds}</span><span class="slot-unit">${unit ? esc(unit) : 'r.'}</span></span></button>`;
  }).join('')}</div></div><div class="scale-foot"><span>Górna granica otwiera kolejny przedział.</span><span class="scale-scroll-hint">Przesuń skalę ↔</span>${room.answer ? `<strong>${axis === 'year' ? fmt(room.answer.year) : `${fmt(room.answer.number)} ${esc(unit)}`}</strong>` : '<span>7 pkt celnie · 3 pkt obok</span>'}</div></section>`;
}
function selectionLabel() {
  const s = state.selection;
  if (!s) return 'Wybierz region na mapie lub przedział na skali.';
  if (s.axis === 'map') return REGIONS.find(r => r.id === s.slot).name;
  return `${s.axis === 'year' ? 'Rok' : state.room.question.numberLabel}: ${intervalLabel(s.axis === 'year' ? YEAR_SCALE : NUMBER_SCALE, s.slot)}${s.axis === 'number' ? ` ${state.room.question.unit}` : ''}`;
}
function pickLabel(axis, slot) {
  if (axis === 'map') return REGIONS.find(r => r.id === slot)?.name ?? '—';
  return `${intervalLabel(axis === 'year' ? YEAR_SCALE : NUMBER_SCALE, slot)}${axis === 'number' ? ` ${state.room.question.unit}` : ''}`;
}
function turnBar() {
  const room = state.room;
  const player = room.players.find(p => p.id === room.currentPlayerId);
  if (room.phase === 'reveal') return `<div class="turn-bar revealed"><span class="turn-icon">${icon('check')}</span><div><strong>Karty na stół!</strong><span>Odpowiedzi odkryte. Zobacz, dokąd zaprowadziła was intuicja.</span></div></div>`;
  if (hiddenMode()) return `<div class="turn-bar your-turn hidden-turn"><span class="turn-icon">${icon(mine()?.ready ? 'check' : 'time')}</span><div><strong>${mine()?.ready ? 'Odpowiedzi zamknięte. Czekamy na odkrycie.' : 'Trzy odpowiedzi. Tylko dla twoich oczu.'}</strong><span>Do 30 s na typy. Wszyscy gotowi? Od razu odkrywamy wyniki.</span></div><span class="countdown" aria-label="Pozostały czas rundy">30 s</span></div>`;
  return `<div class="turn-bar ${player?.id === state.id ? 'your-turn' : ''}"><span class="turn-avatar" style="--player:${player?.color}">${esc(player?.name[0].toUpperCase())}</span><div><strong>${player?.id === state.id ? 'Twoja kolej. Zaufaj intuicji.' : `${esc(player?.name)} szuka dobrego tropu…`}</strong><span>${player?.id === state.id ? 'Jeden znacznik, jedna decyzja. Mapa czy skala?' : 'Za chwilę kolejna decyzja. Rozejrzyj się po planszy.'}</span></div><span class="countdown" aria-label="Pozostały czas na ruch">45 s</span></div>`;
}
function questionCard() {
  const room = state.room, q = room.question;
  return `<section class="question-card paper" tabindex="-1" aria-label="Aktualna karta odkrywcy"><div class="question-top"><span class="eyebrow">Karta odkrywcy</span><span>${String(room.round).padStart(2, '0')} / ${String(room.rounds).padStart(2, '0')}</span></div>${illustration(q.art)}<span class="eyebrow">${esc(q.category)}</span><h2>${esc(q.title)}</h2><p class="question-intro">${esc(q.intro)}</p><div class="question-details"><div>${icon('pin')}<span>${esc(q.location)}</span></div><div>${icon('time')}<span>${esc(q.yearLabel)}</span></div><div>${icon('chart')}<span>${esc(q.numberLabel)} <b>(${esc(q.unit)})</b></span></div></div>${room.answer ? `<div class="answer-box"><span class="eyebrow">Tak wygląda odpowiedź</span><strong>${esc(room.answer.place)}</strong><p>${fmt(room.answer.year)} <span>·</span> ${fmt(room.answer.number)} ${esc(q.unit)}</p><small>${esc(room.answer.fact)}</small><div class="source-links">${room.answer.sources.map((s, i) => `<a href="${esc(s)}" target="_blank" rel="noopener noreferrer">Źródło ${i + 1} ↗</a>`).join('')}</div></div>` : '<div class="question-hint">'+icon('spark')+'Niepewność to część przygody.</div>'}</section>`;
}
function introCard(room) {
  const q = room.question;
  return `<section class="card-reveal-card ${room.fromResults ? 'from-results' : ''}"><div class="question-top"><span class="eyebrow">Nowe odkrycie</span><span>${String(room.round).padStart(2, '0')} / ${String(room.rounds).padStart(2, '0')}</span></div><div class="card-reveal-art">${illustration(q.art)}</div><span class="eyebrow">${esc(q.category)}</span><h2 id="card-intro-title">${esc(q.title)}</h2><p class="card-reveal-story">${esc(q.intro)}</p><button type="button" class="button primary card-reveal-continue" autofocus>Przejdź do planszy ${icon('arrow')}</button><p id="card-intro-instruction">Kliknij kartę lub poczekaj 5 sekund.</p><span class="card-reveal-progress" aria-hidden="true"></span></section>`;
}
function roundAdvanceState() {
  const room = state.room;
  const host = isHost(), last = room?.round === room?.rounds;
  return {
    enabled: host && state.connected && !state.busy && room?.phase === 'reveal',
    label: !host ? 'Czekamy na gospodarza' : !state.connected ? 'Łączymy z pokojem…' : state.busy ? 'Chwileczkę…' : last ? 'Zobacz wyniki wyprawy' : 'Następna karta',
    hint: !host ? 'Gospodarz za chwilę poprowadzi was dalej.' : last ? 'Ostatnie odkrycie za wami. Czas poznać zwycięzcę.' : 'Gotowi na kolejne odkrycie?'
  };
}
function roundResultsCard(room) {
  const players = [...room.players].sort((a, b) => b.score - a.score);
  const controls = roundAdvanceState();
  return `<section class="card-reveal-card round-results-card"><div class="question-top"><span class="eyebrow">Karty na stół!</span><span>Runda ${room.round} / ${room.rounds}</span><button type="button" class="results-close" data-results-close aria-label="Zamknij wyniki i zobacz planszę" title="Zobacz planszę">×</button></div><div class="results-round-emblem">${icon('trophy')}</div><h2 id="round-results-title">Wyniki rundy</h2><p class="results-round-place">${esc(room.question.title)}</p><div class="results-score-labels"><span>Odkrywca</span><span>W rundzie</span><span>Łącznie</span></div><ol class="round-ranking">${players.map(p => `<li style="--player:${p.color}"><span class="round-ranking-position">${players.filter(other => other.score > p.score).length + 1}</span><span class="avatar">${esc(p.name[0].toUpperCase())}</span><strong class="round-ranking-name">${esc(p.name)}${p.id === state.id ? '<small>To ty</small>' : ''}</strong><span class="round-ranking-gain">+${room.result[p.id]?.gained ?? 0}</span><span class="round-ranking-total"><b>${p.score}</b><small>pkt</small></span></li>`).join('')}</ol><button type="button" class="button primary card-reveal-continue results-next" data-results-next ${controls.enabled ? '' : 'disabled'} autofocus><span data-results-next-label>${controls.label}</span>${icon('arrow')}</button><p id="round-results-instruction">${controls.hint}</p></section>`;
}
function regionOptions(selectedRegion) {
  return [['Lądy', LAND_REGIONS], ['Oceany', WATER_REGIONS]].map(([label, regions]) =>
    `<optgroup label="${label}">${regions.map(r => `<option value="${r.id}" ${selectedRegion?.id === r.id ? 'selected' : ''} ${!hiddenMode() && state.room.placements.some(p => p.axis === 'map' && p.slot === r.id) ? 'disabled' : ''}>${esc(r.name)}</option>`).join('')}</optgroup>`).join('');
}
function moveControls() {
  const room = state.room;
  if (room.phase !== 'playing') {
    const nextLabel = room.round === room.rounds ? 'Zobacz wyniki wyprawy' : 'Kolejne odkrycie';
    return `<section class="next-controls" aria-label="Następna runda"><span>${isHost() ? 'Gotowi na kolejną podróż?' : 'Gospodarz za chwilę poprowadzi was dalej.'}</span><button class="button primary full" data-action="next" ${!isHost() || state.busy || !state.connected ? 'disabled' : ''}>${nextLabel} ${icon('arrow')}</button></section>`;
  }
  if (hiddenMode()) {
    const count = usedCategories(room, state.id).length;
    return `<section class="move-controls hidden-controls" aria-label="Twoje tajne odpowiedzi"><div class="hidden-controls-heading"><span class="eyebrow">Twój tajny zestaw</span><span>${count}/3</span></div><ul class="private-picks">${CATEGORIES.map(axis => `<li class="${ownPick(axis) ? 'picked' : ''}"><span>${axis === 'map' ? 'Region' : axis === 'year' ? 'Rok' : 'Wielkość'}</span><strong>${ownPick(axis) ? esc(pickLabel(axis, ownPick(axis).slot)) : 'Wybierz na planszy'}</strong></li>`).join('')}</ul><div class="move-buttons"><button class="button primary full" data-action="submit-answers" ${!myTurn() || count !== 3 ? 'disabled' : ''}>${mine()?.ready ? 'Zestaw zatwierdzony' : 'Zatwierdź 3 odpowiedzi'} ${icon('check')}</button></div><p class="private-hint">${mine()?.ready ? 'Czekamy na pozostałych. Gdy wszyscy zatwierdzą, odkrywamy typy.' : 'Wybory zapisują się od razu. Możesz je zmieniać do zatwierdzenia lub końca czasu. Brak odpowiedzi: 0 pkt.'}</p></section>`;
  }
  return `<section class="move-controls" aria-label="Twój ruch"><div class="move-selection"><span class="eyebrow">${myTurn() ? 'Twój wybór' : 'Wspólna plansza'}</span><strong aria-live="polite">${myTurn() ? esc(selectionLabel()) : 'Obserwuj typy pozostałych graczy.'}</strong></div><div class="move-buttons"><button class="button primary full" data-action="confirm" ${!myTurn() || !state.selection ? 'disabled' : ''}>Zatwierdź wybór ${icon('arrow')}</button><button class="button quiet full" data-action="pass" ${!myTurn() ? 'disabled' : ''}>Pasuję</button></div></section>`;
}
function hiddenResults() {
  const room = state.room;
  if (!hiddenMode() || !room.answer) return '';
  return `<section class="hidden-results paper"><div class="section-label">${icon('check')} Odkryte odpowiedzi <span>Wyniki rundy ${room.round}</span></div><div class="answers-scroll"><table><caption class="sr-only">Odpowiedzi i punkty wszystkich graczy w tej rundzie</caption><thead><tr><th scope="col">Gracz</th><th scope="col">Region</th><th scope="col">Rok</th><th scope="col">Wielkość</th><th scope="col">Punkty</th></tr></thead><tbody>${room.players.map(player => `<tr><th scope="row"><span class="result-player" style="--player:${player.color}">${esc(player.name)}</span></th>${CATEGORIES.map(axis => {
    const pick = room.placements.find(p => p.playerId === player.id && p.axis === axis);
    return `<td>${pick ? `${esc(pickLabel(axis, pick.slot))}<small class="points-${pick.points}">+${pick.points} pkt</small>` : '<span class="missing-answer">Brak typu<small>0 pkt</small></span>'}</td>`;
  }).join('')}<td class="round-total">+${room.result?.[player.id]?.gained ?? 0}</td></tr>`).join('')}</tbody></table></div></section>`;
}
function game() {
  const room = state.room;
  const selectedRegion = REGIONS.find(r => r.id === selectedSlot('map'));
  return `<main class="room-page game-page">${roomTop()}<div class="game-layout"><div class="board-column">${turnBar()}<section class="map-panel paper"><div class="map-heading"><div><span class="eyebrow">01 · Gdzie na świecie?</span><h2>Postaw na dobry kierunek.</h2></div>${categoryLimit('map')}</div>${worldMap()}<div class="map-bottom"><div class="map-legend"><span><i></i> ${room.answer ? 'Poprawny region zaznaczony na zielono' : 'Jeden znacznik na mapie w tej rundzie'}</span><span>17 lądów · 7 obszarów oceanicznych</span></div><label class="sr-only" for="region-picker">Wybierz region z listy</label><select id="region-picker" ${!canSelectCategory('map') ? 'disabled' : ''}><option value="">Wybierz ląd lub akwen…</option>${regionOptions(selectedRegion)}</select>${selectedRegion ? `<p class="neighbors">Sąsiedzi za 3 pkt: ${NEIGHBORS[selectedRegion.id].map(id => esc(REGIONS.find(r => r.id === id).name)).join(', ')}.</p>` : ''}</div></section>
      ${scale('year', '02 · Kiedy?', room.question.yearLabel, '', YEAR_SCALE)}${scale('number', '03 · Ile?', room.question.numberLabel, room.question.unit, NUMBER_SCALE)}${hiddenResults()}
    </div><aside class="game-sidebar">${questionCard()}<section class="roster paper"><div class="section-label">${icon('users')} Twoja ekipa <span>${room.players.filter(p => !p.left).length} graczy</span></div>${playerList()}<div class="cube-supply"><span>Twoje znaczniki</span><div>${Array.from({ length: 5 }, (_, i) => `<i class="cube ${i < (mine()?.cubes ?? 0) ? 'filled' : ''}" style="--player:${mine()?.color}"></i>`).join('')}</div></div>${moveControls()}</section>${room.phase === 'reveal' && room.result?.[state.id] ? `<div class="round-recap"><span class="eyebrow">Twój bilans rundy</span><strong>+${room.result[state.id].gained}<span>punktów</span></strong><p>${room.result[state.id].hits} celnych · ${room.result[state.id].close} bliskich · ${room.result[state.id].lost} nietrafionych</p></div>` : '<p class="sidebar-note">'+icon('compass')+'Za trafienie 7 pkt. Za dobry trop 3 pkt.<br>Każde przeczucie ma znaczenie.</p>'}</aside></div></main>`;
}
function finished() {
  const room = state.room;
  const highest = Math.max(...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === highest);
  return `<main class="results-page"><div class="result-emblem">${icon('trophy')}</div><span class="eyebrow">${room.round < room.rounds ? 'Wyprawa zakończona wcześniej' : 'Wyprawa zakończona'}</span><h1>${winners.length > 1 ? 'Wspólne zwycięstwo!' : `${esc(winners[0].name)} ma nosa!`}</h1><p>${room.practice ? 'Pierwsze przeczucia za tobą. Następna przygoda może być ze znajomymi.' : 'Dzięki za wspólną podróż. Świat ma jeszcze sporo niespodzianek.'}</p><div class="results-card paper">${playerList(true)}<div class="results-facts"><span><b>${room.history.length}</b>odkrytych miejsc</span><span><b>${room.players.reduce((sum, p) => sum + p.score, 0)}</b>wspólnych punktów</span><span><b>${highest}</b>zwycięski wynik</span></div></div><div class="results-actions"><button class="button secondary" data-action="leave">Wróć na początek</button><button class="button primary" data-action="restart" ${!isHost() || room.players.filter(p => !p.left).length < 2 || state.busy || !state.connected ? 'disabled' : ''}>Jeszcze jedna wyprawa ${icon('arrow')}</button></div>${!isHost() ? '<p class="small">Gospodarz może rozpocząć rewanż.</p>' : ''}<details class="history"><summary>Nasze odkrycia</summary>${room.history.map(h => `<div><span>${h.round}. ${esc(h.title)}</span><strong>+${h.scores[state.id]?.gained ?? 0} pkt</strong></div>`).join('')}</details></main>`;
}
function render() {
  const scaleScroll = Object.fromEntries([...app.querySelectorAll('[data-scale-scroll]')].map(el => [el.dataset.scaleScroll, el.scrollLeft]));
  const focused = document.activeElement;
  const selector = focused?.id ? `#${CSS.escape(focused.id)}` : focused?.dataset.region ? `[data-region="${focused.dataset.region}"]`
    : focused?.dataset.axis ? `[data-axis="${focused.dataset.axis}"][data-slot="${focused.dataset.slot}"]`
    : focused?.dataset.action ? `[data-action="${focused.dataset.action}"]` : focused?.dataset.tab ? `[data-tab="${focused.dataset.tab}"]`
    : focused?.dataset.roomChoice ? `#${focused.dataset.roomChoice}-control` : null;
  app.innerHTML = `${header()}${!state.connected && state.loaded ? '<div class="connection-banner" role="status">Połączenie przerwane. Próbujemy wrócić do stołu; twoje miejsce czeka.</div>' : ''}${state.room ? state.room.phase === 'lobby' ? lobby() : state.room.phase === 'finished' ? finished() : game() : home()}${footer()}`;
  for (const el of app.querySelectorAll('[data-scale-scroll]')) el.scrollLeft = scaleScroll[el.dataset.scaleScroll] ?? 0;
  const replacement = selector && app.querySelector(selector);
  if (replacement && !replacement.disabled && replacement.getAttribute('aria-disabled') !== 'true') replacement.focus({ preventScroll: true });
  updateClock();
  roundResults.refresh();
  heroCard.refresh();
}
function updateClock() {
  const countdown = document.querySelector('.countdown');
  if (countdown && state.room?.deadline) {
    const now = Date.now() + state.offset;
    const preview = hiddenMode() && now < state.room.answerStartsAt;
    const seconds = Math.min(hiddenMode() ? 30 : 45, Math.max(0, Math.ceil(((preview ? state.room.answerStartsAt : state.room.deadline) - now) / 1000)));
    countdown.textContent = preview ? `Start za ${seconds} s` : `${seconds} s`;
    countdown.classList.toggle('urgent', !preview && seconds <= 10);
  }
}
function select(axis, slot) {
  if (!canSelectCategory(axis)) return;
  if (hiddenMode()) { action('place', { axis, slot }); return; }
  if (state.room.placements.some(p => p.axis === axis && p.slot === slot)) return;
  state.selection = { axis, slot };
  render();
}
async function copy(text, message) {
  try {
    if (!navigator.clipboard) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(text);
    toast(message);
  } catch { toast(`Skopiuj ręcznie: ${text}`); }
}
document.addEventListener('click', event => {
  const picker = event.target.closest('.setup-picker');
  for (const other of document.querySelectorAll('.setup-picker[open]')) if (other !== picker) other.open = false;
  const choice = event.target.closest('[data-room-choice]');
  if (choice) {
    if (choice.dataset.roomChoice === 'rounds' && [3, 6, 9].includes(Number(choice.dataset.value))) state.rounds = Number(choice.dataset.value);
    if (choice.dataset.roomChoice === 'mode' && ['classic', 'hidden'].includes(choice.dataset.value)) state.mode = choice.dataset.value;
    render(); return;
  }
  if (event.target.closest('[data-close-rules]')) { rules.close(); return; }
  const tab = event.target.closest('[data-tab]');
  if (tab) { state.tab = tab.dataset.tab; render(); return; }
  const region = event.target.closest('[data-region]');
  if (region) { select('map', region.dataset.region); return; }
  const slot = event.target.closest('[data-axis]');
  if (slot) { select(slot.dataset.axis, Number(slot.dataset.slot)); return; }
  const button = event.target.closest('[data-action]');
  if (!button || button.disabled) return;
  switch (button.dataset.action) {
    case 'rules': rules.showModal(); break;
    case 'practice': {
      const name = state.name.trim() || 'Odkrywca';
      if (name.length < 2) { toast('Podaj pseudonim o długości 2–20 znaków.', true); return; }
      mutate('/api/rooms', { name, rounds: state.rounds, practice: true, mode: state.tab === 'create' ? state.mode : 'classic' }); break;
    }
    case 'copy-code': copy(state.room.code, 'Kod pokoju skopiowany.'); break;
    case 'invite': copy(`${location.origin}${location.pathname}?room=${state.room.code}`, 'Zaproszenie skopiowane. Wyślij je znajomym!'); break;
    case 'confirm': if (state.selection) action('place', state.selection); break;
    case 'submit-answers': action('submit'); break;
    case 'pass': action('pass'); break;
    case 'start': action('start'); break;
    case 'next': action('next'); break;
    case 'restart': action('restart'); break;
    case 'leave': action('leave'); break;
  }
});
document.addEventListener('keydown', event => {
  const picker = event.target.closest('.setup-picker');
  if (picker) {
    const summary = picker.querySelector('summary');
    const options = [...picker.querySelectorAll('[role="option"]')];
    const index = options.indexOf(event.target.closest('[role="option"]'));
    if (event.key === 'Escape') { event.preventDefault(); picker.open = false; summary.focus(); return; }
    if (event.key === 'Tab') { picker.open = false; summary.focus(); return; }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault(); picker.open = true;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1
        : index < 0 ? Math.max(0, options.findIndex(option => option.getAttribute('aria-selected') === 'true'))
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      for (const option of options) option.tabIndex = -1;
      options[next].tabIndex = 0; options[next].focus(); return;
    }
  }
  const region = event.target.closest('[data-region]');
  if (region && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select('map', region.dataset.region); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'player-name') state.name = event.target.value;
  if (event.target.id === 'room-code') state.code = event.target.value.toUpperCase();
});
document.addEventListener('toggle', event => {
  const picker = event.target;
  if (!picker.matches('.setup-picker') || !picker.open) return;
  picker.classList.remove('opens-up');
  const bounds = picker.getBoundingClientRect();
  const needed = picker.querySelector('.setup-options').scrollHeight + 12;
  const below = innerHeight - bounds.bottom;
  picker.classList.toggle('opens-up', below < needed && bounds.top > below);
}, true);
document.addEventListener('change', event => {
  if (event.target.id === 'region-picker' && event.target.value) select('map', event.target.value);
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'room-form') return;
  event.preventDefault();
  mutate(state.tab === 'create' ? '/api/rooms' : '/api/rooms/join', { name: state.name, rounds: state.rounds, code: state.code, ...(state.tab === 'create' ? { mode: state.mode } : {}) });
});
rules.addEventListener('click', event => { if (event.target === rules) { const r = rules.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) rules.close(); } });

async function boot() {
  render();
  try {
    const session = await api('/api/session');
    state.id = session.playerId;
    state.offset = session.serverTime - Date.now();
    state.loaded = true;
    updateRoom(session.room);
    const events = new EventSource('/api/events');
    events.onopen = () => { state.connected = true; render(); };
    events.onmessage = event => { try { updateRoom(JSON.parse(event.data).room); } catch { toast('Nie udało się odświeżyć planszy.', true); } };
    events.onerror = () => { state.connected = false; render(); };
  } catch {
    app.innerHTML = `${header()}<main class="offline-message"><h1>Mapa chwilowo poza zasięgiem.</h1><p>Sprawdź połączenie i odśwież stronę.</p><a class="button primary" href="/">Spróbuj ponownie ${icon('arrow')}</a></main>`;
  }
}
setInterval(updateClock, 250);
boot();
