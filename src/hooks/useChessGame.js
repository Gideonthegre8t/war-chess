import {
  useMemo,
  useState,
} from "react";

import { Chess } from "chess.js";

import {
  files,
  ranks,
} from "../utils/chessConstants";

import { playSound } from "../utils/sound";


/*
=========================================================
POSITION KEY
=========================================================

Used for repetition tracking.

We prefer chess.js hash() when available.

Fallback uses the first four FEN fields:

1. Piece placement
2. Side to move
3. Castling rights
4. En-passant target
*/

const getPositionKey = (chess) => {
  if (typeof chess.hash === "function") {
    return chess.hash();
  }

  return chess
    .fen()
    .split(" ")
    .slice(0, 4)
    .join(" ");
};


/*
=========================================================
GAME RESULT ENGINE
=========================================================

This is the SINGLE source of truth for game-over rules.

Priority:

1. Checkmate
2. Stalemate
3. Insufficient material
4. Fivefold repetition
5. 75-move rule
6. Threefold repetition
7. 50-move rule
8. Game continues

For this MVP, we automatically end the game on
threefold repetition and the 50-move rule as well.
*/

const getGameResult = (
  chess,
  positionCounts
) => {

  /*
  -------------------------------------------------------
  CURRENT POSITION
  -------------------------------------------------------
  */

  const positionKey =
    getPositionKey(chess);

  const repetitionCount =
    positionCounts[positionKey] || 1;


  /*
  -------------------------------------------------------
  HALF-MOVE CLOCK
  -------------------------------------------------------

  FEN field #5.

  100 half-moves = 50 moves
  150 half-moves = 75 moves
  */

  const halfmoveClock =
    Number(
      chess
        .fen()
        .split(" ")[4]
    ) || 0;


  /*
  -------------------------------------------------------
  REPETITION FLAGS
  -------------------------------------------------------
  */

  const isThreefoldRepetition =
    repetitionCount >= 3;

  const isFivefoldRepetition =
    repetitionCount >= 5;


  /*
  -------------------------------------------------------
  MOVE RULE FLAGS
  -------------------------------------------------------
  */

  const isFiftyMoveDraw =
    halfmoveClock >= 100;

  const isSeventyFiveMoveDraw =
    halfmoveClock >= 150;


  /*
  =======================================================
  1. CHECKMATE
  =======================================================
  */

  if (chess.isCheckmate()) {

    /*
    After a checkmate move, chess.js has already
    switched the turn to the losing side.

    Therefore:

    If it is White's turn -> Black just checkmated White.
    If it is Black's turn -> White just checkmated Black.
    */

    const winner =
      chess.turn() === "w"
        ? "b"
        : "w";


    return {
      over: true,
      type: "checkmate",
      winner,
      message: "👑 CHECKMATE",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  2. STALEMATE
  =======================================================
  */

  if (chess.isStalemate()) {

    return {
      over: true,
      type: "stalemate",
      message: "🤝 DRAW — STALEMATE",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  3. INSUFFICIENT MATERIAL
  =======================================================
  */

  if (chess.isInsufficientMaterial()) {

    return {
      over: true,
      type: "insufficient-material",
      message:
        "🤝 DRAW — INSUFFICIENT MATERIAL",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  4. FIVEFOLD REPETITION
  =======================================================
  */

  if (isFivefoldRepetition) {

    return {
      over: true,
      type: "fivefold-repetition",
      message:
        "🤝 DRAW — FIVEFOLD REPETITION",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  5. 75-MOVE RULE
  =======================================================
  */

  if (isSeventyFiveMoveDraw) {

    return {
      over: true,
      type: "seventy-five-move",
      message:
        "🤝 DRAW — 75-MOVE RULE",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  6. THREEFOLD REPETITION
  =======================================================
  */

  if (isThreefoldRepetition) {

    return {
      over: true,
      type: "threefold-repetition",
      message:
        "🤝 DRAW — THREEFOLD REPETITION",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  7. 50-MOVE RULE
  =======================================================
  */

  if (isFiftyMoveDraw) {

    return {
      over: true,
      type: "fifty-move",
      message:
        "🤝 DRAW — 50-MOVE RULE",
      repetitionCount,
      halfmoveClock,
      isThreefoldRepetition,
      isFivefoldRepetition,
      isFiftyMoveDraw,
      isSeventyFiveMoveDraw,
    };
  }


  /*
  =======================================================
  GAME CONTINUES
  =======================================================
  */

  return {
    over: false,
    type: null,
    message: null,
    repetitionCount,
    halfmoveClock,
    isThreefoldRepetition,
    isFivefoldRepetition,
    isFiftyMoveDraw,
    isSeventyFiveMoveDraw,
  };
};


/*
=========================================================
HOOK
=========================================================
*/

export function useChessGame() {

  /*
  =======================================================
  GAME
  =======================================================
  */

  const [game, setGame] =
    useState(() => new Chess());


  /*
  =======================================================
  UI STATE
  =======================================================
  */

  const [selectedSquare, setSelectedSquare] =
    useState(null);

  const [lastMove, setLastMove] =
    useState(null);

  const [promotionState, setPromotionState] =
    useState(null);

  const [feedback, setFeedback] =
    useState(null);


  /*
  =======================================================
  REPETITION HISTORY
  =======================================================
  */

  const [positionCounts, setPositionCounts] =
    useState(() => {

      const initialGame =
        new Chess();

      const initialKey =
        getPositionKey(initialGame);

      return {
        [initialKey]: 1,
      };
    });


  /*
  =======================================================
  BOARD
  =======================================================
  */

  const board = useMemo(
    () => game.board(),
    [game]
  );


  /*
  =======================================================
  LEGAL MOVES
  =======================================================
  */

  const legalMoves =
    selectedSquare
      ? game.moves({
          square: selectedSquare,
          verbose: true,
        })
      : [];


  const legalMoveSquares =
    legalMoves.map(
      (move) => move.to
    );


  /*
  =======================================================
  FEEDBACK
  =======================================================
  */

  const showFeedback = (
    message,
    type
  ) => {

    setFeedback({
      message,
      type,
    });

    setTimeout(() => {
      setFeedback(null);
    }, 1800);
  };


  /*
  =======================================================
  FIND KING
  =======================================================
  */

  const findKingSquare = (
    color
  ) => {

    const currentBoard =
      game.board();

    for (
      let row = 0;
      row < currentBoard.length;
      row++
    ) {

      for (
        let column = 0;
        column < currentBoard[row].length;
        column++
      ) {

        const square =
          currentBoard[row][column];

        if (
          square &&
          square.type === "k" &&
          square.color === color
        ) {

          return (
            files[column] +
            ranks[row]
          );
        }
      }
    }

    return null;
  };


  /*
  =======================================================
  CHECKED KING
  =======================================================
  */

  const checkedKingSquare =
    game.isCheck()
      ? findKingSquare(
          game.turn()
        )
      : null;


  /*
  =======================================================
  AUTHORITATIVE GAME RESULT
  =======================================================
  */

  const gameResult = useMemo(
    () =>
      getGameResult(
        game,
        positionCounts
      ),
    [
      game,
      positionCounts,
    ]
  );


  /*
  =======================================================
  MAKE POSITION COUNT
  =======================================================
  */

  const updatePositionCounts = (
    nextGame
  ) => {

    const nextPositionKey =
      getPositionKey(nextGame);

    const nextCount =
      (
        positionCounts[
          nextPositionKey
        ] || 0
      ) + 1;

    const nextPositionCounts = {
      ...positionCounts,

      [nextPositionKey]:
        nextCount,
    };

    return {
      nextPositionCounts,
      nextCount,
    };
  };


  /*
  =======================================================
  HANDLE SQUARE CLICK
  =======================================================
  */

  const handleSquareClick = (
    square
  ) => {

    /*
    DO NOT MOVE DURING PROMOTION
    */

    if (promotionState) {
      return;
    }


    /*
    DO NOT MOVE AFTER GAME OVER
    */

    if (gameResult.over) {

      playSound("illegal");

      return;
    }


    const piece =
      game.get(square);


    /*
    -------------------------------------------------------
    NOTHING SELECTED
    -------------------------------------------------------
    */

    if (!selectedSquare) {

      if (
        piece &&
        piece.color === game.turn()
      ) {

        setSelectedSquare(
          square
        );
      }

      return;
    }


    /*
    -------------------------------------------------------
    CLICKED SAME SQUARE
    -------------------------------------------------------
    */

    if (
      selectedSquare === square
    ) {

      setSelectedSquare(null);

      return;
    }


    /*
    -------------------------------------------------------
    CLICKED ANOTHER FRIENDLY PIECE
    -------------------------------------------------------
    */

    if (
      piece &&
      piece.color === game.turn()
    ) {

      setSelectedSquare(
        square
      );

      return;
    }


    /*
    -------------------------------------------------------
    ILLEGAL DESTINATION
    -------------------------------------------------------
    */

    if (
      !legalMoveSquares.includes(
        square
      )
    ) {

      playSound("illegal");

      showFeedback(
        "🚫 Illegal move",
        "illegal"
      );

      setSelectedSquare(null);

      return;
    }


    /*
    -------------------------------------------------------
    MOVE INFORMATION
    -------------------------------------------------------
    */

    const movingPiece =
      game.get(selectedSquare);

    const capturedPiece =
      game.get(square);


    /*
    -------------------------------------------------------
    PROMOTION
    -------------------------------------------------------
    */

    const promotionMove =
      legalMoves.find(
        (move) =>
          move.to === square &&
          move.promotion
      );


    if (promotionMove) {

      setPromotionState({

        from: selectedSquare,

        to: square,

        color:
          movingPiece.color,

      });

      return;
    }


    /*
    =======================================================
    MAKE NORMAL MOVE
    =======================================================
    */

    try {

      const nextGame =
        new Chess();

      nextGame.loadPgn(
        game.pgn()
      );


      const move =
        nextGame.move({
          from: selectedSquare,
          to: square,
        });


      /*
      -----------------------------------------------------
      UPDATE REPETITION HISTORY
      -----------------------------------------------------
      */

      const {
        nextPositionCounts,
      } =
        updatePositionCounts(
          nextGame
        );


      /*
      -----------------------------------------------------
      GET RESULT FROM ONE ENGINE
      -----------------------------------------------------
      */

      const nextResult =
        getGameResult(
          nextGame,
          nextPositionCounts
        );


      /*
      -----------------------------------------------------
      SOUND
      -----------------------------------------------------
      */

      if (
        nextResult.type ===
        "checkmate"
      ) {

        playSound(
          "checkmate"
        );

      } else if (
        nextGame.isCheck()
      ) {

        playSound("check");

      } else if (
        capturedPiece
      ) {

        playSound("capture");

      } else {

        playSound("move");
      }


      /*
      -----------------------------------------------------
      UPDATE GAME
      -----------------------------------------------------
      */

      setGame(nextGame);

      setPositionCounts(
        nextPositionCounts
      );

      setSelectedSquare(null);


      /*
      -----------------------------------------------------
      LAST MOVE
      -----------------------------------------------------
      */

      setLastMove({

        from: move.from,

        to: move.to,

        captured:
          Boolean(
            capturedPiece
          ),

        piece:
          movingPiece?.type,

      });


      /*
      -----------------------------------------------------
      RESULT FEEDBACK
      -----------------------------------------------------
      */

      if (nextResult.over) {

        showFeedback(
          nextResult.message,
          nextResult.type ===
          "checkmate"
            ? "checkmate"
            : "draw"
        );

      } else if (
        nextGame.isCheck()
      ) {

        showFeedback(
          "⚠️ CHECK",
          "check"
        );
      }

    } catch (error) {

      console.error(
        "Move failed:",
        error
      );

      playSound("illegal");

      showFeedback(
        "🚫 Illegal move",
        "illegal"
      );

      setSelectedSquare(null);
    }
  };


  /*
  =======================================================
  PROMOTION
  =======================================================
  */

  const handlePromotion = (
    pieceType
  ) => {

    if (!promotionState) {
      return;
    }


    /*
    Game could theoretically end between
    opening and selecting promotion.
    */

    if (gameResult.over) {

      setPromotionState(null);

      return;
    }


    try {

      const {
        from,
        to,
      } = promotionState;


      const nextGame =
        new Chess();

      nextGame.loadPgn(
        game.pgn()
      );


      const capturedPiece =
        nextGame.get(to);


      /*
      -----------------------------------------------------
      MAKE PROMOTION
      -----------------------------------------------------
      */

      const move =
        nextGame.move({

          from,

          to,

          promotion:
            pieceType,

        });


      /*
      -----------------------------------------------------
      UPDATE REPETITION HISTORY
      -----------------------------------------------------
      */

      const {
        nextPositionCounts,
      } =
        updatePositionCounts(
          nextGame
        );


      /*
      -----------------------------------------------------
      GET RESULT FROM SAME ENGINE
      -----------------------------------------------------
      */

      const nextResult =
        getGameResult(
          nextGame,
          nextPositionCounts
        );


      /*
      -----------------------------------------------------
      SOUND
      -----------------------------------------------------
      */

      if (
        nextResult.type ===
        "checkmate"
      ) {

        playSound(
          "checkmate"
        );

      } else if (
        nextGame.isCheck()
      ) {

        playSound("check");

      } else {

        playSound(
          "promotion"
        );
      }


      /*
      -----------------------------------------------------
      UPDATE STATE
      -----------------------------------------------------
      */

      setGame(nextGame);

      setPositionCounts(
        nextPositionCounts
      );

      setSelectedSquare(null);

      setPromotionState(null);


      /*
      -----------------------------------------------------
      LAST MOVE
      -----------------------------------------------------
      */

      setLastMove({

        from: move.from,

        to: move.to,

        captured:
          Boolean(
            capturedPiece
          ),

        piece:
          pieceType,

      });


      /*
      -----------------------------------------------------
      RESULT FEEDBACK
      -----------------------------------------------------
      */

      if (nextResult.over) {

        showFeedback(
          nextResult.message,
          nextResult.type ===
          "checkmate"
            ? "checkmate"
            : "draw"
        );

      } else if (
        nextGame.isCheck()
      ) {

        showFeedback(
          "⚠️ CHECK",
          "check"
        );
      }

    } catch (error) {

      console.error(
        "Promotion failed:",
        error
      );

      playSound("illegal");

      showFeedback(
        "🚫 Promotion failed",
        "illegal"
      );
    }
  };


  /*
  =======================================================
  RESET GAME
  =======================================================
  */

  const resetGame = () => {

    const newGame =
      new Chess();


    const initialPositionKey =
      getPositionKey(
        newGame
      );


    setGame(newGame);

    setSelectedSquare(null);

    setLastMove(null);

    setPromotionState(null);

    setFeedback(null);


    /*
    Starting position = occurrence #1
    */

    setPositionCounts({

      [initialPositionKey]: 1,

    });
  };


  /*
  =======================================================
  RETURN
  =======================================================
  */

  return {

    game,

    board,

    selectedSquare,

    legalMoveSquares,

    lastMove,

    promotionState,

    checkedKingSquare,

    feedback,


    /*
    =====================================================
    GAME RESULT
    =====================================================
    */

    gameResult,

    gameOver:
      gameResult.over,

    gameResultType:
      gameResult.type,

    repetitionCount:
      gameResult.repetitionCount,

    halfmoveClock:
      gameResult.halfmoveClock,

    isThreefoldRepetition:
      gameResult.isThreefoldRepetition,

    isFivefoldRepetition:
      gameResult.isFivefoldRepetition,

    isFiftyMoveDraw:
      gameResult.isFiftyMoveDraw,

    isSeventyFiveMoveDraw:
      gameResult.isSeventyFiveMoveDraw,


    /*
    =====================================================
    ACTIONS
    =====================================================
    */

    handleSquareClick,

    handlePromotion,

    resetGame,

  };
}