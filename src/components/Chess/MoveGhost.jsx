import { useState } from 'react';

const GLYPHS = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const UNITS = {
  p: { label: 'Infantry', dur: 720 },
  n: { label: 'Cavalry', dur: 340 },
  b: { label: 'Archers', dur: 520 },
  r: { label: 'Siege engines', dur: 640 },
  q: { label: 'Royal Guard', dur: 430 },
  k: { label: 'The King', dur: 480 },
};

const SPEED_FACTOR = {
  off: 0,
  low: 1.7,
  medium: 1,
  high: 0.55,
};

const colOf = (square) => square.charCodeAt(0) - 97;
const rowOf = (square) => 8 - Number(square[1]);

function MoveGhost({ from, to, pieceType, captured, promotion = false, moverColor = 'w', warzoneLevel = 'medium' }) {
  const [gone, setGone] = useState(false);

  if (gone || warzoneLevel === 'off') return null;

  const unit = UNITS[pieceType] || UNITS.p;
  const glyph = (GLYPHS[moverColor] || GLYPHS.w)[pieceType] || '♟';
  const dCol = colOf(to) - colOf(from);
  const dRow = rowOf(to) - rowOf(from);

  const speed = SPEED_FACTOR[warzoneLevel] || 1;
  const dur = Math.round(unit.dur * speed);

  const tokenClass = [
    'march-token',
    moverColor === 'w' ? 'march-white' : 'march-black',
    promotion ? 'march-promotion' : '',
    `war-${warzoneLevel}`,
  ].join(' ');

  const style = {
    left: `${colOf(from) * 12.5}%`,
    top: `${rowOf(from) * 12.5}%`,
    '--dx': `${dCol * 12.5}%`,
    '--dy': `${dRow * 12.5}%`,
    '--dur': `${dur}ms`,
  };

  const burstStyle = {
    left: `${colOf(to) * 12.5}%`,
    top: `${rowOf(to) * 12.5}%`,
  };

  return (
    <div className="march-layer" aria-hidden="true">
      {captured && <div className="capture-burst" style={burstStyle} />}
      {promotion && <div className="promotion-flare" style={burstStyle} />}

      <div
        className="march-trail"
        style={style}
      >
        <span>{glyph}</span>
      </div>

      <div
        className={tokenClass}
        style={style}
        onAnimationEnd={(e) => {
          if (e.animationName === 'marchMove') setGone(true);
        }}
      >
        <span>{glyph}</span>
      </div>
    </div>
  );
}

export default MoveGhost;