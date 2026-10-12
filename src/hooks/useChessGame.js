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
import { getGameResult, getPositionKey } from "../utils/gameResult";


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

        promotion:
          move.promotion ||
          null,

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

        promotion:
          pieceType ||
          null,

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