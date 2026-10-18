import http from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';
import { GameError, createRoom, addPlayer, startGame, place, pass, submitAnswers, expireRound, nextRound, restart, leave, botMove, publicRoom } from './src/game.mjs';

const PUBLIC = path.resolve(fileURLToPath(new URL('./public/', import.meta.url)));
const TTL = 24 * 60 * 60 * 1000;
const MAX_BODY = 4096;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml' };
const SECURE = {
  'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin',
  'X-Frame-Options': 'DENY', 'Cache-Control': 'no-store',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"
};
export function createApp() {
  const rooms = new Map(), sessions = new Map(), streams = new Map(), rates = new Map(), bots = new Map();
  const send = (res, status, data) => { res.writeHead(status, { ...SECURE, 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(data)); };
  const roomOf = session => rooms.get(session.roomCode) ?? null;
  function sessionFor(req, res) {
    const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('hunch_session='))?.slice(14);
    let session = token && sessions.get(token);
    if (!session) {
      if (sessions.size >= 10_000) throw new GameError('Serwer jest pełny. Spróbuj później.', 503);
      const newToken = randomBytes(32).toString('hex');
      session = { id: randomBytes(12).toString('hex'), roomCode: null, seenAt: Date.now() };
      sessions.set(newToken, session);
      res.setHeader('Set-Cookie', `hunch_session=${newToken}; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400${process.env.COOKIE_SECURE === '1' ? '; Secure' : ''}`);
    }
    session.seenAt = Date.now();
    if (session.roomCode && !rooms.has(session.roomCode)) session.roomCode = null;
    return session;
  }
  function broadcast(room) {
    room.version = (room.version ?? 0) + 1;
    room.activityAt = Date.now();
    for (const session of sessions.values()) {
      if (session.roomCode !== room.code) continue;
      const payload = `data: ${JSON.stringify({ room: publicRoom(room, session.id) })}\n\n`;
      for (const stream of streams.get(session.id) ?? []) stream.write(payload);
    }
    const botNeeded = room.phase === 'playing' && (room.mode === 'hidden'
      ? room.players.some(p => p.bot && !p.left && !p.ready)
      : room.players.find(p => p.id === room.currentPlayerId)?.bot);
    if (!botNeeded && bots.has(room.code)) { clearTimeout(bots.get(room.code)); bots.delete(room.code); }
    if (botNeeded && !bots.has(room.code)) {
      const turnId = room.turnId;
      bots.set(room.code, setTimeout(() => {
        bots.delete(room.code);
        if (room.phase === 'playing' && room.turnId === turnId) botMove(room);
        broadcast(room);
      }, room.mode === 'hidden' ? 7000 : 1000));
    }
  }
  function markConnected(session, connected) {
    const room = roomOf(session), player = room?.players.find(p => p.id === session.id);
    if (!player || player.left) return;
    player.connected = connected;
    if (connected) delete player.disconnectedAt;
    else player.disconnectedAt = Date.now();
    broadcast(room);
  }
  async function bodyOf(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new GameError('Wymagany format JSON.', 415);
    let body = '', bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > MAX_BODY) throw new GameError('Żądanie jest za duże.', 413);
      body += chunk;
    }
    try { const value = JSON.parse(body); if (!value || typeof value !== 'object' || Array.isArray(value)) throw 0; return value; }
    catch { throw new GameError('Niepoprawne dane JSON.'); }
  }
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/health' && req.method === 'GET') return send(res, 200, { ok: true });
      if (url.pathname.startsWith('/api/')) {
        if (!['GET', 'POST'].includes(req.method)) throw new GameError('Niedozwolona metoda.', 405);
        if (req.method === 'POST' && req.headers.origin && new URL(req.headers.origin).host !== req.headers.host)
          throw new GameError('Niedozwolone pochodzenie żądania.', 403);
        const session = sessionFor(req, res);
        if (req.method === 'GET' && url.pathname === '/api/session') return send(res, 200, { playerId: session.id, room: publicRoom(roomOf(session), session.id), serverTime: Date.now() });
        if (req.method === 'GET' && url.pathname === '/api/events') {
          if ((streams.get(session.id)?.size ?? 0) >= 5) throw new GameError('Zbyt wiele otwartych kart gry.', 429);
          res.writeHead(200, { ...SECURE, 'Content-Type': 'text/event-stream', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
          res.write(`data: ${JSON.stringify({ room: publicRoom(roomOf(session), session.id) })}\n\n`);
          if (!streams.has(session.id)) streams.set(session.id, new Set());
          streams.get(session.id).add(res);
          markConnected(session, true);
          req.on('close', () => {
            const set = streams.get(session.id);
            set?.delete(res);
            if (!set?.size) { streams.delete(session.id); markConnected(session, false); }
          });
          return;
        }
        if (req.method !== 'POST') throw new GameError('Nie znaleziono endpointu.', 404);
        const now = Date.now();
        let rate = rates.get(session.id);
        if (!rate || now - rate.at > 60_000) { rate = { at: now, count: 0 }; rates.set(session.id, rate); }
        if (++rate.count > 90) throw new GameError('Zwolnij na chwilę i spróbuj ponownie.', 429);
        const body = await bodyOf(req);
        if (url.pathname === '/api/rooms') {
          if (roomOf(session)) throw new GameError('Najpierw opuść obecny pokój.', 409);
          if (rooms.size >= 1000) throw new GameError('Wszystkie pokoje są zajęte.', 503);
          const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
          let code;
          do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
          const room = createRoom(code, session.id, body.name, body.rounds ?? 6, body.practice === true, body.mode ?? 'classic');
          rooms.set(code, room);
          session.roomCode = code;
          room.players[0].connected = Boolean(streams.get(session.id)?.size);
          broadcast(room);
          return send(res, 201, { room: publicRoom(room, session.id) });
        }
        if (url.pathname === '/api/rooms/join') {
          if (roomOf(session)) throw new GameError('Najpierw opuść obecny pokój.', 409);
          const code = String(body.code ?? '').trim().toUpperCase();
          const room = rooms.get(code);
          if (!room) throw new GameError('Nie znaleziono pokoju. Sprawdź kod zaproszenia.', 404);
          if (room.practice) throw new GameError('To pokój treningowy. Utwórz pokój dla znajomych.', 409);
          addPlayer(room, session.id, body.name);
          session.roomCode = code;
          room.players.at(-1).connected = Boolean(streams.get(session.id)?.size);
          broadcast(room);
          return send(res, 200, { room: publicRoom(room, session.id) });
        }
        if (url.pathname === '/api/room/action') {
          const room = roomOf(session);
          if (!room) throw new GameError('Nie jesteś w pokoju.', 404);
          if (expireRound(room)) broadcast(room);
          switch (body.action) {
            case 'start': startGame(room, session.id); break;
            case 'place': place(room, session.id, body.axis, body.slot, body.turnId); break;
            case 'pass': pass(room, session.id, body.turnId); break;
            case 'submit': submitAnswers(room, session.id, body.turnId); break;
            case 'next': nextRound(room, session.id); break;
            case 'restart': restart(room, session.id); break;
            case 'leave':
              leave(room, session.id); session.roomCode = null;
              for (const stream of streams.get(session.id) ?? []) stream.write('data: {"room":null}\n\n');
              break;
            default: throw new GameError('Nieznana czynność.');
          }
          broadcast(room);
          return send(res, 200, { room: publicRoom(roomOf(session), session.id) });
        }
        throw new GameError('Nie znaleziono endpointu.', 404);
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw new GameError('Niedozwolona metoda.', 405);
      const requestPath = decodeURIComponent(url.pathname);
      const relative = requestPath === '/' ? 'index.html' : requestPath.slice(1);
      const file = path.resolve(PUBLIC, relative);
      if (!file.startsWith(PUBLIC + path.sep) || !MIME[path.extname(file)]) throw new GameError('Nie znaleziono pliku.', 404);
      let data;
      try { data = await readFile(file); } catch { throw new GameError('Nie znaleziono pliku.', 404); }
      res.writeHead(200, { ...SECURE, 'Content-Type': MIME[path.extname(file)] });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      if (res.headersSent) { res.end(); return; }
      if (!(error instanceof GameError)) console.error(error);
      send(res, error instanceof GameError ? error.status : 500, { error: error instanceof GameError ? error.message : 'Błąd serwera. Spróbuj ponownie.' });
    }
  });
  server.requestTimeout = 10_000;
  const tick = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (now - room.activityAt > TTL || !room.players.some(p => !p.bot && !p.left)) {
        for (const session of sessions.values()) if (session.roomCode === room.code) {
          session.roomCode = null;
          for (const stream of streams.get(session.id) ?? []) stream.write('data: {"room":null}\n\n');
        }
        rooms.delete(room.code); clearTimeout(bots.get(room.code)); bots.delete(room.code); continue;
      }
      const host = room.players.find(p => p.id === room.hostId);
      if (host?.disconnectedAt && now - host.disconnectedAt > 30_000) {
        const replacement = room.players.find(p => !p.bot && !p.left && p.connected);
        if (replacement) { room.hostId = replacement.id; broadcast(room); }
      }
      if (room.phase === 'playing' && now >= room.deadline) {
        if (room.mode === 'hidden') expireRound(room, now);
        else pass(room, room.currentPlayerId, room.turnId);
        broadcast(room);
      }
    }
    for (const [token, session] of sessions) if (!streams.has(session.id) && now - session.seenAt > TTL) { sessions.delete(token); rates.delete(session.id); }
  }, 1000);
  const heartbeat = setInterval(() => {
    for (const set of streams.values()) for (const stream of set) stream.write(': heartbeat\n\n');
  }, 15_000);
  server.on('close', () => { clearInterval(tick); clearInterval(heartbeat); for (const timer of bots.values()) clearTimeout(timer); });
  return { server, rooms, sessions, close: () => {
    for (const set of streams.values()) for (const stream of set) stream.end();
    server.closeAllConnections();
    return new Promise(resolve => server.close(resolve));
  } };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const app = createApp();
  const port = Number(process.env.PORT ?? 3000), host = process.env.HOST ?? '0.0.0.0';
  app.server.listen(port, host, () => console.log(`Hunch → http://localhost:${port}`));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
}
