import { useState, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import { PUZZLE_LEVELS } from '../utils/puzzles';

export function usePuzzles() {
  const [currentLevelIndex, setCurrentLevelIndex] = useState(0);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [game, setGame] = useState(() => {
    const level = PUZZLE_LEVELS[0];
    const puzzle = level.puzzles[0];
    return new Chess(puzzle.fen);
  });
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [lastMove, setLastMove] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [solvedPuzzles, setSolvedPuzzles] = useState([]);
  const [showHint, setShowHint] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [isWaitingForOpponent, setIsWaitingForOpponent] = useState(false);

  const currentLevel = PUZZLE_LEVELS[currentLevelIndex];
  const currentPuzzle = currentLevel.puzzles[currentPuzzleIndex];
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
    setTimeout(() => setFeedback(null), 2500);
  };

  const findKingSquare = (color) => {
    const currentBoard = game.board();
    for (let row = 0; row < currentBoard.length; row++) {
      for (let col = 0; col < currentBoard[row].length; col++) {
        const square = currentBoard[row][col];
        if (square && square.type === 'k' && square.color === color) {
          const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
          const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
          return files[col] + ranks[row];
        }
      }
    }
    return null;
  };

  const checkedKingSquare = game.isCheck() ? findKingSquare(game.turn()) : null;

  const isCorrectMove = useCallback((move) => {
    if (!currentPuzzle || moveIndex >= currentPuzzle.solution.length) {
      return false;
    }

    const expectedMove = currentPuzzle.solution[moveIndex];
    const toSquare = move.to;

    // Handle moves like "e8q" (promotion)
    if (expectedMove.length === 3) {
      return toSquare === expectedMove.substring(0, 2) && move.promotion === expectedMove[2];
    }

    return toSquare === expectedMove;
  }, [currentPuzzle, moveIndex]);

  const playOpponentResponse = useCallback((currentGame) => {
    if (!currentPuzzle || moveIndex >= currentPuzzle.solution.length) {
      setIsWaitingForOpponent(false);
      return;
    }

    const opponentMove = currentPuzzle.solution[moveIndex];
    if (opponentMove) {
      const fromSquare = opponentMove.substring(0, 2);
      const toSquare = opponentMove.substring(2, 4);
      const promotion = opponentMove.length > 4 ? opponentMove[4] : undefined;

      try {
        const nextGame = new Chess(currentGame.fen());
        const moveResult = nextGame.move({
          from: fromSquare,
          to: toSquare,
          promotion
        });

        if (moveResult) {
          setLastMove({
            from: moveResult.from,
            to: moveResult.to,
            captured: Boolean(moveResult.captured),
            piece: moveResult.piece,
            promotion: moveResult.promotion || null,
          });
          setGame(nextGame);
          setMoveIndex(moveIndex + 1);
        }
      } catch (error) {
        console.error('Opponent move failed:', error);
      }
    }

    setIsWaitingForOpponent(false);
  }, [currentPuzzle, moveIndex]);

  const makeMove = useCallback((from, to, promotion) => {
    try {
      const nextGame = new Chess();
      nextGame.loadPgn(game.pgn());

      const moveResult = nextGame.move({ from, to, promotion });

      if (moveResult) {
        setLastMove({
          from: moveResult.from,
          to: moveResult.to,
          captured: Boolean(moveResult.captured),
          piece: moveResult.piece,
          promotion: moveResult.promotion || null,
        });

        if (isCorrectMove(moveResult)) {
          const nextMoveIndex = moveIndex + 1;

          if (nextMoveIndex >= currentPuzzle.solution.length) {
            // Puzzle solved!
            setSolvedPuzzles([...solvedPuzzles, currentPuzzle.id]);
            showFeedback('Correct! Puzzle solved!', 'checkmate');
            setGame(nextGame);
            setSelectedSquare(null);
            setMoveIndex(0);
          } else {
            showFeedback('Correct!', 'check');
            setMoveIndex(nextMoveIndex);
            setGame(nextGame);
            setSelectedSquare(null);

            if (nextMoveIndex < currentPuzzle.solution.length) {
              setIsWaitingForOpponent(true);
              setTimeout(() => {
                playOpponentResponse(nextGame);
              }, 500);
            }
          }
        } else {
          showFeedback('Incorrect. Try again!', 'illegal');
          const resetGame = new Chess(currentPuzzle.fen);
          setGame(resetGame);
          setSelectedSquare(null);
          setLastMove(null);
          setMoveIndex(0);
          setIsWaitingForOpponent(false);
        }

        return true;
      }
    } catch (error) {
      console.error('Move failed:', error);
    }
    return false;
  }, [game, moveIndex, currentPuzzle, isCorrectMove, solvedPuzzles, playOpponentResponse]);

  const handleSquareClick = useCallback((square) => {
    if (isWaitingForOpponent) {
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
      setSelectedSquare(null);
      return;
    }

    const promotionMove = legalMoves.find(
      (move) => move.to === square && move.promotion
    );

    if (promotionMove) {
      makeMove(selectedSquare, square, 'q');
      return;
    }

    makeMove(selectedSquare, square);
  }, [selectedSquare, game, isWaitingForOpponent, legalMoveSquares, legalMoves, makeMove]);

  const resetPuzzle = useCallback(() => {
    const chess = new Chess(currentPuzzle.fen);
    setGame(chess);
    setSelectedSquare(null);
    setLastMove(null);
    setMoveIndex(0);
    setIsWaitingForOpponent(false);
    setShowHint(false);
  }, [currentPuzzle]);

  const nextPuzzle = useCallback(() => {
    if (currentPuzzleIndex < currentLevel.puzzles.length - 1) {
      // Next puzzle in current level
      const nextIndex = currentPuzzleIndex + 1;
      setCurrentPuzzleIndex(nextIndex);
      const puzzle = currentLevel.puzzles[nextIndex];
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setSelectedSquare(null);
      setLastMove(null);
      setMoveIndex(0);
      setIsWaitingForOpponent(false);
      setShowHint(false);
    } else if (currentLevelIndex < PUZZLE_LEVELS.length - 1) {
      // Next level
      const nextLevelIndex = currentLevelIndex + 1;
      setCurrentLevelIndex(nextLevelIndex);
      setCurrentPuzzleIndex(0);
      const level = PUZZLE_LEVELS[nextLevelIndex];
      const puzzle = level.puzzles[0];
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setSelectedSquare(null);
      setLastMove(null);
      setMoveIndex(0);
      setIsWaitingForOpponent(false);
      setShowHint(false);
    }
  }, [currentLevelIndex, currentPuzzleIndex, currentLevel]);

  const prevPuzzle = useCallback(() => {
    if (currentPuzzleIndex > 0) {
      // Previous puzzle in current level
      const prevIndex = currentPuzzleIndex - 1;
      setCurrentPuzzleIndex(prevIndex);
      const puzzle = currentLevel.puzzles[prevIndex];
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setSelectedSquare(null);
      setLastMove(null);
      setMoveIndex(0);
      setIsWaitingForOpponent(false);
      setShowHint(false);
    } else if (currentLevelIndex > 0) {
      // Previous level
      const prevLevelIndex = currentLevelIndex - 1;
      setCurrentLevelIndex(prevLevelIndex);
      const level = PUZZLE_LEVELS[prevLevelIndex];
      setCurrentPuzzleIndex(level.puzzles.length - 1);
      const puzzle = level.puzzles[level.puzzles.length - 1];
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setSelectedSquare(null);
      setLastMove(null);
      setMoveIndex(0);
      setIsWaitingForOpponent(false);
      setShowHint(false);
    }
  }, [currentLevelIndex, currentPuzzleIndex, currentLevel]);

  const goToLevel = useCallback((levelIndex) => {
    if (levelIndex >= 0 && levelIndex < PUZZLE_LEVELS.length) {
      setCurrentLevelIndex(levelIndex);
      setCurrentPuzzleIndex(0);
      const level = PUZZLE_LEVELS[levelIndex];
      const puzzle = level.puzzles[0];
      const chess = new Chess(puzzle.fen);
      setGame(chess);
      setSelectedSquare(null);
      setLastMove(null);
      setMoveIndex(0);
      setIsWaitingForOpponent(false);
      setShowHint(false);
    }
  }, []);

  const toggleHint = useCallback(() => {
    setShowHint(!showHint);
  }, [showHint]);

  const totalPuzzles = PUZZLE_LEVELS.reduce((total, level) => total + level.puzzles.length, 0);
  const solvedCount = solvedPuzzles.length;

  return {
    game,
    board,
    selectedSquare,
    legalMoveSquares,
    lastMove,
    checkedKingSquare,
    feedback,
    currentLevel,
    currentPuzzle,
    currentLevelIndex,
    currentPuzzleIndex,
    totalLevels: PUZZLE_LEVELS.length,
    totalPuzzles,
    solvedPuzzles,
    solvedCount,
    showHint,
    isWaitingForOpponent,
    handleSquareClick,
    resetPuzzle,
    nextPuzzle,
    prevPuzzle,
    goToLevel,
    toggleHint,
    PUZZLE_LEVELS,
  };
}