import ChessSquare from "./ChessSquare";
import PromotionPicker from "./PromotionPicker";
import GameOverOverlay from "./GameOverOverlay";
import MoveGhost from "./MoveGhost";

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
  game,
  warzoneLevel,
  orientation = 'w',
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

  const rowIndices = orientation === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];
  const colIndices = orientation === 'b' ? [7, 6, 5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5, 6, 7];

  return (
    <div className="board-wrapper">

      <div className="board">

        {/* CHESS SQUARES */}

        {rowIndices.map((rowIndex) =>
          colIndices.map((columnIndex) => {
            const squareName =
              files[columnIndex] +
              ranks[rowIndex];

            const piece = board[rowIndex][columnIndex];

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

        {/* UNIT MARCH (Phase 3 war engine) */}

        {lastMove && game && (
          <MoveGhost
            key={`${lastMove.from}${lastMove.to}${game.history().length}`}
            from={lastMove.from}
            to={lastMove.to}
            pieceType={lastMove.piece}
            captured={lastMove.captured}
            promotion={lastMove.promotion}
            moverColor={game.turn() === 'w' ? 'b' : 'w'}
            warzoneLevel={warzoneLevel}
            orientation={orientation}
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
