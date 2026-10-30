# Kingdoms at War

A cinematic multiplayer chess game where the chessboard is the primary gameplay and a live medieval warzone visualizes every move as a battlefield command.

## Current Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI |
| Vite | Build tool |
| JavaScript (JSX) | Current language |
| CSS3 | Styling |
| chess.js | Chess engine (single source of truth) |
| Express + Socket.io | Multiplayer server |
| Git + GitHub | Version control |

## Architecture

```
src/
├── components/
│   ├── Chess/           # ChessGame (wraps board in clock bars), ChessBoard, ChessSquare, MoveList, MoveGhost, PromotionPicker, GameOverOverlay, ChessStatus
│   ├── ChessClock/      # Board-attached clock bars (Black above / White below), 8 time controls
│   ├── Landing/         # Mode selection page
│   ├── Lobby/           # Multiplayer create/join UI
│   └── Warzone/         # Medieval battlefield visualization
├── hooks/
│   ├── useChessGame.js      # Local 2-player chess logic (legacy/fallback)
│   ├── useChessCpu.js       # VS CPU game (uses useChessAI)
│   ├── useChessAI.js        # Minimax + alpha-beta + piece-square tables
│   ├── useMultiplayer.js    # Raw Socket.io connection + room management
│   ├── useMultiplayerChess.js # Full multiplayer chess game
│   └── usePuzzles.js        # Puzzle system with level progression
├── utils/
│   ├── chessConstants.js
│   ├── sound.js
│   └── puzzles.js           # 10 levels x 5 puzzles = 50 puzzles
├── App.jsx                  # Manual mode router + top-level state
└── main.jsx
server/
└── server.js                # Express + Socket.io (rooms, moves, resign, new-game)
```

### Design decisions
- **Hermetic rules:** chess.js is the single source of truth for move validation and game state. No chess rules are implemented by hand. A new `Chess` instance is created per move (`loadPgn` from the current game) for immutable state transitions.
- **Hook-per-mode:** each game mode has a dedicated hook exposing the same interface (`game`, `board`, `selectedSquare`, `legalMoveSquares`, `lastMove`, `promotionState`, `checkedKingSquare`, `feedback`, `gameResult`, `handleSquareClick`, `handlePromotion`, `resetGame`, plus mode-specific extras). `App.jsx` unifies them via `getGameState()`.
- **Sound:** Web Audio API oscillators — no audio files.
- **Server authority (partial, to be completed):** moves are fully server-validated and the PGN is the transport format, so boards cannot drift. **The clock is server-owned as of P0-1** (2026-10-12) — timekeeping lives in the room record, flag fall is detected by the server, and clients render `clock-sync` without ever claiming a flag. The remaining hole is **draw-by-repetition / 50-move, which is still evaluated only on clients — that is P0-2.**

## MVP Progress

### Phase 1 — Chess Engine (Completed)
- Legal movement via chess.js
- Castling, en passant, pawn promotion (centered overlay picker)
- Check, checkmate, stalemate
- Insufficient material, threefold/fivefold repetition, 50-/75-move rules
- Game Over overlay, last-move highlighting, legal-move indicators, feedback toasts
- Responsive board (CSS container queries) + sound system

### Phase 2 — Multiplayer + Game Modes (Completed)

Priority order:
1. ✅ Socket.io backend
2. ✅ Room creation
3. ✅ Join by code
4. ✅ White/Black assignment
5. ✅ Move synchronization
6. ✅ Chess clocks (visual, 8 time controls)
7. ✅ **Retreat / resignation** — VS CPU + Multiplayer, synced over the socket
8. ✅ **Move list (Battle Log)** — SAN + from→to square mapping under the board
9. ✅ **New Game / Rematch** — local + CPU reset, and a socket-synced rematch for multiplayer
10. ✅ **Draw offer** — offer/accept/decline/cancel over the socket (`draw-offer`, `draw-response`, `draw-accepted`, `draw-cancelled`, `draw-declined`), `draw-agreed` game-over result. VS CPU always declines. A move that clears a pending offer announces the withdrawal.
11. ✅ **Reconnection handling** — rooms hold an open slot for a disconnected player; rejoin by code (client auto-rejoins on reconnect); `opponent-rejoined` notification; colors preserved by slot.
12. ✅ **Board-state resync** — the server stores each room's PGN + terminal result (resignation/timeout/draw). On any rejoin of an in-progress room it emits `game-resync { pgn, terminal }`; the client rebuilds the board, repetition counts, last-move highlight and end state, so a fully reloaded page can re-enter by code and continue the live game.
13. ✅ **Server-authoritative moves** — each room holds its own `Chess` instance. `make-move` is validated server-side (turn, legality, game-over) before broadcast; rejected attempts get `move-rejected { reason, pgn, terminal }` and the client rebuilds from that authoritative PGN. Opponent broadcasts use the server-generated PGN, so boards cannot drift even if a client misbehaves.

