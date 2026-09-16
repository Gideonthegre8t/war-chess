import ChessSquare from "./ChessSquare";
import PromotionPicker from "./PromotionPicker";
import GameOverOverlay from "./GameOverOverlay";

import {
  files,
  ranks,
} from "../../utils/chessConstants";

function ChessBoard({
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
  const isLastMoveSquare = (square) => {
    if (!lastMove) return false;

    return (
      lastMove.from === square ||
      lastMove.to === square
    );
  };

  const isLastMoveDestination = (square) => {
    if (!lastMove) return false;

    return lastMove.to === square;
  };

  return (
    <div className="board-wrapper">

      <div className="board">

        {/* CHESS SQUARES */}

        {board.map((row, rowIndex) =>
          row.map((piece, columnIndex) => {
            const squareName =
              files[columnIndex] +
              ranks[rowIndex];

            const isDark =
              (rowIndex + columnIndex) % 2 === 1;

            return (
              <ChessSquare
                key={squareName}
                square={piece}
                squareName={squareName}
                isDark={isDark}
                isSelected={
                  selectedSquare === squareName
                }
                isLegal={
                  legalMoveSquares.includes(
                    squareName
                  )
                }
                isLastMove={
                  isLastMoveSquare(squareName)
                }
                isLastMoveDestination={
                  isLastMoveDestination(
                    squareName
                  )
                }
                isCheckedKing={
                  checkedKingSquare === squareName
                }
                onClick={() =>
                  onSquareClick(squareName)
                }
              />
            );
          })
        )}

        {/* GAME OVER */}

        {gameResult?.over && (
          <GameOverOverlay
            gameResult={gameResult}
            onReset={resetGame}
          />
        )}

        {/* PROMOTION */}

        {promotionState && (
          <PromotionPicker
            color={promotionState.color}
            onPromote={onPromotion}
          />
        )}

      </div>

    </div>
  );
}

export default ChessBoard;