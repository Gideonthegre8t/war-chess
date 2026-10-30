import { useState, useEffect, useRef } from 'react';
import { TIME_CONTROLS } from './chessClockConstants';
import './ChessClock.css';

function formatTime(seconds) {
  const total = Math.ceil(seconds);
  if (total <= 0) return '0:00';

  const mins = Math.floor(total / 60);
  const secs = total % 60;

  if (mins >= 60) {
    const hours = Math.floor(mins / 60);
    const remainMins = mins % 60;
    return `${hours}:${remainMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function ChessClock({
  activePlayer = 'w',
  timeControl = 'blitz',
  isRunning = true,
  onFlagFall,
  resetKey = 0,
  incrementTick = 0,
  serverSync = null,
  orientation = 'w',
  playerColor = null,
  children,
}) {
  // Server-driven mode: the multiplayer clock is render-only. The server owns
  // timekeeping and streams `clock-sync`; the client only draws those values
  // (with 250ms local interpolation) and never ticks down or flags on its own.
  const isServerDriven = Boolean(serverSync && serverSync.remaining);

  const [whiteTime, setWhiteTime] = useState(() => {
    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    return tc ? tc.white : 180;
  });

  const [blackTime, setBlackTime] = useState(() => {
    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    return tc ? tc.black : 180;
  });

  const intervalRef = useRef(null);
  const prevIncrementTickRef = useRef(0);
  const flaggedRef = useRef({ w: false, b: false });
  const timeControlRef = useRef(timeControl);

  useEffect(() => {
    timeControlRef.current = timeControl;
  }, [timeControl]);

  // Server-driven rendering: re-anchor on every clock-sync, interpolate
  // smoothly between them by subtracting the elapsed time locally.
  useEffect(() => {
    if (!isServerDriven) return;

    const render = () => {
      const { remaining = {}, turn, running, sentAt } = serverSync;
      const now = Date.now();
      const elapsed = running && turn
        ? Math.max(0, now - (sentAt ?? now)) / 1000
        : 0;
      setWhiteTime(Math.max(0, (remaining.w ?? 0) / 1000 - (turn === 'w' ? elapsed : 0)));
      setBlackTime(Math.max(0, (remaining.b ?? 0) / 1000 - (turn === 'b' ? elapsed : 0)));
    };

    render();
    const serverInterval = setInterval(render, 250);
    return () => clearInterval(serverInterval);
  }, [serverSync, isServerDriven]);

  // Only the active player's clock ticks down (local modes only).
  // Ticks at 100ms so short turns (e.g. a fast CPU reply) are still charged —
  // a 1s tick meant the CPU finished its move before the clock ever fired.
  useEffect(() => {
    if (isServerDriven) return;

    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const tickSeconds = 0.1;
    intervalRef.current = setInterval(() => {
      const setTime = activePlayer === 'w' ? setWhiteTime : setBlackTime;
      setTime(prev => Math.max(0, prev - tickSeconds));
    }, 100);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activePlayer, isRunning, isServerDriven]);

  // Flag detection lives outside the tick's state updater so it fires once.
  useEffect(() => {
    if (isServerDriven || !isRunning) return;
    const time = activePlayer === 'w' ? whiteTime : blackTime;
    if (time <= 0 && !flaggedRef.current[activePlayer]) {
      flaggedRef.current[activePlayer] = true;
      if (onFlagFall) onFlagFall(activePlayer);
    }
  }, [whiteTime, blackTime, activePlayer, isRunning, isServerDriven, onFlagFall]);

  // Rich reward: each completed move credits the mover with the increment.
  useEffect(() => {
    if (isServerDriven) return;

    if (incrementTick === prevIncrementTickRef.current) return;
    prevIncrementTickRef.current = incrementTick;

    if (incrementTick === 0) return;

    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    if (!tc || tc.increment <= 0) return;

    if (activePlayer === 'w') {
      setBlackTime(prev => prev + tc.increment);
    } else {
      setWhiteTime(prev => prev + tc.increment);
    }
  }, [incrementTick, activePlayer, timeControl, isServerDriven]);

  // Reset clock when a new game starts (keyed by resetKey, avoiding mid-game wipe on selector change)
  useEffect(() => {
    if (isServerDriven) return;

    const tc = TIME_CONTROLS.find(t => t.id === timeControlRef.current);
    setWhiteTime(tc ? tc.white : 180);
    setBlackTime(tc ? tc.black : 180);
    prevIncrementTickRef.current = 0;
    flaggedRef.current = { w: false, b: false };
  }, [resetKey, isServerDriven]);

  const whiteTimeWarning = whiteTime <= 30;
  const blackTimeWarning = blackTime <= 30;
  const whiteTimeCritical = whiteTime <= 10;
  const blackTimeCritical = blackTime <= 10;

  // In server-driven mode the authoritative active side comes from the server.
  const displayActive = isServerDriven ? (serverSync.turn || activePlayer) : activePlayer;

  const renderWhiteBar = () => (
    <div className={`clock-bar clock-bar-white ${displayActive === 'w' ? 'clock-bar-active' : ''}`}>
      <div className="clock-bar-player">
        <span className="clock-piece">♔</span>
        <span>White Kingdom{playerColor === 'w' ? ' (You)' : ''}</span>
      </div>
      <div className={`clock-time ${whiteTimeWarning ? 'clock-warning' : ''} ${whiteTimeCritical ? 'clock-critical' : ''}`}>
        {formatTime(whiteTime)}
      </div>
    </div>
  );

  const renderBlackBar = () => (
    <div className={`clock-bar clock-bar-black ${displayActive === 'b' ? 'clock-bar-active' : ''}`}>
      <div className="clock-bar-player">
        <span className="clock-piece">♚</span>
        <span>Black Kingdom{playerColor === 'b' ? ' (You)' : ''}</span>
      </div>
      <div className={`clock-time ${blackTimeWarning ? 'clock-warning' : ''} ${blackTimeCritical ? 'clock-critical' : ''}`}>
        {formatTime(blackTime)}
      </div>
    </div>
  );

  // Chess.com-style layout: player's clock is below the board, opponent's is above.
  return (
    <div className="clock-board-stack">
      {orientation === 'b' ? renderWhiteBar() : renderBlackBar()}
      {children}
      {orientation === 'b' ? renderBlackBar() : renderWhiteBar()}
    </div>
  );
}

export default ChessClock;
