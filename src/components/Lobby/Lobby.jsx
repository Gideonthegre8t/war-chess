import { useState } from 'react';

function Lobby({ onCreateRoom, onJoinRoom, isConnected }) {
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');

  const handleCreateRoom = () => {
    onCreateRoom((response) => {
      if (!response.success) {
        setError(response.error || 'Failed to create room');
      }
    });
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }
    
    onJoinRoom(joinCode.toUpperCase(), (response) => {
      if (!response.success) {
        setError(response.error || 'Failed to join room');
      }
    });
  };

  return (
    <div className="lobby">
      <h2>Multiplayer</h2>
      
      <div className="lobby-section">
        <button 
          onClick={handleCreateRoom}
          disabled={!isConnected}
          className="create-room-btn"
        >
          Create Room
        </button>
      </div>
      
      <div className="lobby-section">
        <input
          type="text"
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value)}
          placeholder="Enter room code"
          maxLength={6}
          className="room-code-input"
        />
        <button 
          onClick={handleJoinRoom}
          disabled={!isConnected || !joinCode.trim()}
          className="join-room-btn"
        >
          Join Room
        </button>
      </div>
      
      {error && <div className="lobby-error">{error}</div>}
      
      <div className="lobby-status">
        Server: {isConnected ? 'Connected' : 'Disconnected'}
      </div>
    </div>
  );
}

export default Lobby;