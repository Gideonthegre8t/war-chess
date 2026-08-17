import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import "./App.css";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

const pieceSymbols = {
  p: "♟",
  r: "♜",
  n: "♞",
  b: "♝",
  q: "♛",
  k: "♚",
};

/* =========================================================
   SOUND SYSTEM
========================================================= */

const playSound = (type) => {
  try {
    const AudioContext =
      window.AudioContext || window.webkitAudioContext;

    if (!AudioContext) return;

    const audioContext = new AudioContext();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    let frequency = 440;
    let duration = 0.08;
    let volume = 0.08;
    let wave = "sine";

    switch (type) {
      case "move":
        frequency = 420;
        duration = 0.07;
        volume = 0.07;
        wave = "triangle";
        break;

      case "capture":
        frequency = 240;
        duration = 0.12;
        volume = 0.1;
        wave = "square";
        break;

      case "illegal":
        frequency = 130;
        duration = 0.18;
        volume = 0.1;
        wave = "sawtooth";
        break;

      case "check":
        frequency = 620;
        duration = 0.18;
        volume = 0.1;
        wave = "triangle";
        break;

      case "checkmate":
        frequency = 180;
        duration = 0.4;
        volume = 0.12;
        wave = "sawtooth";
        break;

      default:
        break;
    }

    oscillator.type = wave;

    oscillator.frequency.setValueAtTime(
      frequency,
      audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(
      volume,
      audioContext.currentTime
    );

    gainNode.gain.exponentialRampToValueAtTime(
      0.001,
      audioContext.currentTime + duration
    );

    oscillator.start();

    oscillator.stop(
      audioContext.currentTime + duration
    );

    oscillator.onended = () => {
      audioContext.close();
    };
  } catch (error) {
    console.warn("Sound could not be played:", error);
  }
};

/* =========================================================
   GAME STATE HELPER

   IMPORTANT:
   We do NOT recreate the game from FEN after every move.

   Instead, after a move, we rebuild the Chess instance
   by replaying the complete move history.

   This means chess.js keeps its internal history, which
   is important for:
   - Threefold repetition
   - Move history
   - Draw detection
   - Future multiplayer support
========================================================= */

const createGameFromHistory = (sourceGame) => {
  const nextGame = new Chess();

  const history = sourceGame.history({
    verbose: true,
  });

  history.forEach((move) => {
    const moveData = {
      from: move.from,
      to: move.to,
    };

    if (move.promotion) {
      moveData.promotion = move.promotion;
    }

    nextGame.move(moveData);
  });

  return nextGame;
};

/* =========================================================
   APP
========================================================= */

function App() {
  const [game, setGame] = useState(() => new Chess());

  const [selectedSquare, setSelectedSquare] =
    useState(null);

  const [warzoneLevel, setWarzoneLevel] =
    useState("medium");

  const [lastMove, setLastMove] =
    useState(null);

  const [battleMessage, setBattleMessage] =
    useState(
      "The armies await your command."
    );

  const [feedback, setFeedback] =
    useState(null);

  /*
    Promotion remains LOCAL UI state.

    This is important for future multiplayer:
    the opponent will never receive this selector.
  */
  const [promotionState, setPromotionState] =
    useState(null);

  const board = useMemo(
    () => game.board(),
    [game]
  );

  /* =========================================================
     LEGAL MOVES
  ========================================================= */

  const legalMoves = selectedSquare
    ? game.moves({
        square: selectedSquare,
        verbose: true,
      })
    : [];

  const legalMoveSquares =
    legalMoves.map(
      (move) => move.to
    );

  /* =========================================================
     GAME STATUS
  ========================================================= */

  const isCheckmate = game.isCheckmate();
  const isCheck = game.isCheck();
  const isStalemate =
    typeof game.isStalemate === "function"
      ? game.isStalemate()
      : false;

  const isThreefold =
    typeof game.isThreefoldRepetition === "function"
      ? game.isThreefoldRepetition()
      : false;

  const isFiftyMoveDraw =
    typeof game.isDrawByFiftyMoves === "function"
      ? game.isDrawByFiftyMoves()
      : false;

  const isInsufficientMaterial =
    typeof game.isInsufficientMaterial === "function"
      ? game.isInsufficientMaterial()
      : false;

  const isDraw =
    typeof game.isDraw === "function"
      ? game.isDraw()
      : false;

  /* =========================================================
     FEEDBACK
  ========================================================= */

  const showFeedback = (message, type) => {
    setFeedback({
      message,
      type,
    });

    setTimeout(() => {
      setFeedback(null);
    }, 1600);
  };

  /* =========================================================
     FIND KING
  ========================================================= */

  const findKingSquare = (color) => {
    const currentBoard = game.board();

    for (
      let row = 0;
      row < currentBoard.length;
      row++
    ) {
      for (
        let column = 0;
        column < currentBoard[row].length;
        column++
      ) {
        const square =
          currentBoard[row][column];

        if (
          square &&
          square.type === "k" &&
          square.color === color
        ) {
          return (
            files[column] +
            ranks[row]
          );
        }
      }
    }

    return null;
  };

  const checkedKingSquare = isCheck
    ? findKingSquare(game.turn())
    : null;

  /* =========================================================
     GAME STATUS TEXT
  ========================================================= */

  const getGameStatus = () => {
    if (isCheckmate) {
      return "CHECKMATE";
    }

    if (isStalemate) {
      return "STALEMATE";
    }

    if (isThreefold) {
      return "DRAW — THREEFOLD REPETITION";
    }

    if (isFiftyMoveDraw) {
      return "DRAW — 50 MOVE RULE";
    }

    if (isInsufficientMaterial) {
      return "DRAW — INSUFFICIENT MATERIAL";
    }

    if (isDraw) {
      return "DRAW";
    }

    if (isCheck) {
      return "CHECK";
    }

    return "Game in progress";
  };

  /* =========================================================
     HANDLE NORMAL MOVE
  ========================================================= */

  const executeMove = (
    from,
    to,
    promotion = undefined
  ) => {
    const movingPiece =
      game.get(from);

    const capturedPiece =
      game.get(to);

    const moveData = {
      from,
      to,
    };

    if (promotion) {
      moveData.promotion = promotion;
    }

    const move = game.move(moveData);

    /*
      The current game now contains the move and
      complete internal history.

      Build a fresh React state object by replaying
      that history.
    */
    const nextGame =
      createGameFromHistory(game);

    /* -----------------------------------------
       SOUND
    ----------------------------------------- */

    if (nextGame.isCheckmate()) {
      playSound("checkmate");
    } else if (nextGame.isCheck()) {
      playSound("check");
    } else if (capturedPiece) {
      playSound("capture");
    } else {
      playSound("move");
    }

    /* -----------------------------------------
       UPDATE STATE
    ----------------------------------------- */

    setGame(nextGame);

    setSelectedSquare(null);

    setLastMove({
      from: move.from,
      to: move.to,
      captured: Boolean(capturedPiece),
      piece: movingPiece?.type,
      promotion: promotion || null,
    });

    /* -----------------------------------------
       CHESS FEEDBACK
    ----------------------------------------- */

    if (nextGame.isCheckmate()) {
      showFeedback(
        "👑 CHECKMATE",
        "checkmate"
      );
    } else if (nextGame.isCheck()) {
      showFeedback(
        "CHECK",
        "check"
      );
    } else if (
      typeof nextGame.isThreefoldRepetition ===
        "function" &&
      nextGame.isThreefoldRepetition()
    ) {
      showFeedback(
        "DRAW — THREEFOLD REPETITION",
        "draw"
      );
    } else if (
      typeof nextGame.isStalemate ===
        "function" &&
      nextGame.isStalemate()
    ) {
      showFeedback(
        "DRAW — STALEMATE",
        "draw"
      );
    } else if (
      typeof nextGame.isDrawByFiftyMoves ===
        "function" &&
      nextGame.isDrawByFiftyMoves()
    ) {
      showFeedback(
        "DRAW — 50 MOVE RULE",
        "draw"
      );
    } else if (
      typeof nextGame.isInsufficientMaterial ===
        "function" &&
      nextGame.isInsufficientMaterial()
    ) {
      showFeedback(
        "DRAW — INSUFFICIENT MATERIAL",
        "draw"
      );
    }

    /* -----------------------------------------
       WARZONE
    ----------------------------------------- */

    createBattleMessage(
      nextGame,
      move,
      capturedPiece
    );
  };

  /* =========================================================
     HANDLE SQUARE CLICK
  ========================================================= */

  const handleSquareClick = (square) => {
    /*
      While promotion choices are visible,
      prevent other moves.
    */
    if (promotionState) {
      return;
    }

    /*
      Don't allow moves after game over.
    */
    if (
      isCheckmate ||
      isStalemate ||
      isDraw ||
      isThreefold ||
      isFiftyMoveDraw ||
      isInsufficientMaterial
    ) {
      return;
    }

    const piece = game.get(square);

    /* -----------------------------------------
       NOTHING SELECTED
    ----------------------------------------- */

    if (!selectedSquare) {
      if (
        piece &&
        piece.color === game.turn()
      ) {
        setSelectedSquare(square);
      }

      return;
    }

    /* -----------------------------------------
       SELECT ANOTHER FRIENDLY PIECE
    ----------------------------------------- */

    if (
      piece &&
      piece.color === game.turn()
    ) {
      setSelectedSquare(square);
      return;
    }

    /* -----------------------------------------
       CLICK SAME SQUARE
    ----------------------------------------- */

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    /* -----------------------------------------
       ILLEGAL MOVE
    ----------------------------------------- */

    if (
      !legalMoveSquares.includes(square)
    ) {
      playSound("illegal");

      showFeedback(
        "🚫 Illegal move",
        "illegal"
      );

      setSelectedSquare(null);

      return;
    }

    /* -----------------------------------------
       LEGAL MOVE
    ----------------------------------------- */

    try {
      const movingPiece =
        game.get(selectedSquare);

      /*
        Promotion must be chosen by the player.

        We deliberately DO NOT execute the move yet.
      */
      const isPromotion =
        movingPiece?.type === "p" &&
        (
          (
            movingPiece.color === "w" &&
            square[1] === "8"
          ) ||
          (
            movingPiece.color === "b" &&
            square[1] === "1"
          )
        );

      if (isPromotion) {
        setPromotionState({
          from: selectedSquare,
          to: square,
          color: movingPiece.color,
          capturedPiece: game.get(square),
        });

        /*
          Keep the pawn where it is until
          the player selects Q/R/B/N.
        */
        setSelectedSquare(null);

        return;
      }

      /*
        Normal move.
      */
      executeMove(
        selectedSquare,
        square
      );
    } catch (error) {
      console.error(
        "Move failed:",
        error
      );

      playSound("illegal");

      showFeedback(
        "🚫 Illegal move",
        "illegal"
      );

      setSelectedSquare(null);
    }
  };

  /* =========================================================
     HANDLE PROMOTION
  ========================================================= */

  const handlePromotion = (pieceType) => {
    if (!promotionState) {
      return;
    }

    try {
      const {
        from,
        to,
      } = promotionState;

      /*
        Execute the pawn move only now,
        using the player's selected piece.
      */
      executeMove(
        from,
        to,
        pieceType
      );

      /*
        The promotion selector disappears
        only after the move is successfully
        committed.
      */
      setPromotionState(null);
    } catch (error) {
      console.error(
        "Promotion failed:",
        error
      );

      playSound("illegal");

      showFeedback(
        "Promotion failed",
        "illegal"
      );
    }
  };

  /* =========================================================
     WARZONE COMMENTARY
  ========================================================= */

  const createBattleMessage = (
    currentGame,
    move,
    capturedPiece
  ) => {
    const pieceNames = {
      p: "Infantry",
      n: "Cavalry",
      b: "Archers",
      r: "Heavy forces",
      q: "Royal Guard",
      k: "King's Guard",
    };

    const movingUnit =
      pieceNames[move.piece] ||
      "Army";

    if (currentGame.isCheckmate()) {
      setBattleMessage(
        "The enemy command has fallen. The kingdom stands victorious."
      );
    } else if (currentGame.isCheck()) {
      setBattleMessage(
        "The enemy king is under attack! The opposing army is retreating."
      );
    } else if (
      typeof currentGame.isThreefoldRepetition ===
        "function" &&
      currentGame.isThreefoldRepetition()
    ) {
      setBattleMessage(
        "The armies have returned to the same battlefield position. Neither kingdom can gain the advantage."
      );
    } else if (
      typeof currentGame.isStalemate ===
        "function" &&
      currentGame.isStalemate()
    ) {
      setBattleMessage(
        "The battlefield is locked. The opposing commander has no legal move."
      );
    } else if (
      typeof currentGame.isDrawByFiftyMoves ===
        "function" &&
      currentGame.isDrawByFiftyMoves()
    ) {
      setBattleMessage(
        "The battle has raged too long without a decisive capture or advance."
      );
    } else if (
      typeof currentGame.isInsufficientMaterial ===
        "function" &&
      currentGame.isInsufficientMaterial()
    ) {
      setBattleMessage(
        "Both kingdoms lack enough forces to deliver a decisive victory."
      );
    } else if (capturedPiece) {
      setBattleMessage(
        `${movingUnit} has attacked and destroyed an enemy unit.`
      );
    } else if (
      move.piece === "p"
    ) {
      setBattleMessage(
        "Infantry has advanced across the battlefield."
      );
    } else if (
      move.piece === "n"
    ) {
      setBattleMessage(
        "Cavalry has maneuvered into a new position."
      );
    } else if (
      move.piece === "b"
    ) {
      setBattleMessage(
        "Archers have taken position on the battlefield."
      );
    } else if (
      move.piece === "r"
    ) {
      setBattleMessage(
        "Heavy forces have advanced toward enemy territory."
      );
    } else if (
      move.piece === "q"
    ) {
      setBattleMessage(
        "The Royal Guard has entered the field."
      );
    } else {
      setBattleMessage(
        `${movingUnit} has advanced across the battlefield.`
      );
    }
  };

  /* =========================================================
     RESET
  ========================================================= */

  const resetGame = () => {
    setGame(new Chess());

    setSelectedSquare(null);

    setLastMove(null);

    setPromotionState(null);

    setBattleMessage(
      "The armies await your command."
    );

    setFeedback(null);
  };

  /* =========================================================
     BOARD HELPERS
  ========================================================= */

  const isLastMoveSquare = (square) => {
    if (!lastMove) {
      return false;
    }

    return (
      lastMove.from === square ||
      lastMove.to === square
    );
  };

  const isLegalDestination = (square) => {
    return legalMoveSquares.includes(
      square
    );
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="app">

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <header className="topbar">
        <div>
          <div className="brand">
            KINGDOMS AT WAR
          </div>

          <div className="subtitle">
            Every move is a command. Every
            capture changes the war.
          </div>
        </div>

        <button
          type="button"
          className="reset-button"
          onClick={resetGame}
        >
          New Battle
        </button>
      </header>

      {/* =====================================================
          FEEDBACK
      ===================================================== */}

      {feedback && (
        <div
          className={`game-feedback feedback-${feedback.type}`}
        >
          {feedback.message}
        </div>
      )}

      {/* =====================================================
          MAIN GAME
      ===================================================== */}

      <main className="game-layout">

        {/* ===================================================
            CHESS
        =================================================== */}

        <section className="chess-panel">

          <div className="panel-header">
            <div>
              <span className="panel-label">
                PRIMARY
              </span>

              <h1>Chess</h1>
            </div>

            <div className="turn-indicator">
              {game.turn() === "w"
                ? "WHITE TO MOVE"
                : "BLACK TO MOVE"}
            </div>
          </div>

          {/* PLAYER INFO */}

          <div className="player-info">

            <div className="player">
              <span className="player-piece white-piece">
                ♔
              </span>

              <div>
                <strong>
                  White Kingdom
                </strong>

                <small>
                  Commander
                </small>
              </div>
            </div>

            <div className="player">

              <div className="player-text-right">
                <strong>
                  Black Kingdom
                </strong>

                <small>
                  Commander
                </small>
              </div>

              <span className="player-piece black-piece">
                ♚
              </span>

            </div>

          </div>

      {/* ===================================================
    CHESS BOARD
=================================================== */}

<div className="board-wrapper">

  <div className="board">

    {board.map((row, rowIndex) =>
      row.map((square, columnIndex) => {

        const squareName =
          files[columnIndex] + ranks[rowIndex];

        const isDark =
          (rowIndex + columnIndex) % 2 === 1;

        const isSelected =
          selectedSquare === squareName;

        const isLegal =
          isLegalDestination(squareName);

        const isLastMove =
          isLastMoveSquare(squareName);

        const isCheckedKing =
          checkedKingSquare === squareName;

        return (
          <button
            type="button"
            key={squareName}
            className={[
              "square",

              isDark
                ? "dark-square"
                : "light-square",

              isSelected
                ? "selected-square"
                : "",

              isLastMove
                ? lastMove?.to === squareName
                  ? "last-move-square last-move-destination"
                  : "last-move-square"
                : "",

              isCheckedKing
                ? "check-square"
                : "",
            ].join(" ")}

            onClick={() =>
              handleSquareClick(squareName)
            }
          >

            {/* PIECE */}

            {square && (
              <span
                className={
                  square.color === "w"
                    ? "piece white-piece"
                    : "piece black-piece"
                }
              >
                {pieceSymbols[square.type]}
              </span>
            )}

            {/* LEGAL MOVE */}

            {isLegal && !square && (
              <span className="move-dot" />
            )}

            {/* CAPTURE */}

            {isLegal && square && (
              <span className="capture-ring" />
            )}

          </button>
        );
      })
    )}

    {/* =====================================================
        CENTERED PROMOTION SELECTOR

        IMPORTANT:
        This is OUTSIDE the individual chess squares.

        Therefore:
        - It cannot be clipped by a1/h1/a8/h8.
        - It always appears in the center.
        - It does not move the pawn.
        - The player chooses Q/R/B/N.
    ===================================================== */}

    {promotionState && (
      <div
        className={`promotion-overlay ${
          promotionState.color === "w"
            ? "promotion-overlay-white"
            : "promotion-overlay-black"
        }`}
        onClick={(event) =>
          event.stopPropagation()
        }
      >

        <div className="promotion-title">
          PROMOTE PAWN
        </div>

        <div className="promotion-options">

          {/* QUEEN */}

          <div
            className="promotion-choice"
            role="button"
            tabIndex={0}
            onClick={() =>
              handlePromotion("q")
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                handlePromotion("q");
              }
            }}
          >
            <span className="promotion-piece">
              {promotionState.color === "w"
                ? "♕"
                : "♛"}
            </span>

            <span className="promotion-label">
              QUEEN
            </span>
          </div>

          {/* ROOK */}

          <div
            className="promotion-choice"
            role="button"
            tabIndex={0}
            onClick={() =>
              handlePromotion("r")
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                handlePromotion("r");
              }
            }}
          >
            <span className="promotion-piece">
              {promotionState.color === "w"
                ? "♖"
                : "♜"}
            </span>

            <span className="promotion-label">
              ROOK
            </span>
          </div>

          {/* BISHOP */}

          <div
            className="promotion-choice"
            role="button"
            tabIndex={0}
            onClick={() =>
              handlePromotion("b")
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                handlePromotion("b");
              }
            }}
          >
            <span className="promotion-piece">
              {promotionState.color === "w"
                ? "♗"
                : "♝"}
            </span>

            <span className="promotion-label">
              BISHOP
            </span>
          </div>

          {/* KNIGHT */}

          <div
            className="promotion-choice"
            role="button"
            tabIndex={0}
            onClick={() =>
              handlePromotion("n")
            }
            onKeyDown={(event) => {
              if (
                event.key === "Enter" ||
                event.key === " "
              ) {
                handlePromotion("n");
              }
            }}
          >
            <span className="promotion-piece">
              {promotionState.color === "w"
                ? "♘"
                : "♞"}
            </span>

            <span className="promotion-label">
              KNIGHT
            </span>
          </div>

        </div>
      </div>
    )}

  </div>

