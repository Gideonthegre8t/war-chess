/*
=========================================================
POSITION KEY
=========================================================

Used for repetition tracking.

We prefer chess.js hash() when available.

Fallback uses the first four FEN fields:

1. Piece placement
2. Side to move
3. Castling rights
4. En-passant target
*/

export const getPositionKey = (chess) => {
  if (typeof chess.hash === 'function') {
    return chess.hash();
  }
  return chess.fen().split(' ').slice(0, 4).join(' ');
};

/*
=========================================================
GAME RESULT ENGINE
=========================================================

This is the SINGLE source of truth for game-over rules.

Priority:

1. Checkmate
2. Stalemate
3. Insufficient material
4. Fivefold repetition
5. 75-move rule
6. Threefold repetition
7. 50-move rule
8. Game continues

For this MVP, we automatically end the game on
threefold repetition and the 50-move rule as well.
*/

export const getGameResult = (chess, positionCounts) => {
  const positionKey = getPositionKey(chess);
  const repetitionCount = positionCounts[positionKey] || 1;
  const halfmoveClock = Number(chess.fen().split(' ')[4]) || 0;

  const isThreefoldRepetition = repetitionCount >= 3;
  const isFivefoldRepetition = repetitionCount >= 5;
  const isFiftyMoveDraw = halfmoveClock >= 100;
  const isSeventyFiveMoveDraw = halfmoveClock >= 150;

  const meta = {
    repetitionCount,
    halfmoveClock,
    isThreefoldRepetition,
    isFivefoldRepetition,
    isFiftyMoveDraw,
    isSeventyFiveMoveDraw,
  };

  if (chess.isCheckmate()) {
    const winner = chess.turn() === 'w' ? 'b' : 'w';
    return { over: true, type: 'checkmate', winner, message: '👑 CHECKMATE', ...meta };
  }

  if (chess.isStalemate()) {
    return { over: true, type: 'stalemate', message: '🤝 DRAW — STALEMATE', ...meta };
  }

  if (chess.isInsufficientMaterial()) {
    return { over: true, type: 'insufficient-material', message: '🤝 DRAW — INSUFFICIENT MATERIAL', ...meta };
  }

  if (isFivefoldRepetition) {
    return { over: true, type: 'fivefold-repetition', message: '🤝 DRAW — FIVEFOLD REPETITION', ...meta };
  }

  if (isSeventyFiveMoveDraw) {
    return { over: true, type: 'seventy-five-move', message: '🤝 DRAW — 75-MOVE RULE', ...meta };
  }

  if (isThreefoldRepetition) {
    return { over: true, type: 'threefold-repetition', message: '🤝 DRAW — THREEFOLD REPETITION', ...meta };
  }

  if (isFiftyMoveDraw) {
    return { over: true, type: 'fifty-move', message: '🤝 DRAW — 50-MOVE RULE', ...meta };
  }

  return { over: false, type: null, message: null, ...meta };
};