import { REGIONS, NEIGHBORS, YEAR_SCALE, NUMBER_SCALE, CATEGORIES, usedCategories, fmt, intervalLabel } from './board.mjs';
import { icon, illustration } from './art.mjs';

const app = document.querySelector('#app');
const rules = document.querySelector('#rules');
const invite = new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '';
const saved = key => { try { return sessionStorage.getItem(key) ?? ''; } catch { return ''; } };
const state = { id: null, room: null, tab: invite ? 'join' : 'create', name: saved('hunch:name'), code: invite,
  rounds: 6, busy: false, connected: false, loaded: false, selection: null, offset: 0 };
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const mine = () => state.room?.players.find(p => p.id === state.id);
const myTurn = () => state.connected && !state.busy && state.room?.phase === 'playing' && state.room?.currentPlayerId === state.id;
const categoryUsed = axis => usedCategories(state.room, state.id).includes(axis);
const canSelectCategory = axis => myTurn() && !categoryUsed(axis);
const categoryLimit = axis => `<span class="category-limit ${categoryUsed(axis) ? 'used' : ''}">${categoryUsed(axis) ? icon('check') : ''}Twój typ: ${categoryUsed(axis) ? '1' : '0'}/1</span>`;
const isHost = () => state.room?.hostId === state.id;
let toastTimer;
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
}
async function mutate(path, body) {
  if (state.busy) return;
  state.busy = true;
  render();
  try {
    const value = await api(path, body);
    updateRoom(value.room);
    try { sessionStorage.setItem('hunch:name', state.name); } catch { /* Storage is optional. */ }
  } catch (error) { toast(error.message || 'Połączenie przerwane. Spróbuj ponownie.', true); }
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
  const selected = state.selection?.axis === 'map' ? state.selection.slot : null;
  return `<svg class="world-map ${preview ? 'preview' : ''}" viewBox="25 15 920 445" ${preview ? 'aria-hidden="true"' : 'role="group" aria-label="Mapa świata — wybierz region"'}>
    <defs><pattern id="map-grid" width="46" height="44" patternUnits="userSpaceOnUse"><path d="M46 0H0V44" fill="none" stroke="currentColor" stroke-opacity=".1" stroke-width=".6"/></pattern></defs>
    <rect x="25" y="15" width="920" height="445" fill="url(#map-grid)"/>
    <path d="M25 242.22H945" stroke="currentColor" stroke-opacity=".15" stroke-dasharray="4 6"/>
    <text x="43" y="236" class="map-coordinate">0°</text><text x="43" y="89" class="map-coordinate">60° N</text><text x="43" y="396" class="map-coordinate">60° S</text>
    ${REGIONS.map(r => {
      const placed = !preview && room?.placements.find(p => p.axis === 'map' && p.slot === r.id);
      const player = placed && room.players.find(p => p.id === placed.playerId);
      const correct = !preview && room?.answer?.region === r.id;
      return `<path d="${r.path}" fill-rule="evenodd" class="region ${selected === r.id ? 'selected' : ''} ${correct ? 'correct' : ''} ${placed ? 'occupied' : ''} ${preview ? '' : canSelectCategory('map') && !placed ? 'available' : ''}" ${preview ? '' : `data-region="${r.id}" tabindex="${canSelectCategory('map') && !placed ? 0 : -1}" role="button" aria-label="${esc(r.name)}${placed ? ` — zajęte: ${esc(player.name)}` : ''}${correct ? ' — poprawna odpowiedź' : ''}" aria-disabled="${!canSelectCategory('map') || Boolean(placed)}" aria-pressed="${selected === r.id}"`}><title>${esc(r.name)}${player ? ` — ${esc(player.name)}` : ''}</title></path>${player ? `<g class="map-token" style="--player:${player.color}" aria-hidden="true"><rect x="${r.x - 9}" y="${r.y - 9}" width="18" height="18" rx="4"/><text x="${r.x}" y="${r.y + 4}">${esc(player.name[0].toUpperCase())}</text></g>` : ''}`;
    }).join('')}
    <text x="144" y="27" class="ocean-name">ARKTYKA</text><text x="344" y="213" class="ocean-name ocean-vertical">ATLANTYK</text><text x="80" y="330" class="ocean-name">PACYFIK</text><text x="615" y="350" class="ocean-name">OCEAN INDYJSKI</text>
    <g transform="translate(903 417)" class="compass-rose"><path d="M0-21 5-5 21 0 5 5 0 21-5 5-21 0-5-5Z" fill="none" stroke="currentColor" stroke-width=".7"/><path d="M0-21 5-5 0 0Z" fill="currentColor"/><text y="-29" text-anchor="middle">N</text></g>
    ${preview ? '<path d="M273 132Q395 30 500 120T827 306" fill="none" stroke="#b65c3e" stroke-width="1.4" stroke-dasharray="5 7" opacity=".6"/><circle cx="500" cy="120" r="7" fill="#b65c3e" stroke="#f6f4ec" stroke-width="3"/><circle cx="273" cy="132" r="6" fill="#386d69" stroke="#f6f4ec" stroke-width="3"/><circle cx="827" cy="306" r="6" fill="#b18b2c" stroke="#f6f4ec" stroke-width="3"/>' : ''}
  </svg>`;
}
function home() {
  return `<main class="home"><section class="hero-copy"><div class="eyebrow"><span class="tiny-star">✳</span> Dla ciekawych świata</div><h1>Świat jest wielki.<br>Zaufaj <em>przeczuciu.</em></h1><p class="hero-description">Wiesz, gdzie? Pamiętasz, kiedy? Zgadniesz, ile?<br>Zbierz znajomych i sprawdźcie, dokąd zaprowadzi was intuicja.</p><div class="hero-badges"><span>${icon('users')} 2–6 odkrywców</span><span>${icon('time')} 15–25 minut</span><span>${icon('globe')} Bez konta</span></div>
    <div class="entry-card"><div class="tabs" role="tablist" aria-label="Wybierz sposób gry"><button class="tab ${state.tab === 'create' ? 'active' : ''}" role="tab" aria-selected="${state.tab === 'create'}" data-tab="create">Stwórz pokój</button><button class="tab ${state.tab === 'join' ? 'active' : ''}" role="tab" aria-selected="${state.tab === 'join'}" data-tab="join">Dołącz do znajomych</button></div>
    <form id="room-form"><label for="player-name">Twój pseudonim</label><input id="player-name" name="name" autocomplete="nickname" placeholder="Jak mamy cię nazywać?" required minlength="2" maxlength="20" value="${esc(state.name)}">
      ${state.tab === 'create' ? `<div class="round-choice"><label for="rounds">Długość wyprawy</label><select id="rounds" name="rounds"><option value="3" ${state.rounds === 3 ? 'selected' : ''}>3 rundy · szybki wypad</option><option value="6" ${state.rounds === 6 ? 'selected' : ''}>6 rund · mała wyprawa</option><option value="9" ${state.rounds === 9 ? 'selected' : ''}>9 rund · dookoła świata</option></select></div>` : `<label for="room-code">Kod pokoju</label><input id="room-code" name="code" class="code-input" placeholder="NP. K7X9PQ" minlength="6" maxlength="6" pattern="[a-zA-Z2-9]{6}" required autocapitalize="characters" spellcheck="false" value="${esc(state.code)}">`}
      <button class="button primary full" type="submit" ${state.busy || !state.loaded ? 'disabled' : ''}>${state.busy ? 'Chwileczkę…' : state.tab === 'create' ? 'Zaczynamy przygodę' : 'Dołącz do wyprawy'} ${icon('arrow')}</button></form>
      <button class="practice-link" data-action="practice" ${state.busy || !state.loaded ? 'disabled' : ''}>${icon('spark')} Najpierw spróbuj treningu z Atlasem ${icon('arrow')}</button>
    </div></section>
    <section class="hero-visual" aria-label="Odkrywaj świat na mapie"><div class="visual-note"><span class="mini-line"></span> WIELKI ŚWIAT, DOBRE TOWARZYSTWO</div><div class="hero-map">${worldMap(true)}</div><div class="sample-card"><span class="sample-stamp">KARTA ODKRYWCY <span>01 / 10</span></span>${illustration('eiffel')}<span class="eyebrow">Wielkie konstrukcje</span><h2>Wieża Eiffla</h2><div class="sample-questions"><span>${icon('pin')} Gdzie?</span><span>${icon('time')} Kiedy?</span><span>${icon('chart')} Jak wysoko?</span></div><div class="sample-bottom"><span class="sample-dots"><i></i><i></i><i></i></span>Nie musisz znać odpowiedzi.</div></div><div class="floating-note">${icon('spark')} Blisko też się liczy.<span>+3 pkt za dobry trop</span></div><span class="map-caption">CAŁY ŚWIAT JEST TWOJĄ PLANSZĄ ↗</span></section>
    <section class="how-strip"><div><span class="step-number">01</span><p><strong>Zbierz swoją ekipę</strong><span>Jeden kod. Wspólny stół.</span></p></div><div><span class="step-number">02</span><p><strong>Postaw na intuicję</strong><span>Mapa, daty i wielkie liczby.</span></p></div><div><span class="step-number">03</span><p><strong>Odkryj coś nowego</strong><span>Każda runda to małe „aha!”.</span></p></div></section>
  </main>`;
}
function playerList(final = false) {
  const room = state.room;
  const players = final ? [...room.players].sort((a, b) => b.score - a.score) : room.players;
  return `<ol class="player-list ${final ? 'final-players' : ''}">${players.map((p, i) => {
    const current = room.currentPlayerId === p.id;
    const result = room.result?.[p.id];
    return `<li class="player-row ${current ? 'current' : ''} ${p.left ? 'left' : ''}" style="--player:${p.color}">${final ? `<span class="rank">${players.filter(other => other.score > p.score).length + 1}</span>` : ''}<span class="avatar">${esc(p.name[0].toUpperCase())}<i class="presence ${p.connected && !p.left ? 'on' : ''}"></i></span><div class="player-info"><strong>${esc(p.name)}${p.id === state.id ? ' <span>(ty)</span>' : ''}</strong><span>${p.left ? 'Opuścił pokój' : p.bot ? 'Towarzysz treningu' : room.phase === 'lobby' ? (p.id === room.hostId ? 'Gospodarz wyprawy' : 'Gotowy na przygodę') : final ? `${room.history.length} rozegranych rund` : current ? 'Teraz obstawia' : p.passed || p.cubes === 0 || usedCategories(room, p.id).length === CATEGORIES.length ? 'Koniec ruchów' : `${p.cubes} znaczników`}</span></div><div class="player-score"><strong>${p.score}</strong><span>${['reveal', 'finished'].includes(room.phase) && result && !final ? `+${result.gained} w rundzie` : 'pkt'}</span></div></li>`;
  }).join('')}</ol>`;
}
function roomTop() {
  const room = state.room;
  return `<div class="room-top"><div><span class="eyebrow">${room.practice ? 'Spokojnie, to tylko trening' : 'Wspólny stół'}</span><h1>${room.practice ? 'Ty, Atlas i cały świat.' : room.phase === 'lobby' ? 'Przygoda zaczyna się tutaj.' : 'Kierunek: dobre przeczucie.'}</h1></div><div class="room-code-block"><span>${room.practice ? 'Tryb' : 'Kod pokoju'}</span>${room.practice ? '<strong>Trening</strong>' : `<button class="code-copy" data-action="copy-code" title="Kopiuj kod pokoju">${room.code} ${icon('copy')}</button>`}</div></div>`;
}
function lobby() {
  const room = state.room;
  const count = room.players.length;
  return `<main class="room-page">${roomTop()}<div class="lobby-layout"><section class="lobby-card paper"><div class="section-label">${icon('users')} Ekipa odkrywców <span>${count} / 6</span></div>${playerList()}${Array.from({ length: Math.max(0, 3 - count) }, () => '<div class="empty-seat"><span>+</span> Miejsce dla kolejnego przeczucia</div>').join('')}<div class="invite-panel"><span class="eyebrow">Dobre rzeczy warto dzielić</span><p>Wyślij znajomym zaproszenie.<br>Dołączą bez zakładania konta.</p><button class="button secondary full" data-action="invite">${icon('copy')} Kopiuj zaproszenie</button></div><div class="lobby-start"><span>${room.rounds} rund · 45 sekund na ruch</span>${isHost() ? `<button class="button primary full" data-action="start" ${count < 2 || state.busy || !state.connected ? 'disabled' : ''}>${count < 2 ? 'Czekamy na drugiego gracza' : 'Wyruszamy!'} ${icon('arrow')}</button>` : '<div class="waiting-text"><i class="status-dot on"></i> Gospodarz za chwilę rozpocznie grę</div>'}</div></section><section class="lobby-map"><div class="eyebrow">Zanim ruszycie w świat</div><h2>Wiedza pomaga.<br><em>Intuicja wygrywa.</em></h2>${worldMap(true)}<div class="score-explainer"><span><b>7</b>Trafienie w punkt</span><span><b>3</b>Bliski strzał</span><span><b>∞</b>Nowe odkrycia</span></div></section></div></main>`;
}
function scale(axis, title, label, unit, values) {
  const room = state.room;
  const answerSlot = room.answer?.[axis === 'year' ? 'yearSlot' : 'numberSlot'];
  return `<section class="scale-panel paper ${categoryUsed(axis) ? 'category-used' : ''}"><div class="scale-heading"><span class="section-label">${icon(axis === 'year' ? 'time' : 'chart')}${title} ${categoryLimit(axis)}</span><span>${esc(label)}${unit ? ` <b>(${esc(unit)})</b>` : ''}</span></div><div class="scale-track">${values.map((value, slot) => {
    const placed = room.placements.find(p => p.axis === axis && p.slot === slot);
    const player = placed && room.players.find(p => p.id === placed.playerId);
    const selected = state.selection?.axis === axis && state.selection.slot === slot;
    const range = `${intervalLabel(values, slot)}${unit ? ` ${esc(unit)}` : ''}`;
    return `<button class="scale-slot ${selected ? 'selected' : ''} ${answerSlot === slot ? 'correct' : ''} ${player ? 'occupied' : ''}" ${!canSelectCategory(axis) || placed ? 'disabled' : ''} data-axis="${axis}" data-slot="${slot}" aria-pressed="${selected}" aria-label="${range}${player ? ` — ${esc(player.name)}` : ''}" title="${range}" ${player ? `style="--player:${player.color}"` : ''}><span class="slot-marker">${player ? esc(player.name[0].toUpperCase()) : answerSlot === slot ? icon('check') : '+'}</span><span class="slot-label">${range}</span></button>`;
  }).join('')}</div><div class="scale-foot"><span>Górna granica otwiera kolejny przedział.</span>${room.answer ? `<strong>${axis === 'year' ? fmt(room.answer.year) : `${fmt(room.answer.number)} ${esc(unit)}`}</strong>` : '<span>7 pkt celnie · 3 pkt obok</span>'}</div></section>`;
}
function selectionLabel() {
  const s = state.selection;
  if (!s) return 'Wybierz region na mapie lub przedział na skali.';
  if (s.axis === 'map') return REGIONS.find(r => r.id === s.slot).name;
  return `${s.axis === 'year' ? 'Rok' : state.room.question.numberLabel}: ${intervalLabel(s.axis === 'year' ? YEAR_SCALE : NUMBER_SCALE, s.slot)}${s.axis === 'number' ? ` ${state.room.question.unit}` : ''}`;
}
function turnBar() {
  const room = state.room;
  const player = room.players.find(p => p.id === room.currentPlayerId);
  if (room.phase === 'reveal') return `<div class="turn-bar revealed"><span class="turn-icon">${icon('check')}</span><div><strong>Karty na stół!</strong><span>Odpowiedzi odkryte. Zobacz, dokąd zaprowadziła was intuicja.</span></div></div>`;
  return `<div class="turn-bar ${player?.id === state.id ? 'your-turn' : ''}"><span class="turn-avatar" style="--player:${player?.color}">${esc(player?.name[0].toUpperCase())}</span><div><strong>${player?.id === state.id ? 'Twoja kolej. Zaufaj intuicji.' : `${esc(player?.name)} szuka dobrego tropu…`}</strong><span>${player?.id === state.id ? 'Jeden znacznik, jedna decyzja. Mapa czy skala?' : 'Za chwilę kolejna decyzja. Rozejrzyj się po planszy.'}</span></div><span class="countdown" aria-label="Pozostały czas na ruch">45 s</span></div>`;
}
function questionCard() {
  const room = state.room, q = room.question;
  return `<section class="question-card paper"><div class="question-top"><span class="eyebrow">Karta odkrywcy</span><span>${String(room.round).padStart(2, '0')} / ${String(room.rounds).padStart(2, '0')}</span></div>${illustration(q.art)}<span class="eyebrow">${esc(q.category)}</span><h2>${esc(q.title)}</h2><p class="question-intro">${esc(q.intro)}</p><div class="question-details"><div>${icon('pin')}<span>${esc(q.location)}</span></div><div>${icon('time')}<span>${esc(q.yearLabel)}</span></div><div>${icon('chart')}<span>${esc(q.numberLabel)} <b>(${esc(q.unit)})</b></span></div></div>${room.answer ? `<div class="answer-box"><span class="eyebrow">Tak wygląda odpowiedź</span><strong>${esc(room.answer.place)}</strong><p>${fmt(room.answer.year)} <span>·</span> ${fmt(room.answer.number)} ${esc(q.unit)}</p><small>${esc(room.answer.fact)}</small><div class="source-links">${room.answer.sources.map((s, i) => `<a href="${esc(s)}" target="_blank" rel="noopener noreferrer">Źródło ${i + 1} ↗</a>`).join('')}</div></div>` : '<div class="question-hint">'+icon('spark')+'Niepewność to część przygody.</div>'}</section>`;
}
function game() {
  const room = state.room;
  const selectedRegion = state.selection?.axis === 'map' && REGIONS.find(r => r.id === state.selection.slot);
  const nextLabel = room.round === room.rounds ? 'Zobacz wyniki wyprawy' : 'Kolejne odkrycie';
  return `<main class="room-page game-page">${roomTop()}<div class="game-layout"><div class="board-column">${turnBar()}<section class="map-panel paper"><div class="map-heading"><div><span class="eyebrow">01 · Gdzie na świecie?</span><h2>Postaw na dobry kierunek.</h2></div>${categoryLimit('map')}</div>${worldMap()}<div class="map-bottom"><div class="map-legend"><span><i></i> ${room.answer ? 'Poprawny region zaznaczony na zielono' : 'Jeden znacznik na mapie w tej rundzie'}</span><span>Regiony umowne</span></div><label class="sr-only" for="region-picker">Wybierz region z listy</label><select id="region-picker" ${!canSelectCategory('map') ? 'disabled' : ''}><option value="">Wybierz region z listy…</option>${REGIONS.map(r => `<option value="${r.id}" ${selectedRegion?.id === r.id ? 'selected' : ''} ${room.placements.some(p => p.axis === 'map' && p.slot === r.id) ? 'disabled' : ''}>${esc(r.name)}</option>`).join('')}</select>${selectedRegion ? `<p class="neighbors">Sąsiedzi za 3 pkt: ${NEIGHBORS[selectedRegion.id].map(id => esc(REGIONS.find(r => r.id === id).name)).join(', ')}.</p>` : ''}</div></section>
      ${scale('year', '02 · Kiedy?', room.question.yearLabel, '', YEAR_SCALE)}${scale('number', '03 · Ile?', room.question.numberLabel, room.question.unit, NUMBER_SCALE)}
      ${room.phase === 'playing' ? `<div class="move-controls paper"><div><span class="eyebrow">${myTurn() ? 'Twój typ' : 'Wspólna plansza'}</span><strong>${myTurn() ? esc(selectionLabel()) : 'Obserwuj typy pozostałych graczy.'}</strong></div><div class="move-buttons"><button class="button quiet" data-action="pass" ${!myTurn() ? 'disabled' : ''}>Pasuję</button><button class="button primary" data-action="confirm" ${!myTurn() || !state.selection ? 'disabled' : ''}>Stawiam znacznik ${icon('arrow')}</button></div></div>` : `<div class="next-controls paper"><span>${isHost() ? 'Gotowi na kolejną podróż?' : 'Gospodarz za chwilę poprowadzi was dalej.'}</span><button class="button primary" data-action="next" ${!isHost() || state.busy || !state.connected ? 'disabled' : ''}>${nextLabel} ${icon('arrow')}</button></div>`}
    </div><aside class="game-sidebar">${questionCard()}<section class="roster paper"><div class="section-label">${icon('users')} Twoja ekipa <span>${room.players.filter(p => !p.left).length} graczy</span></div>${playerList()}<div class="cube-supply"><span>Twoje znaczniki</span><div>${Array.from({ length: 5 }, (_, i) => `<i class="cube ${i < (mine()?.cubes ?? 0) ? 'filled' : ''}" style="--player:${mine()?.color}"></i>`).join('')}</div></div></section>${room.phase === 'reveal' && room.result?.[state.id] ? `<div class="round-recap"><span class="eyebrow">Twój bilans rundy</span><strong>+${room.result[state.id].gained}<span>punktów</span></strong><p>${room.result[state.id].hits} celnych · ${room.result[state.id].close} bliskich · ${room.result[state.id].lost} nietrafionych</p></div>` : '<p class="sidebar-note">'+icon('compass')+'Za trafienie 7 pkt. Za dobry trop 3 pkt.<br>Każde przeczucie ma znaczenie.</p>'}</aside></div></main>`;
}
function finished() {
  const room = state.room;
  const highest = Math.max(...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === highest);
  return `<main class="results-page"><div class="result-emblem">${icon('trophy')}</div><span class="eyebrow">${room.round < room.rounds ? 'Wyprawa zakończona wcześniej' : 'Wyprawa zakończona'}</span><h1>${winners.length > 1 ? 'Wspólne zwycięstwo!' : `${esc(winners[0].name)} ma nosa!`}</h1><p>${room.practice ? 'Pierwsze przeczucia za tobą. Następna przygoda może być ze znajomymi.' : 'Dzięki za wspólną podróż. Świat ma jeszcze sporo niespodzianek.'}</p><div class="results-card paper">${playerList(true)}<div class="results-facts"><span><b>${room.history.length}</b>odkrytych miejsc</span><span><b>${room.players.reduce((sum, p) => sum + p.score, 0)}</b>wspólnych punktów</span><span><b>${highest}</b>zwycięski wynik</span></div></div><div class="results-actions"><button class="button secondary" data-action="leave">Wróć na początek</button><button class="button primary" data-action="restart" ${!isHost() || room.players.filter(p => !p.left).length < 2 || state.busy || !state.connected ? 'disabled' : ''}>Jeszcze jedna wyprawa ${icon('arrow')}</button></div>${!isHost() ? '<p class="small">Gospodarz może rozpocząć rewanż.</p>' : ''}<details class="history"><summary>Nasze odkrycia</summary>${room.history.map(h => `<div><span>${h.round}. ${esc(h.title)}</span><strong>+${h.scores[state.id]?.gained ?? 0} pkt</strong></div>`).join('')}</details></main>`;
}
function render() {
  const focused = document.activeElement;
  const selector = focused?.id ? `#${CSS.escape(focused.id)}` : focused?.dataset.region ? `[data-region="${focused.dataset.region}"]`
    : focused?.dataset.axis ? `[data-axis="${focused.dataset.axis}"][data-slot="${focused.dataset.slot}"]`
    : focused?.dataset.action ? `[data-action="${focused.dataset.action}"]` : focused?.dataset.tab ? `[data-tab="${focused.dataset.tab}"]` : null;
  app.innerHTML = `${header()}${!state.connected && state.loaded ? '<div class="connection-banner" role="status">Połączenie przerwane. Próbujemy wrócić do stołu; twoje miejsce czeka.</div>' : ''}${state.room ? state.room.phase === 'lobby' ? lobby() : state.room.phase === 'finished' ? finished() : game() : home()}${footer()}`;
  const replacement = selector && app.querySelector(selector);
  if (replacement && !replacement.disabled && replacement.getAttribute('aria-disabled') !== 'true') replacement.focus({ preventScroll: true });
  updateClock();
}
function updateClock() {
  const countdown = document.querySelector('.countdown');
  if (countdown && state.room?.deadline) {
    const seconds = Math.min(45, Math.max(0, Math.ceil((state.room.deadline - Date.now() - state.offset) / 1000)));
    countdown.textContent = `${seconds} s`;
    countdown.classList.toggle('urgent', seconds <= 10);
  }
}
function select(axis, slot) {
  if (!canSelectCategory(axis)) return;
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
      mutate('/api/rooms', { name, rounds: state.rounds, practice: true }); break;
    }
    case 'copy-code': copy(state.room.code, 'Kod pokoju skopiowany.'); break;
    case 'invite': copy(`${location.origin}${location.pathname}?room=${state.room.code}`, 'Zaproszenie skopiowane. Wyślij je znajomym!'); break;
    case 'confirm': if (state.selection) action('place', state.selection); break;
    case 'pass': action('pass'); break;
    case 'start': action('start'); break;
    case 'next': action('next'); break;
    case 'restart': action('restart'); break;
    case 'leave': action('leave'); break;
  }
});
document.addEventListener('keydown', event => {
  const region = event.target.closest('[data-region]');
  if (region && ['Enter', ' '].includes(event.key)) { event.preventDefault(); select('map', region.dataset.region); }
});
document.addEventListener('input', event => {
  if (event.target.id === 'player-name') state.name = event.target.value;
  if (event.target.id === 'room-code') state.code = event.target.value.toUpperCase();
});
document.addEventListener('change', event => {
  if (event.target.id === 'rounds') state.rounds = Number(event.target.value);
  if (event.target.id === 'region-picker' && event.target.value) select('map', event.target.value);
});
document.addEventListener('submit', event => {
  if (event.target.id !== 'room-form') return;
  event.preventDefault();
  mutate(state.tab === 'create' ? '/api/rooms' : '/api/rooms/join', { name: state.name, rounds: state.rounds, code: state.code });
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
