import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

import "./App.css";

import ChessGame from "./components/Chess/ChessGame";
import MoveList from "./components/Chess/MoveList";
import Warzone from "./components/Warzone/Warzone";
import LandingPage from "./components/Landing/LandingPage";
import Lobby from "./components/Lobby/Lobby";
import { TIME_CONTROLS } from "./components/ChessClock/chessClockConstants";
import {
  useChessGame,
} from "./hooks/useChessGame";

import {
  useMultiplayerChess,
} from "./hooks/useMultiplayerChess";

import {
  useChessCpu,
} from "./hooks/useChessCpu";

import {
  usePuzzles,
} from "./hooks/usePuzzles";

const rollColor = (pref) => (pref === "random" ? (Math.random() < 0.5 ? "w" : "b") : pref);

function App() {
  const [currentMode, setCurrentMode] = useState(null);
  const [cpuDifficulty, setCpuDifficulty] = useState("medium");
  const [playerColorPreference, setPlayerColorPreference] = useState("w");
  const [playerColor, setPlayerColor] = useState("w");
  const [timeControl, setTimeControl] = useState("blitz");
  const [clockRunning, setClockRunning] = useState(false);
  const [clockResetKey, setClockResetKey] = useState(0);
  const [incrementSignal, setIncrementSignal] = useState(0);
  const lastMoveRef = useRef(null);
  const [retreatConfirm, setRetreatConfirm] = useState(false);

  // Latest hook instances, read via refs so derived callbacks can stay stable.
  const cpuGameRef = useRef();
  const localGameRef = useRef();

  const localGame = useChessGame();
  const cpuGame = useChessCpu(playerColor, cpuDifficulty);
  const puzzleGame = usePuzzles();
  const multiplayer = useMultiplayerChess();

  useEffect(() => {
    cpuGameRef.current = cpuGame;
  }, [cpuGame]);

  useEffect(() => {
    localGameRef.current = localGame;
  }, [localGame]);

  const [warzoneLevel, setWarzoneLevel] = useState("medium");

  // Unify each mode's hook behind the same interface.
  const getGameState = () => {
    switch (currentMode) {
      case 'multiplayer':
        return {
          game: multiplayer.game,
          board: multiplayer.board,
          selectedSquare: multiplayer.selectedSquare,
          legalMoveSquares: multiplayer.legalMoveSquares,
          lastMove: multiplayer.lastMove,
          promotionState: multiplayer.promotionState,
          checkedKingSquare: multiplayer.checkedKingSquare,
          feedback: multiplayer.feedback,
          gameResult: multiplayer.gameResult,
          handleSquareClick: multiplayer.handleSquareClick,
          handlePromotion: multiplayer.handlePromotion,
          resetGame: multiplayer.resetGame,
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
      case 'local':
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

  // The active clock player is always whoever is to move on the board.
  const activePlayer = gameState.game.turn() === 'w' ? 'w' : 'b';

  // Start the clock and credit the mover's increment only on a real move.
  useEffect(() => {
    const lm = gameState.lastMove;
    if (lm === lastMoveRef.current) return;
    lastMoveRef.current = lm;
    if (lm) {
      setClockRunning(true);
      setIncrementSignal((s) => s + 1);
    } else {
      setIncrementSignal(0);
    }
  }, [gameState.lastMove]);

  // Stop the clock whenever the game is over.
  useEffect(() => {
    if (gameState.gameResult?.over) {
      setClockRunning(false);
    }
  }, [gameState.gameResult?.over]);

  const handleSelectMode = (mode) => {
    setCurrentMode(mode);
    if (mode === 'cpu') {
      setPlayerColor(rollColor(playerColorPreference));
    }
    setClockRunning(false);
    lastMoveRef.current = null;
    setIncrementSignal(0);
  };

  const handleBackToMenu = () => {
    setCurrentMode(null);
    localGame.resetGame();
    cpuGame.resetGame();
    puzzleGame.resetPuzzle();
    multiplayer.resetGame();
    setClockRunning(false);
    setRetreatConfirm(false);
    lastMoveRef.current = null;
    setIncrementSignal(0);
    setClockResetKey(k => k + 1);
  };

  const handleNewGame = () => {
    if (currentMode === 'multiplayer') {
      multiplayer.requestNewGame(timeControl);
    } else if (currentMode === 'cpu') {
      setPlayerColor(rollColor(playerColorPreference));
      cpuGame.resetGame();
    } else {
      gameState.resetGame();
    }
    setClockRunning(false);
    setRetreatConfirm(false);
    lastMoveRef.current = null;
    setIncrementSignal(0);
    setClockResetKey(k => k + 1);
  };

  const handleRetreat = () => {
    if (currentMode === 'multiplayer') {
      multiplayer.resign();
    } else if (currentMode === 'cpu') {
      cpuGame.resign();
    } else if (currentMode === 'local') {
      localGame.resign(gameState.game.turn());
    }
    setClockRunning(false);
    setRetreatConfirm(false);
  };

  const handleFlagFall = useCallback((color) => {
    setClockRunning(false);
    // Multiplayer flag fall is decided by the server (P0-1) — the client only
    // acts on the server's `opponent-flag-fall` in the hook.
    if (currentMode === 'cpu') {
      cpuGameRef.current?.setTimeoutLoser(color);
    } else if (currentMode === 'local') {
      localGameRef.current?.setTimeoutLoser(color);
    }
  }, [currentMode]);

  // Clock props handed to ChessGame, which draws a clock bar directly above and
  // below the board (chess.com-style). Null when the mode has no clock.
  const isClockMode = currentMode === 'multiplayer' || currentMode === 'cpu' || currentMode === 'local';
  const orientation = currentMode === 'multiplayer'
    ? (multiplayer.playerColor || 'w')
    : (currentMode === 'cpu' ? playerColor : 'w');

  const clockProps = isClockMode
    ? {
        activePlayer,
        timeControl,
        isRunning: clockRunning,
        onFlagFall: (currentMode === 'cpu' || currentMode === 'local') ? handleFlagFall : undefined,
        resetKey: clockResetKey + (currentMode === 'multiplayer' ? multiplayer.resetSignal : 0),
        incrementTick: incrementSignal,
        serverSync: currentMode === 'multiplayer' ? multiplayer.clockSync : null,
        orientation,
        playerColor: currentMode === 'multiplayer'
          ? multiplayer.playerColor
          : (currentMode === 'cpu' ? playerColor : null),
      }
    : null;

  if (!currentMode) {
    return (
      <div className="app">
        <LandingPage onSelectMode={handleSelectMode} />
      </div>
    );
  }

  // Multiplayer: show lobby if game hasn't started
  if (currentMode === 'multiplayer' && !multiplayer.gameStarted) {
    return (
      <div className="app">
        <header className="topbar">
          <div>
            <div className="brand">KINGDOMS AT WAR</div>
            <div className="subtitle">Battle friends online</div>
          </div>
          <div className="topbar-actions">
            <button
              type="button"
              className="back-button"
              onClick={handleBackToMenu}
            >
              ← Menu
            </button>
          </div>
        </header>

        <main className="game-layout">
          <Lobby
            onCreateRoom={(cb) => multiplayer.createRoom(timeControl, cb)}
            onJoinRoom={multiplayer.joinRoom}
            isConnected={multiplayer.isConnected}
          />
        </main>
      </div>
    );
  }

  // Get game state based on mode
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
            {currentMode === 'local' && 'Two commanders on one screen'}
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
              <div className="side-selector">
                <label>Side:</label>
                <select
                  value={playerColorPreference}
                  onChange={(e) => {
                    const pref = e.target.value;
                    setPlayerColorPreference(pref);
                    const chosen = rollColor(pref);
                    setPlayerColor(chosen);
                    cpuGame.resetGame();
                    setClockRunning(false);
                    lastMoveRef.current = null;
                    setIncrementSignal(0);
                    setClockResetKey(k => k + 1);
                  }}
                >
                  <option value="w">White (♔)</option>
                  <option value="b">Black (♚)</option>
                  <option value="random">Random (🎲)</option>
                </select>
              </div>

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
                  onChange={(e) => {
                    setTimeControl(e.target.value);
                    if (!clockRunning && !gameState.lastMove) {
                      setClockResetKey(k => k + 1);
                    }
                  }}
                >
                  {TIME_CONTROLS.map(tc => (
                    <option key={tc.id} value={tc.id}>{tc.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentMode === 'local' && (
            <div className="control-group">
              <div className="time-control-selector">
                <label>Time:</label>
                <select
                  value={timeControl}
                  onChange={(e) => {
                    setTimeControl(e.target.value);
                    if (!clockRunning && !gameState.lastMove) {
                      setClockResetKey(k => k + 1);
                    }
                  }}
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

          {(currentMode === 'multiplayer' || currentMode === 'cpu') && (
            <button
              type="button"
              className="draw-offer-button"
              disabled={Boolean(currentMode === 'multiplayer' && multiplayer.drawOffer)}
              onClick={() => {
                if (currentMode === 'multiplayer') {
                  multiplayer.offerDraw();
                } else {
                  cpuGame.offerDraw();
                }
              }}
            >
              🤝 Offer Draw
            </button>
          )}

          {(currentMode === 'multiplayer' || currentMode === 'cpu' || currentMode === 'local') && (
            <button
              type="button"
              className={`retreat-button${retreatConfirm ? ' retreat-confirm' : ''}`}
              onClick={() => {
                if (retreatConfirm) {
                  handleRetreat();
                } else {
                  setRetreatConfirm(true);
                  setTimeout(() => setRetreatConfirm(false), 4000);
                }
              }}
            >
              {retreatConfirm ? 'Confirm Retreat?' : '🏳 Retreat'}
            </button>
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
            onClick={handleNewGame}
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

      {/* PENDING DRAW */}
      {currentMode === 'multiplayer' && multiplayer.drawOffer && (
        <div className="draw-banner">
          {multiplayer.drawOffer.direction === 'received' ? (
            <>
              <span className="draw-banner-text">
                🤝 {multiplayer.drawOffer.color === 'w' ? 'White' : 'Black'} offers a draw
              </span>
              <div className="draw-banner-actions">
                <button
                  type="button"
                  className="draw-action-button draw-accept"
                  onClick={multiplayer.acceptDraw}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="draw-action-button"
                  onClick={multiplayer.declineDraw}
                >
                  Decline
                </button>
              </div>
            </>
          ) : (
            <>
              <span className="draw-banner-text">
                🤝 Draw offered — awaiting response…
              </span>
              <div className="draw-banner-actions">
                <button
                  type="button"
                  className="draw-action-button"
                  onClick={multiplayer.cancelDraw}
                >
                  Cancel
                </button>
              </div>
            </>
          )}
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
          <ChessGame
            game={gameState.game}
            board={gameState.board}
            selectedSquare={gameState.selectedSquare}
            legalMoveSquares={gameState.legalMoveSquares}
            lastMove={gameState.lastMove}
            checkedKingSquare={gameState.checkedKingSquare}
            promotionState={gameState.promotionState}
            onSquareClick={gameState.handleSquareClick}
            onPromotion={gameState.handlePromotion}
            gameResult={gameState.gameResult}
            resetGame={currentMode === 'multiplayer'
              ? multiplayer.requestNewGame
              : gameState.resetGame}
            warzoneLevel={warzoneLevel}
            clock={clockProps}
          />

          <MoveList
            game={gameState.game}
            notes={currentMode === 'multiplayer' ? multiplayer.battleLog : []}
          />
        </div>

        <Warzone
          warzoneLevel={warzoneLevel}
          setWarzoneLevel={setWarzoneLevel}
          lastMove={gameState.lastMove}
          gameResult={gameState.gameResult}
          game={gameState.game}
        />
      </main>
    </div>
  );
}

export default App;
