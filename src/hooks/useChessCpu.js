import { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { useChessAI } from './useChessAI';
import { playSound } from '../utils/sound';
import { files, ranks } from '../utils/chessConstants';

const getPositionKey = (chess) => {
  if (typeof chess.hash === 'function') {
    return chess.hash();
  }
  return chess.fen().split(' ').slice(0, 4).join(' ');
};

const getGameResult = (chess, positionCounts) => {
  const positionKey = getPositionKey(chess);
  const repetitionCount = positionCounts[positionKey] || 1;
  const halfmoveClock = Number(chess.fen().split(' ')[4]) || 0;
  const isThreefoldRepetition = repetitionCount >= 3;
  const isFivefoldRepetition = repetitionCount >= 5;
  const isFiftyMoveDraw = halfmoveClock >= 100;
  const isSeventyFiveMoveDraw = halfmoveClock >= 150;

  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'b' : 'w';
    return {
      over: true,
      type: 'checkmate',
      winner,
      message: 'CHECKMATE',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  if (chess.isStalemate()) {
    return {
      over: true,
      type: 'stalemate',
      message: 'DRAW - STALEMATE',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  if (chess.isInsufficientMaterial()) {
    return {
      over: true,
      type: 'insufficient-material',
      message: 'DRAW - INSUFFICIENT MATERIAL',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  if (isFivefoldRepetition) {
    return {
      over: true,
      type: 'fivefold-repetition',
      message: 'DRAW - FIVEFOLD REPETITION',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  if (isSeventyFiveMoveDraw) {
    return {
      over: true,
      type: 'seventy-five-move',
      message: 'DRAW - 75-MOVE RULE',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  if (isThreefoldRepetition) {
    return {
      over: true,
      type: 'threefold-repetition',
      message: 'DRAW - THREEFOLD REPETITION',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  if (isFiftyMoveDraw) {
    return {
      over: true,
      type: 'fifty-move',
      message: 'DRAW - 50-MOVE RULE',
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }

  return {
    over: false,
    type: null,
    message: null,
    repetitionCount,
    halfmoveClock,
    isThreefoldRepetition,
    isFivefoldRepetition,
    isFiftyMoveDraw,
    isSeventyFiveMoveDraw,
  };
};

export function useChessCpu(playerColor = 'w', difficulty = 'medium') {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [promotionState, setPromotionState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [positionCounts, setPositionCounts] = useState(() => {
    const initialGame = new Chess();
    const initialKey = getPositionKey(initialGame);
    return { [initialKey]: 1 };
  });
  const [isThinking, setIsThinking] = useState(false);

  const { getBestMove } = useChessAI();

  const board = game.board();

  const legalMoves = selectedSquare
    ? game.moves({ square: selectedSquare, verbose: true })
    : [];

  const legalMoveSquares = legalMoves.map((move) => move.to);

  const showFeedback = (message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1800);
  };

  const findKingSquare = (color) => {
    const currentBoard = game.board();
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[row].length; col++) {
        const square = currentBoard[row][col];
        if (square && square.type === 'k' && square.color === color) {
          return files[col] + ranks[row];
        }
      }
    }
    return null;
  };

  const checkedKingSquare = game.isCheck() ? findKingSquare(game.turn()) : null;

  const gameResult = getGameResult(game, positionCounts);

  const updatePositionCounts = (nextGame) => {
    const nextPositionKey = getPositionKey(nextGame);
    const nextCount = (positionCounts[nextPositionKey] || 0) + 1;
    const nextPositionCounts = {
      ...positionCounts,
      [nextPositionKey]: nextCount,
    };
    return { nextPositionCounts, nextCount };
  };

  const makeMove = useCallback((from, to, promotion) => {
    try {
      const nextGame = new Chess();
      nextGame.loadPgn(game.pgn());

      const moveResult = nextGame.move({ from, to, promotion });

      if (moveResult) {
        const { nextPositionCounts } = updatePositionCounts(nextGame);
        const nextResult = getGameResult(nextGame, nextPositionCounts);

        if (nextResult.type === 'checkmate') {
          playSound('checkmate');
        } else if (nextGame.isCheck()) {
          playSound('check');
        } else if (moveResult.captured) {
          playSound('capture');
        } else {
          playSound('move');
        }

        setGame(nextGame);
        setPositionCounts(nextPositionCounts);
        setSelectedSquare(null);
        setLastMove({
          from: moveResult.from,
          to: moveResult.to,
          captured: Boolean(moveResult.captured),
          piece: moveResult.piece,
        });

        if (nextResult.over) {
          showFeedback(nextResult.message, nextResult.type === 'checkmate' ? 'checkmate' : 'draw');
        } else if (nextGame.isCheck()) {
          showFeedback('CHECK', 'check');
        }

        return true;
      }
    } catch (error) {
      console.error('Move failed:', error);
    }
    return false;
  }, [game, positionCounts]);

  // CPU makes a move when it's their turn
  useEffect(() => {
    if (gameResult.over || game.turn() === playerColor || isThinking) {
      return;
    }

    const cpuTimeout = setTimeout(() => {
      setIsThinking(true);
      
      // Small delay to make CPU feel more natural
      setTimeout(() => {
        const bestMove = getBestMove(game, difficulty);
        if (bestMove) {
          makeMove(bestMove.from, bestMove.to, bestMove.promotion);
        }
        setIsThinking(false);
      }, 300 + Math.random() * 400);
    }, 100);

    return () => clearTimeout(cpuTimeout);
  }, [game, gameResult.over, playerColor, isThinking, getBestMove, difficulty, makeMove]);

  const handleSquareClick = useCallback((square) => {
    if (promotionState || gameResult.over || isThinking) {
      return;
    }

    // Only allow moves on player's turn
    if (game.turn() !== playerColor) {
      return;
    }

    const piece = game.get(square);

    if (!selectedSquare) {
      if (piece && piece.color === playerColor) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === playerColor) {
      setSelectedSquare(square);
      return;
    }

    if (!legalMoveSquares.includes(square)) {
      playSound('illegal');
      showFeedback('Illegal move', 'illegal');
      setSelectedSquare(null);
      return;
    }

    const movingPiece = game.get(selectedSquare);
    const promotionMove = legalMoves.find(
      (move) => move.to === square && move.promotion
    );

    if (promotionMove) {
      setPromotionState({
        from: selectedSquare,
        to: square,
        color: movingPiece.color,
      });
      return;
    }

    makeMove(selectedSquare, square);
  }, [selectedSquare, game, promotionState, gameResult.over, isThinking, playerColor, legalMoveSquares, legalMoves, makeMove]);

  const handlePromotion = useCallback((pieceType) => {
    if (!promotionState || gameResult.over) {
      setPromotionState(null);
      return;
    }

    const { from, to } = promotionState;
    makeMove(from, to, pieceType);
    setPromotionState(null);
  }, [promotionState, gameResult.over, makeMove]);

  const resetGame = () => {
    const newGame = new Chess();
    const initialPositionKey = getPositionKey(newGame);

    setGame(newGame);
    setSelectedSquare(null);
    setLastMove(null);
    setPromotionState(null);
    setFeedback(null);
    setPositionCounts({ [initialPositionKey]: 1 });
  };

  return {
    game,
    board,
    selectedSquare,
    legalMoveSquares,
    lastMove,
    promotionState,
    checkedKingSquare,
    feedback,
    gameResult,
    isThinking,
    playerColor,
    handleSquareClick,
    handlePromotion,
    resetGame,
  };
}