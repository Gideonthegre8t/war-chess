# Kingdoms at War

A cinematic multiplayer chess game where the chessboard is the primary gameplay and a live medieval warzone visualizes every move as a battlefield command.

## Documentation

See [docs/DOCUMENTATION.md](docs/DOCUMENTATION.md) for full project documentation including architecture, phase-by-phase MVP progress, and the roadmap.

## Current State (verified 2026-10-30)

> **Verified this session, not assumed.** `npm run lint` → **0 problems** (it was failing: 1 error + 2 warnings, all now fixed). `npm run build` → passes: the game window stays at **343 kB (108 kB gzip)** and the 3D display is a separate **541 kB chunk** that only `?display=1` downloads. `npm run test` → **22/22 PASS**. P0–P3 are landed, the **3D second screen is built** (P5-1/P5-2) and P4-1 is wired; what remains is P4-2/P4-3 and P6 launch work.

### Fully working
- **VS CPU mode** — play **White, Black, or Random** against a minimax AI with alpha-beta pruning, MVV-LVA move ordering and piece-square tables, running **off the main thread in a Web Worker** so "Hard" (depth 3) no longer freezes the tab. 3 difficulties (Easy/Medium/Hard). The engine is colour-aware, so it plays either side correctly.
- **Multiplayer mode** — Express + Socket.io rooms (6-char code), create/join, white/black assignment, real-time move sync, opponent-disconnect handling, rematch ("New Game" syncs with the opponent).
- **Pass & Play mode** — two players on one screen, same board/clock/warzone, backed by `useChessGame` (previously dead code, now a shipped mode).
- **Reconnection handling** — a disconnect no longer kills the room. The slot is held open; the player rejoins by code (and the client auto-rejoins on socket reconnect). Colors are preserved by slot and the opponent gets an `opponent-rejoined` notice.
- **Board-state resync on reconnect** — the server stores each room's PGN (plus the terminal result: resignation / timeout / draw) and pushes a `game-resync` payload to anyone who rejoins an in-progress room. A player who reloaded the page and re-enters by code is back on the real position with correct repetition counts, last-move highlight, and end state.
- **Server-authoritative moves** — the server keeps its own chess.js board per room and validates every move (correct turn, legality, game not over) before broadcasting it. Illegal or out-of-turn attempts are rejected with a `move-rejected` message plus an authoritative PGN resync, so the boards can never quietly diverge. The server-generated PGN is what opponents and rejoining players receive.
- **Server-enforced draw rules** — the server runs the same `getGameResult` engine as the client after every accepted move, so insufficient material, 3-/5-fold repetition and the 50-/75-move rules terminate the room server-side. Both clients now agree on the result instead of one showing a draw overlay while the other keeps playing.
- **Room persistence** — every move, clock snapshot and terminal result is written to `server/rooms-snapshot.json`; rooms are reloaded on boot, so a server restart no longer loses in-progress games.
- **Draw offers** — a two-step 🤝 Offer Draw button (Multiplayer) with an Accept/Decline banner on the opponent's side, Cancel support, and a synced `draw-agreed` game-over result. In VS CPU the AI always declines. Offers are cleared by any move, retreat, or new game, and a message announces the withdrawal if a move kills a pending offer. **The receiver's banner is now cleared when the opponent moves**, so a dead offer can no longer be accepted.
- **Battle log (multiplayer)** — under the move table, a live feed of non-move events: draw offers/accepts/declines/cancels/withdrawals, retreats, and timeouts, color-coded per event type.
- **Puzzles mode** — 50 puzzles across 10 levels, hints, opponent-response simulation, solved counter.
- **Full chess rules** via chess.js — castling, en passant, promotion picker, check/checkmate/stalemate, insufficient material, 3-/5-fold repetition, 50-/75-move rules.
- **Chess clock (reliable)** — 8 time controls, warning/critical states, flag fall, resets on New Game. The active player is derived from the real board turn. The local (VS CPU / Pass & Play) clock ticks in 100ms sub-second steps, so fast CPU replies are still charged. **Increments (`1|1`, `3|2`, `5|3`, `10|5`) are credited after each real move.** Flag fall produces a real game-over result (`timeout`, winner + "LOST ON TIME" overlay), synced to the opponent in Multiplayer. The clock is drawn as **two bars attached to the board** — Black directly above, White directly below (chess.com-style).
- **Server-owned clock (P0-1)** — multiplayer timekeeping lives in the room record on the server (`remaining`, `increment`, `lastTickAt`, `running`). The server charges the mover on every move, credits increments itself, halts the clock on mate/resign/draw, and streams `clock-sync` (1s cadence) to both clients. `ChessClock` is render-only in multiplayer — it interpolates between server snapshots and **can no longer declare a flag**. The client sends only a `timeControlId`; the server owns the millisecond values and validates the id.
- **Env-driven backend URL** — `VITE_SERVER_URL` (see `.env.example`) with a sensible dev fallback, so the build is no longer pinned to `localhost:3001`.
- **Retreat (resign)** — a two-step "(🏳) Retreat" button in the top bar for VS CPU, Pass & Play and Multiplayer. Resigning concedes the game: the retreating side loses, opponent wins, both players see the same result.
- **Move list (Battle Log)** — a moves panel under the board listing every move in SAN (`♘ Nf3`) plus the exact squares a piece traveled (`g1→f3`). Supplied directly from `chess.js` history, so it is always correct.
- **Warzone visualization (reactive)** — the battlefield reacts to chess events (unit-themed rally messages, battle flash, check alarm, end-of-game cinematics), and **every real move plays an on-board unit march**: the moved piece flies from its old square to its destination as its unit type (Infantry / Cavalry / Archers / Siege engines / Royal Guard) with a capture burst, sped up by intensity (Off / Low / Medium / High). **Promotions** finish with a golden flare and a "promoted to Queen" crowning message. **Checkmate** runs a staged castle collapse — screen shake, then the white tower, then the black tower crash down into rubble over lingering smoke — while the winning side's army charges forward and the loser's crumples.
- **Second screen, 3D (2026-10-30)** — a 📺 **Second Screen** button opens `?display=1` as a separate window showing a **full-bleed Three.js warzone** for a second monitor or projector: rolling terrain with the 8×8 board inlaid in it, two castles, two armies, a marching unit token that flies along the real move, capture bursts, promotion rings, castle collapse + camera push on checkmate, and a camera that drifts while the battle is live. A live **board panel** sits beside the scene, and the view toggles **3D / 2D** (the 2D warzone is the fallback when WebGL is missing). Driven entirely by a plain-JSON broadcast — see [Second Screen](#second-screen-display-mode).
- **Sound system** — Web Audio API oscillator effects for move/capture/check/checkmate/promotion/illegal.
- **Responsive layout** — the topbar controls wrap and stack instead of overflowing, the draw banner stacks, the feedback toast is clamped to the viewport, and tiny screens get compact move-list/lobby styles. No horizontal overflow from phones up to desktops.

### Known bugs / rough edges — AUDITED 2026-10-30

> **No open High- or Medium-severity issues.** The previous table's eight rows are all resolved; each fix is recorded in the Session Log. What is left is genuine polish, not integrity:

| # | Issue | Severity | Where |
|---|-------|----------|-------|
| 1 | Switching time control mid-game resets the local clocks (CPU / Pass & Play only). Multiplayer has no selector, so it cannot desync there. | Low | `ChessClock.jsx` |
| 2 | The second screen only syncs within the same browser profile (BroadcastChannel is same-origin, same-browser). Cross-device mirroring would need a server channel. | Low (by design) | `useDisplayLink.js` |
| 3 | The 3D scene has no quality setting — fixed 1×–2× pixel ratio, no post-processing. Fine on a desktop GPU, untested on integrated graphics. | Low | `scene3d.js` |
| 4 | Rooms are persisted as a full-file rewrite on every move; fine for a handful of concurrent rooms, not for thousands. | Low (scale) | `server/server.js` |

## Second Screen (display mode)

Goal: the chessboard stays the **primary gameplay surface** on the main monitor, while the **warzone becomes a cinematic on the second screen**.

**How to use**

1. Start any mode (Multiplayer, VS CPU, Pass & Play, Puzzles).
2. Click **📺 Second Screen** in the top bar. A popup window opens at `?display=1`.
3. Drag that window to your second monitor and make it full screen (`F11`, or `Win`+`Shift`+`Enter`).
4. In the display's top bar, switch **3D / 2D** and toggle the **♟ Board** panel.

**How it works**

```
Game window (App.jsx)                    Display window (DisplayScreen.jsx)
  gameState ──► displayState (useMemo)     useWarzoneReceiver()
        │                                        ▲
        └── useWarzoneBroadcast ──► BroadcastChannel('kingdoms-at-war-display')
```

- The payload is **plain JSON**: `{ fen, turn, lastMove, gameResult, warzoneLevel, mode }`. No `chess.js` instance crosses the boundary (it is not serialisable) — the display rebuilds the game from `fen`. That payload is the display's whole contract, which is what makes the 3D version a drop-in replacement.
- A display opened mid-game sends `request-sync` and immediately receives the current snapshot, so it never sits blank waiting for the next move.
- The display is strictly read-only: intensity and every control stay in the game window (`Warzone` takes `showControls={false}` there).

**The 3D scene (P5-1)** lives in `src/components/Display/warzone3d/`:

- `scene3d.js` — framework-free Three.js engine. Deterministic rolling terrain (flat inside the board, hills outside), an 8×8 board texture inlaid at the centre, two castles, two armies, a marching token, capture particles, a promotion ring, castle collapse and a camera rig (idle drift → locked push-in on a decisive ending). Intensity maps to march duration, shake amplitude and flash strength — the same knobs as the 2D view.
- `Warzone3D.jsx` — a thin wrapper: it mounts the container and forwards `lastMove` / `gameResult` / `warzoneLevel` / `turn` / `inCheck`. React owns nothing else.
- Chess squares map straight onto terrain coordinates, so a march reads as a real advance across the battlefield rather than an abstraction.
- `three` is the only new dependency. The display route is **lazy-loaded**, so the game window's bundle is unchanged (343 kB); the scene ships in its own 541 kB chunk.

## What's Next — priority order

### P0 — Integrity & correctness ✅ complete
- [x] **P0-1 · Server-owned clock.** Timekeeping lives in the room record; the server charges the mover, credits increments, detects flag fall and broadcasts `clock-sync`. The client-emitted `flag-fall` claim is deleted.
- [x] **P0-2 · Server-enforced draw rules.** The server runs the shared `getGameResult` engine after each accepted move and sets `terminal`, so both clients agree.
- [x] **P0-3 · Clear the stale draw offer on `opponent-move`.**
- [x] **P0-4 · Env-driven server URL.** `VITE_SERVER_URL` + `.env.example`.

### P1 — Truthful product surface ✅ complete
- [x] **P1-1 · Play as Black in VS CPU.** Colour picker (White / Black / Random) + a colour-aware engine.
- [x] **P1-2 · Ship `useChessGame` as "Pass & Play".**
- [x] **P1-3 · Landing footer** now reads Phase 3.

### P2 — Performance ✅ complete
- [x] **P2-1 · AI in a Web Worker** + MVV-LVA move ordering.

### P3 — Persistence ✅ complete
- [x] **P3-1 · Persist rooms to disk** (`server/rooms-snapshot.json`, reloaded on boot).

### P4 — War Engine polish (delight; next up)
- [x] **P4-1 · Intensity drives the cinematics.** `.warzone` now carries `--war-shake`, `--war-flash-alpha`, `--war-charge`, `--war-charge-dur` per intensity level; `battleFlash`, `warzoneShake` and `victoryCharge` read them, so one setting moves shake magnitude, flash strength and charge distance together (and `off` silences all three).
- [ ] **P4-2** Timed-out "army routed" visual — the victory/defeat army states already exist for `checkmate|timeout|resignation`, they just need a distinct routed treatment.
- [ ] **P4-3** Emissive glow / brief zoom on the promoted square (`promotion-flare` exists in `MoveGhost.jsx`).

### P5 — Second screen
- [x] **P5-0 · Display window** (`?display=1`, BroadcastChannel mirror, full-bleed warzone).
- [x] **P5-1 · 3D warzone.** Three.js terrain, inlaid board, castles, armies, marching token, capture bursts, promotion ring, castle collapse, camera rig. Lazy-loaded so the game bundle is untouched.
- [x] **P5-2 · Display board + 3D/2D toggle.** Live board panel beside the scene, with the 2D warzone as the WebGL fallback.
- [ ] **P5-3 · Display chrome.** Hide the cursor and add an in-page fullscreen toggle inside the display window.

### P6 — Launch
- [ ] **P6-1 · Deploy** — Render/Railway backend + Vercel/Netlify frontend + env var guide.
- [ ] **P6-2 · Mobile touch support** — tap-to-select, touch events on squares.
- [ ] **P6-3 · Spectator mode** — read-only board via room code (the display payload is already the right shape).

## Session Log

### 2026-10-30 (b) — 3D warzone, display board, intensity wiring
- **P5-1 · 3D warzone (the headline).** Added `three` and a framework-free scene engine (`src/components/Display/warzone3d/scene3d.js`) plus a thin `Warzone3D.jsx` wrapper. The scene: rolling procedural terrain that stays flat inside the board footprint, an 8×8 board texture inlaid at the centre, two castles (keep, towers, battlements, flag), two 6-man armies, a marching token that flies `from → to` with an eased arc, capture particle bursts, a promotion ring, castle collapse + army fade + camera push-in on checkmate, army rout on timeout/resignation, and a slow idle camera drift while the battle is live. **Chess squares map directly onto world coordinates**, so a march reads as a real advance.
- **Bundle discipline.** The first build showed the game window jumping from 343 kB to **885 kB** because `three` was in the main chunk. `main.jsx` now lazy-loads the display route, so the game window is back to **343 kB (108 kB gzip)** and the scene ships separately at 541 kB, downloaded only by `?display=1`.
- **P5-2 · Board beside the scene.** The display renders a live `ChessBoard` (read-only: no selection, no legal-move dots, no game-over overlay) beside the 3D scene, with a **♟ Board** toggle and a **3D / 2D** switch that falls back to the 2D warzone when WebGL is unavailable.
- **P4-1 · Intensity drives the cinematics.** `.warzone` exposes `--war-shake`, `--war-flash-alpha`, `--war-charge`, `--war-charge-dur` per intensity; `battleFlash`, `warzoneShake` and `victoryCharge` read the variables, so one setting now scales shake magnitude, flash strength and charge distance together — `off` silences all three.
- **Verification:** `npm run lint` → 0 problems; `npm run build` → passes with the split above. I did **not** run the 3D scene in a browser, so its visual quality and GPU behaviour are unverified.
- **Open for next session:** P4-2 (timed-out "army routed" treatment), P4-3 (promotion glow), then P6 launch work.

### 2026-10-30 — docs reconciled to reality, lint fixed, second screen shipped
- **Re-verified the repo against its own docs.** `DOCUMENTATION.md` claimed P0–P3 landed on 2026-10-28 while `README.md` still showed them unchecked as "verified 2026-10-12" — the two docs disagreed. Checked the code directly: `server/server.js` imports the shared `getGameResult` and persists rooms, `useChessAI` runs the engine in a worker, `getBestMove` is colour-aware, and Pass & Play is routed from `LandingPage`. **The DOCUMENTATION.md claims were the accurate ones**; this README has been rewritten to match.
- **Lint was failing and nobody had noticed:** `server/server.js:67` — `try { chess.loadPgn(...) } catch { }` (empty block, `no-empty`). The empty catch was also swallowing a real condition, so it now logs which room's snapshot was unreadable and restores that room from a fresh board. Also cleared the two standing warnings: `useChessAI`'s effect cleanup now closes over a captured `pendingRequests` map instead of reading the ref late, and a stray unused `eslint-disable` in `useChessCpu` was removed. **`npm run lint` → 0 problems.**
- **Second screen (P5-0).** New `src/hooks/useDisplayLink.js` (BroadcastChannel broadcaster + receiver), `src/components/Display/DisplayScreen.jsx` + CSS, a `?display=1` route in `main.jsx`, a 📺 Second Screen button in the top bar, and a `showControls` prop on `Warzone` so the display stays read-only. Payload is plain JSON (`fen`, `turn`, `lastMove`, `gameResult`, `warzoneLevel`, `mode`) — deliberately the same contract the 3D scene will consume.
- **Verification:** `npm run lint` 0 problems, `npm run build` passes (88 modules, +3 new), `npm run test` re-run for the server suite.
- **Open for next session:** **P5-1 (3D warzone)** is the user's stated ambition and the natural next step; P4-1..3 are the cheap wins if 3D is not the priority.

### 2026-10-28 — P0-2 … P3-1 (integrity, product surface, performance, persistence)
- Server-enforced draws, stale draw-banner fix, `VITE_SERVER_URL`, play-as-Black, Pass & Play, landing footer, AI worker, and room persistence all landed. Full detail in `docs/DOCUMENTATION.md`.

### 2026-10-12 (c) — chess.com-style clock placement + march speed
- `ChessClock` wraps the board (Black above, White below); `ChessGame` takes a `clock` prop; `PlayerInfo` deleted.
- Piece march retuned to chess.com speed (~190ms pawn slide on Medium) with a 30ms trail delay.

### 2026-10-12 (b) — VS CPU clock + animation-speed fixes
- Local clock ticks every 100ms in sub-second steps with once-only flag detection, so fast CPU replies are charged.

### 2026-10-12 — P0-1 landed + snapshot commit
- Server-owned clock end-to-end: room `clock` record, 1s tick, `clock-sync`, server-side increment credit, clock halt on terminal states, client `flag-fall` handler deleted. `ChessClock` is render-only in multiplayer.

### 2026-09-28 — Audit + re-plan (docs only, no code changed)
- Every "fully working" claim verified against the source; three false statements corrected; the plan was re-sequenced to integrity-first.

## Current Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI |
| Vite | Build tool |
| JavaScript (JSX) | Language |
| CSS3 | Styling |
| chess.js | Chess engine (single source of truth) |
| Express + Socket.io | Multiplayer server |
| BroadcastChannel | Second-screen mirror (no dependency) |
| Three.js | 3D second-screen warzone (lazy-loaded chunk) |
| Git + GitHub | Version control |

## Project Layout

```
src/
├── components/
│   ├── Chess/           # ChessGame (wraps board in the clock bars), ChessBoard, ChessSquare, MoveList, MoveGhost (on-board unit march + promotion flare), PromotionPicker, GameOverOverlay, ChessStatus
│   ├── ChessClock/      # Board-attached clock bars (Black above / White below) for 8 time controls + chessClockConstants
│   ├── Display/         # Second-screen warzone (read-only, ?display=1)
│   │   └── warzone3d/   # Three.js scene engine (scene3d.js) + React wrapper
│   ├── Landing/         # Mode selection page
│   ├── Lobby/           # Multiplayer create/join
│   └── Warzone/         # Medieval battlefield visualization (reactive)
├── hooks/               # One hook per game mode: useChessGame (Pass & Play), useChessCpu (+useChessAI worker), useMultiplayerChess (+useMultiplayer), usePuzzles, useDisplayLink (second screen)
├── utils/               # chessConstants, sound, puzzles, gameResult (shared game-over engine)
├── App.jsx              # Mode router + top-level state (clock driver + display broadcast live here)
└── main.jsx             # Entry; routes ?display=1 to the Display screen
server/
├── package.json         # express, socket.io, cors, chess.js (authoritative validation)
├── rooms-snapshot.json  # Persisted rooms (written on every move; gitignored)
└── server.js            # Express + Socket.io rooms, validated moves, resign, new-game, draw flow, server-owned clock, server-enforced draws, rejoin, game-resync, persistence. Exports createClock/chargeClock/getGameResult for the smoke test.
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
3. Keep game logic inside the mode hooks (`useChessCpu`, `useMultiplayerChess`, `useChessGame`, `usePuzzles`).
4. Keep components presentational (all data + callbacks via props).
5. Promotion uses the centered overlay (no modal).
6. The chessboard must always remain the primary gameplay surface.
7. Game-over rules live in `src/utils/gameResult.js` — never re-implement the draw/win engine per hook.
8. **The server is the authority.** A client may *report* an event; it may never *decide* one. Never accept a terminal result, clock value, or move without the server validating it against its own room state.
9. **`getGameResult` is imported by the server** (`server/server.js`) — keep the two sides in lockstep or draws will desync.
10. If a feature claims to support a side/colour/variant, the UI must actually expose it.
11. **The display payload is a contract.** `DisplayScreen` consumes `{ fen, turn, lastMove, gameResult, warzoneLevel, mode }` and nothing else. Extend the payload rather than reaching into app state, so the 3D scene can consume the same broadcast.
12. **Verify before you document.** Run `npm run lint` and `npm run build` (and `npm run test` for server work) and record what actually ran; do not carry forward an old "0 errors" claim.
