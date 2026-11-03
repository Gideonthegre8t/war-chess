/**
 * useDisplayLink.js
 *
 * The "second screen" link. The game window broadcasts a plain-JSON snapshot of
 * the battle to any same-origin window opened with `?display=1` (a second
 * monitor, a projector, a TV). No server round-trip and no new dependency —
 * BroadcastChannel is same-origin and same-browser, which is exactly the shape
 * of a local second display.
 *
 * Two hooks:
 *   useWarzoneBroadcast(state)  — game window: publish state, answer late joiners
 *   useWarzoneReceiver()        — display window: subscribe, ask for a snapshot
 *
 * The payload never contains a chess.js instance (not serialisable). The display
 * rebuilds the game from `fen`.
 */
import { useEffect, useRef, useState } from 'react';

export const DISPLAY_CHANNEL = 'kingdoms-at-war-display';

const supported = () => typeof BroadcastChannel !== 'undefined';

/**
 * Game window side. Publishes `state` whenever it changes (identity compare) and
 * re-sends the latest snapshot when a display asks for one — so a display opened
 * mid-game catches up immediately instead of waiting for the next move.
 *
 * @param {object|null} state plain-JSON snapshot, or null to broadcast nothing
 */
export function useWarzoneBroadcast(state) {
  const channelRef = useRef(null);
  const stateRef = useRef(state);

  stateRef.current = state;

  useEffect(() => {
    if (!supported()) return undefined;

    const channel = new BroadcastChannel(DISPLAY_CHANNEL);
    channelRef.current = channel;
    channel.onmessage = (event) => {
      if (event.data?.type === 'request-sync' && stateRef.current) {
        channel.postMessage({ type: 'state', state: stateRef.current });
      }
    };

    return () => {
      channelRef.current = null;
      channel.close();
    };
  }, []);

  useEffect(() => {
    const channel = channelRef.current;
    if (!channel || !state) return;
    channel.postMessage({ type: 'state', state });
  }, [state]);
}

/**
 * Display window side.
 *
 * @returns {{
 *   state: object|null,   // latest snapshot from the game window
 *   connected: boolean,   // a snapshot has been received at least once
 *   supported: boolean,   // false where BroadcastChannel is unavailable
 * }}
 */
export function useWarzoneReceiver() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!supported()) return undefined;

    const channel = new BroadcastChannel(DISPLAY_CHANNEL);
    channel.onmessage = (event) => {
      if (event.data?.type !== 'state') return;
      setState(event.data.state);
      setConnected(true);
    };

    // Announce ourselves so the game window can push the current battle.
    channel.postMessage({ type: 'request-sync' });

    return () => channel.close();
  }, []);

  return { state, connected, supported: supported() };
}
