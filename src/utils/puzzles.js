// Progressive Chess Puzzles - From Beginner to Advanced
// Each level teaches specific concepts

export const PUZZLE_LEVELS = [
  // =====================================================
  // LEVEL 1: What is Checkmate?
  // =====================================================
  {
    id: 1,
    title: "Welcome to Chess",
    subtitle: "Learn what checkmate means",
    category: "Basics",
    difficulty: "beginner",
    concepts: ["Checkmate", "King safety"],
    puzzles: [
      {
        id: "1-1",
        title: "Back Rank Mate",
        fen: "6k1/5ppp/8/8/8/8/8/R3K3 w Q - 0 1",
        solution: ["a8"],
        explanation: "CHECKMATE! The rook attacks the king on the back rank. The pawns block the king's escape.",
        hint: "The king is trapped on the last row by its own pawns. Attack it there!",
        teachingNote: "Checkmate happens when the king is in check and has no escape squares."
      },
      {
        id: "1-2",
        title: "Queen delivers mate",
        fen: "5rk1/5ppp/8/8/8/8/4Q3/4K3 w Q - 0 1",
        solution: ["e8"],
        explanation: "The queen captures the rook and delivers checkmate! The king cannot escape.",
        hint: "The queen can move in any direction. Find the square that attacks the king.",
        teachingNote: "The queen is the most powerful piece - it can move in any direction."
      },
      {
        id: "1-3",
        title: "Two Rooks Mate",
        fen: "4k3/8/8/8/8/8/R7/R3K3 w Q - 0 1",
        solution: ["a8"],
        explanation: "Rook on a1 moves to a8, delivering checkmate. The other rook protects it!",
        hint: "Use one rook to attack while the other protects.",
        teachingNote: "Two rooks can easily checkmate a lone king."
      },
      {
        id: "1-4",
        title: "Queen and King Mate",
        fen: "4k3/8/8/8/8/8/4Q3/4K3 w Q - 0 1",
        solution: ["e7"],
        explanation: "The queen moves to e7, protected by the king. The enemy king cannot escape!",
        hint: "The queen needs protection when delivering close-range checkmate.",
        teachingNote: "The queen and king work together to force checkmate."
      },
      {
        id: "1-5",
        title: "Rook Behind the King",
        fen: "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1",
        solution: ["a8"],
        explanation: "Rook moves to a8, checkmate! The king cannot move forward or sideways.",
        hint: "Attack the king from behind when it's on the edge.",
        teachingNote: "Rooks are strongest on open files and ranks."
      }
    ]
  },

  // =====================================================
  // LEVEL 2: How to Use the Queen
  // =====================================================
  {
    id: 2,
    title: "The Queen's Power",
    subtitle: "Master the strongest piece",
    category: "Queen Moves",
    difficulty: "beginner",
    concepts: ["Queen movement", "Queen attacks", "Multiple directions"],
    puzzles: [
      {
        id: "2-1",
        title: "Queen Fork",
        fen: "r1bqkbnr/pppppppp/2n5/1B6/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        solution: ["d4"],
        explanation: "The queen moves to d4, attacking both the king and the rook! This is called a FORK.",
        hint: "Find a square where the queen attacks two pieces at once.",
        teachingNote: "A fork is when one piece attacks two or more enemy pieces simultaneously."
      },
      {
        id: "2-2",
        title: "Queen Diagonal Attack",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["b5"],
        explanation: "The queen moves along the diagonal to deliver check!",
        hint: "Queens move diagonally as well as horizontally and vertically.",
        teachingNote: "The queen combines the power of the rook and bishop."
      },
      {
        id: "2-3",
        title: "Queen Pin",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["g5"],
        explanation: "The queen pins the knight to the king! The knight cannot move without exposing the king.",
        hint: "Look for pieces that are lined up with the king.",
        teachingNote: "A pin is when a piece cannot move because it would expose a more valuable piece behind it."
      },
      {
        id: "2-4",
        title: "Queen Skewer",
        fen: "4k3/8/8/8/8/8/4r3/4K2R w K - 0 1",
        solution: ["h8"],
        explanation: "The rook checks the king, forcing it to move, then we can capture the queen!",
        hint: "Attack the king to force it away from the piece behind it.",
        teachingNote: "A skewer is like a pin in reverse - the valuable piece is in front."
      },
      {
        id: "2-5",
        title: "Queen Sacrifice",
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        solution: ["f7"],
        explanation: "Queen captures on f7, protected by the bishop. Checkmate!",
        hint: "Sometimes sacrificing your strongest piece leads to checkmate.",
        teachingNote: "A queen sacrifice is when you give up your queen to achieve checkmate or win material."
      }
    ]
  },

  // =====================================================
  // LEVEL 3: Rooks and Open Files
  // =====================================================
  {
    id: 3,
    title: "Rook Mastery",
    subtitle: "Control the ranks and files",
    category: "Rook Tactics",
    difficulty: "beginner",
    concepts: ["Rook movement", "Open files", "Rook lifts"],
    puzzles: [
      {
        id: "3-1",
        title: "Rook Checkmate",
        fen: "4k3/8/8/8/8/8/8/R3K3 w Q - 0 1",
        solution: ["a8"],
        explanation: "Rook delivers checkmate on the back rank!",
        hint: "Rooks are strongest on the 1st and 8th ranks.",
        teachingNote: "Rooks control entire files and ranks."
      },
      {
        id: "3-2",
        title: "Rook Fork",
        fen: "4k3/8/8/8/8/1r6/8/R3K3 w Q - 0 1",
        solution: ["a8"],
        explanation: "Rook checks the king and attacks the other rook!",
        hint: "Find a square where your rook attacks two pieces.",
        teachingNote: "Rooks can fork pieces along ranks and files."
      },
      {
        id: "3-3",
        title: "Rook Lift",
        fen: "r3k2r/pppppppp/8/8/8/8/PPPPPPPP/R3K2R w KQkq - 0 1",
        solution: ["a3"],
        explanation: "Rook lifts to the third rank to swing over to the kingside!",
        hint: "Rooks can move horizontally to join attacks.",
        teachingNote: "A rook lift is when a rook moves up to the 3rd or 4th rank to attack."
      },
      {
        id: "3-4",
        title: "Rook on 7th",
        fen: "5k2/4r3/8/8/8/8/8/4K2R w K - 0 1",
        solution: ["h8"],
        explanation: "Rook checks on h8, forcing the king to move, then we capture the rook!",
        hint: "Rooks are extremely powerful on the 7th rank.",
        teachingNote: "A rook on the 7th rank attacks all pawns and restricts the king."
      },
      {
        id: "3-5",
        title: "Doubled Rooks",
        fen: "4k3/8/8/8/8/8/R7/R3K3 w Q - 0 1",
        solution: ["a8"],
        explanation: "Both rooks work together to deliver checkmate!",
        hint: "Two rooks on the same file or rank are very powerful.",
        teachingNote: "Doubled rooks (on the same file) control that file completely."
      }
    ]
  },

  // =====================================================
  // LEVEL 4: Knight Forks
  // =====================================================
  {
    id: 4,
    title: "Knight Tactics",
    subtitle: "The L-shaped attacker",
    category: "Knight Moves",
    difficulty: "beginner",
    concepts: ["Knight forks", "Knight outposts", "Knight movement"],
    puzzles: [
      {
        id: "4-1",
        title: "Basic Knight Fork",
        fen: "4k3/8/8/8/3N4/8/8/4K3 w - - 0 1",
        solution: ["c6"],
        explanation: "Knight moves to c6, forking the king and winning material!",
        hint: "Knights attack in an L-shape: 2 squares one way, 1 square perpendicular.",
        teachingNote: "Knights are the only pieces that can jump over others."
      },
      {
        id: "4-2",
        title: "Knight Forks King and Queen",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        solution: ["g5"],
        explanation: "Knight forks the king and queen!",
        hint: "Look for squares where the knight attacks two valuable pieces.",
        teachingNote: "Knight forks are devastating because knights are hard to block."
      },
      {
        id: "4-3",
        title: "Knight Outpost",
        fen: "4k3/8/8/3N4/8/8/8/4K3 w - - 0 1",
        solution: ["c7"],
        explanation: "Knight on c7 attacks both rooks!",
        hint: "An outpost is a square where the knight cannot be attacked by enemy pawns.",
        teachingNote: "Knights are strongest in the center of the board."
      },
      {
        id: "4-4",
        title: "Smothered Mate Setup",
        fen: "5rk1/5ppp/8/8/8/8/5PPP/4NK1N w - - 0 1",
        solution: ["g6"],
        explanation: "Knight moves to g6, setting up a smothered mate threat!",
        hint: "Sometimes you need to set up the checkmate before delivering it.",
        teachingNote: "Smothered mate is when the king is trapped by its own pieces."
      },
      {
        id: "4-5",
        title: "Knight Endgame",
        fen: "4k3/4n3/8/8/8/8/4N3/4K3 w - - 0 1",
        solution: ["d4"],
        explanation: "Centralize the knight to control more squares!",
        hint: "In endgames, knights need to be active in the center.",
        teachingNote: "Knight endgames are complex - piece activity is crucial."
      }
    ]
  },

  // =====================================================
  // LEVEL 5: Bishop Pairs
  // =====================================================
  {
    id: 5,
    title: "Bishop Strategy",
    subtitle: "Long-range diagonal control",
    category: "Bishop Moves",
    difficulty: "intermediate",
    concepts: ["Bishop pairs", "Diagonal control", "Color complexes"],
    puzzles: [
      {
        id: "5-1",
        title: "Bishop Check",
        fen: "4k3/8/8/8/8/8/8/B3K3 w Q - 0 1",
        solution: ["h8"],
        explanation: "Bishop delivers checkmate on the long diagonal!",
        hint: "Bishops control entire diagonals.",
        teachingNote: "Bishops are strongest on open diagonals."
      },
      {
        id: "5-2",
        title: "Bishop Pair Attack",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["b5"],
        explanation: "Both bishops coordinate to attack the king!",
        hint: "Two bishops on adjacent diagonals are very powerful.",
        teachingNote: "The bishop pair is a significant advantage in open positions."
      },
      {
        id: "5-3",
        title: "Bishop Pin",
        fen: "4k3/8/8/8/4b3/8/4P3/4K3 w - - 0 1",
        solution: ["f3"],
        explanation: "Bishop pins the knight to the king!",
        hint: "Line up your bishop with the enemy piece and the king.",
        teachingNote: "Pins are one of the most common tactical motifs."
      },
      {
        id: "5-4",
        title: "Bishop Sacrifice",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["f7"],
        explanation: "Sacrifice the bishop to expose the king!",
        hint: "Sometimes sacrificing a piece opens up the enemy king.",
        teachingNote: "Bishop sacrifices often lead to devastating attacks."
      },
      {
        id: "5-5",
        title: "Good vs Bad Bishop",
        fen: "4k3/4p3/8/8/8/5B2/4P3/4K3 w - - 0 1",
        solution: ["d5"],
        explanation: "Centralize the bishop to control more squares!",
        hint: "A bishop blocked by its own pawns is 'bad'.",
        teachingNote: "Keep pawns on the opposite color of your bishop."
      }
    ]
  },

  // =====================================================
  // LEVEL 6: Pawn Structure
  // =====================================================
  {
    id: 6,
    title: "Pawn Power",
    subtitle: "The soul of chess",
    category: "Pawn Tactics",
    difficulty: "intermediate",
    concepts: ["Pawn chains", "Pawn islands", "Pawn breaks", "En passant"],
    puzzles: [
      {
        id: "6-1",
        title: "Pawn Promotion",
        fen: "8/4P1k1/8/8/8/8/8/4K3 w - - 0 1",
        solution: ["e8q"],
        explanation: "Promote the pawn to a queen!",
        hint: "A pawn that reaches the 8th rank becomes any piece.",
        teachingNote: "Pawn promotion is one of the most powerful rules in chess."
      },
      {
        id: "6-2",
        title: "En Passant",
        fen: "8/8/8/4Pp2/8/8/8/4K3 w kq f6 0 2",
        solution: ["f6"],
        explanation: "Capture en passant! The pawn captures as if it only moved one square.",
        hint: "When an enemy pawn moves two squares and lands beside your pawn, you can capture it.",
        teachingNote: "En passant can only be done immediately after the enemy pawn moves two squares."
      },
      {
        id: "6-3",
        title: "Pawn Fork",
        fen: "4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 1",
        solution: ["d6"],
        explanation: "Pawn attacks the knight! Pawns can be powerful attackers.",
        hint: "Pawns attack diagonally.",
        teachingNote: "Pawn forks are common in endgames."
      },
      {
        id: "6-4",
        title: "Pawn Break",
        fen: "4k3/8/8/3p4/4P3/8/8/4K3 w - - 0 1",
        solution: ["d5"],
        explanation: "Pawn break opens up the position!",
        hint: "Pawn breaks create imbalances and open lines.",
        teachingNote: "Timing is crucial for pawn breaks."
      },
      {
        id: "6-5",
        title: "Passed Pawn",
        fen: "4k3/3P4/8/8/8/8/8/4K3 w - - 0 1",
        solution: ["d8q"],
        explanation: "The passed pawn promotes! No enemy pawns can stop it.",
        hint: "A passed pawn has no enemy pawns blocking its path.",
        teachingNote: "Passed pawns are extremely dangerous in endgames."
      }
    ]
  },

  // =====================================================
  // LEVEL 7: Pins and Skewers
  // =====================================================
  {
    id: 7,
    title: "Pins & Skewers",
    subtitle: "Line up your attacks",
    category: "Tactics",
    difficulty: "intermediate",
    concepts: ["Absolute pins", "Relative pins", "Skewers"],
    puzzles: [
      {
        id: "7-1",
        title: "Absolute Pin",
        fen: "4k3/8/8/8/4r3/8/4P3/4K3 w - - 0 1",
        solution: ["f1"],
        explanation: "Rook pins the pawn to the king! The pawn cannot move.",
        hint: "An absolute pin is when a piece cannot move because it would expose the king.",
        teachingNote: "Absolute pins are extremely powerful - the pinned piece is helpless."
      },
      {
        id: "7-2",
        title: "Relative Pin",
        fen: "4k3/8/8/8/4b3/8/4N3/4K3 w - - 0 1",
        solution: ["g3"],
        explanation: "Bishop pins the knight to the queen! The knight shouldn't move.",
        hint: "A relative pin is when a piece cannot move without exposing a valuable piece (not the king).",
        teachingNote: "Relative pins are not as strong as absolute pins, but still very useful."
      },
      {
        id: "7-3",
        title: "Skewer Attack",
        fen: "4k3/8/8/8/8/8/8/R3K2R w KQ - 0 1",
        solution: ["a8"],
        explanation: "Rook checks the king, forcing it to move, then we capture the other rook!",
        hint: "A skewer attacks a valuable piece, forcing it to move, revealing a piece behind it.",
        teachingNote: "Skewers are like pins in reverse."
      },
      {
        id: "7-4",
        title: "Double Pin",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["g5"],
        explanation: "Knight pins the knight, and the bishop pins the pawn!",
        hint: "Sometimes you can create multiple pins at once.",
        teachingNote: "Multiple pins can paralyze the opponent's position."
      },
      {
        id: "7-5",
        title: "Pin to Win Material",
        fen: "4k3/8/8/4b3/8/8/4R3/4K3 w - - 0 1",
        solution: ["e8"],
        explanation: "Check forces the king to move, then we capture the bishop!",
        hint: "Use the pin to win material.",
        teachingNote: "Pins often lead to winning material."
      }
    ]
  },

  // =====================================================
  // LEVEL 8: Discovered Attacks
  // =====================================================
  {
    id: 8,
    title: "Discovered Attacks",
    subtitle: "Hidden power",
    category: "Advanced Tactics",
    difficulty: "intermediate",
    concepts: ["Discovered check", "Double check", "Windmill"],
    puzzles: [
      {
        id: "8-1",
        title: "Discovered Attack",
        fen: "4k3/8/8/8/1B6/8/8/4K2R w K - 0 1",
        solution: ["e7"],
        explanation: "Bishop moves, discovering a check from the rook!",
        hint: "Moving one piece reveals an attack from another piece behind it.",
        teachingNote: "Discovered attacks are devastating because the opponent must deal with two threats."
      },
      {
        id: "8-2",
        title: "Double Check",
        fen: "4k3/8/8/8/1B6/8/8/4K2R w K - 0 1",
        solution: ["f7"],
        explanation: "Double check! Both the bishop and rook attack the king!",
        hint: "Double check forces the king to move - there's no other defense.",
        teachingNote: "Double check is the most powerful type of attack."
      },
      {
        id: "8-3",
        title: "Windmill Attack",
        fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        solution: ["e8"],
        explanation: "Rook checks, then we can capture pawns with discovered checks!",
        hint: "A windmill uses repeated discovered checks to win material.",
        teachingNote: "The windmill is one of the most devastating tactical patterns."
      },
      {
        id: "8-4",
        title: "Discovered Mate",
        fen: "4k3/8/8/8/8/8/8/R3K1B1 w Q - 0 1",
        solution: ["a8"],
        explanation: "Rook moves to a8, delivering checkmate while the bishop covers escape!",
        hint: "Sometimes a discovered attack leads directly to checkmate.",
        teachingNote: "Discovered checkmate is the ultimate combination."
      },
      {
        id: "8-5",
        title: "Discovered Check Win",
        fen: "4k3/8/8/4r3/8/8/4R3/4K3 w - - 0 1",
        solution: ["e5"],
        explanation: "Discover check and capture the enemy rook!",
        hint: "Move your piece to discover a check, then capture the undefended piece.",
        teachingNote: "Discovered checks often lead to winning material."
      }
    ]
  },

  // =====================================================
  // LEVEL 9: Sacrifices
  // =====================================================
  {
    id: 9,
    title: "Sacrifices",
    subtitle: "Give to receive",
    category: "Advanced Tactics",
    difficulty: "advanced",
    concepts: ["Exchange sacrifice", "Piece sacrifice", "Positional sacrifice"],
    puzzles: [
      {
        id: "9-1",
        title: "Rook Sacrifice",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["b5"],
        explanation: "Sacrifice the rook to open up the king's defenses!",
        hint: "Sometimes giving up a rook for a minor piece can lead to a winning attack.",
        teachingNote: "Exchange sacrifice means giving up a rook for a bishop or knight."
      },
      {
        id: "9-2",
        title: "Queen Sacrifice",
        fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
        solution: ["f7"],
        explanation: "Queen sacrifice leads to checkmate! The bishop protects the queen.",
        hint: "Sacrificing the queen is worth it if it leads to checkmate.",
        teachingNote: "Queen sacrifices are the most spectacular tactics in chess."
      },
      {
        id: "9-3",
        title: "Bishop Sacrifice",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["f7"],
        explanation: "Bishop sacrifice opens the king's position!",
        hint: "Sacrificing a bishop can expose the enemy king.",
        teachingNote: "Bishop sacrifices often occur on f7 or f2."
      },
      {
        id: "9-4",
        title: "Knight Sacrifice",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5",
        solution: ["g5"],
        explanation: "Knight sacrifice destroys the pawn cover!",
        hint: "Sacrificing a knight can shatter the king's pawn shield.",
        teachingNote: "Knight sacrifices are often unsound but can be devastating."
      },
      {
        id: "9-5",
        title: "Positional Sacrifice",
        fen: "4k3/8/8/4r3/8/8/4R3/4K3 w - - 0 1",
        solution: ["e5"],
        explanation: "Sacrifice the exchange for a dominating position!",
        hint: "Sometimes material isn't everything - piece activity matters more.",
        teachingNote: "Positional sacrifices are based on long-term advantages."
      }
    ]
  },

  // =====================================================
  // LEVEL 10: Endgame Essentials
  // =====================================================
  {
    id: 10,
    title: "Endgame Mastery",
    subtitle: "Convert your advantage",
    category: "Endgame",
    difficulty: "advanced",
    concepts: ["King and pawn", "Opposition", "Zugzwang", "Lucena position"],
    puzzles: [
      {
        id: "10-1",
        title: "King and Pawn Mate",
        fen: "8/8/8/8/8/5k2/4P3/4K3 w - - 0 1",
        solution: ["e4"],
        explanation: "Advance the pawn while the king supports it!",
        hint: "In king and pawn endgames, the king must support the pawn.",
        teachingNote: "King and pawn endgames are the foundation of all endgames."
      },
      {
        id: "10-2",
        title: "Opposition",
        fen: "8/8/8/4k3/8/4K3/8/8 w - - 0 1",
        solution: ["d4"],
        explanation: "Take the opposition! The enemy king must give way.",
        hint: "Opposition means kings face each other with one square between.",
        teachingNote: "Opposition is crucial for winning king and pawn endgames."
      },
      {
        id: "10-3",
        title: "Zugzwang",
        fen: "8/8/8/8/3k4/8/3P4/3K4 w - - 0 1",
        solution: ["d3"],
        explanation: "Force the enemy king into zugzwang - any move worsens their position!",
        hint: "Zugzwang means the player to move is at a disadvantage.",
        teachingNote: "Zugzwang is common in endgames and can decide the outcome."
      },
      {
        id: "10-4",
        title: "Lucena Position",
        fen: "4k3/4P3/8/8/8/8/4R3/4K3 w - - 0 1",
        solution: ["e8q"],
        explanation: "The Lucena position guarantees promotion!",
        hint: "The Lucena position is a winning rook endgame technique.",
        teachingNote: "The Lucena position is fundamental for rook endgames."
      },
      {
        id: "10-5",
        title: "Rook Endgame",
        fen: "4k3/4r3/8/8/8/8/4R3/4K3 w - - 0 1",
        solution: ["e7"],
        explanation: "Control the 7th rank with your rook!",
        hint: "In rook endgames, rook activity is more important than material.",
        teachingNote: "Rook endgames are the most common endgames in chess."
      }
    ]
  }
];

// Get total number of puzzles
export const getTotalPuzzles = () => {
  return PUZZLES_LEVELS.reduce((total, level) => total + level.puzzles.length, 0);
};

// Get puzzle by global index
export const getPuzzleByIndex = (index) => {
  let count = 0;
  for (const level of PUZZLES_LEVELS) {
    for (const puzzle of level.puzzles) {
      if (count === index) {
        return { level, puzzle };
      }
      count++;
    }
  }
  return null;
};