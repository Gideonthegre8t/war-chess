import { useState, useEffect, useRef } from 'react';

const RALLY_LINES = {
  p: { unit: 'Infantry', action: 'advances' },
  n: { unit: 'Cavalry', action: 'charges' },
  b: { unit: 'Archers', action: 'reposition' },
  r: { unit: 'Siege engines', action: 'advance' },
  q: { unit: 'The Royal Guard', action: 'attacks' },
  k: { unit: 'The King', action: 'commands' },
};

function Warzone({
  warzoneLevel,
  setWarzoneLevel,
  lastMove = null,
  gameResult = null,
  game = null,
  showControls = true,
}) {
  const [battleMessage, setBattleMessage] = useState('The armies await your command.');
  const [battleIcon, setBattleIcon] = useState('⚔');
  const [moveFlash, setMoveFlash] = useState(false);
  const [destroyStage, setDestroyStage] = useState(0);
  const lastMoveRef = useRef(null);
  const wasCheckmateRef = useRef(false);

  // Multi-stage castle destruction on checkmate: tower vibrations -> white
  // tower collapses -> black tower collapses -> rubble + lingering smoke.
  useEffect(() => {
    const isCheckmateOver = Boolean(gameResult?.over && gameResult.type === 'checkmate');
    if (isCheckmateOver && !wasCheckmateRef.current) {
      wasCheckmateRef.current = true;
      setDestroyStage(1);
      const t1 = setTimeout(() => setDestroyStage(2), 850);
      const t2 = setTimeout(() => setDestroyStage(3), 1750);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
    if (!gameResult?.over) {
      wasCheckmateRef.current = false;
      setDestroyStage(0);
    }
  }, [gameResult]);

  // Every real chess move becomes a battlefield command.
  useEffect(() => {
    if (lastMove === lastMoveRef.current) return;
    lastMoveRef.current = lastMove;

    if (!lastMove) {
      setBattleMessage('The armies await your command.');
      setBattleIcon('⚔');
      return;
    }

    const mover = game?.turn() === 'w' ? 'WHITE' : 'BLACK';
    const info = RALLY_LINES[lastMove.piece] || { unit: 'The troops', action: 'advance' };

    if (lastMove.promotion) {
      setBattleIcon('👑');
      setBattleMessage(
        `👑 ${mover} — PROMOTION! The ${info.unit} is crowned ${lastMove.promotion.toUpperCase()}.`
      );
    } else {
      setBattleIcon(lastMove.captured ? '🏹' : '🛡');
      setBattleMessage(
        `${mover} — ${info.unit} ${info.action}${lastMove.captured ? '! An enemy soldier falls.' : '!'}`
      );
    }

    setMoveFlash(true);
    const t = setTimeout(() => setMoveFlash(false), 900);
    return () => clearTimeout(t);
  }, [lastMove, game]);

  // End-of-game cinematics.
  useEffect(() => {
    if (!gameResult?.over) return;

    switch (gameResult.type) {
      case 'checkmate': {
        const loser = gameResult.winner === 'w' ? 'BLACK' : 'WHITE';
        setBattleMessage(`🏰 ${loser} CASTLE LIES IN RUIN — CHECKMATE!`);
        setBattleIcon('🏰');
        break;
      }
      case 'stalemate':
        setBattleMessage('🕊 The armies are deadlocked — a stalemate.');
        setBattleIcon('🕊');
        break;
      case 'draw-agreed':
        setBattleMessage('🤝 Peace is declared — the war ends in a draw.');
        setBattleIcon('🤝');
        break;
      case 'timeout': {
        const loser = gameResult.timeoutLoser === 'w' ? 'WHITE' : 'BLACK';
        setBattleMessage(`⏰ ${loser} runs out of time!`);
        setBattleIcon('⏰');
        break;
      }
      case 'resignation': {
        const retreating = gameResult.retreatColor === 'w' ? 'WHITE' : 'BLACK';
        setBattleMessage(`🏳 ${retreating} retreats from the battlefield!`);
        setBattleIcon('🏳');
        break;
      }
      default:
        setBattleMessage('🤝 The war ends in a draw.');
        setBattleIcon('🤝');
        break;
    }
  }, [gameResult]);

  const isCheckActive = Boolean(game?.isCheck && game.isCheck() && !gameResult?.over);
  const isCheckmate = gameResult?.type === 'checkmate';
  const lastMoverPlanet = game?.turn() === 'w' ? 'black' : 'white';

  // The winning side's army charges; the loser's crumples.
  const hasWinner = Boolean(
    gameResult?.over &&
      ['checkmate', 'timeout', 'resignation'].includes(gameResult.type)
  );
  const winnerSide =
    hasWinner && gameResult.winner === 'w' ? 'white'
    : hasWinner && gameResult.winner === 'b' ? 'black'
    : null;
  const whiteArmyState = winnerSide === 'white' ? ' army-victorious' : winnerSide === 'black' ? ' army-defeated' : '';
  const blackArmyState = winnerSide === 'black' ? ' army-victorious' : winnerSide === 'white' ? ' army-defeated' : '';
  const whiteCastleFallen = destroyStage >= 2;
  const blackCastleFallen = destroyStage >= 3;

  const warzoneClasses = [
    'warzone',
    `warzone-intensity-${warzoneLevel}`,
    isCheckActive ? 'warzone-alarm' : '',
    isCheckmate ? 'warzone-destroyed' : '',
    moveFlash ? 'warzone-flash' : '',
  ].filter(Boolean).join(' ');

  return (
    <section className="warzone-panel">

      <div className="panel-header">

        <div>
          <span className="panel-label">
            SECONDARY
          </span>

          <h1>
            Warzone
          </h1>
        </div>

        <div className={`war-status ${isCheckActive ? 'war-status-alarm' : ''}`}>
          {isCheckActive ? 'ALARM' : 'LIVE'}
        </div>

      </div>

      <div className={warzoneClasses}>

        <div className="sky" />

        {/* WHITE CASTLE */}

        <div className={`castle castle-white${whiteCastleFallen ? ' castle-fallen' : ''}`}>

          <div className="castle-flag">
            ⚑
          </div>

          <div className="castle-body">
            ♜
          </div>

          <span>
            WHITE
          </span>

          {whiteCastleFallen && (
            <div className="castle-rubble">🧱🪨🧱</div>
          )}

        </div>

        {/* BATTLEFIELD */}

        <div className="battlefield">

          <div className="territory territory-white" />

          <div className="territory territory-black" />

          <div className="mountain mountain-one" />

          <div className="mountain mountain-two" />

          {/* WHITE ARMY */}

          <div
            className={`army army-white${moveFlash && lastMoverPlanet === 'white' ? ' army-advancing' : ''}${whiteArmyState} war-${warzoneLevel}`}
          >
            <span>⚔</span>
            <span>⚔</span>
            <span>⚔</span>
            <span>🏹</span>
            <span>⚔</span>
          </div>

          {/* BLACK ARMY */}

          <div
            className={`army army-black${moveFlash && lastMoverPlanet === 'black' ? ' army-advancing' : ''}${blackArmyState} war-${warzoneLevel}`}
          >
            <span>⚔</span>
            <span>🏹</span>
            <span>⚔</span>
            <span>⚔</span>
            <span>🏹</span>
          </div>

          {/* BATTLE LINE */}

          <div className="battle-line">
            <span>⚔</span>
            <span>⚔</span>
            <span>⚔</span>
          </div>

        </div>

        {/* BLACK CASTLE */}

        <div className={`castle castle-black${blackCastleFallen ? ' castle-fallen' : ''}`}>

          <div className="castle-flag">
            ⚑
          </div>

          <div className="castle-body">
            ♜
          </div>

          <span>
            BLACK
          </span>

          {blackCastleFallen && (
            <div className="castle-rubble">🧱🧱🪨</div>
          )}

        </div>

        {/* COMMENTARY */}

        <div className="battle-message">

          <span className="message-icon">
            {battleIcon}
          </span>

          {battleMessage}

        </div>

      </div>

      {/* CONTROLS — hidden on the read-only second screen, where intensity is
          owned by the game window. */}

      {showControls && (
      <div className="warzone-controls">

        <div className="control-title">
          Warzone Intensity
        </div>

        <div className="intensity-buttons">

          {[
            "off",
            "low",
            "medium",
            "high",
          ].map(
            (level) => (
              <button
                type="button"
                key={level}
                className={
                  warzoneLevel ===
                  level
                    ? "active-intensity"
                    : ""
                }
                onClick={() =>
                  setWarzoneLevel(
                    level
                  )
                }
              >
                {level}
              </button>
            )
          )}

        </div>

      </div>
      )}

    </section>
  );
}

export default Warzone;