import { useState, useEffect, useRef } from 'react';
import { TIME_CONTROLS } from './chessClockConstants';
import './ChessClock.css';

function formatTime(seconds) {
  if (seconds <= 0) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

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
}) {
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

  // Only the active player's clock ticks down.
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (activePlayer === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            if (onFlagFall) onFlagFall('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
            if (onFlagFall) onFlagFall('b');
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activePlayer, isRunning, onFlagFall]);

  // Rich reward: each completed move credits the mover with the increment.
  useEffect(() => {
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
  }, [incrementTick, activePlayer, timeControl]);

  // Reset clock when a new game starts (or time control changes).
  useEffect(() => {
    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    setWhiteTime(tc ? tc.white : 180);
    setBlackTime(tc ? tc.black : 180);
    prevIncrementTickRef.current = 0;
  }, [resetKey, timeControl]);

  const whiteTimeWarning = whiteTime <= 30;
  const blackTimeWarning = blackTime <= 30;
  const whiteTimeCritical = whiteTime <= 10;
  const blackTimeCritical = blackTime <= 10;

  return (
    <div className="chess-clock">
      <div className="clock-display">
        {/* Black's clock (top) */}
        <div className={`clock-player clock-black ${activePlayer === 'b' ? 'clock-active' : ''}`}>
          <div className="clock-label">
            <span className="clock-piece">♟</span>
            <span>Black</span>
          </div>
          <div className={`clock-time ${blackTimeWarning ? 'clock-warning' : ''} ${blackTimeCritical ? 'clock-critical' : ''}`}>
            {formatTime(blackTime)}
          </div>
        </div>

        {/* Divider */}
        <div className="clock-divider">
          <span className="clock-vs">VS</span>
        </div>

        {/* White's clock (bottom) */}
        <div className={`clock-player clock-white ${activePlayer === 'w' ? 'clock-active' : ''}`}>
          <div className="clock-label">
            <span className="clock-piece">♙</span>
            <span>White</span>
          </div>
          <div className={`clock-time ${whiteTimeWarning ? 'clock-warning' : ''} ${whiteTimeCritical ? 'clock-critical' : ''}`}>
            {formatTime(whiteTime)}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChessClock;