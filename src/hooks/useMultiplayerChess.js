import { useState, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import { useMultiplayer } from './useMultiplayer';

export function useMultiplayerChess() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [promotionState, setPromotionState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [_positionCounts, _setPositionCounts] = useState(() => {
    const initialGame = new Chess();
    const initialKey = getPositionKey(initialGame);
    return { [initialKey]: 1 };
  });

  const {
    socket,
    roomCode,
    playerColor,
    isConnected: _isConnected,
    opponentConnected: _opponentConnected,
    gameStarted,
    createRoom,
    joinRoom,
    makeMove: sendMove,
  } = useMultiplayer();

  // Listen for opponent moves
  useEffect(() => {
    if (!socket) return;

    const handleOpponentMove = ({ move }) => {
      try {
        const nextGame = new Chess();
        nextGame.loadPgn(game.pgn());
        
        const moveResult = nextGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });

        if (moveResult) {
          setGame(nextGame);
          setSelectedSquare(null);
          setLastMove({
            from: moveResult.from,
            to: moveResult.to,
            captured: Boolean(moveResult.captured),
            piece: moveResult.piece,
          });
        }
      } catch (error) {
        console.error('Failed to apply opponent move:', error);
      }
    };

    socket.on('opponent-move', handleOpponentMove);

    return () => {
      socket.off('opponent-move', handleOpponentMove);
    };
  }, [socket, game]);

  // Get current player's color
  const myTurn = playerColor === 'w' ? 'w' : 'b';
  const isMyTurn = game.turn() === myTurn;

  const handleSquareClick = useCallback((_square) => {
    // Only allow moves on your turn in multiplayer
    if (gameStarted && !isMyTurn) {
      setFeedback({ message: "Wait for opponent's move", type: 'illegal' });
      setTimeout(() => setFeedback(null), 1800);
      return;
    }

    // ... rest of the existing logic
  }, [gameStarted, isMyTurn]);

  const makeMove = useCallback((from, to, promotion) => {
    if (!gameStarted || !roomCode) return false;

    try {
      const nextGame = new Chess();
      nextGame.loadPgn(game.pgn());
      
      const moveResult = nextGame.move({
        from,
        to,
        promotion,
      });

      if (moveResult) {
        setGame(nextGame);
        setSelectedSquare(null);
        setLastMove({
          from: moveResult.from,
          to: moveResult.to,
          captured: Boolean(moveResult.captured),
          piece: moveResult.piece,
        });

        // Send move to opponent
        sendMove({
          from: moveResult.from,
          to: moveResult.to,
          promotion: moveResult.promotion,
        }, nextGame.fen());

        return true;
      }
    } catch (error) {
      console.error('Move failed:', error);
    }

    return false;
  }, [game, gameStarted, roomCode, sendMove]);

  return {
    game,
    selectedSquare,
    lastMove,
    promotionState,
    feedback,
    playerColor,
    isMyTurn,
    gameStarted,
    createRoom,
    joinRoom,
    handleSquareClick,
    makeMove,
    setPromotionState,
    setFeedback,
  };
}

function getPositionKey(chess) {
  if (typeof chess.hash === 'function') {
    return chess.hash();
  }
  return chess.fen().split(' ').slice(0, 4).join(' ');
}