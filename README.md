# Kingdoms at War

A cinematic multiplayer chess game where the chessboard is the primary gameplay and a live medieval warzone visualizes every move as a battlefield command.

## Documentation

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for full project documentation including architecture, phase-by-phase MVP progress, and the roadmap.

## Current State (verified 2026-10-12 — after P0-1)

> **P0-1 (server-owned clock) landed this session**, plus two polish passes: the VS CPU clock now charges fast CPU replies, the piece-march animation was retuned to chess.com-like speed, and the clocks were moved from above the panel to **board-attached bars** (Black above the board, White below). Re-ran `npm run lint` (0 errors, 4 warnings) and `npm run build` (passes). All other "fully working" claims below still hold; the bug table now has 8 rows (was 9).

### Fully working
- **VS CPU mode** — play **White** against a minimax AI with alpha-beta pruning and piece-square tables. 3 difficulties (Easy/Medium/Hard). ⚠️ *You cannot play Black yet — `playerColor` is a hardcoded `'w'` with no setter (`src/App.jsx:37`). See P1-1.*
- **Multiplayer mode** — Express + Socket.io rooms (6-char code), create/join, white/black assignment, real-time move sync, opponent-disconnect handling, rematch ("New Game" now syncs with the opponent).
- **Reconnection handling** — a disconnect no longer kills the room. The slot is held open; the player rejoins by code (and the client auto-rejoins on socket reconnect). Colors are preserved by slot and the opponent gets an `opponent-rejoined` notice.
- **Board-state resync on reconnect** — the server stores each room's PGN (plus the terminal result: resignation / timeout / draw) and pushes a `game-resync` payload to anyone who rejoins an in-progress room. A player who reloaded the page and re-enters by code is back on the real position with correct repetition counts, last-move highlight, and end state.
- **Server-authoritative moves** — the server keeps its own chess.js board per room and validates every move (correct turn, legality, game not over) before broadcasting it. Illegal or out-of-turn attempts are rejected with a `move-rejected` message plus an authoritative PGN resync, so the boards can never quietly diverge. The server-generated PGN is what opponents and rejoining players receive.
- **Draw offers** — a two-step 🤝 Offer Draw button (Multiplayer) with an Accept/Decline banner on the opponent's side, Cancel support, and a synced `draw-agreed` game-over result. In VS CPU the AI always declines. Offers are cleared by any move, retreat, or new game, and a message announces the withdrawal if a move kills a pending offer.
- **Battle log (multiplayer)** — under the move table, a live feed of non-move events: draw offers/accepts/declines/cancels/withdrawals, retreats, and timeouts, color-coded per event type.
- **Puzzles mode** — 50 puzzles across 10 levels, hints, opponent-response simulation, solved counter.
- **Full chess rules** via chess.js — castling, en passant, promotion picker, check/checkmate/stalemate, insufficient material, 3-/5-fold repetition, 50-/75-move rules.
- **Chess clock (reliable)** — 8 time controls, warning/critical states, flag fall, resets on New Game. The active player is now derived from the real board turn, so selecting a piece no longer swaps the clock. The local (VS CPU) clock ticks in 100ms sub-second steps, so fast CPU replies are still charged (the old 1s tick let the CPU dodge the clock entirely). **Increments (`1|1`, `3|2`, `5|3`, `10|5`) are credited after each real move.** Flag fall now produces a real game-over result (`timeout`, winner + "LOST ON TIME" overlay) instead of an `alert()`, and is synced to the opponent in Multiplayer. The clock is drawn as **two bars attached to the board** — Black directly above, White directly below (chess.com-style) — so each side sees its own clock next to the board.
- **Server-owned clock (P0-1)** — multiplayer timekeeping now lives in the room record on the server (`remaining`, `increment`, `lastTickAt`, `running`). The server charges the mover on every move, credits increments itself, halts the clock on mate/resign/draw, and streams `clock-sync` (1s cadence) to both clients. `ChessClock` is render-only in multiplayer — it interpolates between server snapshots and **can no longer declare a flag**. The old client-emitted `flag-fall` event is deleted, so a client can no longer name itself or its opponent the timeout loser. The client sends only a `timeControlId`; the server owns the millisecond values and validates the id. VS CPU keeps its local client-side clock (no server involved). Verified by `smoke-test.mjs` (14 checks: init, charge, flag math, move/increment flow, cheat-ignored, resignation halt).
- **Retreat (resign)** — a two-step "(🏳) Retreat" button in the top bar for VS CPU and Multiplayer. Resigning concedes the game: the retreating side loses, opponent wins, both players see the same result. Labeled "Retreat" for the medieval theme.
- **Move list (Battle Log)** — a moves panel under the board listing every move in SAN (`♘ Nf3`) plus the exact squares a piece traveled (`g1→f3`). Supplied directly from `chess.js` history, so it is always correct. In Multiplayer a color-coded notes feed below it records draw offers, retreats and timeouts.
- **Warzone visualization (reactive)** — the battlefield reacts to chess events (unit-themed rally messages, battle flash, check alarm, end-of-game cinematics), and **every real move plays an on-board unit march**: the moved piece flies from its old square to its destination as its unit type (Infantry / Cavalry / Archers / Siege engines / Royal Guard) with a capture burst, sped up by intensity (Off / Low / Medium / High). The march is tuned to **chess.com-like speed** — a ~190ms pawn slide on Medium (fastest unit ~130ms) with an ease-out curve, so moves land almost instantly. **Promotions** finish with a golden flare and a "promoted to Queen" crowning message. **Checkmate** runs a staged castle collapse — screen shake, then the white tower, then the black tower crash down into rubble over lingering smoke — while the winning side's army charges forward and the loser's crumples.
- **Sound system** — Web Audio API oscillator effects for move/capture/check/checkmate/promotion/illegal.
- **Responsive layout** — the topbar controls (room code, difficulty/time selectors, draw offer, retreat, menu, new game) now wrap and stack instead of overflowing, the draw banner stacks, the feedback toast is clamped to the viewport, and tiny screens get compact move-list/lobby styles. No horizontal overflow from phones up to desktops.
- **Refactor** — `getGameResult` / `getPositionKey` are extracted into a single shared util (`src/utils/gameResult.js`) used by all three chess hooks (no more duplication, identical draw messages everywhere).

