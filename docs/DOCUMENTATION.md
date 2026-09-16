# Kingdoms at War

A cinematic multiplayer chess game where the chessboard is the primary gameplay and a live medieval warzone visualizes every move as a battlefield command.

## Current Stack

| Technology | Purpose |
|------------|---------|
| React 19 | UI |
| Vite | Build tool |
| JavaScript (JSX) | Current language |
| CSS3 | Styling |
| chess.js | Chess engine |
| Git + GitHub | Version control |

## Architecture

```
src/
├── components/
│   ├── Chess/
│   └── Warzone/
├── hooks/
│   └── useChessGame.jsx
├── utils/
│   ├── chessConstants.js
│   └── sound.js
├── App.jsx
└── main.jsx
```

## MVP Progress

### Phase 1 — Chess Engine (Completed)
- Legal movement
- Castling
- En passant
- Pawn promotion
- Check
- Checkmate
- Stalemate
- Insufficient material
- Threefold repetition
- Fivefold repetition
- 50-move rule
- 75-move rule
- Game Over overlay
- Responsive board
- Sound system

**Status: MVP Chess Engine Complete**

### Phase 2 — Multiplayer (Next)

Priority order:
1. Socket.io backend
2. Room creation
3. Join by code
4. White/Black assignment
5. Move synchronization
6. Promotion visible only to promoting player
7. Chess clocks
8. Draw offer
9. Resignation
10. Reconnection handling

### Phase 3 — War Engine

The warzone becomes reactive:
- Pawn advances → Infantry marches
- Knight → Cavalry charge
- Bishop → Archers reposition
- Rook → Siege weapons advance
- Queen → Royal Guard attack
- Check → Castle alarm
- Checkmate → Castle destruction cinematic

## Coding Rules for Any AI

1. Never implement chess rules manually.
2. chess.js is the single source of truth.
3. Keep game logic inside useChessGame.
4. Keep components presentational.
5. Promotion uses the centered overlay (no modal).
6. The chessboard must always remain the primary gameplay surface.

## Where We Continue Next

We are officially entering **Phase 2: Multiplayer Infrastructure**.

The first milestone will be building:
- Node + Express server
- Socket.io
- Create Room / Join Room
- Real-time synchronized chess board

After that, we'll connect the existing React UI without changing the chess engine.