</div>

          {/* STATUS */}

          <div className="chess-status">
            {getGameStatus()}
          </div>

          {/* MOVE COUNT */}

          <div className="move-history">
            <span>
              Moves
            </span>

            <strong>
              {game.history().length}
            </strong>
          </div>

        </section>

        {/* ===================================================
            WARZONE
        =================================================== */}

        <section className="warzone-panel">

          <div className="panel-header">

            <div>

              <span className="panel-label">
                SECONDARY
              </span>

              <h1>
                Warzone
              </h1>

            </div>

            <div className="war-status">
              LIVE
            </div>

          </div>

          <div className="warzone">

            <div className="sky" />

            {/* WHITE CASTLE */}

            <div className="castle castle-white">

              <div className="castle-flag">
                ⚑
              </div>

              <div className="castle-body">
                ♜
              </div>

              <span>
                WHITE
              </span>

            </div>

            {/* BATTLEFIELD */}

            <div className="battlefield">

              <div className="territory territory-white" />

              <div className="territory territory-black" />

              <div className="mountain mountain-one" />

              <div className="mountain mountain-two" />

              {/* WHITE ARMY */}

              <div
                className={`army army-white war-${warzoneLevel}`}
              >
                <span>⚔</span>
                <span>⚔</span>
                <span>⚔</span>
                <span>🏹</span>
                <span>⚔</span>
              </div>

              {/* BLACK ARMY */}

              <div
                className={`army army-black war-${warzoneLevel}`}
              >
                <span>⚔</span>
                <span>🏹</span>
                <span>⚔</span>
                <span>⚔</span>
                <span>🏹</span>
              </div>

              {/* BATTLE LINE */}

              <div className="battle-line">

                <span>⚔</span>
                <span>⚔</span>
                <span>⚔</span>

              </div>

            </div>

            {/* BLACK CASTLE */}

            <div className="castle castle-black">

              <div className="castle-flag">
                ⚑
              </div>

              <div className="castle-body">
                ♜
              </div>

              <span>
                BLACK
              </span>

            </div>

            {/* COMMENTARY */}

            <div className="battle-message">

              <span className="message-icon">
                ⚔
              </span>

              {battleMessage}

            </div>

          </div>

          {/* WARZONE CONTROLS */}

          <div className="warzone-controls">

            <div className="control-title">
              Warzone Intensity
            </div>

            <div className="intensity-buttons">

              {[
                "off",
                "low",
                "medium",
                "high",
              ].map((level) => (

                <button
                  type="button"
                  key={level}
                  className={
                    warzoneLevel ===
                    level
                      ? "active-intensity"
                      : ""
                  }
                  onClick={() =>
                    setWarzoneLevel(
                      level
                    )
                  }
                >
                  {level}
                </button>

              ))}

            </div>

          </div>

        </section>

      </main>

    </div>
  );
}

export default App;