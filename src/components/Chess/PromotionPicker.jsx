import {
  promotionPieces,
} from "../../utils/chessConstants";

function PromotionPicker({
  color,
  onPromote,
}) {
  return (
    <div
      className={`promotion-overlay ${
        color === "w"
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

        {Object.entries(
          promotionPieces
        ).map(
          ([pieceType, piece]) => (
            <div
              key={pieceType}
              className="promotion-choice"
              role="button"
              tabIndex={0}
              onClick={() =>
                onPromote(pieceType)
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" ||
                  event.key === " "
                ) {
                  onPromote(pieceType);
                }
              }}
            >

              <span className="promotion-piece">
                {color === "w"
                  ? piece.white
                  : piece.black}
              </span>

              <span className="promotion-label">
                {piece.name.toUpperCase()}
              </span>

            </div>
          )
        )}

      </div>
    </div>
  );
}

export default PromotionPicker;