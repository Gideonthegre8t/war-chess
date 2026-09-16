import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

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
      gameStarted: false
    });
    
    socket.join(roomCode);
    callback({ success: true, roomCode });
    console.log(`Room created: ${roomCode}`);
  });

  // Join room
  socket.on('join-room', (roomCode, callback) => {
    const room = rooms.get(roomCode);
    
    if (!room) {
      callback({ success: false, error: 'Room not found' });
      return;
    }
    
    if (room.players.length >= 2) {
      callback({ success: false, error: 'Room is full' });
      return;
    }
    
    room.players.push(socket.id);
    room.gameStarted = true;
    
    socket.join(roomCode);
    
    // Assign colors
    const player1Color = 'w';
    const player2Color = 'b';
    
    // Notify both players
    io.to(room.players[0]).emit('game-start', {
      color: player1Color,
      roomCode
    });
    
    io.to(room.players[1]).emit('game-start', {
      color: player2Color,
      roomCode
    });
    
    callback({ success: true, roomCode });
    console.log(`Player joined room: ${roomCode}`);
  });

  // Handle move
  socket.on('make-move', ({ roomCode, move, fen }) => {
    const room = rooms.get(roomCode);
    if (room) {
      // Broadcast move to all players in room
      socket.to(roomCode).emit('opponent-move', { move, fen });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // Find and clean up rooms
    rooms.forEach((room, code) => {
      const playerIndex = room.players.indexOf(socket.id);
      if (playerIndex !== -1) {
        room.players.splice(playerIndex, 1);
        
        // Notify remaining player
        if (room.players.length > 0) {
          io.to(room.players[0]).emit('opponent-disconnected');
        }
        
        // Remove empty rooms
        if (room.players.length === 0) {
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