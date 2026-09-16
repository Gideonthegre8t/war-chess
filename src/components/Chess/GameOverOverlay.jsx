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

  const winnerKingdom =
    isCheckmate
      ? winner === "w"
        ? "WHITE KINGDOM"
        : "BLACK KINGDOM"
      : null;

  return (
    <div className="game-over-overlay">
      <div className="game-over-card">

        <div className="game-over-icon">
          {isCheckmate ? "♛" : "🤝"}
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
          {isCheckmate ? "VICTORY" : "DRAW"}
        </div>

        {isCheckmate && (
          <p className="game-over-description">
            The king has been checkmated.
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