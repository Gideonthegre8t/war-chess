/**
 * DisplayScreen.jsx
 *
 * The second-screen view: `?display=1`. Two renderings of the same broadcast:
 * a full-bleed **3D** warzone (default, Three.js) and the **2D** panel warzone
 * as a fallback / tactical view. An optional live board sits beside it.
 *
 * Read-only: every control lives in the game window; the intensity shown here is
 * whatever the game window has selected.
 */
import { useMemo, useState } from 'react';
import { Chess } from 'chess.js';

import ChessBoard from '../Chess/ChessBoard';
import Warzone from '../Warzone/Warzone';
import Warzone3D from './warzone3d/Warzone3D';
import { isWebGLSupported } from './warzone3d/scene3d';
import { useWarzoneReceiver } from '../../hooks/useDisplayLink';
import '../../App.css';
import './DisplayScreen.css';

const describeLastMove = (lastMove) => {
  if (!lastMove) return 'Awaiting the first command';
  const piece = (lastMove.piece || '').toUpperCase();
  const squares = `${lastMove.from} → ${lastMove.to}`;
  const capture = lastMove.captured ? ` captures ${lastMove.captured.toUpperCase()}` : '';
  const promotion = lastMove.promotion ? ` = ${lastMove.promotion.toUpperCase()}` : '';
  return `${lastMove.color === 'b' ? 'Black' : 'White'} ${piece}${capture}${promotion}  ${squares}`;
};

const MODE_LABELS = {
  multiplayer: 'MULTIPLAYER',
  cpu: 'VS CPU',
  local: 'PASS & PLAY',
  puzzles: 'PUZZLES',
};

const noop = () => {};

function DisplayScreen() {
  const { state, connected, supported } = useWarzoneReceiver();
  const [webgl] = useState(() => isWebGLSupported());
  const [use3d, setUse3d] = useState(webgl);
  const [showBoard, setShowBoard] = useState(true);

  // The broadcast carries a FEN, not a chess.js instance — rebuild it here.
  const game = useMemo(() => {
    if (!state?.fen) return null;
    try {
      return new Chess(state.fen);
    } catch {
      return null;
    }
  }, [state?.fen]);

  if (!supported) {
    return (
      <div className="display-root">
        <div className="display-waiting">
          <div className="display-waiting-icon">⚔</div>
          <h1>SECOND SCREEN UNAVAILABLE</h1>
          <p>This browser does not support BroadcastChannel.</p>
        </div>
      </div>
    );
  }

  if (!connected || !state || !game) {
    return (
      <div className="display-root">
        <div className="display-waiting">
          <div className="display-waiting-icon">🏰</div>
          <h1>AWAITING THE BATTLE</h1>
          <p>Start or resume a game in the main window — this screen mirrors it live.</p>
        </div>
      </div>
    );
  }

  const inCheck = game.isCheck() && !state.gameResult?.over;
  const rendering3d = webgl && use3d;

  return (
    <div className="display-root">
      <header className="display-topbar">
        <div className="display-brand">
          <span className="display-crown">♛</span>
          <div>
            <h1>KINGDOMS AT WAR</h1>
            <span className="display-mode">
              {MODE_LABELS[state.mode] || 'BATTLE'} · SECOND SCREEN
            </span>
          </div>
        </div>

        <div className="display-controls">
          <div className="display-toggle">
            <button
              type="button"
              className={rendering3d ? 'is-active' : ''}
              onClick={() => setUse3d(true)}
              disabled={!webgl}
              title={webgl ? 'Cinematic 3D warzone' : 'WebGL is unavailable in this browser'}
            >
              3D
            </button>
            <button
              type="button"
              className={!rendering3d ? 'is-active' : ''}
              onClick={() => setUse3d(false)}
            >
              2D
            </button>
          </div>

          <button
            type="button"
            className={`display-board-toggle${showBoard ? ' is-active' : ''}`}
            onClick={() => setShowBoard((value) => !value)}
          >
            ♟ Board
          </button>

          <span className="display-live">● LIVE</span>
          <span className="display-turn">
            {state.turn === 'b' ? 'BLACK TO MOVE' : 'WHITE TO MOVE'}
          </span>
        </div>
      </header>

      <main className={`display-stage${showBoard ? ' display-stage-with-board' : ''}`}>
        <div className="display-scene">
          {rendering3d ? (
            <Warzone3D
              lastMove={state.lastMove}
              gameResult={state.gameResult}
              warzoneLevel={state.warzoneLevel}
              turn={state.turn}
              inCheck={inCheck}
              onUnsupported={() => setUse3d(false)}
            />
          ) : (
            <Warzone
              warzoneLevel={state.warzoneLevel || 'medium'}
              setWarzoneLevel={noop}
              lastMove={state.lastMove}
              gameResult={state.gameResult}
              game={game}
              showControls={false}
            />
          )}
        </div>

        {showBoard && (
          <aside className="display-board-panel">
            <ChessBoard
              board={game.board()}
              selectedSquare={null}
              legalMoveSquares={[]}
              lastMove={state.lastMove}
              checkedKingSquare={null}
              promotionState={null}
              onSquareClick={noop}
              onPromotion={noop}
              gameResult={null}
              resetGame={noop}
              game={game}
              warzoneLevel={state.warzoneLevel || 'medium'}
              orientation="w"
            />
          </aside>
        )}
      </main>

      <footer className="display-footer">
        <span className="display-last-move">{describeLastMove(state.lastMove)}</span>
        {state.gameResult?.over && (
          <span className="display-result">{state.gameResult.message}</span>
        )}
      </footer>
    </div>
  );
}

export default DisplayScreen;
