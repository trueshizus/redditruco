export const en = {
  board: {
    title: "TRUCO",
    description: "Select and play your cards",
    trickStatus: (num: number) => `Trick ${num}/3`,
    playAreas: {
      player1: "Player 1",
      player2: "Player 2"
    }
  },
  game: {
    states: {
      idle: "Waiting to start",
      dealing: "Dealing cards",
      playing: "Playing",
      envidoBetting: "Envido Betting", 
      trucoBetting: "Truco Betting",
      handComplete: "Hand Complete",
      finished: "Game Over"
    },
    info: {
      currentTurn: "Current Turn",
      score: "Score",
      dealer: "Dealer",
      mano: "Mano",
      cardsDealt: (dealt: number, total: number) => `Cards dealt: ${dealt}/${total}`,
      matchId: "Match ID"
    },
    winner: {
      gameOver: "🏆 GAME OVER! 🏆",
      winner: "Winner",
      finalScore: "Final Score"
    }
  },
  player: {
    currentTurn: "(Current Turn)",
    cards: (count: number) => `Cards: ${count}`,
    noCards: "No cards dealt"
  },
  actions: {
    buttons: {
      startGame: "Start Game & Deal Cards",
      playCard: "Play Selected Card",
      startNewHand: "Start New Hand",
      envido: "Envido",
      realEnvido: "Real Envido", 
      faltaEnvido: "Falta Envido",
      truco: "Truco",
      retruco: "Retruco",
      valeCuatro: "Vale Cuatro",
      quiero: "Quiero",
      noQuiero: "No Quiero",
      mazo: "Mazo",
      continue: "Continue"
    }
  },
  betting: {
    called: (player: string, bet: string, points: number) => `${player} called: ${bet.replace('_', ' ').toUpperCase()}(${points} pts)`,
    handWinner: (player: string) => `Hand Winner: ${player}`
  },
  logs: {
    title: "Match Log",
    gameInitialized: "Game initialized",
    roundBegins: (round: number) => `Round ${round} begins`,
    cardsDealt: "Cards dealt to players",
    cardPlayed: (player: string, card: string) => `${player} plays ${card}`,
    trickWon: (player: string, trick: number) => `${player} wins trick ${trick}`,
    trickTied: (trick: number) => `Trick ${trick} is tied (parda)`,
    envidoCalled: (player: string, points: number) => `${player} calls Envido (${points} pts)`,
    realEnvidoCalled: (player: string, points: number) => `${player} calls Real Envido (${points} pts)`,
    faltaEnvidoCalled: (player: string, points: number) => `${player} calls Falta Envido (${points} pts)`,
    trucoCalled: (player: string, points: number) => `${player} calls Truco (${points} pts)`,
    retrucoCalled: (player: string, points: number) => `${player} calls Retruco (${points} pts)`,
    valeCuatroCalled: (player: string, points: number) => `${player} calls Vale Cuatro (${points} pts)`,
    envidoAccepted: (winner: string, p1Points: number, p2Points: number, stake: number) => `Envido accepted. Player 1: ${p1Points}, Player 2: ${p2Points}. ${winner} wins ${stake} pts`,
    envidoDeclined: (winner: string) => `Envido declined. ${winner} scores 1 point`,
    trucoAccepted: (stake: number) => `Truco accepted. Round worth ${stake} points`,
    trucoDeclined: (winner: string, points: number) => `Truco declined. ${winner} wins ${points} points`,
    roundComplete: (winner: string) => `Round complete. ${winner} wins!`,
    gameOver: (winner: string) => `Game Over! ${winner} wins the match!`,
    newRound: "--- Starting new round ---",
    goesToDeck: (player: string, winner: string) => `${player} goes to deck. ${winner} wins the round!`
  }
};