**Also added beyond the original roadmap:**
- ✅ VS CPU mode with minimax AI (Easy/Medium/Hard) — depth 1/2/3 + piece-square tables + thinking delay
- ✅ 50-puzzle system across 10 levels with hints, opponent responses, and progress tracking
- ✅ Clock reliability pass: active player derived from the real board turn (no swap on piece selection), **increments credited after every real move**, and **flag fall is a real `timeout` game result** (winner + overlay, synced over the socket) instead of `alert()`.
- ✅ `getGameResult` / `getPositionKey` extracted into `src/utils/gameResult.js` — single shared game-over engine across all hooks (removes duplication).

### Phase 3 — War Engine (Deep Reactivity — in progress)

The warzone reacts to live chess events, and the board now visualizes every move as a battlefield command:

**Done:**
- Unit-themed rally messages per move (`White — Cavalry charges!`), battle flash, advancing-army highlight, castle alarm on check, end-of-game battle messages for every result type.
- **On-board unit march:** every real move plays a marching-piece animation from its old square to its destination, glyph + speed mapped to the unit (Infantry slow, Cavalry fast, Archers/Royal Guard mid, Siege engines lumbering, King as the commander). Captures add a `capture-burst`. Intensity (Off/Low/Medium/High) gates and re-times the march.
- **Staged castle collapse (multi-stage).** On checkmate a JS state machine walks `destroyStage` 1→2→3: screen shake, then the white tower crashes down (`castle-fallen`, animated `castleSink`), then the black tower, each finishing in a rubble pile (`castle-rubble` fade-in) over the lingering smoke overlay. Resets when a new game begins.
- **Victory / defeat armies.** Any decisive ending (checkmate, timeout, resignation) makes the winner's army charge across the battlefield (gold glow + `victoryCharge`, mirrored for black) while the loser's crumples (`armyDefeat` fade).
- **Promotion cinematic.** The promoting move's `lastMove.promotion` flag drives a golden `promotion-flare` on the destination square (MoveGhost) and a "👑 PROMOTION! …crowned QUEEN" crowning message in the Warzone.

**Planned (next):** — deferred to **P4** (delight). Correctness work (P0–P2) now outranks it; see the table below.
- Ride intensity further into the cinematics (shake magnitude, flash strength, charge distance).
- A timed-out "army routed" visual and victory-charge duration scaled by intensity.
- Emissive glow / brief zoom on the promoted square.

### Known Bugs / Rough Edges — re-audited 2026-10-12

Ordered by severity. Full reasoning in the [README](../README.md) table.

1. **Server never enforces repetition / 50-move draws** *(High)* — the draw engine is client-only (`getGameResult` runs on the board hook), so one side can show a draw overlay while the server keeps the game live. → **P0-2.**
2. **Stale draw banner** *(Medium)* — `useMultiplayerChess.js:326` `handleOpponentMove` never clears `drawOffer`; the receiver keeps a dead Accept/Decline banner. → **P0-3.**
3. **Time-control change mid-game wipes both clocks** *(Medium)* — `ChessClock.jsx:101`. Now CPU-only: multiplayer has no selector, and ChessClock ignores `timeControl` in server-driven mode.
4. **`SERVER_URL` hardcoded to `localhost:3001`** *(Medium)* — `useMultiplayer.js:4`; not deployable. → **P0-4.**
5. **`useChessGame` is unreachable dead code** *(Low)* — ~450 lines; `LandingPage` never routes to it. → **P1-2.**
6. **`getBestMove` assumes the CPU is Black** *(Low, latent trap)* — `useChessAI.js:165`; breaks the moment Play-as-Black ships. → **P1-1.**
7. Landing footer says "Phase 2" *(cosmetic)*. → **P1-3.**
8. 4 pre-existing harmless ESLint warnings in `useChessCpu` / `usePuzzles`.

> ~~`flag-fall` is client-authoritative — `server.js:210` trusted whatever colour the client named as the terminal result.~~ **FIXED by P0-1 (2026-10-12):** the server owns the clock, detects flags itself, and the client `flag-fall` handler is deleted.
>
> `dist/` was previously listed as a committed-directory bug. **That is false** — `git ls-files dist` is empty and `.gitignore:17` covers it. Already fixed.

## Where We Continue Next

