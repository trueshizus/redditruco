import { pickCard, respondToEnvido, respondToTruco } from './canillitaStrategy';

interface BotSnapshot {
  value: string;
  context: {
    currentTurn: number;
    mano: number;
    awaitingResponse: boolean;
    betInitiator: number | null;
    envidoStake: number;
    roundStake: number;
    trucoState: 'none' | 'truco' | 'retruco' | 'vale_cuatro';
    adversary: { hand: string[] };
    board: { cardsInPlay: { player: string | null; adversary: string | null } };
  };
}

const BOT_INDEX = 1;

export type BotEvent =
  | { type: 'PLAY_CARD'; cardId: string }
  | { type: 'QUIERO' }
  | { type: 'NO_QUIERO' }
  | { type: 'CALL_RETRUCO' };

export function decideBotEvent(state: BotSnapshot): BotEvent | null {
  const c = state.context;

  if (
    (state.value === 'envido_betting' || state.value === 'truco_betting') &&
    c.awaitingResponse &&
    c.betInitiator === 0
  ) {
    if (state.value === 'envido_betting') {
      const decision = respondToEnvido(c.adversary.hand, c.envidoStake);
      return decision === 'quiero' ? { type: 'QUIERO' } : { type: 'NO_QUIERO' };
    }
    const decision = respondToTruco(c.adversary.hand, { trucoState: c.trucoState as never });
    if (decision === 'retruco') return { type: 'CALL_RETRUCO' };
    return decision === 'quiero' ? { type: 'QUIERO' } : { type: 'NO_QUIERO' };
  }

  if (state.value === 'playing' && c.currentTurn === BOT_INDEX) {
    if (c.adversary.hand.length === 0) return null;
    const lead =
      c.board.cardsInPlay.player !== null && c.board.cardsInPlay.adversary === null
        ? c.board.cardsInPlay.player
        : null;
    const cardId = pickCard(c.adversary.hand, { lead });
    return { type: 'PLAY_CARD', cardId };
  }

  return null;
}
