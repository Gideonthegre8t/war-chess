// P0-1 smoke test — run from repo root: node smoke-test.mjs
// Imports the server (boots it on :3001 in-process), then drives two real
// socket.io clients through create/join/move/increment/cheat-death flows.
import { io } from 'socket.io-client';

const { createClock, chargeClock, getGameResult, getPositionKey, persistRooms, loadPersistedRooms } = await import('./server/server.js');
await new Promise((r) => setTimeout(r, 300));

let failures = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failures += 1;
};

// --- P0-2 Server-enforced draw & terminal unit checks ---
{
  const { Chess } = await import('chess.js');
  const c = new Chess();
  const counts = { [getPositionKey(c)]: 3 };
  const res = getGameResult(c, counts);
  ok(res.over === true && res.type === 'threefold-repetition', 'P0-2 threefold repetition triggers draw');

  const cFifty = new Chess('r3k3/8/8/8/8/8/8/4K3 w - - 100 1');
  const resFifty = getGameResult(cFifty, {});
  ok(resFifty.over === true && resFifty.type === 'fifty-move', 'P0-2 50-move rule triggers draw');

  const cMate = new Chess('rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3');
  const resMate = getGameResult(cMate, {});
  ok(resMate.over === true && resMate.type === 'checkmate' && resMate.winner === 'b', 'P0-2 checkmate detected');
}

// --- Pure unit checks for the flag math (no need to wait 60s) ---
{
  const c = createClock('bullet-inc');
  ok(c.remaining.w === 60000 && c.remaining.b === 60000, 'createClock bullet-inc init 60s');
  ok(c.incrementMs === 1000, 'createClock increment 1000ms');
  const room = {
    chess: { turn: () => 'w' },
    clock: { ...c, lastTickAt: Date.now() - 70000, running: true },
  };
  const flagged = chargeClock(room, Date.now());
  ok(flagged === true && room.clock.remaining.w === 0, 'chargeClock flags after 70s');
  const room2 = {
    chess: { turn: () => 'w' },
    clock: { ...createClock('blitz'), lastTickAt: Date.now() - 1000, running: true },
  };
  const flagged2 = chargeClock(room2, Date.now());
  ok(flagged2 === false && room2.clock.remaining.w < 180000, 'chargeClock charges ~1s, no flag');
}

const connectPlayer = () =>
  new Promise((resolve, reject) => {
    const s = io('http://localhost:3001', { transports: ['websocket'] });
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });

const [pA, pB] = await Promise.all([connectPlayer(), connectPlayer()]);
console.log('Both clients connected.');

const waitFor = (s, event, ms = 4000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    s.once(event, (payload) => {
      clearTimeout(t);
      resolve(payload);
    });
  });

const aStart = waitFor(pA, 'game-start');
const roomCode = await new Promise((resolve, reject) => {
  pA.emit('create-room', { timeControlId: 'blitz-inc' }, (res) =>
    res.success ? resolve(res.roomCode) : reject(new Error(res.error))
  );
});
const bStart = waitFor(pB, 'game-start');

const joinRes = await new Promise((resolve) => {
  pB.emit('join-room', roomCode, resolve);
});
ok(joinRes.success === true, 'join-room succeeds');

// Only the joining player receives `game-start`; the creator's clock is
// anchored by the first `clock-sync` (see move-1 assertions below).
try {
  await aStart;
  ok(false, 'creator should not receive its own game-start');
} catch {
  ok(true, 'creator does not receive game-start (anchors on first clock-sync)');
}

const bStartPayload = await bStart;
ok(
  bStartPayload.clock?.remaining?.w === 180000 &&
    bStartPayload.clock?.running === false &&
    bStartPayload.color === 'b',
  'game-start carries initial clock (180s, not running) to the joiner'
);

// --- Move 1: White e2-e4 ---
const bMove = waitFor(pB, 'opponent-move');
pA.emit('make-move', { roomCode, move: { from: 'e2', to: 'e4' } });
const { pgn } = await bMove;
ok(typeof pgn === 'string' && pgn.includes('e4'), 'white move propagates with PGN');

const sync1 = await waitFor(pA, 'clock-sync');
ok(sync1.running === true && sync1.turn === 'b', 'clock running, black to move after move 1');
ok(
  sync1.remaining.w === 180000 + sync1.incrementMs &&
    Math.abs(sync1.remaining.b - 180000) < 3000,
  'creator anchored on server clock (blitz-inc: white 182s after its +2s increment)'
);

await new Promise((r) => setTimeout(r, 2200));
const sync2 = await waitFor(pA, 'clock-sync');
ok(sync2.running === true && sync2.remaining.b < 179500, 'black clock counts down');

// --- Move 2: Black e7-e5, check increment credit on black ---
const aMove = waitFor(pA, 'opponent-move');
const beforeBlack = sync2.remaining.b;
pB.emit('make-move', { roomCode, move: { from: 'e7', to: 'e5' } });
await aMove;

await new Promise((r) => setTimeout(r, 600));
const sync3 = await waitFor(pA, 'clock-sync');
ok(
  sync3.turn === 'w' && sync3.running === true && sync3.remaining.w < 180000 + sync3.incrementMs,
  'white clock now running (ticking down from 182s) after black moves'
);
await new Promise((r) => setTimeout(r, 1500));
const sync4 = await waitFor(pA, 'clock-sync');
ok(sync4.remaining.w < sync3.remaining.w, 'white clock visibly counts down between syncs');
ok(
  sync3.remaining.b >= beforeBlack && sync3.remaining.b < sync3.incrementMs + 180000,
  `black credited increment (+2s): ${beforeBlack} -> ${sync3.remaining.b}`
);

// --- Cheat death: client-declared flag-fall must be ignored ---
let cheatEmitted = false;
pA.on('opponent-flag-fall', () => { cheatEmitted = true; });
pB.on('opponent-flag-fall', () => { cheatEmitted = true; });
pB.emit('flag-fall', { roomCode, color: 'w' });
await new Promise((r) => setTimeout(r, 1600));
ok(cheatEmitted === false, 'client-emitted flag-fall is ignored (cheat dead)');

// --- A real terminal path still works: resign freezes the clock ---
const bResignMsg = waitFor(pB, 'opponent-resigned');
pA.emit('resign', { roomCode });
await bResignMsg;
const syncAfterResign = await waitFor(pA, 'clock-sync');
ok(syncAfterResign.running === false, 'clock halted after resignation');

// --- P0-2 Server rejects moves when game is terminal ---
const moveRejected = waitFor(pB, 'move-rejected');
pB.emit('make-move', { roomCode, move: { from: 'e5', to: 'e4' } });
const rejectRes = await moveRejected;
ok(rejectRes.reason === 'The battle is already over.', 'server rejects move when game is already terminal');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);