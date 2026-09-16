import {
  pieceSymbols,
} from "../../utils/chessConstants";

function ChessSquare({
  square,
  isDark,
  isSelected,
  isLegal,
  isLastMove,
  isLastMoveDestination,
  isCheckedKing,
  onClick,
}) {
  return (
    <button
      type="button"
      className={[
        "square",

        isDark
          ? "dark-square"
          : "light-square",

        isSelected
          ? "selected-square"
          : "",

        isLastMove
          ? isLastMoveDestination
            ? "last-move-square last-move-destination"
            : "last-move-square"
          : "",

        isCheckedKing
          ? "check-square"
          : "",
      ].join(" ")}
      onClick={onClick}
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
          {
            pieceSymbols[
              square.type
            ]
          }
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
}

export default ChessSquare;