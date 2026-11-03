import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Chess } from 'chess.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGameResult, getPositionKey } from '../src/utils/gameResult.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SNAPSHOT_FILE = path.join(__dirname, 'rooms-snapshot.json');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Room storage
const rooms = new Map();

// Snapshot persistence (P3-1)
const persistRooms = () => {
  try {
    const list = [];
    for (const [code, room] of rooms.entries()) {
      list.push({
        code,
        timeControlId: room.timeControlId,
        pgn: room.pgn,
        terminal: room.terminal,
        clock: room.clock
          ? {
            timeControlId: room.clock.timeControlId,
            initial: room.clock.initial,
            incrementMs: room.clock.incrementMs,
            remaining: room.clock.remaining,
            lastTickAt: room.clock.lastTickAt,
            running: room.clock.running,
          }
          : null,
      });
    }
    fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Persist rooms warning:', err.message);
  }
};

const loadPersistedRooms = () => {
  try {
    if (!fs.existsSync(SNAPSHOT_FILE)) return;
    const raw = fs.readFileSync(SNAPSHOT_FILE, 'utf-8');
    const list = JSON.parse(raw);
    for (const item of list) {
      if (!item.code) continue;
      const chess = new Chess();
      if (item.pgn) {
        try {
          chess.loadPgn(item.pgn);
        } catch {
          // A corrupt snapshot must not stop the server from booting; the
          // room is restored from a fresh board instead.
          console.warn(`Snapshot for room ${item.code} has an unreadable PGN; starting from a fresh board.`);
        }
      }
      rooms.set(item.code, {
        players: [null, null],
        boardState: null,
        currentTurn: chess.turn(),
        gameStarted: true,
        pendingDrawBy: null,
        chess,
        positionCounts: { [getPositionKey(chess)]: 1 },
        pgn: item.pgn || null,
        terminal: item.terminal || null,
        timeControlId: item.timeControlId || DEFAULT_TIME_CONTROL,
        clock: item.clock || createClock(item.timeControlId),
        clockInterval: null,
      });
    }
  } catch (err) {
    console.warn('Load persisted rooms warning:', err.message);
  }
};

loadPersistedRooms();

// Generate room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Time controls in milliseconds. The server owns these values (client sends only
// an id) and only accepts ids it knows. Keep in sync with
// src/components/ChessClock/chessClockConstants.js.
const TIME_CONTROLS = {
  bullet: { white: 60000, black: 60000, increment: 0 },
  'bullet-inc': { white: 60000, black: 60000, increment: 1000 },
  blitz: { white: 180000, black: 180000, increment: 0 },
  'blitz-inc': { white: 180000, black: 180000, increment: 2000 },
  rapid: { white: 300000, black: 300000, increment: 0 },
  'rapid-inc': { white: 300000, black: 300000, increment: 3000 },
  classical: { white: 600000, black: 600000, increment: 0 },
  'classical-inc': { white: 600000, black: 600000, increment: 5000 },
};
const DEFAULT_TIME_CONTROL = 'blitz';

// Fresh per-game clock state. `running` starts false (nothing is charged until
// the first real move) and `lastTickAt` is set when a move completes, so the
// clock only counts the *next* player's thinking time.
const createClock = (timeControlId) => {
  const tc = TIME_CONTROLS[timeControlId] || TIME_CONTROLS[DEFAULT_TIME_CONTROL];
  return {
    timeControlId: Object.prototype.hasOwnProperty.call(TIME_CONTROLS, timeControlId)
      ? timeControlId
      : DEFAULT_TIME_CONTROL,
    initial: { w: tc.white, b: tc.black },
    incrementMs: tc.increment,
    remaining: { w: tc.white, b: tc.black },
    lastTickAt: null,
    running: false,
  };
};

const getRoomTurn = (room) => (room.chess ? room.chess.turn() : 'w');

// Charge the side to move for time elapsed since lastTickAt (clamped at 0).
// Returns true if that side has now flagged. Only counts while running.
const chargeClock = (room, now = Date.now()) => {
  const clock = room.clock;
  if (!clock || !clock.running) return false;
  const turn = getRoomTurn(room);
  const elapsed = Math.max(0, now - (clock.lastTickAt ?? now));
  clock.remaining[turn] = Math.max(0, clock.remaining[turn] - elapsed);
  clock.lastTickAt = now;
  return clock.remaining[turn] <= 0;
};

const clockSyncPayload = (room, sentAt = Date.now()) => ({
  timeControlId: room.clock.timeControlId,
  remaining: { w: room.clock.remaining.w, b: room.clock.remaining.b },
  turn: getRoomTurn(room),
  running: room.clock.running,
  incrementMs: room.clock.incrementMs,
  lastTickAt: room.clock.lastTickAt,
  sentAt,
});

const emitClockSync = (io, roomCode, room, sentAt) => {
  io.to(roomCode).emit('clock-sync', clockSyncPayload(room, sentAt));
};

const stopRoomClock = (room) => {
  if (room.clockInterval) {
    clearInterval(room.clockInterval);
    room.clockInterval = null;
  }
};