### Known bugs / rough edges — AUDITED 2026-09-28

> Re-audited after P0-1. The old #1 (client-authoritative `flag-fall`) is **gone** — the server now owns the clock. Remaining, ordered by severity:

| # | Issue | Severity | Where |
|---|-------|----------|-------|
| 1 | **Server never enforces repetition / 50-move draws.** `getGameResult` runs client-side, so one player can see a draw overlay while the server still thinks the game is live and lets the opponent keep moving. | **High** | `server/server.js` (absent) + `useMultiplayerChess.js:108` |
| 2 | **Stale draw banner.** When the offering side makes a move, the server clears `pendingDrawBy`, but `handleOpponentMove` never calls `setDrawOffer(null)`. The receiver keeps an Accept/Decline banner for a dead offer; accepting it then yields a bogus "opponent declined" toast. | Medium | `useMultiplayerChess.js:326` |
| 3 | **Switching time control mid-game wipes both clocks** (reset effect depends on `timeControl`). Now CPU-only: multi has no selector and ChessClock ignores timeControl in server mode. | Medium | `ChessClock.jsx:101` |
| 4 | **`SERVER_URL` is hardcoded** to `http://localhost:3001` — the build cannot be deployed anywhere else. No `VITE_*` env support. | Medium | `useMultiplayer.js:4` |
| 5 | **`useChessGame` is unreachable dead code** (~450 lines). `LandingPage` offers only multiplayer/cpu/puzzles, so `getGameState()`'s `default:` branch never fires. | Low | `useChessGame.js`, `App.jsx:113` |
| 6 | **`getBestMove` assumes the CPU is Black** (`bestScore = Infinity`, minimize). This is *correct today* only because the player is always White. Enabling Play-as-Black without fixing this makes the AI play garbage as White. | Low (latent trap) | `useChessAI.js:165` |
| 7 | Landing footer still reads "Phase 2: Multiplayer" (project is in Phase 3). | Cosmetic | `LandingPage.jsx:49` |
| 8 | 4 pre-existing harmless ESLint warnings: `legalMoves` computed without `useMemo` + a missing dep in `useChessCpu` and `usePuzzles`. | Cosmetic | `useChessCpu.js`, `usePuzzles.js` |

