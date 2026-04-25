// Argentine Spanish: voseo + register/terminology a real player would use.
//   - "mano" for a hand of 3 tricks (not "ronda").
//   - "rival" in place of "oponente" — card-game parlance in the Río de la Plata.
//   - "te toca" / "próxima" / "seguir" — colloquial register over stiff cognates.
//   - "llevarse" (la) — idiomatic for winning a trick. Argentines don't use
//     "baza" (that's Spain); individual tricks are referenced positionally
//     or with an implicit pronoun ("se la llevó").
//   - "partida" for the full first-to-30 match.
export const es = {
  common: {
    you: 'Vos',
    opponent: 'Rival',
    vs: 'VS',
  },
  board: {
    round: (n: number) => `Mano ${n}`,
    envidoStake: (n: number) => `Envido: ${n} pts`,
    trucoStake: (n: number) => `Truco: ${n} pts`,
  },
  status: {
    yourTurn: 'Te toca',
    waitingForResponse: 'Esperando que responda…',
    respondToBet: 'Respondé',
    waiting: 'Esperando…',
  },
  idle: {
    prompt: '¿Listo para jugar al Truco?',
    startButton: '🎴 Empezar',
  },
  trick: {
    youWon: '🏆 ¡Te la llevaste!',
    opponentWon: (name: string) => `🏆 Tanto para ${name}`,
    parda: '🤝 Parda',
    continue: 'Seguir →',
  },
  round: {
    youWon: '🎉 ¡Ganaste la mano!',
    opponentWon: '🎉 Ganó la mano el rival',
    nextRound: 'Próxima mano →',
  },
  gameOver: {
    title: '🎊 ¡Terminó la partida!',
    youWin: '¡Ganaste!',
    opponentWins: 'Ganó el rival',
    finalScore: 'Puntaje final',
    restart: '🎴 Jugar de nuevo',
  },
  playerSection: {
    noCards: 'Sin cartas en mano',
    truco: 'Truco',
    retruco: 'Retruco',
    valeCuatro: 'Vale Cuatro',
    mazo: 'Me voy al mazo',
    envido: 'Envido',
    realEnvido: 'Real',
    faltaEnvido: 'Falta',
  },
  opponentStatus: {
    cardsCount: (n: number) => `${n} carta${n === 1 ? '' : 's'}`,
  },
  debugPanel: {
    title: 'Panel de Debug',
    aiBadge: '🤖 IA',
    playCardHeading: 'Jugar carta',
    envidoHeading: 'Envido',
    responseHeading: 'Respuesta',
    actionsHeading: 'Acciones',
    quiero: '✓ Quiero',
    noQuiero: '✗ No quiero',
    quieroRetruco: '🎯 Quiero Retruco',
    quieroValeCuatro: '🎯 Quiero Vale Cuatro',
    truco: '🎯 Truco',
    mazo: '🃏 Al mazo',
  },
  response: {
    required: '⚡ Respondé',
    quiero: '✓ Quiero',
    noQuiero: '✗ No quiero',
    quieroRetruco: '🎯 Quiero Retruco',
    quieroValeCuatro: '🎯 Quiero Vale Cuatro',
    envidoEstaPrimero: '⚡ El envido está primero',
    envido: 'Envido',
    realEnvido: 'Real',
    faltaEnvido: 'Falta',
  },
  chat: {
    channelTitle: '#mesa-truco',
    welcomePrompt: 'tipeá /start para empezar · /help para los comandos',
    helpHeading: 'comandos',
    promptPrefix: 'vos@truco:#mesa $',
    inputPlaceholder: 'tipeá un comando o un comentario…',
    thinking: '<rival> está pensando…',
    bot: { name: 'CanillitaBot' },
    placeholders: { freeText: 'apretá / para ver los comandos' },
  },
};
