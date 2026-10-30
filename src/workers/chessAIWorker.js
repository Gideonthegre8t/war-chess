/**
 * chessAIWorker.js — Web Worker for minimax AI.
 *
 * Vite handles ESM workers when imported with:
 *   new Worker(new URL('../workers/chessAIWorker.js', import.meta.url), { type: 'module' })
 *
 * Message protocol:
 *   IN  { id, fen, difficulty }
 *   OUT { id, move }   where move is { from, to, promotion? } | null
 */
import { getBestMove } from '../utils/chessAIEngine.js';

self.onmessage = (event) => {
  const { id, fen, difficulty } = event.data;
  const move = getBestMove(fen, difficulty);
  self.postMessage({ id, move });
};

