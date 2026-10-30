import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Chess } from 'chess.js';
import { useChessAI } from './useChessAI';
import { playSound } from '../utils/sound';
import { files, ranks } from '../utils/chessConstants';
import { getGameResult, getPositionKey } from '../utils/gameResult';

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
  const [retreatedColor, setRetreatedColor] = useState(null);
  const [timeoutLoser, setTimeoutLoser] = useState(null);

  // Tracks whether a CPU think cycle is in progress without triggering re-runs.
  // Must be declared before the CPU useEffect that reads it.
  const isThinkingRef = useRef(false);

  const { getBestMove } = useChessAI();

  const board = useMemo(() => game.board(), [game]);

  const legalMoves = useMemo(
    () => (selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : []),
    [game, selectedSquare]
  );

  const legalMoveSquares = useMemo(
    () => legalMoves.map((move) => move.to),
    [legalMoves]
  );

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

  const gameResult = retreatedColor
    ? {
      over: true,
      type: 'resignation',
      winner: retreatedColor === 'w' ? 'b' : 'w',
      message: retreatedColor === 'w' ? '🏳️ WHITE RETREATS' : '🏳️ BLACK RETREATS',
      retreatColor: retreatedColor,
    }
    : timeoutLoser
      ? {
        over: true,
        type: 'timeout',
        winner: timeoutLoser === 'w' ? 'b' : 'w',
        message: timeoutLoser === 'w' ? '⏰ WHITE RUNS OUT OF TIME' : '⏰ BLACK RUNS OUT OF TIME',
        timeoutLoser,
      }
      : getGameResult(game, positionCounts);

  const updatePositionCounts = useCallback((nextGame) => {
    const nextPositionKey = getPositionKey(nextGame);
    const nextCount = (positionCounts[nextPositionKey] || 0) + 1;
    const nextPositionCounts = {
      ...positionCounts,
      [nextPositionKey]: nextCount,
    };
    return { nextPositionCounts, nextCount };
  }, [positionCounts]);

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
          promotion: moveResult.promotion || null,
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
  }, [game, updatePositionCounts]);

  // CPU makes a move when it's their turn.
  // isThinking is NOT in the dep array — it is only set inside this effect,
  // so including it would cause an infinite re-run. We use a ref to read
  // the latest value without making it a dep.
  useEffect(() => {
    if (gameResult.over || game.turn() === playerColor || isThinkingRef.current) {
      return;
    }

    let cancelled = false;
    isThinkingRef.current = true;
    setIsThinking(true);

    // Natural-feel delay before the engine responds, then async minimax in worker
    const thinkDelay = setTimeout(() => {
      getBestMove(game, difficulty)
        .then((bestMove) => {
          if (cancelled) return;
          if (bestMove) {
            makeMove(bestMove.from, bestMove.to, bestMove.promotion);
          }
          isThinkingRef.current = false;
          setIsThinking(false);
        })
        .catch(() => {
          if (!cancelled) {
            isThinkingRef.current = false;
            setIsThinking(false);
          }
        });
    }, 300 + Math.random() * 400);

    return () => {
      cancelled = true;
      clearTimeout(thinkDelay);
      isThinkingRef.current = false;
      setIsThinking(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, gameResult.over, playerColor, getBestMove, difficulty, makeMove]);

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

  const resign = useCallback(() => {
    if (gameResult.over) return;
    setRetreatedColor(playerColor);
  }, [gameResult.over, playerColor]);

  const offerDraw = () => {
    if (gameResult.over) return;
    showFeedback('🤝 The CPU general declines your offer of peace', 'illegal');
  };

  const resetGame = () => {
    const newGame = new Chess();
    const initialPositionKey = getPositionKey(newGame);

    setGame(newGame);
    setSelectedSquare(null);
    setLastMove(null);
    setPromotionState(null);
    setFeedback(null);
    setIsThinking(false);
    setRetreatedColor(null);
    setTimeoutLoser(null);
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
    resign,
    offerDraw,
    resetGame,
    setTimeoutLoser,
  };
}