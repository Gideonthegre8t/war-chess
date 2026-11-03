/**
 * useChessAI.js
 *
 * Spawns a persistent Web Worker that runs minimax off the main thread.
 * The worker is created once per hook instance and terminated on unmount.
 *
 * API:
 *   const { getBestMove } = useChessAI();
 *   // getBestMove(chess, difficulty) → Promise<{ from, to, promotion? } | null>
 *
 * The worker receives the position as FEN (serialisable) and returns the best
 * move object. useChessCpu awaits the promise in a useEffect so the board
 * stays responsive while the engine thinks (especially on Hard, depth 3).
 */
import { useRef, useEffect, useCallback } from 'react';

let nextId = 0;

export function useChessAI() {
  const workerRef = useRef(null);
  // Map from request id → { resolve, reject } for in-flight promises.
  const pendingRef = useRef(new Map());

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/chessAIWorker.js', import.meta.url),
      { type: 'module' }
    );

    // Captured for the lifetime of this effect so the cleanup below always
    // drains the same map (the ref itself could point elsewhere by then).
    const pendingRequests = pendingRef.current;

    worker.onmessage = (event) => {
      const { id, move } = event.data;
      const request = pendingRequests.get(id);
      if (request) {
        pendingRequests.delete(id);
        request.resolve(move);
      }
    };

    worker.onerror = (err) => {
      console.error('[chessAIWorker] error', err);
      // Reject all pending requests on worker error
      for (const [id, request] of pendingRequests) {
        pendingRequests.delete(id);
        request.reject(err);
      }
    };

    workerRef.current = worker;

    return () => {
      // Cancel all pending promises so callers don't leak
      for (const [, request] of pendingRequests) {
        request.reject(new Error('Worker terminated'));
      }
      pendingRequests.clear();
      worker.terminate();
    };
  }, []);

  /**
   * @param {import('chess.js').Chess} chess — current board
   * @param {'easy'|'medium'|'hard'} difficulty
   * @returns {Promise<{ from: string, to: string, promotion?: string } | null>}
   */
  const getBestMove = useCallback((chess, difficulty = 'medium') => {
    return new Promise((resolve, reject) => {
      const worker = workerRef.current;
      if (!worker) {
        resolve(null);
        return;
      }
      const id = nextId++;
      pendingRef.current.set(id, { resolve, reject });
      worker.postMessage({ id, fen: chess.fen(), difficulty });
    });
  }, []);

  return { getBestMove };
}
