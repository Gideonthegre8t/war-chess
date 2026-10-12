# Kingdoms at War

A cinematic multiplayer chess game where the chessboard is the primary gameplay and a live medieval warzone visualizes every move as a battlefield command.

## Documentation

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for full project documentation including architecture, phase-by-phase MVP progress, and the roadmap.

## Current State (re-verified 2026-10-12)

> Re-verified today: the working tree is **unchanged since the 2026-09-28 audit** — every claim below still holds, all 9 bug rows still reproduce, and none of the P0–P4 items have been started (see the checks in the session log). `npm run lint` → 0 errors, 4 warnings; `npm run build` → passes, 86 modules.

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
- **Chess clock (reliable)** — 8 time controls, warning/critical states, flag fall, resets on New Game. The active player is now derived from the real board turn, so selecting a piece no longer swaps the clock. **Increments (`1|1`, `3|2`, `5|3`, `10|5`) are credited after each real move.** Flag fall now produces a real game-over result (`timeout`, winner + "LOST ON TIME" overlay) instead of an `alert()`, and is synced to the opponent in Multiplayer.
- **Retreat (resign)** — a two-step "(🏳) Retreat" button in the top bar for VS CPU and Multiplayer. Resigning concedes the game: the retreating side loses, opponent wins, both players see the same result. Labeled "Retreat" for the medieval theme.
- **Move list (Battle Log)** — a moves panel under the board listing every move in SAN (`♘ Nf3`) plus the exact squares a piece traveled (`g1→f3`). Supplied directly from `chess.js` history, so it is always correct. In Multiplayer a color-coded notes feed below it records draw offers, retreats and timeouts.
- **Warzone visualization (reactive)** — the battlefield reacts to chess events (unit-themed rally messages, battle flash, check alarm, end-of-game cinematics), and **every real move plays an on-board unit march**: the moved piece flies from its old square to its destination as its unit type (Infantry / Cavalry / Archers / Siege engines / Royal Guard) with a capture burst, sped up by intensity (Off / Low / Medium / High). **Promotions** finish with a golden flare and a "promoted to Queen" crowning message. **Checkmate** runs a staged castle collapse — screen shake, then the white tower, then the black tower crash down into rubble over lingering smoke — while the winning side's army charges forward and the loser's crumples.
- **Sound system** — Web Audio API oscillator effects for move/capture/check/checkmate/promotion/illegal.
- **Responsive layout** — the topbar controls (room code, difficulty/time selectors, draw offer, retreat, menu, new game) now wrap and stack instead of overflowing, the draw banner stacks, the feedback toast is clamped to the viewport, and tiny screens get compact move-list/lobby styles. No horizontal overflow from phones up to desktops.
- **Refactor** — `getGameResult` / `getPositionKey` are extracted into a single shared util (`src/utils/gameResult.js`) used by all three chess hooks (no more duplication, identical draw messages everywhere).

### Known bugs / rough edges — AUDITED 2026-09-28

> The old list had one item that was already fixed and missed several real ones. Re-audited below, ordered by severity.

| # | Issue | Severity | Where |
|---|-------|----------|-------|
| 1 | **`flag-fall` is client-authoritative.** A client can emit `flag-fall` naming *either* colour at any moment and the server accepts it verbatim as the terminal result. Trivial win-by-cheat. | **High** | `server/server.js:210` |
| 2 | **Server never enforces repetition / 50-move draws.** `getGameResult` runs client-side, so one player can see a draw overlay while the server still thinks the game is live and lets the opponent keep moving. | **High** | `server/server.js` (absent) + `useMultiplayerChess.js:108` |
| 3 | **Stale draw banner.** When the offering side makes a move, the server clears `pendingDrawBy`, but `handleOpponentMove` never calls `setDrawOffer(null)`. The receiver keeps an Accept/Decline banner for a dead offer; accepting it then yields a bogus "opponent declined" toast. | Medium | `useMultiplayerChess.js:326` |
| 4 | **Switching time control mid-game wipes both clocks** (reset effect depends on `timeControl`). | Medium | `ChessClock.jsx:101` |
| 5 | **`SERVER_URL` is hardcoded** to `http://localhost:3001` — the build cannot be deployed anywhere else. No `VITE_*` env support. | Medium | `useMultiplayer.js:4` |
| 6 | **`useChessGame` is unreachable dead code** (~450 lines). `LandingPage` offers only multiplayer/cpu/puzzles, so `getGameState()`'s `default:` branch never fires. | Low | `useChessGame.js`, `App.jsx:113` |
| 7 | **`getBestMove` assumes the CPU is Black** (`bestScore = Infinity`, minimize). This is *correct today* only because the player is always White. Enabling Play-as-Black without fixing this makes the AI play garbage as White. | Low (latent trap) | `useChessAI.js:165` |
| 8 | Landing footer still reads "Phase 2: Multiplayer" (project is in Phase 3). | Cosmetic | `LandingPage.jsx:49` |
| 9 | 4 pre-existing harmless ESLint warnings: `legalMoves` computed without `useMemo` + a missing dep in `useChessCpu` and `usePuzzles`. | Cosmetic | `useChessCpu.js`, `usePuzzles.js` |

