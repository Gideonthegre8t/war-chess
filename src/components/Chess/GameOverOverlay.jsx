export default function GameOverOverlay({
  gameResult,
  onReset,
}) {
  if (!gameResult?.over) {
    return null;
  }

  const {
    type,
    message,
    winner,
  } = gameResult;

  const isCheckmate =
    type === "checkmate";

  const isResignation =
    type === "resignation";

  const isTimeout =
    type === "timeout";

  const isDrawAgreed =
    type === "draw-agreed";

  const hasWinner =
    isCheckmate || isResignation || isTimeout;

  const winnerKingdom =
    hasWinner
      ? winner === "w"
        ? "WHITE KINGDOM"
        : "BLACK KINGDOM"
      : null;

  const resultLabel =
    isResignation
      ? "CONCEDED"
      : isCheckmate
        ? "VICTORY"
        : isTimeout
          ? "LOST ON TIME"
          : "DRAW";

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">

        <div className="game-over-icon">
          {isCheckmate ? "♛" : (isResignation ? "🏳" : (isTimeout ? "⏰" : "🤝"))}
        </div>

        <div className="game-over-label">
          GAME OVER
        </div>

        <h2 className="game-over-title">
          {message}
        </h2>

        {winnerKingdom && (
          <p className="game-over-winner">
            {winnerKingdom} VICTORIOUS
          </p>
        )}

        <div className="game-over-result">
          {resultLabel}
        </div>

        {isCheckmate && (
          <p className="game-over-description">
            The king has been checkmated.
          </p>
        )}

        {isResignation && (
          <p className="game-over-description">
            The losing kingdom has retreated from
            the battlefield and conceded the war.
          </p>
        )}

        {isTimeout && (
          <p className="game-over-description">
            The battlefield clock has run dry.
          </p>
        )}

        {isDrawAgreed && (
          <p className="game-over-description">
            Both commanders agreed to end this
            war in peace.
          </p>
        )}

        {type === "stalemate" && (
          <p className="game-over-description">
            The player to move has no legal moves,
            but their king is not in check.
          </p>
        )}

        {type === "insufficient-material" && (
          <p className="game-over-description">
            Neither side has enough material to
            force checkmate.
          </p>
        )}

        {type === "threefold-repetition" && (
          <p className="game-over-description">
            The same position occurred three times.
          </p>
        )}

        {type === "fifty-move" && (
          <p className="game-over-description">
            50 moves were completed without a pawn
            move or capture.
          </p>
        )}

        {type === "seventy-five-move" && (
          <p className="game-over-description">
            75 moves were completed without a pawn
            move or capture.
          </p>
        )}

        {type === "fivefold-repetition" && (
          <p className="game-over-description">
            The same position occurred five times.
          </p>
        )}

        <button
          type="button"
          className="game-over-button"
          onClick={onReset}
        >
          PLAY AGAIN
        </button>

      </div>
    </div>
  );
}