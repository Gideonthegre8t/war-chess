function PlayerInfo() {
  return (
    <div className="player-info">

      <div className="player">
        <span className="player-piece white-piece">
          ♔
        </span>

        <div>
          <strong>
            White Kingdom
          </strong>

          <small>
            Commander
          </small>
        </div>
      </div>

      <div className="player">

        <div className="player-text-right">
          <strong>
            Black Kingdom
          </strong>

          <small>
            Commander
          </small>
        </div>

        <span className="player-piece black-piece">
          ♚
        </span>

      </div>

    </div>
  );
}

export default PlayerInfo;