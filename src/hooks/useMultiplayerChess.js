import {
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import { Chess } from 'chess.js';
import { useMultiplayer } from './useMultiplayer';
import { files, ranks } from '../utils/chessConstants';
import { playSound } from '../utils/sound';
import { getGameResult, getPositionKey } from '../utils/gameResult';

export function useMultiplayerChess() {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [promotionState, setPromotionState] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [retreatedColor, setRetreatedColor] = useState(null);
  const [timeoutLoser, setTimeoutLoser] = useState(null);
  const [drawOffer, setDrawOffer] = useState(null);
  const [agreedDraw, setAgreedDraw] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [battleLog, setBattleLog] = useState([]);
  const battleLogId = useRef(0);
  const [positionCounts, setPositionCounts] = useState(() => {
    const initialGame = new Chess();
    const initialKey = getPositionKey(initialGame);
    return { [initialKey]: 1 };
  });

  const {
    socket,
    roomCode,
    playerColor,
    isConnected,
    opponentConnected,
    gameStarted,
    createRoom,
    joinRoom,
    makeMove: sendMove,
    resign: sendResign,
    requestNewGame: sendNewGame,
    offerDraw: sendOfferDraw,
    cancelDraw: sendCancelDraw,
    respondDraw: sendRespondDraw,
    sendFlagFall,
  } = useMultiplayer();

  const board = useMemo(() => game.board(), [game]);

  const legalMoves = useMemo(
    () => selectedSquare
      ? game.moves({ square: selectedSquare, verbose: true })
      : [],
    [game, selectedSquare]
  );

  const legalMoveSquares = useMemo(
    () => legalMoves.map((move) => move.to),
    [legalMoves]
  );

  const myTurn = playerColor || 'w';
  const isMyTurn = game.turn() === myTurn;

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

  const checkedKingSquare = game.isCheck()
    ? findKingSquare(game.turn())
    : null;

  const gameResult = useMemo(() => {
    if (agreedDraw) {
      return { over: true, type: 'draw-agreed', winner: null, message: '🤝 DRAW AGREED' };
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
    return getGameResult(game, positionCounts);
  }, [game, positionCounts, retreatedColor, timeoutLoser, agreedDraw]);

  const showFeedback = useCallback((message, type) => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 1800);
  }, []);

  // Append an entry to the battle-log sidebar (draw offers, retreats, timeouts).
  const logEvent = useCallback((text, tone = 'normal') => {
    battleLogId.current += 1;
    setBattleLog((log) => [...log.slice(-49), { id: battleLogId.current, text, tone }]);
  }, []);

  // Rebuild game + repetition counts + last move from a server-provided PGN.
  const parsePgnState = useCallback((pgn) => {
    const nextGame = new Chess();
    nextGame.loadPgn(pgn);

    const verboseHistory = nextGame.history({ verbose: true });

    const temp = new Chess();
    const counts = { [getPositionKey(temp)]: 1 };
    for (const move of verboseHistory) {
      temp.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      const key = getPositionKey(temp);
      counts[key] = (counts[key] || 0) + 1;
    }

    const last = verboseHistory[verboseHistory.length - 1];
    return {
      nextGame,
      counts,
      lastMove: last
        ? {
            from: last.from,
            to: last.to,
            captured: Boolean(last.captured),
            piece: last.piece,
            promotion: last.promotion || null,
          }
        : null,
    };
  }, []);

  const updatePositionCounts = useCallback((nextGame) => {
    const nextPositionKey = getPositionKey(nextGame);
    const nextCount = (positionCounts[nextPositionKey] || 0) + 1;
    return {
      nextPositionCounts: { ...positionCounts, [nextPositionKey]: nextCount },
      nextCount,
    };
  }, [positionCounts]);

  const applyMoveToState = useCallback((nextGame, moveResult, capturedPiece, movingPiece) => {
    const { nextPositionCounts } = updatePositionCounts(nextGame);
    const nextResult = getGameResult(nextGame, nextPositionCounts);
    const hadPendingDraw = Boolean(drawOffer);

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
    setDrawOffer(null);
    setLastMove({
      from: moveResult.from,
      to: moveResult.to,
      captured: Boolean(capturedPiece),
      piece: movingPiece?.type || moveResult.piece,
      promotion: moveResult.promotion || null,
    });

    if (nextResult.over) {
      showFeedback(
        nextResult.message,
        nextResult.type === 'checkmate' ? 'checkmate' : 'draw'
      );
    } else if (nextGame.isCheck()) {
      showFeedback('⚠️ CHECK', 'check');
    } else if (hadPendingDraw) {
      logEvent('🤝 Draw offer withdrawn by a move — battle continues', 'draw');
      showFeedback('🤝 Draw offer withdrawn — battle continues', 'draw');
    }
  }, [updatePositionCounts, showFeedback, drawOffer, logEvent]);

  const declareTimeoutLoser = useCallback((color) => {
    setTimeoutLoser(color);
    showFeedback(
      color === 'w' ? '⏰ White runs out of time!' : '⏰ Black runs out of time!',
      'draw'
    );
  }, [showFeedback]);

  const handleFlagFall = useCallback((color) => {
    declareTimeoutLoser(color);
    setDrawOffer(null);
    logEvent(`⏰ ${color === 'w' ? 'White' : 'Black'} ran out of time`, 'timeout');
    sendFlagFall(color);
  }, [declareTimeoutLoser, setDrawOffer, logEvent, sendFlagFall]);

  const offerDraw = useCallback(() => {
    if (gameResult.over || !gameStarted || drawOffer) return;
    setDrawOffer({ direction: 'sent' });
    sendOfferDraw();
    logEvent('🤝 You offered a draw', 'draw');
    showFeedback('🤝 Draw offered — awaiting response…', 'draw');
  }, [gameResult.over, gameStarted, drawOffer, sendOfferDraw, showFeedback, logEvent]);

  const cancelDraw = useCallback(() => {
    if (!drawOffer || drawOffer.direction !== 'sent') return;
    setDrawOffer(null);
    sendCancelDraw();
    logEvent('Draw offer cancelled', 'draw');
  }, [drawOffer, sendCancelDraw, logEvent]);

  const acceptDraw = useCallback(() => {
    if (!drawOffer || drawOffer.direction !== 'received') return;
    sendRespondDraw(true);
    setDrawOffer(null);
    setAgreedDraw(true);
    playSound('promotion');
    showFeedback('🤝 DRAW AGREED', 'draw');
  }, [drawOffer, sendRespondDraw, showFeedback]);

  const declineDraw = useCallback(() => {
    if (!drawOffer || drawOffer.direction !== 'received') return;
    sendRespondDraw(false);
    setDrawOffer(null);
    logEvent('🚫 You declined the draw', 'illegal');
    showFeedback('🚫 Draw declined — battle continues!', 'illegal');
  }, [drawOffer, sendRespondDraw, showFeedback, logEvent]);

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
    setDrawOffer(null);
    setAgreedDraw(false);
    setPositionCounts({ [initialPositionKey]: 1 });
    setBattleLog([]);
    setResetSignal((s) => s + 1);
  }, []);

  // Rejoin / reconnect: rebuild the board from the server's stored PGN and
  // restore any non-move terminal state (resignation / timeout / draw).
  const handleGameResync = useCallback(({ pgn, terminal }) => {
    try {
      if (pgn) {
        const { nextGame, counts, lastMove } = parsePgnState(pgn);
        setGame(nextGame);
        setPositionCounts(counts);
        setLastMove(lastMove);
      }

      setSelectedSquare(null);
      setPromotionState(null);
      setFeedback(null);
      setDrawOffer(null);
      setAgreedDraw(false);
      setRetreatedColor(null);
      setTimeoutLoser(null);

      if (terminal?.type === 'resignation') {
        setRetreatedColor(terminal.color);
        showFeedback(
          terminal.color === 'w'
            ? '🏳️ White has retreated!'
            : '🏳️ Black has retreated!',
          'draw'
        );
      } else if (terminal?.type === 'timeout') {
        setTimeoutLoser(terminal.color);
        showFeedback(
          terminal.color === 'w'
            ? '⏰ White runs out of time!'
            : '⏰ Black runs out of time!',
          'draw'
        );
      } else if (terminal?.type === 'draw-agreed') {
        setAgreedDraw(true);
        showFeedback('🤝 DRAW AGREED', 'draw');
      }
    } catch (error) {
      console.error('Failed to resync game:', error);
    }
  }, [parsePgnState, showFeedback]);

  // The server refused a move (out of turn / illegal / game over). Rebuild
  // from the authoritative PGN first, then tell the player what happened.
  const handleMoveRejected = useCallback(({ reason, pgn, terminal }) => {
    handleGameResync({ pgn, terminal });
    showFeedback(`🚫 ${reason}`, 'illegal');
  }, [handleGameResync, showFeedback]);

  useEffect(() => {
    if (!socket) return;

    // Opponent moves now arrive with the server's authoritative PGN, so we
    // rebuild directly from it (no replay-desync risk).
    const handleOpponentMove = ({ pgn, move }) => {
      try {
        if (pgn) {
          const { nextGame, counts, lastMove } = parsePgnState(pgn);
          setGame(nextGame);
          setPositionCounts(counts);
          setSelectedSquare(null);
          setLastMove(lastMove);

          const nextResult = getGameResult(nextGame, counts);
          if (nextResult.over) {
            if (nextResult.type === 'checkmate') playSound('checkmate');
            showFeedback(
              nextResult.message,
              nextResult.type === 'checkmate' ? 'checkmate' : 'draw'
            );
          } else if (nextGame.isCheck()) {
            playSound('check');
            showFeedback('⚠️ CHECK', 'check');
          } else if (lastMove?.captured) {
            playSound('capture');
          } else {
            playSound('move');
          }
          return;
        }

        // Fallback: replay the raw move against the local game.
        const nextGame = new Chess();
        nextGame.loadPgn(game.pgn());

        const moveResult = nextGame.move({
          from: move.from,
          to: move.to,
          promotion: move.promotion,
        });

        if (moveResult) {
          const capturedPiece = game.get(move.to);
          applyMoveToState(nextGame, moveResult, capturedPiece, null);
        }
      } catch (error) {
        console.error('Failed to apply opponent move:', error);
      }
    };

    const handleOpponentNewGame = () => {
      resetGame();
    };

    const handleOpponentResigned = ({ color }) => {
      setRetreatedColor(color);
      logEvent(`🏳️ ${color === 'w' ? 'White' : 'Black'} retreated from the battle`, 'resign');
      showFeedback('🏳️ Opponent has retreated!', 'draw');
    };

    const handleOpponentFlagFall = ({ color }) => {
      logEvent(`⏰ ${color === 'w' ? 'White' : 'Black'} ran out of time`, 'timeout');
      declareTimeoutLoser(color);
    };

    const handleDrawOffered = ({ color }) => {
      if (gameResult.over || agreedDraw) return;
      setDrawOffer({ direction: 'received', color });
      logEvent('🤝 Opponent offers a draw', 'draw');
      showFeedback('🤝 Opponent offers a draw', 'draw');
    };

    const handleDrawCancelled = () => {
      if (drawOffer?.direction === 'received') {
        setDrawOffer(null);
        logEvent('Opponent cancelled the draw offer', 'draw');
      }
    };

    const handleDrawDeclined = () => {
      if (drawOffer?.direction === 'sent') {
        setDrawOffer(null);
        logEvent('🚫 Opponent declined the draw', 'illegal');
        showFeedback('🚫 Opponent declined the draw', 'illegal');
      }
    };

    const handleDrawAccepted = () => {
      setDrawOffer(null);
      setAgreedDraw(true);
      playSound('promotion');
      logEvent('🤝 Draw agreed — the war ends in peace', 'draw');
      showFeedback('🤝 DRAW AGREED', 'draw');
    };

    socket.on('opponent-move', handleOpponentMove);
    socket.on('opponent-new-game', handleOpponentNewGame);
    socket.on('opponent-resigned', handleOpponentResigned);
    socket.on('opponent-flag-fall', handleOpponentFlagFall);
    socket.on('game-resync', handleGameResync);
    socket.on('move-rejected', handleMoveRejected);
    socket.on('draw-offered', handleDrawOffered);
    socket.on('draw-cancelled', handleDrawCancelled);
    socket.on('draw-declined', handleDrawDeclined);
    socket.on('draw-accepted', handleDrawAccepted);
    return () => {
      socket.off('opponent-move', handleOpponentMove);
      socket.off('opponent-new-game', handleOpponentNewGame);
      socket.off('opponent-resigned', handleOpponentResigned);
      socket.off('opponent-flag-fall', handleOpponentFlagFall);
      socket.off('game-resync', handleGameResync);
      socket.off('move-rejected', handleMoveRejected);
      socket.off('draw-offered', handleDrawOffered);
      socket.off('draw-cancelled', handleDrawCancelled);
      socket.off('draw-declined', handleDrawDeclined);
      socket.off('draw-accepted', handleDrawAccepted);
    };
  }, [socket, game, positionCounts, applyMoveToState, resetGame, declareTimeoutLoser, showFeedback, handleGameResync, handleMoveRejected, parsePgnState, logEvent, gameResult.over, agreedDraw, drawOffer]);

  const handleSquareClick = useCallback((square) => {
    if (promotionState) return;

    if (gameResult.over) {
      playSound('illegal');
      return;
    }

    if (!gameStarted) return;

    if (!isMyTurn) {
      setFeedback({ message: "Wait for opponent's move", type: 'illegal' });
      setTimeout(() => setFeedback(null), 1800);
      return;
    }

    const piece = game.get(square);

    if (!selectedSquare) {
      if (piece && piece.color === myTurn) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    if (piece && piece.color === myTurn) {
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

      const moveResult = nextGame.move({
        from: selectedSquare,
        to: square,
      });

      applyMoveToState(nextGame, moveResult, capturedPiece, movingPiece);

      sendMove({
        from: moveResult.from,
        to: moveResult.to,
        promotion: moveResult.promotion,
      });
    } catch (error) {
      console.error('Move failed:', error);
      playSound('illegal');
      showFeedback('🚫 Illegal move', 'illegal');
      setSelectedSquare(null);
    }
  }, [game, selectedSquare, legalMoveSquares, legalMoves, gameStarted, isMyTurn, myTurn, promotionState, gameResult, sendMove, applyMoveToState, showFeedback]);

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
      const movingPiece = game.get(from);

      const moveResult = nextGame.move({ from, to, promotion: pieceType });

      applyMoveToState(nextGame, moveResult, capturedPiece, movingPiece);

      sendMove({
        from: moveResult.from,
        to: moveResult.to,
        promotion: moveResult.promotion,
      });

      setPromotionState(null);
    } catch (error) {
      console.error('Promotion failed:', error);
      playSound('illegal');
      showFeedback('🚫 Promotion failed', 'illegal');
    }
  }, [game, promotionState, gameResult, sendMove, applyMoveToState, showFeedback]);

  const resign = useCallback(() => {
    if (!gameStarted || gameResult.over) return;
    setRetreatedColor(playerColor);
    setDrawOffer(null);
    logEvent('🏳️ You retreated from the battle', 'resign');
    sendResign();
  }, [gameStarted, gameResult.over, playerColor, sendResign, logEvent]);

  const requestNewGame = useCallback(() => {
    resetGame();
    sendNewGame();
  }, [resetGame, sendNewGame]);

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
    playerColor,
    isMyTurn,
    gameStarted,
    isConnected,
    opponentConnected,
    roomCode,
    createRoom,
    joinRoom,
    handleSquareClick,
    handlePromotion,
    resetGame,
    resign,
    requestNewGame,
    resetSignal,
    setPromotionState,
    setFeedback,
    handleFlagFall,
    drawOffer,
    offerDraw,
    cancelDraw,
    acceptDraw,
    declineDraw,
    battleLog,
  };
}
