import { pieceSymbols } from "../../utils/chessConstants";

function MoveCell({ move }) {
  if (!move) {
    return <span className="move-cell empty" />;
  }

  const piece = pieceSymbols[move.piece] || "";

  return (
    <span className="move-cell">
      <span className="move-san">
        {piece} {move.san}
      </span>
      <span className="move-squares">
        {move.from}→{move.to}
      </span>
    </span>
  );
}

function MoveList({ game, notes = [] }) {
  const moves = game.history({ verbose: true });

  const rows = [];
  for (let i = 0; i < moves.length; i += 2) {
    rows.push({
      number: i / 2 + 1,
      white: moves[i] || null,
      black: moves[i + 1] || null,
    });
  }

  return (
    <section className="move-list-panel">
      <div className="move-list-header">
        <span className="panel-label">BATTLE LOG</span>
        <h3>Moves</h3>
      </div>

      {rows.length === 0 ? (
        <div className="move-list-empty">
          No moves yet — deploy your forces.
        </div>
      ) : (
        <div className="move-list-table">
          <div className="move-list-row move-list-head">
            <span className="move-col-num">#</span>
            <span className="move-col-side">White</span>
            <span className="move-col-side">Black</span>
          </div>

          {rows.map((row) => (
            <div className="move-list-row" key={row.number}>
              <span className="move-col-num">{row.number}.</span>
              <span className="move-col-side">
                <MoveCell move={row.white} />
              </span>
              <span className="move-col-side">
                <MoveCell move={row.black} />
              </span>
            </div>
          ))}
        </div>
      )}

      {notes.length > 0 && (
        <ul className="battle-notes">
          {notes.map((note) => (
            <li key={note.id} className={`battle-note battle-note-${note.tone}`}>
              {note.text}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MoveList;