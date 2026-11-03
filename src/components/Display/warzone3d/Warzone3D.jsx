/**
 * Warzone3D.jsx
 *
 * Thin React wrapper around the Three.js scene. React owns nothing but the
 * container and the prop→scene forwarding; the scene itself lives in scene3d.js
 * so it stays testable and independent of the React lifecycle.
 *
 * If WebGL is unavailable the component renders a notice and calls
 * `onUnsupported` so the display can fall back to the 2D warzone.
 */
import { useEffect, useRef } from 'react';
import { createWarzone3D } from './scene3d';

function Warzone3D({
  lastMove = null,
  gameResult = null,
  warzoneLevel = 'medium',
  turn = 'w',
  inCheck = false,
  onUnsupported,
}) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const unsupportedRef = useRef(onUnsupported);

  unsupportedRef.current = onUnsupported;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const instance = createWarzone3D(container);
    if (!instance) {
      unsupportedRef.current?.();
      return undefined;
    }
    sceneRef.current = instance;

    return () => {
      sceneRef.current = null;
      instance.dispose();
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.setIntensity(warzoneLevel);
  }, [warzoneLevel]);

  // A new move: march the token and fire the capture/promotion effects.
  // `turn` is already the opponent's, so the mover is the other colour.
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (!lastMove) {
      scene.reset();
      return;
    }
    scene.playMove(lastMove, turn === 'w' ? 'b' : 'w');
  }, [lastMove, turn]);

  useEffect(() => {
    sceneRef.current?.setAlarm(Boolean(inCheck));
  }, [inCheck]);

  useEffect(() => {
    if (!gameResult?.over) return;
    sceneRef.current?.playResult(gameResult);
  }, [gameResult]);

  return <div className="warzone3d" ref={containerRef} />;
}

export default Warzone3D;