✅ **Already fixed (was wrongly listed as a bug):** `dist/` is **not** committed — `git ls-files dist` is empty and `.gitignore:17` ignores it.

## What's Next — priority order

The previous plan was 100% cinematic polish with the two real integrity bugs filed as "rough edges". That is inverted: **trust and correctness first, delight last.** Polish is cheap to add later; a cheat vector or a desync is expensive to unwind.

### P0 — Integrity & correctness (do these first; each is small and verified)
- [x] **P0-1 · Server-owned clock.** Timekeeping lives in the room record (`remaining: {w,b}`, `increment`, `lastTickAt`, `running`). The server charges the mover, credits increments itself, detects flag fall itself, and broadcasts `clock-sync`. The client-emitted `flag-fall` claim is deleted; `ChessClock` is render-only in multiplayer; the client sends only an id that the server validates against its own TIME_CONTROLS map. *Fixed the old bug #1 (cheat) entirely; the mid-game time-control wipe is now CPU-only (see current bug #3).* Covered by `smoke-test.mjs`.
- [ ] **P0-2 · Server-enforced draw rules.** After each accepted `make-move`, run the same `getGameResult` engine server-side (insufficient material, 3-/5-fold, 50-/75-move) and set `terminal` when it fires, so both clients agree. *Fixes bug #1.*
- [ ] **P0-3 · Clear the stale draw offer on `opponent-move`.** One `setDrawOffer(null)` + a "offer withdrawn" battle-log line. *Fixes bug #2.*
- [ ] **P0-4 · Env-driven server URL.** `const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? \`${location.protocol}//${location.hostname}:3001\`` + a `.env.example`. *Fixes bug #4.*

### P1 — Truthful product surface
- [ ] **P1-1 · Play as Black in VS CPU.** Two coupled halves — do them together or not at all: (a) expose a colour picker and give `playerColor` a setter; (b) make `getBestMove` colour-aware (maximise when the CPU is White). A "Random side" option is ~5 extra lines and makes the pairing feature land.
- [ ] **P1-2 · Resolve `useChessGame`.** Either ship it as a "Pass & Play" mode card (the hook is already done and board/clock/warzone are all mode-agnostic) or delete ~450 lines. Shipping is cheaper than it sounds; deleting is the honest minimum.
- [ ] **P1-3 · Update the landing footer** to Phase 3. *Fixes bug #8.*

### P2 — Performance (this is what makes "Hard" usable)
- [ ] **P2-1 · Move the AI to a Web Worker.** `useChessAI` builds a fresh `new Chess(fen)` at every node of a depth-3 tree, blocking the main thread. Off-thread search + move ordering (MVV-LVA) is the difference between "Hard" and "Hard freezes the tab".

### P3 — Persistence (lowest value: only matters if the whole server dies)
- [ ] **P3-1 · Persist rooms to disk** (snapshot PGN + clock + terminal on every move). The in-memory `Map` is the last real multiplayer gap, but P0-1 already makes this *easier* — do it after the clock is server-owned.

### P4 — War Engine polish (delight; fill-in when P0–P2 are done)
- [ ] **P4-1** Route `warzoneLevel` intensity into shake magnitude, flash strength, and victory-charge distance (currently only march duration/speed).
- [ ] **P4-2** Timed-out "army routed" visual — the victory/defeat army states already exist for `checkmate|timeout|resignation`, they just need a distinct routed treatment.
- [ ] **P4-3** Emissive glow / brief zoom on the promoted square (`promotion-flare` exists in `MoveGhost.jsx:63`).

## Session Log

