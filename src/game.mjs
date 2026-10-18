import { randomInt } from 'node:crypto';
import { QUESTIONS } from './questions.mjs';
import { REGIONS, NEIGHBORS, YEAR_SCALE, NUMBER_SCALE, COLORS, CATEGORIES, usedCategories, bucket } from '../public/board.mjs';

export const TURN_MS = 45_000;
export const HIDDEN_ROUND_MS = 30_000;
export const CARD_PREVIEW_MS = 5_000;
export class GameError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
const requireThat = (condition, message, status) => { if (!condition) throw new GameError(message, status); };
export function cleanName(value) {
  requireThat(typeof value === 'string', 'Podaj swój pseudonim.');
  const name = value.normalize('NFC').trim().replace(/\s+/g, ' ');
  requireThat(name.length >= 2 && name.length <= 20 && !/[<>\p{C}]/u.test(name), 'Pseudonim musi mieć 2–20 znaków, bez znaków specjalnych < >.');
  return name;
}
const shuffle = cards => {
  const result = [...cards];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};
export function createRoom(code, hostId, name, rounds = 6, practice = false, mode = 'classic') {
  requireThat([3, 6, 9].includes(rounds), 'Wybierz 3, 6 lub 9 rund.');
  requireThat(['classic', 'hidden'].includes(mode), 'Wybierz dostępny tryb gry.');
  const room = { code, hostId, rounds, practice, mode, phase: 'lobby', players: [], round: 0,
    deck: [], placements: [], turnId: 0, currentPlayerId: null, deadline: null,
    result: null, history: [], activityAt: Date.now() };
  addPlayer(room, hostId, name);
  if (practice) { addPlayer(room, `bot-${code}`, cleanName(name).toLowerCase() === 'atlas' ? 'Atlas bot' : 'Atlas', true); startGame(room, hostId); }
  return room;
}
export function addPlayer(room, id, name, bot = false) {
  requireThat(room.phase === 'lobby', 'Ta rozgrywka już trwa. Dołącz do nowego pokoju.', 409);
  requireThat(room.players.length < 6, 'Pokój jest pełny (maks. 6 osób).', 409);
  requireThat(!room.players.some(p => p.id === id), 'Już jesteś w tym pokoju.', 409);
  name = cleanName(name);
  requireThat(!room.players.some(p => p.name.toLocaleLowerCase('pl') === name.toLocaleLowerCase('pl')), 'Ten pseudonim jest już zajęty w pokoju.', 409);
  const color = COLORS.find(color => !room.players.some(p => p.color === color));
  room.players.push({ id, name, color, bot, connected: bot, left: false, score: 0, cubes: 5, passed: false });
}
const isHost = (room, id) => requireThat(room.hostId === id, 'Tę czynność wykonuje gospodarz pokoju.', 403);
const activePlayers = room => room.players.filter(p => !p.left);
export const question = room => room.deck[room.round - 1];
export function startGame(room, id) {
  isHost(room, id);
  requireThat(room.phase === 'lobby', 'Rozgrywka już się rozpoczęła.', 409);
  requireThat(activePlayers(room).length >= 2, 'Do gry potrzeba co najmniej 2 osób.', 409);
  room.deck = shuffle(QUESTIONS).slice(0, room.rounds);
  room.round = 0;
  beginRound(room);
}
function setTurn(room, player) {
  room.currentPlayerId = player.id;
  room.turnId++;
  room.deadline = Date.now() + TURN_MS;
}
function beginRound(room) {
  room.round++;
  room.phase = 'playing';
  room.placements = [];
  room.result = null;
  const players = activePlayers(room);
  for (const p of players) { p.passed = false; p.ready = false; }
  if (room.mode === 'hidden') {
    room.currentPlayerId = null;
    room.turnId++;
    room.answerStartsAt = Date.now() + CARD_PREVIEW_MS;
    room.deadline = room.answerStartsAt + HIDDEN_ROUND_MS;
  } else setTurn(room, players[(room.round - 1) % players.length]);
}
function advance(room) {
  const start = room.players.findIndex(p => p.id === room.currentPlayerId);
  for (let n = 1; n <= room.players.length; n++) {
    const player = room.players[(start + n) % room.players.length];
    if (!player.left && !player.passed && player.cubes > 0 && usedCategories(room, player.id).length < CATEGORIES.length) { setTurn(room, player); return; }
  }
  reveal(room);
}
function requireTurn(room, id, turnId) {
  requireThat(room.phase === 'playing', 'Teraz nie można obstawiać.', 409);
  requireThat(room.currentPlayerId === id, 'Zaczekaj na swoją turę.', 409);
  requireThat(room.turnId === turnId, 'Tura już się zmieniła. Spróbuj ponownie.', 409);
}
export function scorePlacement(card, axis, slot) {
  if (axis === 'map') return slot === card.region ? 7 : NEIGHBORS[card.region].includes(slot) ? 3 : 0;
  const correct = bucket(axis === 'year' ? card.year : card.number, axis === 'year' ? YEAR_SCALE : NUMBER_SCALE);
  const distance = Math.abs(slot - correct);
  return distance === 0 ? 7 : distance === 1 ? 3 : 0;
}
export function place(room, id, axis, slot, turnId) {
  const hidden = room.mode === 'hidden';
  if (hidden) requireHiddenRound(room, id, turnId);
  else requireTurn(room, id, turnId);
  requireThat(CATEGORIES.includes(axis), 'Wybierz mapę lub skalę.');
  if (!hidden) requireThat(!usedCategories(room, id).includes(axis), 'W tej kategorii masz już znacznik w tej rundzie.', 409);
  if (axis === 'map') requireThat(REGIONS.some(r => r.id === slot), 'Nieznany region.');
  else requireThat(Number.isInteger(slot) && slot >= 0 && slot < (axis === 'year' ? YEAR_SCALE : NUMBER_SCALE).length, 'Niepoprawny przedział.');
  if (hidden) {
    const previous = room.placements.find(p => p.playerId === id && p.axis === axis);
    if (previous) previous.slot = slot;
    else room.placements.push({ playerId: id, axis, slot });
    return;
  }
  requireThat(!room.placements.some(p => p.axis === axis && p.slot === slot), 'To pole jest już zajęte.', 409);
  const player = room.players.find(p => p.id === id);
  requireThat(player && !player.left && !player.passed && player.cubes > 0, 'Nie masz już znaczników w tej rundzie.', 409);
  player.cubes--;
  room.placements.push({ playerId: id, axis, slot });
  advance(room);
}
export function pass(room, id, turnId) {
  requireThat(room.mode !== 'hidden', 'W tym trybie wybierz trzy odpowiedzi i zatwierdź zestaw.', 409);
  requireTurn(room, id, turnId);
  room.players.find(p => p.id === id).passed = true;
  advance(room);
}
function requireHiddenRound(room, id, turnId) {
  requireThat(room.mode === 'hidden', 'Ta czynność jest dostępna w trybie ukrytych odpowiedzi.', 409);
  requireThat(room.phase === 'playing' && Date.now() < room.deadline, 'Czas na odpowiedzi już się skończył.', 409);
  requireThat(room.turnId === turnId, 'Runda już się zmieniła. Spróbuj ponownie.', 409);
  const player = room.players.find(p => p.id === id && !p.left);
  requireThat(player, 'Nie należysz do tego pokoju.', 403);
  requireThat(!player.ready, 'Twój zestaw odpowiedzi jest już zatwierdzony.', 409);
  return player;
}
export function submitAnswers(room, id, turnId) {
  const player = requireHiddenRound(room, id, turnId);
  requireThat(usedCategories(room, id).length === CATEGORIES.length, 'Wybierz region, rok i wielkość przed zatwierdzeniem.', 409);
  player.ready = true;
  revealWhenReady(room);
}
function revealWhenReady(room) {
  if (room.mode === 'hidden' && room.phase === 'playing' && activePlayers(room).every(p => p.ready)) reveal(room);
}
export function expireRound(room, now = Date.now()) {
  if (room.mode !== 'hidden' || room.phase !== 'playing' || now < room.deadline) return false;
  reveal(room);
  return true;
}
function reveal(room) {
  const card = question(room);
  const scores = Object.fromEntries(room.players.map(p => [p.id, { gained: 0, hits: 0, close: 0, lost: 0 }]));
  for (const placement of room.placements) {
    const points = scorePlacement(card, placement.axis, placement.slot);
    placement.points = points;
    const player = room.players.find(p => p.id === placement.playerId);
    if (room.mode === 'hidden') player.cubes--;
    const score = scores[player.id];
    score.gained += points;
    if (points > 0) { player.cubes++; score[points === 7 ? 'hits' : 'close']++; }
    else score.lost++;
    player.score += points;
  }
  room.phase = 'reveal';
  room.currentPlayerId = null;
  room.deadline = null;
  room.answerStartsAt = null;
  room.turnId++;
  room.result = scores;
  room.history.push({ round: room.round, title: card.title, scores: structuredClone(scores) });
}
export function nextRound(room, id) {
  isHost(room, id);
  requireThat(room.phase === 'reveal', 'Najpierw dokończ rundę.', 409);
  requireThat(activePlayers(room).length >= 2, 'Do dalszej gry potrzeba 2 graczy.', 409);
  if (room.round >= room.rounds) { room.phase = 'finished'; return; }
  for (const player of activePlayers(room)) player.cubes = Math.min(5, Math.max(3, player.cubes + 1));
  beginRound(room);
}
export function restart(room, id) {
  isHost(room, id);
  requireThat(room.phase === 'finished', 'Rewanż jest dostępny po zakończeniu gry.', 409);
  room.players = activePlayers(room);
  for (const p of room.players) Object.assign(p, { score: 0, cubes: 5, passed: false });
  room.history = [];
  room.phase = 'lobby';
  startGame(room, id);
}
export function leave(room, id) {
  const player = room.players.find(p => p.id === id);
  if (!player) return;
  if (room.phase === 'lobby') room.players = room.players.filter(p => p.id !== id);
  else { player.left = true; player.connected = false; player.passed = true; }
  const humans = activePlayers(room).filter(p => !p.bot);
  if (room.hostId === id) room.hostId = humans[0]?.id ?? null;
  if (room.phase === 'playing') {
    if (activePlayers(room).length < 2) {
      reveal(room);
      room.phase = 'finished';
    } else if (room.mode === 'hidden') revealWhenReady(room);
    else if (room.currentPlayerId === id) advance(room);
  } else if (room.phase === 'reveal' && activePlayers(room).length < 2) room.phase = 'finished';
}
export function botMove(room) {
  if (room.mode === 'hidden') {
    const bot = room.players.find(p => p.bot && !p.left && !p.ready);
    if (room.phase !== 'playing' || !bot || Date.now() >= room.deadline) return;
    for (const axis of CATEGORIES) {
      const candidates = axis === 'map' ? REGIONS.map(r => r.id) : (axis === 'year' ? YEAR_SCALE : NUMBER_SCALE).map((_, slot) => slot);
      const roll = randomInt(10);
      const ideal = candidates.filter(slot => scorePlacement(question(room), axis, slot) === (roll < 4 ? 7 : roll < 8 ? 3 : 0));
      const options = ideal.length ? ideal : candidates;
      place(room, bot.id, axis, options[randomInt(options.length)], room.turnId);
    }
    submitAnswers(room, bot.id, room.turnId);
    return;
  }
  const bot = room.players.find(p => p.id === room.currentPlayerId);
  if (room.phase !== 'playing' || !bot?.bot) return;
  const card = question(room);
  const candidates = [
    ...REGIONS.map(r => ({ axis: 'map', slot: r.id })),
    ...YEAR_SCALE.map((_, slot) => ({ axis: 'year', slot })),
    ...NUMBER_SCALE.map((_, slot) => ({ axis: 'number', slot }))
  ].filter(c => !usedCategories(room, bot.id).includes(c.axis) && !room.placements.some(p => p.axis === c.axis && p.slot === c.slot));
  if (!candidates.length || (bot.cubes < 3 && randomInt(4) === 0)) { pass(room, bot.id, room.turnId); return; }
  const roll = randomInt(10);
  const ideal = candidates.filter(c => scorePlacement(card, c.axis, c.slot) === (roll < 4 ? 7 : roll < 8 ? 3 : 0));
  const options = ideal.length ? ideal : candidates;
  const move = options[randomInt(options.length)];
  place(room, bot.id, move.axis, move.slot, room.turnId);
}
export function publicRoom(room, viewerId) {
  if (!room) return null;
  requireThat(room.players.some(p => p.id === viewerId && !p.left), 'Nie należysz do tego pokoju.', 403);
  const card = question(room);
  const shown = card ? { title: card.title, category: card.category, art: card.art, intro: card.intro,
    location: card.location, yearLabel: card.yearLabel, numberLabel: card.numberLabel, unit: card.unit } : null;
  const hidden = room.mode === 'hidden' && room.phase === 'playing';
  return { code: room.code, version: room.version ?? 0, hostId: room.hostId, rounds: room.rounds, practice: room.practice, mode: room.mode,
    phase: room.phase, round: room.round, turnId: room.turnId, deadline: room.deadline, answerStartsAt: room.answerStartsAt ?? null,
    currentPlayerId: room.currentPlayerId, players: room.players.map(p => ({ ...p })),
    placements: room.placements.filter(p => !hidden || p.playerId === viewerId).map(p => ({ ...p })), question: shown,
    answer: ['reveal', 'finished'].includes(room.phase) && card ? {
      region: card.region, place: card.place, year: card.year, number: card.number, fact: card.fact,
      sources: card.sources, yearSlot: bucket(card.year, YEAR_SCALE), numberSlot: bucket(card.number, NUMBER_SCALE)
    } : null, result: room.result, history: room.history };
}
