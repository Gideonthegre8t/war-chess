/**
 * chessAIEngine.js
 * Pure minimax engine — no React, no DOM. Importable by both the web worker
 * and any unit/smoke tests. chess.js is the only dependency.
 */
import { Chess } from 'chess.js';

// ---------------------------------------------------------------------------
// Piece values & piece-square tables
// ---------------------------------------------------------------------------
export const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

const PAWN_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0],
];
const KNIGHT_TABLE = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50],
];
const BISHOP_TABLE = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20],
];
const ROOK_TABLE = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  0,  0,  0],
];
const QUEEN_TABLE = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  0,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20],
];
const KING_TABLE_MID = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20],
];

const PIECE_TABLES = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE_MID,
};

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------
export function evaluateBoard(chess) {
  let score = 0;
  const board = chess.board();
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece) {
        const pv = PIECE_VALUES[piece.type] || 0;
        const table = PIECE_TABLES[piece.type];
        const tv = table ? (piece.color === 'w' ? table[row][col] : table[7 - row][col]) : 0;
        score += piece.color === 'w' ? pv + tv : -(pv + tv);
      }
    }
  }
  if (chess.isCheck()) {
    score += chess.turn() === 'w' ? -50 : 50;
  }
  return score;
}

// ---------------------------------------------------------------------------
// MVV-LVA move ordering
// ---------------------------------------------------------------------------
export function orderMoves(moves) {
  return [...moves].sort((a, b) => {
    const aScore =
      (a.captured ? (PIECE_VALUES[a.captured] || 0) * 10 - (PIECE_VALUES[a.piece] || 0) : 0) +
      (a.promotion ? 800 : 0);
    const bScore =
      (b.captured ? (PIECE_VALUES[b.captured] || 0) * 10 - (PIECE_VALUES[b.piece] || 0) : 0) +
      (b.promotion ? 800 : 0);
    return bScore - aScore;
  });
}

// ---------------------------------------------------------------------------
// Minimax with alpha-beta pruning
// ---------------------------------------------------------------------------
export function minimax(chess, depth, alpha, beta, isMaximizing) {
  if (depth === 0 || chess.isGameOver()) {
    return evaluateBoard(chess);
  }
  const moves = orderMoves(chess.moves({ verbose: true }));
  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const next = new Chess(chess.fen());
      next.move(move);
      const evalScore = minimax(next, depth - 1, alpha, beta, false);
      if (evalScore > maxEval) maxEval = evalScore;
      if (evalScore > alpha) alpha = evalScore;
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const next = new Chess(chess.fen());
      next.move(move);
      const evalScore = minimax(next, depth - 1, alpha, beta, true);
      if (evalScore < minEval) minEval = evalScore;
      if (evalScore < beta) beta = evalScore;
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

// ---------------------------------------------------------------------------
// getBestMove — pure function (no hooks)
// ---------------------------------------------------------------------------
const DEPTH_MAP = { easy: 1, medium: 2, hard: 3 };

/**
 * @param {string} fen  — current position as FEN string
 * @param {'easy'|'medium'|'hard'} difficulty
 * @returns {{ from: string, to: string, promotion?: string } | null}
 */
export function getBestMove(fen, difficulty = 'medium') {
  const chess = new Chess(fen);
  const rawMoves = chess.moves({ verbose: true });
  if (rawMoves.length === 0) return null;

  const moves = orderMoves(rawMoves);
  const depth = DEPTH_MAP[difficulty] ?? 2;
  const cpuColor = chess.turn();
  const isCpuWhite = cpuColor === 'w';

  let bestMove = moves[0];
  let bestScore = isCpuWhite ? -Infinity : Infinity;

  for (const move of moves) {
    const next = new Chess(chess.fen());
    next.move(move);
    const score = minimax(next, depth - 1, -Infinity, Infinity, !isCpuWhite);
    if (isCpuWhite ? score > bestScore : score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }

  return { from: bestMove.from, to: bestMove.to, promotion: bestMove.promotion };
}