### 2026-10-12 (c) — chess.com-style clock placement + march speed
- **Clock moved onto the board (chess.com layout)** *(reported: "the time screen is far from the board")*. Previously `ChessClock` rendered as a two-row card above the whole chess panel, ~120px+ from the board. Now `ChessClock` accepts `children` and wraps the board: **Black's clock bar sits directly above the board, White's directly below, each showing the player's name** — so both players see their own clock adjacent to the board. `ChessGame` now takes a `clock` prop and composes `<ChessClock>{board}</ChessClock>`; `App.jsx` builds a `clockProps` object (unchanged ticking/increment/server-driven wiring) and passes it down. The redundant two-player `PlayerInfo` row was removed (names now live in the clock bars) and `PlayerInfo.jsx` deleted. New `.clock-board-stack` / `.clock-bar` styles (`ChessClock.css`).
- **Piece march retuned to chess.com speed** *(reported: "still very slow")*. Chess.com slides a piece in ~150–220ms with an ease-out. Unit base durations cut again (`p 540→320`, `n 280→220`, `b 400→260`, `r 480→300`, `q 340→240`, `k 380→250`) and the Medium factor `0.7→0.6`, so a **pawn marches ~190ms** and a knight ~130ms on Medium (Low 1.5×, High 0.4×). The march **trail delay** was halved (`60ms→30ms`) so the blurred duplicate no longer outlives the token. Capture burst `0.35s`, promotion flare `0.85s` (`MoveGhost.jsx`, `App.css`).
- Re-ran `npm run lint` (0 errors / 4 warnings) and `npm run build` (passes).
- **Open for next session:** still **P0-2** (server-enforced draw rules).

### 2026-10-12 (b) — VS CPU clock + animation-speed fixes
- **VS CPU black clock was frozen** *(reported)*: the local (non-server) clock ticked once per 1000ms and subtracted a full second. The CPU replies in ~400–800ms, so `activePlayer` flipped back to White before the 1s tick ever fired — Black literally never lost time, and the human flagged while the CPU was immune. Fixed by ticking the local clock every 100ms in sub-second steps (still clamped ≥0), with flag detection moved into its own once-only effect (`flaggedRef`). Multiplayer is unaffected (server-driven path is guarded). Files: `ChessClock.jsx`.
- **Move/capture animations were too slow** *(reported)*: unit-march durations trimmed (`p 720→540`, `n 340→280`, `b 520→400`, `r 640→480`, `q 430→340`, `k 480→380`) and the "medium" intensity factor `1.0→0.7` (low `1.7→1.4`, high `0.55→0.45`). Capture burst `0.55s→0.35s`, promotion flare `1.1s→0.85s` (`MoveGhost.jsx`, `App.css`).
- Re-ran `npm run lint` (0 errors / 4 warnings) and `npm run build` (passes).
- **Open for next session:** still **P0-2** (server-enforced draw rules).

### 2026-10-12 — P0-1 landed + snapshot commit
- Committed the whole Phase 2 + Phase 3 working tree as `Phase 2 + 3 snapshot: multiplayer, vs CPU, puzzles, war engine` (mixed with the docs re-verification from earlier) so P0 work is isolated.
- **Implemented P0-1 (server-owned clock).** Server: room record gains `clock` (`initial`, `remaining`, `incrementMs`, `lastTickAt`, `running`) + a 1s room interval that charges the side to move, detects flag fall itself, and broadcasts `clock-sync`; `make-move` charges the mover pre-move (rejecting a late flagged move), credits the increment post-move, and halts the clock on mate/stalemate/draw; `resign` / `draw-response` halt it too; server owns the TIME_CONTROLS values (validates ids only); the `flag-fall` socket handler is **deleted**. Client: `ChessClock` gained a render-only server mode (interpolates between syncs, never ticks/flags itself); `useMultiplayer.*` no longer emits `flag-fall` and now passes `timeControlId` on `create-room`/`new-game`; `useMultiplayerChess` renders `clockSync` from `game-start` / `clock-sync` / `game-resync` and drops its local `handleFlagFall`.
- **Verification:** `npm run lint` 0 errors / 4 warnings (the original 4), `npm run build` passes (86 modules), and a new `npm run test` → `smoke-test.mjs` passes **14/14** (clock init, charge/flag math, move→clock-sync flow, +2s increment crediting, white/black countdown, client `flag-fall` ignored, clock halt on resignation). Unit checks hit the exported `createClock`/`chargeClock` so flag logic is covered without waiting out a real flag.
- ⚠️ Note: the creator (slot 0) doesn't receive `game-start` (only the joiner does) — its clock anchors on the first `clock-sync` after move 1. Works because the default time control matches on both sides; if a multiplayer time-control picker is added later, send `game-start` to the creator too.
- **Open for next session:** **P0-2** (server-enforced draw rules) — it removes the last High-severity desync and directly enables P3-1.

