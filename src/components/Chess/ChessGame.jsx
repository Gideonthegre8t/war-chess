import ChessClock from "../ChessClock/ChessClock";
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
  warzoneLevel,
  clock,
}) {
  const boardElement = (
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
      game={game}
      warzoneLevel={warzoneLevel}
      orientation={clock?.orientation || 'w'}
    />
  );

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
          BOARD (+ CLOCKS)
      ========================= */}

      {clock ? (
        <ChessClock {...clock}>
          {boardElement}
        </ChessClock>
      ) : (
        boardElement
      )}


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
