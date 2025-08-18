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
      mazo: "Mazo"
    }
  },
  betting: {
    called: (player: string, bet: string, points: number) => `${player} called: ${bet.replace('_', ' ').toUpperCase()}(${points} pts)`,
    handWinner: (player: string) => `Hand Winner: ${player}`
  }
};