### 2026-09-28 — Audit + re-plan (no code changed)
- Read the full source tree, `server/server.js`, and both docs; ran `npm run lint` and `npm run build`. **Everything the README claimed as working is in fact working** — the server-authoritative move path, PGN resync, draw flow, reconnection slots, clock increments, warzone cinematics and move march all check out against the code.
- Corrected three false statements: `dist/` is *not* committed; you cannot play Black in VS CPU; the "known bugs" list was missing the two highest-severity issues (client-authoritative flag fall, unenforced server draws).
- Replaced the polish-first plan with the P0–P4 integrity-first plan above.
- **Open for next session:** start at P0-1 (server-owned clock) — it is the dependency for P0-2, P3-1, and P1-1.


## Current Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI |
| Vite | Build tool |
| JavaScript (JSX) | Language |
| CSS3 | Styling |
| chess.js | Chess engine (single source of truth) |
| Express + Socket.io | Multiplayer server |
| Git + GitHub | Version control |

## Project Layout

```
src/
├── components/
│   ├── Chess/           # ChessGame (wraps board in the clock bars), ChessBoard, ChessSquare, MoveList, MoveGhost (on-board unit march + promotion flare), PromotionPicker, GameOverOverlay, ChessStatus
│   ├── ChessClock/      # Board-attached clock bars (Black above / White below) for 8 time controls + chessClockConstants
│   ├── Landing/         # Mode selection page
│   ├── Lobby/           # Multiplayer create/join
│   └── Warzone/         # Medieval battlefield visualization (reactive)
├── hooks/               # One hook per game mode: useChessGame, useChessCpu (+useChessAI), useMultiplayerChess (+useMultiplayer), usePuzzles
├── utils/               # chessConstants, sound, puzzles, gameResult (shared game-over engine)
├── App.jsx              # Mode router + top-level state (clock driver lives here)
└── main.jsx
server/
├── package.json         # express, socket.io, cors, chess.js (authoritative validation)
└── server.js            # Express + Socket.io rooms, validated moves, resign, new-game, draw-offer/accept/decline/cancel, server-owned clock (clock-sync, flag detection), rejoin, game-resync (PGN + terminal + clock). Exports createClock/chargeClock for the smoke test.
smoke-test.mjs           # End-to-end server test (boots server in-process, drives 2 socket clients): npm run test
```

## Development

```bash
# Install dependencies
npm install

# Start dev server (client)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run the server smoke test (boots a server on :3001 — stop any dev server first)
npm run test
```

## Run Multiplayer

```bash
# Terminal 1 — backend
cd server && npm install && npm run dev

# Terminal 2 — frontend
npm run dev
```

Open two browser windows at `http://localhost:5173`, create a room in one, join with the code in the other.

## Coding Rules for Any AI

1. Never implement chess rules manually.
2. chess.js is the single source of truth.
3. Keep game logic inside the mode hooks (`useChessCpu`, `useMultiplayerChess`, `usePuzzles`).
4. Keep components presentational (all data + callbacks via props).
5. Promotion uses the centered overlay (no modal).
6. The chessboard must always remain the primary gameplay surface.
7. Game-over rules live in `src/utils/gameResult.js` — never re-implement the draw/win engine per hook.
8. **The server is the authority.** A client may *report* an event; it may never *decide* one. Never accept a terminal result, clock value, or move without the server validating it against its own room state.
9. **`getGameResult` must agree on both sides.** When P0-2 lands, the server imports the same engine — keep the two in lockstep or draws will desync.
10. If a feature claims to support a side/colour/variant, the UI must actually expose it. (See P1-1.)
