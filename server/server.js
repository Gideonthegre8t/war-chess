import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { Chess } from 'chess.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Room storage
const rooms = new Map();

// Generate room code
const generateRoomCode = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Create room
  socket.on('create-room', (callback) => {
    const roomCode = generateRoomCode();
    rooms.set(roomCode, {
      players: [socket.id],
      boardState: null,
      currentTurn: 'w',
      gameStarted: false,
      pendingDrawBy: null,
      chess: null,
      pgn: null,
      terminal: null
    });
    
    socket.join(roomCode);
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
    }

    socket.join(roomCode);

    const color = slotIndex === 0 ? 'w' : 'b';

    // Notify the player who just (re)joined about their color.
    socket.emit('game-start', { color, roomCode });

    // If the game is already underway (a player reconnecting or a slot
    // being refilled after a disconnect), sync the real board state.
    if (room.pgn || room.terminal) {
      socket.emit('game-resync', { pgn: room.pgn, terminal: room.terminal });
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

    if (room.chess.turn() !== color) {
      reject("It's not your turn.");
      return;
    }

    if (room.chess.isGameOver()) {
      reject('The battle is already over.');
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
    room.terminal = null;
    room.pgn = room.chess.pgn();

    // Broadcast the move to the opponent only; reject() already kept the
    // mover in sync, and their own board was applied optimistically.
    socket.to(roomCode).emit('opponent-move', {
      move: { from: move.from, to: move.to, promotion: move.promotion },
      fen: room.chess.fen(),
      pgn: room.pgn,
    });
  });

  // Handle new game (rematch) request
  socket.on('new-game', ({ roomCode }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.boardState = null;
      room.currentTurn = 'w';
      room.pendingDrawBy = null;
      room.chess = new Chess();
      room.pgn = null;
      room.terminal = null;
      socket.to(roomCode).emit('opponent-new-game');
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
      room.terminal = { type: 'resignation', color };
      socket.to(roomCode).emit('opponent-resigned', { color });
    }
  });

  // Handle flag fall (timeout). The losing color is passed by the client.
  socket.on('flag-fall', ({ roomCode, color }) => {
    const room = rooms.get(roomCode);
    if (room) {
      room.pendingDrawBy = null;
      room.terminal = { type: 'timeout', color };
      socket.to(roomCode).emit('opponent-flag-fall', { color });
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
        room.terminal = { type: 'draw-agreed' };
        io.to(roomCode).emit('draw-accepted', { color });
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
          rooms.delete(code);
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