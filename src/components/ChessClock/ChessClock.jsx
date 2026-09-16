import { useState, useEffect, useRef } from 'react';
import './ChessClock.css';

const TIME_CONTROLS = [
  { id: 'bullet', label: '1|0', white: 60, black: 60, increment: 0 },
  { id: 'bullet-inc', label: '1|1', white: 60, black: 60, increment: 1 },
  { id: 'blitz', label: '3|0', white: 180, black: 180, increment: 0 },
  { id: 'blitz-inc', label: '3|2', white: 180, black: 180, increment: 2 },
  { id: 'rapid', label: '5|0', white: 300, black: 300, increment: 0 },
  { id: 'rapid-inc', label: '5|3', white: 300, black: 300, increment: 3 },
  { id: 'classical', label: '10|0', white: 600, black: 600, increment: 0 },
  { id: 'classical-inc', label: '10|5', white: 600, black: 600, increment: 5 },
];

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
  isActive,
  onTimeUp,
  playerColor = 'w',
  timeControl = 'blitz',
  isRunning = true,
  onFlagFall
}) {
  const [whiteTime, setWhiteTime] = useState(() => {
    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    return tc ? tc.white : 180;
  });
  
  const [blackTime, setBlackTime] = useState(() => {
    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    return tc ? tc.black : 180;
  });
  
  const [activePlayer, setActivePlayer] = useState('w');
  const intervalRef = useRef(null);
  const timeControlData = TIME_CONTROLS.find(t => t.id === timeControl);
  const increment = timeControlData ? timeControlData.increment : 0;

  // Timer logic
  useEffect(() => {
    if (!isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      if (activePlayer === 'w') {
        setWhiteTime(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
            if (onFlagFall) onFlagFall('w');
            return 0;
          }
          return prev - 1;
        });
      } else {
        setBlackTime(prev => {
          if (prev <= 1) {
            clearInterval(intervalRef.current);
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
      }
    };
  }, [activePlayer, isRunning, onFlagFall]);

  // Switch turns
  useEffect(() => {
    if (isActive !== undefined) {
      setActivePlayer(isActive ? 'w' : 'b');
    }
  }, [isActive]);

  // Add increment after move
  const addIncrement = (color) => {
    if (color === 'w') {
      setWhiteTime(prev => prev + increment);
    } else {
      setBlackTime(prev => prev + increment);
    }
  };

  // Reset clock
  const resetClock = () => {
    const tc = TIME_CONTROLS.find(t => t.id === timeControl);
    setWhiteTime(tc ? tc.white : 180);
    setBlackTime(tc ? tc.black : 180);
    setActivePlayer('w');
  };

  // Expose reset and addIncrement functions
  ChessClock.resetClock = resetClock;
  ChessClock.addIncrement = addIncrement;

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

export { TIME_CONTROLS };
export default ChessClock;