The previous ordering was polish-first with two integrity bugs filed as "rough edges". That is inverted — **correctness before delight**. **P0-1 is done** (2026-10-12): multiplayer timekeeping now lives in the server's room record, the client `flag-fall` claim is gone, and a 14-check `npm run test` covers it. The next highest-leverage change is **P0-2: server-enforced draw rules** — the last High-severity desync, and the direct prerequisite for P3-1 (persistence).

| ID | Item | Severity |
|----|------|----------|
| ~~P0-1~~ | ~~Server-owned clock (kills client `flag-fall` claim, emits `clock-sync`)~~ | ✅ **Done 2026-10-12** |
| ~~P0-2~~ | ~~Server-enforced draw rules via the shared `getGameResult` engine~~ | ✅ **Done 2026-10-28** |
| ~~P0-3~~ | ~~Clear the stale draw offer on `opponent-move`~~ | ✅ **Done 2026-10-28** |
| ~~P0-4~~ | ~~Env-driven `VITE_SERVER_URL` + `.env.example`~~ | ✅ **Done 2026-10-28** |
| ~~P1-1~~ | ~~Play as Black in VS CPU — **requires** fixing `getBestMove` to be colour-aware~~ | ✅ **Done 2026-10-28** |
| ~~P1-2~~ | ~~Ship `useChessGame` as "Pass & Play"~~ | ✅ **Done 2026-10-28** |
| ~~P1-3~~ | ~~Landing footer → Phase 3~~ | ✅ **Done 2026-10-28** |
| ~~P2-1~~ | ~~Move `useChessAI` to a Web Worker + MVV-LVA move ordering~~ | ✅ **Done 2026-10-28** |
| ~~P3-1~~ | ~~Persist rooms to disk~~ | ✅ **Done 2026-10-28** |
| P4-1..3 | War Engine: intensity → shake/flash/charge, timeout "army routed", promotion glow | Delight |
| P5-1 | Deploy: Render/Railway backend + Vercel/Netlify frontend + env var guide | Launch |
| P5-2 | Mobile touch support: tap-to-select, touch events on squares | UX |
| P5-3 | Spectator mode: read-only board via room code | Feature |

See the README for the full expanded task descriptions and acceptance notes.

## Session Log

**2026-10-12 — P0-1 landed + snapshot commit.** Committed the Phase 2 + Phase 3 working tree (`752f550`'s successor) so integrity work is isolated. Then implemented the server-owned clock end-to-end: room `clock` record, per-room 1s tick interval that charges/flags/streams `clock-sync`, `make-move` charges the mover and credits increments server-side, clock halts on mate/resign/draw, TIME_CONTROLS values live on the server (client sends only an id), and the client `flag-fall` handler is deleted. `ChessClock` is now render-only in multiplayer. Verified: `npm run lint` 0/4, `npm run build` passes, and `npm run test` (`smoke-test.mjs`) passes **14/14**. **Open for next session: P0-2.**

**2026-10-12 (b/c) — reported-bug fixes + chess.com polish.** (b) Fixed the frozen VS CPU black clock: the local clock ticked once per 1000ms so fast CPU replies (400–800ms) were never charged; now it ticks every 100ms in sub-second steps with once-only flag detection. (c) Moved the clocks onto the board — `ChessClock` now wraps the board (Black bar above, White bar below, names inline), `ChessGame` takes a `clock` prop, `PlayerInfo` was removed/deleted — and retuned the unit march to chess.com speed (~190ms pawn/move on Medium, trail delay 30ms). Verified: `npm run lint` 0/4, `npm run build` passes.

**2026-09-28 — Audit + re-plan (docs only, no code changed).** Every "fully working" claim in the README was verified against the source; all hold. `npm run lint` → 0 errors / 4 warnings; `npm run build` → passes. Three false statements were corrected (committed `dist/`, playable-as-Black, incomplete bug list) and the plan was re-sequenced to integrity-first. Next session starts at **P0-1**.


## Run Multiplayer

```bash
# Terminal 1 — backend
cd server
npm install
npm run dev

# Terminal 2 — frontend
npm run dev
```

Open two browser windows on `http://localhost:5173`, create a room in one, join with the code in the other.

## Coding Rules for Any AI

1. Never implement chess rules manually.
2. chess.js is the single source of truth.
3. Keep game logic inside useChessGame / useChessCpu / useMultiplayerChess / usePuzzles.
4. Keep components presentational.
5. Promotion uses the centered overlay (no modal).
6. The chessboard must always remain the primary gameplay surface.
7. Game-over rules live in `src/utils/gameResult.js` — never re-implement the draw/win engine per hook.
8. **The server is the authority.** A client may *report* an event; it may never *decide* one.
9. **`getGameResult` must agree on both sides** once P0-2 lands.
10. If a feature claims to support a side/colour/variant, the UI must actually expose it.
