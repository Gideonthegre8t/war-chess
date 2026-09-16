function ChessStatus({
  game,
}) {
  let status =
    "Game in progress";

  if (game.isCheckmate()) {
    status = "CHECKMATE";
  } else if (game.isCheck()) {
    status = "CHECK";
  } else if (game.isDraw()) {
    status = "DRAW";
  }

  const moveCount =
    game.history().length;

  const lastSide =
    moveCount === 0
      ? null
      : moveCount % 2 === 1
        ? "WHITE"
        : "BLACK";

  return (
    <>
      <div className="chess-status">
        {status}
      </div>

      <div className="move-history">
        <span>
          Moves
        </span>

        <strong>
          {moveCount}
        </strong>

        {lastSide && (
          <span>
            {lastSide}
          </span>
        )}
      </div>
    </>
  );
}

export default ChessStatus;