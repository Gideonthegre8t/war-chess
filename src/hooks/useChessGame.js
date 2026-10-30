import { useState, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import { files, ranks } from '../utils/chessConstants';
import { playSound } from '../utils/sound';
import { getGameResult, getPositionKey } from '../utils/gameResult';

export function useChessGame() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [promotionState, setPromotionState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [retreatedColor, setRetreatedColor] = useState(null);
  const [timeoutLoser, setTimeoutLoser] = useState(null);
  const [positionCounts, setPositionCounts] = useState(() => {
    const initialGame = new Chess();
    const initialKey = getPositionKey(initialGame);
    return { [initialKey]: 1 };
  });

  const board = useMemo(() => game.board(), [game]);

  const legalMoves = useMemo(
    () => (selectedSquare ? game.moves({ square: selectedSquare, verbose: true }) : []),
    [game, selectedSquare]
  );

  const legalMoveSquares = useMemo(
    () => legalMoves.map((move) => move.to),
    [legalMoves]
  );

  const showFeedback = useCallback((message, type) => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback(null);
    }, 1800);
  }, []);

  const findKingSquare = (color) => {
    const currentBoard = game.board();
    for (let row = 0; row < currentBoard.length; row++) {
      for (let column = 0; column < currentBoard[row].length; column++) {
        const square = currentBoard[row][column];
        if (square && square.type === 'k' && square.color === color) {
          return files[column] + ranks[row];
        }
      }
    }
    return null;
  };

  const checkedKingSquare = game.isCheck() ? findKingSquare(game.turn()) : null;

  const gameResult = useMemo(() => {
    if (retreatedColor) {
      const winner = retreatedColor === 'w' ? 'b' : 'w';
      return {
        over: true,
        type: 'resignation',
        winner,
        message: retreatedColor === 'w' ? '🏳️ WHITE RETREATS' : '🏳️ BLACK RETREATS',
        retreatColor: retreatedColor,
      };
    }
    if (timeoutLoser) {
      return {
        over: true,
        type: 'timeout',
        winner: timeoutLoser === 'w' ? 'b' : 'w',
        message: timeoutLoser === 'w' ? '⏰ WHITE RUNS OUT OF TIME' : '⏰ BLACK RUNS OUT OF TIME',
        timeoutLoser,
      };
    }
    return getGameResult(game, positionCounts);
  }, [game, positionCounts, retreatedColor, timeoutLoser]);

  const updatePositionCounts = useCallback((nextGame) => {
    const nextPositionKey = getPositionKey(nextGame);
    const nextCount = (positionCounts[nextPositionKey] || 0) + 1;
    const nextPositionCounts = {
      ...positionCounts,
      [nextPositionKey]: nextCount,
    };
    return { nextPositionCounts, nextCount };
  }, [positionCounts]);

  const handleSquareClick = useCallback((square) => {
    if (promotionState) return;

    if (gameResult.over) {
      playSound('illegal');
      return;
    }

    const piece = game.get(square);

    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      return;
    }

    if (!legalMoveSquares.includes(square)) {
      playSound('illegal');
      showFeedback('🚫 Illegal move', 'illegal');
      setSelectedSquare(null);
      return;
    }

    const movingPiece = game.get(selectedSquare);
    const capturedPiece = game.get(square);

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

    try {
      const nextGame = new Chess();
      nextGame.loadPgn(game.pgn());

      const move = nextGame.move({
        from: selectedSquare,
        to: square,
      });

      const { nextPositionCounts } = updatePositionCounts(nextGame);
      const nextResult = getGameResult(nextGame, nextPositionCounts);

      if (nextResult.type === 'checkmate') {
        playSound('checkmate');
      } else if (nextGame.isCheck()) {
        playSound('check');
      } else if (capturedPiece) {
        playSound('capture');
      } else {
        playSound('move');
      }

      setGame(nextGame);
      setPositionCounts(nextPositionCounts);
      setSelectedSquare(null);
      setLastMove({
        from: move.from,
        to: move.to,
        captured: Boolean(capturedPiece),
        piece: movingPiece?.type,
        promotion: move.promotion || null,
      });

      if (nextResult.over) {
        showFeedback(nextResult.message, nextResult.type === 'checkmate' ? 'checkmate' : 'draw');
      } else if (nextGame.isCheck()) {
        showFeedback('⚠️ CHECK', 'check');
      }
    } catch (error) {
      console.error('Move failed:', error);
      playSound('illegal');
      showFeedback('🚫 Illegal move', 'illegal');
      setSelectedSquare(null);
    }
  }, [game, selectedSquare, legalMoveSquares, legalMoves, promotionState, gameResult, showFeedback, updatePositionCounts]);

  const handlePromotion = useCallback((pieceType) => {
    if (!promotionState) return;

    if (gameResult.over) {
      setPromotionState(null);
      return;
    }

    try {
      const { from, to } = promotionState;
      const nextGame = new Chess();
      nextGame.loadPgn(game.pgn());

      const capturedPiece = nextGame.get(to);

      const move = nextGame.move({
        from,
        to,
        promotion: pieceType,
      });

      const { nextPositionCounts } = updatePositionCounts(nextGame);
      const nextResult = getGameResult(nextGame, nextPositionCounts);

      if (nextResult.type === 'checkmate') {
        playSound('checkmate');
      } else if (nextGame.isCheck()) {
        playSound('check');
      } else {
        playSound('promotion');
      }

      setGame(nextGame);
      setPositionCounts(nextPositionCounts);
      setSelectedSquare(null);
      setPromotionState(null);
      setLastMove({
        from: move.from,
        to: move.to,
        captured: Boolean(capturedPiece),
        piece: pieceType,
        promotion: pieceType || null,
      });

      if (nextResult.over) {
        showFeedback(nextResult.message, nextResult.type === 'checkmate' ? 'checkmate' : 'draw');
      } else if (nextGame.isCheck()) {
        showFeedback('⚠️ CHECK', 'check');
      }
    } catch (error) {
      console.error('Promotion failed:', error);
      playSound('illegal');
      showFeedback('🚫 Promotion failed', 'illegal');
    }
  }, [game, promotionState, gameResult, showFeedback, updatePositionCounts]);

  const resign = useCallback((color) => {
    if (gameResult.over) return;
    setRetreatedColor(color || game.turn());
  }, [gameResult.over, game]);

  const resetGame = useCallback(() => {
    const newGame = new Chess();
    const initialPositionKey = getPositionKey(newGame);
    setGame(newGame);
    setSelectedSquare(null);
    setLastMove(null);
    setPromotionState(null);
    setFeedback(null);
    setRetreatedColor(null);
    setTimeoutLoser(null);
    setPositionCounts({
      [initialPositionKey]: 1,
    });
  }, []);

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
    gameOver: gameResult.over,
    gameResultType: gameResult.type,
    repetitionCount: gameResult.repetitionCount,
    halfmoveClock: gameResult.halfmoveClock,
    isThreefoldRepetition: gameResult.isThreefoldRepetition,
    isFivefoldRepetition: gameResult.isFivefoldRepetition,
    isFiftyMoveDraw: gameResult.isFiftyMoveDraw,
    isSeventyFiveMoveDraw: gameResult.isSeventyFiveMoveDraw,
    handleSquareClick,
    handlePromotion,
    resetGame,
    resign,
    setTimeoutLoser,
  };
}
