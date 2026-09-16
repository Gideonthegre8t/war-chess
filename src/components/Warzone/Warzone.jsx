function Warzone({
  warzoneLevel,
  setWarzoneLevel,
}) {
  return (
    <section className="warzone-panel">

      <div className="panel-header">

        <div>
          <span className="panel-label">
            SECONDARY
          </span>

          <h1>
            Warzone
          </h1>
        </div>

        <div className="war-status">
          LIVE
        </div>

      </div>

      <div className="warzone">

        <div className="sky" />

        {/* WHITE CASTLE */}

        <div className="castle castle-white">

          <div className="castle-flag">
            ⚑
          </div>

          <div className="castle-body">
            ♜
          </div>

          <span>
            WHITE
          </span>

        </div>

        {/* BATTLEFIELD */}

        <div className="battlefield">

          <div className="territory territory-white" />

          <div className="territory territory-black" />

          <div className="mountain mountain-one" />

          <div className="mountain mountain-two" />

          {/* WHITE ARMY */}

          <div
            className={`army army-white war-${warzoneLevel}`}
          >
            <span>⚔</span>
            <span>⚔</span>
            <span>⚔</span>
            <span>🏹</span>
            <span>⚔</span>
          </div>

          {/* BLACK ARMY */}

          <div
            className={`army army-black war-${warzoneLevel}`}
          >
            <span>⚔</span>
            <span>🏹</span>
            <span>⚔</span>
            <span>⚔</span>
            <span>🏹</span>
          </div>

          {/* BATTLE LINE */}

          <div className="battle-line">
            <span>⚔</span>
            <span>⚔</span>
            <span>⚔</span>
          </div>

        </div>

        {/* BLACK CASTLE */}

        <div className="castle castle-black">

          <div className="castle-flag">
            ⚑
          </div>

          <div className="castle-body">
            ♜
          </div>

          <span>
            BLACK
          </span>

        </div>

        {/* COMMENTARY */}

        <div className="battle-message">

          <span className="message-icon">
            ⚔
          </span>

          The armies await your command.

        </div>

      </div>

      {/* CONTROLS */}

      <div className="warzone-controls">

        <div className="control-title">
          Warzone Intensity
        </div>

        <div className="intensity-buttons">

          {[
            "off",
            "low",
            "medium",
            "high",
          ].map(
            (level) => (
              <button
                type="button"
                key={level}
                className={
                  warzoneLevel ===
                  level
                    ? "active-intensity"
                    : ""
                }
                onClick={() =>
                  setWarzoneLevel(
                    level
                  )
                }
              >
                {level}
              </button>
            )
          )}

        </div>

      </div>

    </section>
  );
}

export default Warzone;