✅ **Already fixed (was wrongly listed as a bug):** `dist/` is **not** committed — `git ls-files dist` is empty and `.gitignore:17` ignores it.

## What's Next — priority order

The previous plan was 100% cinematic polish with the two real integrity bugs filed as "rough edges". That is inverted: **trust and correctness first, delight last.** Polish is cheap to add later; a cheat vector or a desync is expensive to unwind.

### P0 — Integrity & correctness (do these first; each is small and verified)
- [ ] **P0-1 · Server-owned clock.** Move timekeeping into the room record: `remaining: {w,b}`, `increment`, `lastTickAt`, `turn`. Server ticks on read, computes the loser itself, and broadcasts `clock-sync`. Kill the `flag-fall` client claim. *Fixes bugs #1 and #4.*
- [ ] **P0-2 · Server-enforced draw rules.** After each accepted `make-move`, run the same `getGameResult` engine server-side (insufficient material, 3-/5-fold, 50-/75-move) and set `terminal` when it fires, so both clients agree. *Fixes bug #2.*
- [ ] **P0-3 · Clear the stale draw offer on `opponent-move`.** One `setDrawOffer(null)` + a "offer withdrawn" battle-log line. *Fixes bug #3.*
- [ ] **P0-4 · Env-driven server URL.** `const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? \`${location.protocol}//${location.hostname}:3001\`` + a `.env.example`. *Fixes bug #5.*

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

### 2026-10-12 — Re-verification (no code changed)
- Re-checked the full source tree against this README. State is **identical to 2026-09-28**: no P0–P4 item is done.
- Verified the specific bug sites still stand: `flag-fall` trusted verbatim (`server/server.js:210`); no server draw engine; `handleOpponentMove` still leaves a stale draw banner (`useMultiplayerChess.js:326`); `SERVER_URL` still hardcoded (`useMultiplayer.js:4`); `playerColor` still hardcoded `'w'` with no setter (`App.jsx:37`); `getBestMove` still minimizes (Black-only) (`useChessAI.js:165`); landing footer still "Phase 2" (`LandingPage.jsx:49`); `useChessGame` still unreachable dead code.
- Ran `npm run lint` (0 errors, 4 warnings) and `npm run build` (passes, 86 modules).
- ⚠️ **Housekeeping for next time:** the entire Phase 2 + Phase 3 feature set exists only as *uncommitted* working-tree changes (last commit is `752f550 "Organising files"`). Recommend committing a "Phase 2 + War Engine" snapshot before starting P0 work, so it's isolated from the integrity fixes.
- **Open for next session:** still P0-1 (server-owned clock).

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
│   ├── Chess/           # ChessGame, ChessBoard, ChessSquare, MoveList, MoveGhost (on-board unit march + promotion flare), PromotionPicker, GameOverOverlay, ChessStatus, PlayerInfo
│   ├── ChessClock/      # Dual clock (8 time controls) + chessClockConstants
│   ├── Landing/         # Mode selection page
│   ├── Lobby/           # Multiplayer create/join
│   └── Warzone/         # Medieval battlefield visualization (reactive)
├── hooks/               # One hook per game mode: useChessGame, useChessCpu (+useChessAI), useMultiplayerChess (+useMultiplayer), usePuzzles
├── utils/               # chessConstants, sound, puzzles, gameResult (shared game-over engine)
├── App.jsx              # Mode router + top-level state (clock driver lives here)
└── main.jsx
server/
├── package.json         # express, socket.io, cors, chess.js (authoritative validation)
└── server.js            # Express + Socket.io rooms, validated moves, resign, new-game, draw-offer/accept/decline/cancel, flag-fall, rejoin, game-resync (PGN + terminal)
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
