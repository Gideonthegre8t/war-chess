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
│   ├── Chess/           # ChessGame, ChessBoard, ChessSquare, MoveList, PromotionPicker, GameOverOverlay, ChessStatus, PlayerInfo
│   ├── ChessClock/      # Dual clock (8 time controls)
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
- **Server authority (partial, to be completed):** moves are fully server-validated and the PGN is the transport format, so boards cannot drift. **The clock is the hole** — timekeeping is client-side and `flag-fall` is trusted verbatim, and draw-by-repetition is evaluated only on clients. Both are P0-1/P0-2.

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

### Known Bugs / Rough Edges — re-audited 2026-09-28

Ordered by severity. Full reasoning in the [README](../README.md) table.

1. **`flag-fall` is client-authoritative** *(High)* — `server.js:210` accepts whatever colour the client names as the terminal result. Trivial cheat.
2. **Server never enforces repetition / 50-move draws** *(High)* — the draw engine is client-only, so one side can show a draw overlay while the server keeps the game live.
3. **Stale draw banner** *(Medium)* — `useMultiplayerChess.js:326` `handleOpponentMove` never clears `drawOffer`; the receiver keeps a dead Accept/Decline banner.
4. **Time-control change mid-game wipes both clocks** *(Medium)* — `ChessClock.jsx:101`.
5. **`SERVER_URL` hardcoded to `localhost:3001`** *(Medium)* — `useMultiplayer.js:4`; not deployable.
6. **`useChessGame` is unreachable dead code** *(Low)* — ~450 lines; `LandingPage` never routes to it.
7. **`getBestMove` assumes the CPU is Black** *(Low, latent trap)* — `useChessAI.js:165`; breaks the moment Play-as-Black ships.
8. Landing footer says "Phase 2" *(cosmetic)*.
9. 4 pre-existing harmless ESLint warnings in `useChessCpu` / `usePuzzles`.

> `dist/` was previously listed as a committed-directory bug. **That is false** — `git ls-files dist` is empty and `.gitignore:17` covers it. Already fixed.

## Where We Continue Next

The previous ordering was polish-first with two integrity bugs filed as "rough edges". That is inverted — **correctness before delight**. The single highest-leverage change is **P0-1: move the clock into the server's room record**, because it is the prerequisite for P0-2 (server draws), P3-1 (persistence) and P1-1 (colour choice), and it closes the only true cheat vector in the game.

| ID | Item | Severity |
|----|------|----------|
| P0-1 | Server-owned clock (kills client `flag-fall` claim, emits `clock-sync`) | **Start here** |
| P0-2 | Server-enforced draw rules via the shared `getGameResult` engine | High |
| P0-3 | Clear the stale draw offer on `opponent-move` | Medium |
| P0-4 | Env-driven `VITE_SERVER_URL` + `.env.example` | Medium |
| P1-1 | Play as Black in VS CPU — **requires** fixing `getBestMove` to be colour-aware | Feature |
| P1-2 | Ship `useChessGame` as "Pass & Play" or delete it | Feature |
| P1-3 | Landing footer → Phase 3 | Cosmetic |
| P2-1 | Move `useChessAI` to a Web Worker + MVV-LVA move ordering (unblocks "Hard") | Perf |
| P3-1 | Persist rooms to disk (do *after* P0-1) | Low value |
| P4-1..3 | War Engine: intensity → shake/flash/charge, timeout "army routed", promotion glow | Delight |

See the README for the full expanded task descriptions and acceptance notes.

## Session Log

**2026-10-12 — Re-verification (no code changed).** Re-checked the source against the README; the tree is identical to the 2026-09-28 audit. No P0–P3 item has been started; all bug sites reproduce. `npm run lint` → 0/4, `npm run build` → passes. Note: all Phase 2 + Phase 3 work is still uncommitted (last commit `752f550`) — commit a snapshot before starting P0-1 so the integrity fixes are isolated.

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
