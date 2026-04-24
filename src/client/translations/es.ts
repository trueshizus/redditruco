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
      mazo: "Mazo",
      continue: "Continuar"
    }
  },
  betting: {
    called: (player: string, bet: string, points: number) => `${player} cantó: ${bet.replace('_', ' ').toUpperCase()}(${points} pts)`,
    handWinner: (player: string) => `Ganador de la Mano: ${player}`
  },
  logs: {
    title: "Registro de Partida",
    gameInitialized: "Juego inicializado",
    roundBegins: (round: number) => `Ronda ${round} comienza`,
    cardsDealt: "Cartas repartidas a los jugadores",
    cardPlayed: (player: string, card: string) => `${player} juega ${card}`,
    trickWon: (player: string, trick: number) => `${player} gana la baza ${trick}`,
    trickTied: (trick: number) => `Baza ${trick} está empatada (parda)`,
    envidoCalled: (player: string, points: number) => `${player} canta Envido (${points} pts)`,
    realEnvidoCalled: (player: string, points: number) => `${player} canta Real Envido (${points} pts)`,
    faltaEnvidoCalled: (player: string, points: number) => `${player} canta Falta Envido (${points} pts)`,
    trucoCalled: (player: string, points: number) => `${player} canta Truco (${points} pts)`,
    retrucoCalled: (player: string, points: number) => `${player} canta Retruco (${points} pts)`,
    valeCuatroCalled: (player: string, points: number) => `${player} canta Vale Cuatro (${points} pts)`,
    envidoAccepted: (winner: string, p1Points: number, p2Points: number, stake: number) => `Envido aceptado. Jugador 1: ${p1Points}, Jugador 2: ${p2Points}. ${winner} gana ${stake} pts`,
    envidoDeclined: (winner: string) => `Envido rechazado. ${winner} anota 1 punto`,
    trucoAccepted: (stake: number) => `Truco aceptado. Ronda vale ${stake} puntos`,
    trucoDeclined: (winner: string, points: number) => `Truco rechazado. ${winner} gana ${points} puntos`,
    roundComplete: (winner: string) => `Ronda completa. ¡${winner} gana!`,
    gameOver: (winner: string) => `¡Juego terminado! ¡${winner} gana la partida!`,
    newRound: "--- Empezando nueva ronda ---",
    goesToDeck: (player: string, winner: string) => `${player} se va al mazo. ¡${winner} gana la ronda!`
  }
};