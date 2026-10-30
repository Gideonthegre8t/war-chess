import { useState } from 'react';

const GLYPHS = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕', k: '♔' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛', k: '♚' },
};

const UNITS = {
  p: { label: 'Infantry', dur: 320 },
  n: { label: 'Cavalry', dur: 220 },
  b: { label: 'Archers', dur: 260 },
  r: { label: 'Siege engines', dur: 300 },
  q: { label: 'Royal Guard', dur: 240 },
  k: { label: 'The King', dur: 250 },
};

const SPEED_FACTOR = {
  off: 0,
  low: 1.5,
  medium: 0.6,
  high: 0.4,
};

const colOf = (square, orientation = 'w') => {
  const c = square.charCodeAt(0) - 97;
  return orientation === 'b' ? 7 - c : c;
};
const rowOf = (square, orientation = 'w') => {
  const r = 8 - Number(square[1]);
  return orientation === 'b' ? 7 - r : r;
};

function MoveGhost({ from, to, pieceType, captured, promotion = false, moverColor = 'w', warzoneLevel = 'medium', orientation = 'w' }) {
  const [gone, setGone] = useState(false);

  if (gone || warzoneLevel === 'off') return null;

  const unit = UNITS[pieceType] || UNITS.p;
  const glyph = (GLYPHS[moverColor] || GLYPHS.w)[pieceType] || '♟';
  const fromCol = colOf(from, orientation);
  const fromRow = rowOf(from, orientation);
  const toCol = colOf(to, orientation);
  const toRow = rowOf(to, orientation);
  const dCol = toCol - fromCol;
  const dRow = toRow - fromRow;

  const speed = SPEED_FACTOR[warzoneLevel] || 1;
  const dur = Math.round(unit.dur * speed);

  const tokenClass = [
    'march-token',
    moverColor === 'w' ? 'march-white' : 'march-black',
    promotion ? 'march-promotion' : '',
    `war-${warzoneLevel}`,
  ].join(' ');

  const style = {
    left: `${fromCol * 12.5}%`,
    top: `${fromRow * 12.5}%`,
    '--dx': `${dCol * 12.5}%`,
    '--dy': `${dRow * 12.5}%`,
    '--dur': `${dur}ms`,
  };

  const burstStyle = {
    left: `${toCol * 12.5}%`,
    top: `${toRow * 12.5}%`,
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