import { useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ??
  (typeof window !== 'undefined' && window.location?.hostname
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : 'http://localhost:3001');

export function useMultiplayer() {
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [playerColor, setPlayerColor] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [opponentConnected, setOpponentConnected] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);

  const roomCodeRef = useRef(null);
  const gameStartedRef = useRef(false);
  const playerColorRef = useRef(null);

  useEffect(() => {
    roomCodeRef.current = roomCode;
  }, [roomCode]);

  useEffect(() => {
    gameStartedRef.current = gameStarted;
  }, [gameStarted]);

  useEffect(() => {
    playerColorRef.current = playerColor;
  }, [playerColor]);

  useEffect(() => {
    const newSocket = io(SERVER_URL);
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Connected to server');

      // If we were mid-game, re-attach to our room.
      if (roomCodeRef.current && gameStartedRef.current) {
        newSocket.emit('join-room', roomCodeRef.current, (response) => {
          if (response.success) {
            setOpponentConnected(true);
            console.log('Rejoined room:', roomCodeRef.current);
          }
        });
      }
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

    newSocket.on('opponent-rejoined', () => {
      setOpponentConnected(true);
      console.log('Opponent rejoined');
    });

    newSocket.on('opponent-new-game', () => {
      console.log('Opponent started a new game');
    });

    newSocket.on('opponent-resigned', ({ color }) => {
      console.log('Opponent resigned. Color:', color);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  const createRoom = useCallback((timeControlId, callback) => {
    if (!socket) return;

    socket.emit('create-room', { timeControlId }, (response) => {
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

  const makeMove = useCallback((move) => {
    if (!socket || !roomCode) return;

    socket.emit('make-move', { roomCode, move });
  }, [socket, roomCode]);

  const resign = useCallback(() => {
    if (!socket || !roomCode) return;

    socket.emit('resign', { roomCode });
  }, [socket, roomCode]);

  const requestNewGame = useCallback((timeControlId) => {
    if (!socket || !roomCode) return;

    socket.emit('new-game', { roomCode, timeControlId });
  }, [socket, roomCode]);

  const offerDraw = useCallback(() => {
    if (!socket || !roomCode) return;

    socket.emit('draw-offer', { roomCode });
  }, [socket, roomCode]);

  const cancelDraw = useCallback(() => {
    if (!socket || !roomCode) return;

    socket.emit('draw-cancel', { roomCode });
  }, [socket, roomCode]);

  const respondDraw = useCallback((accept) => {
    if (!socket || !roomCode) return;

    socket.emit('draw-response', { roomCode, accept });
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
    makeMove,
    resign,
    requestNewGame,
    offerDraw,
    cancelDraw,
    respondDraw,
  };
}