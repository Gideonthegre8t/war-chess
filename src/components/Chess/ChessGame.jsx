import PlayerInfo from "./PlayerInfo";
import ChessBoard from "./ChessBoard";
import ChessStatus from "./ChessStatus";

function ChessGame({
  game,
  board,
  selectedSquare,
  legalMoveSquares,
  lastMove,
  checkedKingSquare,
  promotionState,
  onSquareClick,
  onPromotion,
  gameResult,
  resetGame,
}) {
  return (
    <section className="chess-panel">

      {/* =========================
          HEADER
      ========================= */}

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


      {/* =========================
          PLAYERS
      ========================= */}

      <PlayerInfo />


      {/* =========================
          CHESS BOARD
      ========================= */}

      <ChessBoard
        board={board}
        selectedSquare={selectedSquare}
        legalMoveSquares={legalMoveSquares}
        lastMove={lastMove}
        checkedKingSquare={checkedKingSquare}
        promotionState={promotionState}
        onSquareClick={onSquareClick}
        onPromotion={onPromotion}
        gameResult={gameResult}
        resetGame={resetGame}
      />


      {/* =========================
          STATUS
      ========================= */}

      <ChessStatus
        game={game}
      />

    </section>
  );
}

export default ChessGame;