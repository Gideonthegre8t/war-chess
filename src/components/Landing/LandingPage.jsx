import './LandingPage.css';

function LandingPage({ onSelectMode }) {
  return (
    <div className="landing-page">
      <div className="landing-content">
        {/* Logo and Title */}
        <div className="landing-header">
          <div className="landing-crown">♛</div>
          <h1 className="landing-title">KINGDOMS AT WAR</h1>
          <p className="landing-tagline">Every move is a command. Every capture changes the war.</p>
        </div>

        {/* Mode Selection */}
        <div className="mode-grid">
          <button
            className="mode-card mode-multiplayer"
            onClick={() => onSelectMode('multiplayer')}
          >
            <div className="mode-icon">⚔️</div>
            <h2 className="mode-title">MULTIPLAYER</h2>
            <p className="mode-description">Battle friends online in real-time</p>
            <div className="mode-badge">LIVE</div>
          </button>

          <button
            className="mode-card mode-cpu"
            onClick={() => onSelectMode('cpu')}
          >
            <div className="mode-icon">🤖</div>
            <h2 className="mode-title">VS CPU</h2>
            <p className="mode-description">Train against the computer</p>
            <div className="mode-badge">SOLO</div>
          </button>

          <button
            className="mode-card mode-pass-play"
            onClick={() => onSelectMode('local')}
          >
            <div className="mode-icon">👥</div>
            <h2 className="mode-title">PASS & PLAY</h2>
            <p className="mode-description">Two commanders on one screen</p>
            <div className="mode-badge">LOCAL</div>
          </button>

          <button
            className="mode-card mode-puzzles"
            onClick={() => onSelectMode('puzzles')}
          >
            <div className="mode-icon">🧩</div>
            <h2 className="mode-title">PUZZLES</h2>
            <p className="mode-description">Learn tactics and improve</p>
            <div className="mode-badge">LEARN</div>
          </button>
        </div>

        {/* Footer */}
        <div className="landing-footer">
          <p>Built with chess.js • Phase 3: War Engine & Integrity</p>
        </div>
      </div>
    </div>
  );
}

export default LandingPage;
