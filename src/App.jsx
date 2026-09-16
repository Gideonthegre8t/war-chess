import {
  useState,
  useCallback,
} from "react";

import "./App.css";

import ChessGame from "./components/Chess/ChessGame";
import Warzone from "./components/Warzone/Warzone";
import LandingPage from "./components/Landing/LandingPage";
import ChessClock, { TIME_CONTROLS } from "./components/ChessClock/ChessClock";

import {
  useChessGame,
} from "./hooks/useChessGame";

import {
  useMultiplayer,
} from "./hooks/useMultiplayer";

import {
  useChessCpu,
} from "./hooks/useChessCpu";

import {
  usePuzzles,
} from "./hooks/usePuzzles";

function App() {
  const [currentMode, setCurrentMode] = useState(null);
  const [cpuDifficulty, setCpuDifficulty] = useState("medium");
  const [playerColor] = useState("w");
  const [timeControl, setTimeControl] = useState("blitz");
  const [clockRunning, setClockRunning] = useState(false);
  const [isWhiteTurn, setIsWhiteTurn] = useState(true);

  const localGame = useChessGame();
  const cpuGame = useChessCpu(playerColor, cpuDifficulty);
  const puzzleGame = usePuzzles();
  const multiplayer = useMultiplayer();

  const [warzoneLevel, setWarzoneLevel] = useState("medium");

  const handleSelectMode = (mode) => {
    setCurrentMode(mode);
    setClockRunning(false);
    setIsWhiteTurn(true);
  };

  const handleBackToMenu = () => {
    setCurrentMode(null);
    localGame.resetGame();
    cpuGame.resetGame();
    puzzleGame.resetPuzzle();
    setClockRunning(false);
    setIsWhiteTurn(true);
  };

  const handleMoveMade = useCallback(() => {
    setIsWhiteTurn(prev => !prev);
    setClockRunning(true);
  }, []);

  const handleFlagFall = useCallback((color) => {
    setClockRunning(false);
    if (color === 'w') {
      alert('White ran out of time! Black wins!');
    } else {
      alert('Black ran out of time! White wins!');
    }
  }, []);

  // Render based on current mode
  if (!currentMode) {
    return (
      <div className="app">
        <LandingPage onSelectMode={handleSelectMode} />
      </div>
    );
  }

  // Get game state based on mode
  const getGameState = () => {
    switch (currentMode) {
      case 'multiplayer':
        return {
          game: localGame.game,
          board: localGame.board,
          selectedSquare: localGame.selectedSquare,
          legalMoveSquares: localGame.legalMoveSquares,
          lastMove: localGame.lastMove,
          promotionState: localGame.promotionState,
          checkedKingSquare: localGame.checkedKingSquare,
          feedback: localGame.feedback,
          gameResult: localGame.gameResult,
          handleSquareClick: localGame.handleSquareClick,
          handlePromotion: localGame.handlePromotion,
          resetGame: localGame.resetGame,
        };
      case 'cpu':
        return {
          game: cpuGame.game,
          board: cpuGame.board,
          selectedSquare: cpuGame.selectedSquare,
          legalMoveSquares: cpuGame.legalMoveSquares,
          lastMove: cpuGame.lastMove,
          promotionState: cpuGame.promotionState,
          checkedKingSquare: cpuGame.checkedKingSquare,
          feedback: cpuGame.feedback,
          gameResult: cpuGame.gameResult,
          handleSquareClick: cpuGame.handleSquareClick,
          handlePromotion: cpuGame.handlePromotion,
          resetGame: cpuGame.resetGame,
        };
      case 'puzzles':
        return {
          game: puzzleGame.game,
          board: puzzleGame.board,
          selectedSquare: puzzleGame.selectedSquare,
          legalMoveSquares: puzzleGame.legalMoveSquares,
          lastMove: puzzleGame.lastMove,
          promotionState: null,
          checkedKingSquare: puzzleGame.checkedKingSquare,
          feedback: puzzleGame.feedback,
          gameResult: { over: false },
          handleSquareClick: puzzleGame.handleSquareClick,
          handlePromotion: () => {},
          resetGame: puzzleGame.resetPuzzle,
        };
      default:
        return localGame;
    }
  };

  const gameState = getGameState();
  const showClock = currentMode === 'multiplayer' || (currentMode === 'cpu' && true); // Always show for now, can add toggle

  return (
    <div className="app">
      {/* TOP BAR */}
      <header className="topbar">
        <div>
          <div className="brand">
            KINGDOMS AT WAR
          </div>
          <div className="subtitle">
            {currentMode === 'multiplayer' && 'Battle friends online'}
            {currentMode === 'cpu' && 'Train against the computer'}
            {currentMode === 'puzzles' && 'Learn chess tactics'}
          </div>
        </div>

        <div className="topbar-actions">
          {currentMode === 'multiplayer' && multiplayer.roomCode && (
            <div className="room-code">
              Room: {multiplayer.roomCode}
            </div>
          )}
          
          {currentMode === 'cpu' && (
            <div className="control-group">
              <div className="difficulty-selector">
                <label>Difficulty:</label>
                <select
                  value={cpuDifficulty}
                  onChange={(e) => setCpuDifficulty(e.target.value)}
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div className="time-control-selector">
                <label>Time:</label>
                <select
                  value={timeControl}
                  onChange={(e) => setTimeControl(e.target.value)}
                >
                  {TIME_CONTROLS.map(tc => (
                    <option key={tc.id} value={tc.id}>{tc.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentMode === 'puzzles' && (
            <div className="puzzle-controls">
              <div className="level-selector">
                <label>Level:</label>
                <select
                  value={puzzleGame.currentLevelIndex}
                  onChange={(e) => puzzleGame.goToLevel(Number(e.target.value))}
                >
                  {puzzleGame.PUZZLE_LEVELS.map((level, index) => (
                    <option key={level.id} value={index}>
                      {level.id}. {level.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="puzzle-nav">
                <button onClick={puzzleGame.prevPuzzle}>← Prev</button>
                <span>{puzzleGame.currentPuzzleIndex + 1} / {puzzleGame.currentLevel.puzzles.length}</span>
                <button onClick={puzzleGame.nextPuzzle}>Next →</button>
              </div>

              <div className="puzzle-progress">
                Solved: {puzzleGame.solvedCount} / {puzzleGame.totalPuzzles}
              </div>
            </div>
          )}

          <button
            type="button"
            className="back-button"
            onClick={handleBackToMenu}
          >
            ← Menu
          </button>

          <button
            type="button"
            className="reset-button"
            onClick={() => {
              gameState.resetGame();
              setClockRunning(false);
              setIsWhiteTurn(true);
            }}
          >
            New Game
          </button>
        </div>
      </header>

      {/* FEEDBACK */}
      {gameState.feedback && (
        <div className={`game-feedback feedback-${gameState.feedback.type}`}>
          {gameState.feedback.message}
        </div>
      )}

      {/* PUZZLE INFO */}
      {currentMode === 'puzzles' && (
        <div className="puzzle-info">
          <div className="puzzle-level-badge">
            Level {puzzleGame.currentLevel.id}: {puzzleGame.currentLevel.title}
          </div>
          <div className="puzzle-title">{puzzleGame.currentPuzzle.title}</div>
          <div className="puzzle-category">
            {puzzleGame.currentLevel.category} • {puzzleGame.currentLevel.difficulty}
          </div>
          <div className="puzzle-concepts">
            Concepts: {puzzleGame.currentLevel.concepts.join(', ')}
          </div>
          {puzzleGame.showHint && (
            <div className="puzzle-hint">{puzzleGame.currentPuzzle.hint}</div>
          )}
          <button className="hint-button" onClick={puzzleGame.toggleHint}>
            {puzzleGame.showHint ? 'Hide Hint' : 'Show Hint'}
          </button>
        </div>
      )}

      {/* MAIN */}
      <main className="game-layout">
        <div className="game-main-content">
          {/* Chess Clock for Multiplayer */}
          {currentMode === 'multiplayer' && (
            <ChessClock
              isActive={isWhiteTurn}
              onTimeUp={handleFlagFall}
              timeControl={timeControl}
              isRunning={clockRunning}
              onFlagFall={handleFlagFall}
            />
          )}

          {/* Chess Clock for CPU (optional) */}
          {currentMode === 'cpu' && (
            <ChessClock
              isActive={isWhiteTurn}
              onTimeUp={handleFlagFall}
              timeControl={timeControl}
              isRunning={clockRunning}
              onFlagFall={handleFlagFall}
            />
          )}

          <ChessGame
            game={gameState.game}
            board={gameState.board}
            selectedSquare={gameState.selectedSquare}
            legalMoveSquares={gameState.legalMoveSquares}
            lastMove={gameState.lastMove}
            checkedKingSquare={gameState.checkedKingSquare}
            promotionState={gameState.promotionState}
            onSquareClick={(square) => {
              gameState.handleSquareClick(square);
              if (currentMode !== 'puzzles') {
                handleMoveMade();
              }
            }}
            onPromotion={gameState.handlePromotion}
            gameResult={gameState.gameResult}
            resetGame={gameState.resetGame}
          />
        </div>

        <Warzone
          warzoneLevel={warzoneLevel}
          setWarzoneLevel={setWarzoneLevel}
        />
      </main>
    </div>
  );
}

export default App;