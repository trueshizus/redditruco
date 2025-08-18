export const es = {
  board: {
    title: "TRUCO",
    description: "Selecciona y juega tus cartas",
    trickStatus: (num: number) => `Baza ${num}/3`,
    playAreas: {
      player1: "Jugador 1",
      player2: "Jugador 2"
    }
  },
  game: {
    states: {
      idle: "Esperando para empezar",
      dealing: "Repartiendo cartas",
      playing: "Jugando",
      envidoBetting: "Apostando Envido",
      trucoBetting: "Apostando Truco", 
      handComplete: "Mano Completa",
      finished: "Juego Terminado"
    },
    info: {
      currentTurn: "Turno Actual",
      score: "Puntuación",
      dealer: "Repartidor",
      mano: "Mano",
      cardsDealt: (dealt: number, total: number) => `Cartas repartidas: ${dealt}/${total}`,
      matchId: "ID de Partida"
    },
    winner: {
      gameOver: "🏆 ¡JUEGO TERMINADO! 🏆",
      winner: "Ganador",
      finalScore: "Puntuación Final"
    }
  },
  player: {
    currentTurn: "(Turno Actual)",
    cards: (count: number) => `Cartas: ${count}`,
    noCards: "No hay cartas repartidas"
  },
  actions: {
    buttons: {
      startGame: "Empezar Juego y Repartir",
      playCard: "Jugar Carta Seleccionada",
      startNewHand: "Empezar Nueva Mano",
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
    called: (player: string, bet: string, points: number) => `${player} cantó: ${bet.replace('_', ' ').toUpperCase()}(${points} pts)`,
    handWinner: (player: string) => `Ganador de la Mano: ${player}`
  }
};