// One 1s interval per live room: re-anchors both clients' clocks and lets the
// server detect flag fall itself (no client claim is ever trusted).
const startRoomClock = (io, roomCode, room) => {
  if (room.clockInterval || room.terminal || !room.clock) return;
  room.clockInterval = setInterval(() => {
    const currentRoom = rooms.get(roomCode);
    if (!currentRoom || currentRoom.terminal) {
      stopRoomClock(room);
      return;
    }
    const flagged = chargeClock(room);
    if (flagged) {
      const loser = getRoomTurn(room);
      currentRoom.pendingDrawBy = null;
      currentRoom.terminal = { over: true, type: 'timeout', color: loser };
      currentRoom.clock.running = false;
      stopRoomClock(currentRoom);
      io.to(roomCode).emit('opponent-flag-fall', { color: loser });
      emitClockSync(io, roomCode, currentRoom);
      return;
    }
    emitClockSync(io, roomCode, currentRoom);
  }, 1000);
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create room
  socket.on('create-room', ({ timeControlId } = {}, callback) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      players: [socket.id],
      boardState: null,
      currentTurn: 'w',
      gameStarted: false,
      pendingDrawBy: null,
      chess: null,
      positionCounts: null,
      pgn: null,
      terminal: null,
      timeControlId: TIME_CONTROLS[timeControlId]
        ? timeControlId
        : DEFAULT_TIME_CONTROL,
      clock: createClock(timeControlId),
      clockInterval: null,
    });

    socket.join(roomCode);
    persistRooms();
    callback({ success: true, roomCode });
    console.log(`Room created: ${roomCode}`);
  });

  // Join room (also used to rejoin after a reconnection)
  socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);

    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }

    // Both slots are currently occupied by live sockets.
    if (room.players.length >= 2 && room.players.every((p) => typeof p === 'string')) {
      callback({ success: false, error: 'Room is full' });
      return;
    }

    // A disconnected player's slot is free -> take it over.
    let slotIndex = room.players.findIndex((p) => typeof p !== 'string');
    if (slotIndex === -1) {
      slotIndex = room.players.length;
    }

    // Only emit "opponent-rejoined" when filling a previously-disconnected slot.
    const wasRejoin = room.players[slotIndex] === null;

    // If this socket already sits in the room, keep its own slot (reconnect).
    const existingIndex = room.players.indexOf(socket.id);
    if (existingIndex !== -1) {
      slotIndex = existingIndex;
    }

    room.players[slotIndex] = socket.id;
    room.gameStarted = true;

    // Start the room's authoritative chess state once both sides exist.
    if (!room.chess) {
      room.chess = new Chess();
      room.positionCounts = { [getPositionKey(room.chess)]: 1 };
    }

    socket.join(roomCode);

    const color = slotIndex === 0 ? 'w' : 'b';

    // Notify the player who just (re)joined about their color + clock baseline.
    socket.emit('game-start', {
      color,
      roomCode,
      clock: clockSyncPayload(room),
    });

    // If the game is already underway (a player reconnecting or a slot
    // being refilled after a disconnect), sync the real board state.
    if (room.pgn || room.terminal) {
      socket.emit('game-resync', {
        pgn: room.pgn,
        terminal: room.terminal,
        clock: clockSyncPayload(room),
      });
    }

    // If this was a reconnect, let the opponent know.
    if (wasRejoin) {
      const otherIndex = slotIndex === 0 ? 1 : 0;
      const otherPlayer = room.players[otherIndex];
      if (typeof otherPlayer === 'string') {
        io.to(otherPlayer).emit('opponent-rejoined');
      }
    }

    callback({ success: true, roomCode });
    console.log(`Player joined room: ${roomCode}`);
  });

  // Handle move — server-authoritative. The move is applied to the room's own
  // chess.js instance FIRST; only legal, in-turn moves are broadcast onward.
  // The clock is also authoritative here: the mover is charged for elapsed time
  // before the move, flagged if they ran out, and credited the increment after.
  socket.on('make-move', ({ roomCode, move }) => {
    const room = rooms.get(roomCode);
    if (!room) return;

    const playerIndex = room.players.indexOf(socket.id);
    if (playerIndex === -1) return;
    const color = playerIndex === 0 ? 'w' : 'b';

    if (!room.chess) {
      room.chess = new Chess();
    }

    const reject = (reason) => {
      // Carry the authoritative state in the rejection so the offender can
      // rebuild immediately; the client resyncs + surfaces the reason.
      socket.emit('move-rejected', {
        reason,
        pgn: room.pgn,
        terminal: room.terminal,
      });
    };

    if (room.chess.isGameOver() || room.terminal) {
      reject('The battle is already over.');
      return;
    }

    if (room.chess.turn() !== color) {
      reject("It's not your turn.");
      return;
    }

    // Charge the mover for their thinking time. If they flagged, the game is
    // over on time and the move never happens.
    const flagged = chargeClock(room);
    if (flagged) {
      room.pendingDrawBy = null;
      room.terminal = { over: true, type: 'timeout', color };
      room.clock.running = false;
      stopRoomClock(room);
      io.to(roomCode).emit('opponent-flag-fall', { color });
      emitClockSync(io, roomCode, room);
      return;
    }

    let applied = null;
    try {
      applied = room.chess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || undefined,
      });
    } catch {
      applied = null;
    }

    if (!applied) {
      reject('Illegal move — the war council refuses.');
      return;
    }

    room.pendingDrawBy = null;
    if (!room.positionCounts) {
      room.positionCounts = { [getPositionKey(new Chess())]: 1 };
    }
    const posKey = getPositionKey(room.chess);
    room.positionCounts[posKey] = (room.positionCounts[posKey] || 0) + 1;

    const gameResult = getGameResult(room.chess, room.positionCounts);
    if (gameResult.over) {
      room.terminal = gameResult;
    } else {
      room.terminal = null;
    }
    room.pgn = room.chess.pgn();

    // Credit the mover's increment, then start the opponent's half of the
    // clock from this instant.
    room.clock.remaining[color] += room.clock.incrementMs;
    room.clock.lastTickAt = Date.now();
    room.clock.running = true;

    // Broadcast the move to the opponent only; the mover applied it
    // optimistically already.
    socket.to(roomCode).emit('opponent-move', {
      move: { from: move.from, to: move.to, promotion: move.promotion },
      fen: room.chess.fen(),
      pgn: room.pgn,
      terminal: room.terminal,
    });

    emitClockSync(io, roomCode, room);
    persistRooms();

    // If this move ended the battle (mate/stalemate/draw/repetition), freeze the clock.
    if (gameResult.over || room.chess.isGameOver()) {
      room.clock.running = false;
      stopRoomClock(room);
      return;
    }

    startRoomClock(io, roomCode, room);
  });

  // Handle new game (rematch) request
  socket.on('new-game', ({ roomCode, timeControlId } = {}) => {
    const room = rooms.get(roomCode);
    if (room) {
      stopRoomClock(room);
      room.boardState = null;
      room.currentTurn = 'w';
      room.pendingDrawBy = null;
      room.chess = new Chess();
      room.positionCounts = { [getPositionKey(room.chess)]: 1 };
      room.pgn = null;
      room.terminal = null;
      room.timeControlId = TIME_CONTROLS[timeControlId]
        ? timeControlId
        : room.timeControlId;
      room.clock = createClock(room.timeControlId);
      socket.to(roomCode).emit('opponent-new-game');
      emitClockSync(io, roomCode, room);
      persistRooms();
    }
  });

  // Handle resignation / retreat
  socket.on('resign', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex === -1) return;
      const color = playerIndex === 0 ? 'w' : 'b';
      room.pendingDrawBy = null;
      room.terminal = { over: true, type: 'resignation', color };
      room.clock.running = false;
      stopRoomClock(room);
      socket.to(roomCode).emit('opponent-resigned', { color });
      emitClockSync(io, roomCode, room);
      persistRooms();
    }
  });

  // Handle draw offer
  socket.on('draw-offer', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex === -1) return;
      const color = playerIndex === 0 ? 'w' : 'b';
      room.pendingDrawBy = color;
      socket.to(roomCode).emit('draw-offered', { color });
    }
  });

  // Handle draw offer cancellation (by the offering player)
  socket.on('draw-cancel', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.pendingDrawBy = null;
      socket.to(roomCode).emit('draw-cancelled');
    }
  });

  // Handle accept / decline response to a pending draw offer
  socket.on('draw-response', ({ roomCode, accept }) => {
    const room = rooms.get(roomCode);
    if (room) {
      if (accept && room.pendingDrawBy) {
        const color = room.pendingDrawBy;
        room.pendingDrawBy = null;
        room.terminal = { over: true, type: 'draw-agreed' };
        room.clock.running = false;
        stopRoomClock(room);
        io.to(roomCode).emit('draw-accepted', { color });
        persistRooms();
      } else {
        room.pendingDrawBy = null;
        socket.to(roomCode).emit('draw-declined');
      }
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);

    // Keep the room alive so the player can rejoin by code.
    rooms.forEach((room, code) => {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        room.players[playerIndex] = null;
        room.pendingDrawBy = null;

        // Notify remaining player
        const otherIndex = playerIndex === 0 ? 1 : 0;
        const otherPlayer = room.players[otherIndex];
        if (typeof otherPlayer === 'string') {
          io.to(otherPlayer).emit('opponent-disconnected');
        }

        // Remove rooms where both players are gone
        if (room.players.every((p) => p === null)) {
          stopRoomClock(room);
          rooms.delete(code);
          persistRooms();
        }
      }
    });
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', rooms: rooms.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Exported for the smoke test (smoke-test.mjs) — otherwise unit-testing the
// clock math would require waiting out a real 60s flag.
export { createClock, chargeClock, TIME_CONTROLS, DEFAULT_TIME_CONTROL, getGameResult, getPositionKey, persistRooms, loadPersistedRooms };