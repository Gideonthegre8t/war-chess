import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:3001';

export function useMultiplayer() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Disconnected from server');
    });

    newSocket.on('game-start', ({ color }) => {
      setPlayerColor(color);
      setGameStarted(true);
      console.log('Game started as', color);
    });

    newSocket.on('opponent-move', ({ move }) => {
      // This will be handled by the chess game hook
      console.log('Opponent moved:', move);
    });

    newSocket.on('opponent-disconnected', () => {
      setOpponentConnected(false);
      console.log('Opponent disconnected');
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = useCallback((callback) => {
    if (!socket) return;
    
    socket.emit('create-room', (response) => {
      if (response.success) {
        setRoomCode(response.roomCode);
      }
      callback(response);
    });
  }, [socket]);

  const joinRoom = useCallback((code, callback) => {
    if (!socket) return;
    
    socket.emit('join-room', code, (response) => {
      if (response.success) {
        setRoomCode(response.roomCode);
        setOpponentConnected(true);
      }
      callback(response);
    });
  }, [socket]);

  const makeMove = useCallback((move, fen) => {
    if (!socket || !roomCode) return;
    
    socket.emit('make-move', { roomCode, move, fen });
  }, [socket, roomCode]);

  return {
    socket,
    roomCode,
    playerColor,
    isConnected,
    opponentConnected,
    gameStarted,
    createRoom,
    joinRoom,
    makeMove
  };
}