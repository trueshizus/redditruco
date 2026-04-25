import type { ChatMessage } from './types';

interface Snap {
  value: string;
  context: {
    mano: number;
    currentTurn: number;
    player: { hand: string[]; score: number; name: string };
    adversary: { hand: string[]; score: number; name: string };
    board: {
      currentTrick: number;
      cardsInPlay: { player: string | null; adversary: string | null };
      trickWinner: number | null;
    };
    tricks: Array<{ player1Card: string | null; player2Card: string | null; winner: number | null }>;
    trucoState: 'none' | 'truco' | 'retruco' | 'vale_cuatro';
    envidoState: 'none' | 'envido' | 'real_envido' | 'falta_envido';
    envidoStake: number;
    roundStake: number;
    betInitiator: number | null;
    awaitingResponse: boolean;
    roundWinner: number | null;
    gameWinner: number | null;
  };
}

let MID = 0;
function nextId(now: number): string {
  MID += 1;
  return `${now}-${MID}`;
}

function nick(playerIndex: number): 'vos' | 'rival' {
  return playerIndex === 0 ? 'vos' : 'rival';
}

export function deriveMessages(prev: Snap | null, curr: Snap, now: number): ChatMessage[] {
  const out: ChatMessage[] = [];
  const prevValue = prev?.value;

  if (prevValue === 'idle' && curr.value === 'playing') {
    out.push({ kind: 'system', text: '─── empezó la partida ───', timestamp: now, id: nextId(now) });
    out.push({ kind: 'system', text: 'se repartieron 3 cartas', timestamp: now, id: nextId(now) });
    out.push({ kind: 'system', text: `mano: ${nick(curr.context.mano)}`, timestamp: now, id: nextId(now) });
  }

  if ((prevValue === 'round_complete' || prevValue === 'dealing') && curr.value === 'playing' && prev) {
    out.push({ kind: 'system', text: '─── nueva mano ───', timestamp: now, id: nextId(now) });
    out.push({ kind: 'system', text: `mano: ${nick(curr.context.mano)}`, timestamp: now, id: nextId(now) });
  }

  const prevP = prev?.context.board.cardsInPlay.player ?? null;
  const prevA = prev?.context.board.cardsInPlay.adversary ?? null;
  const currP = curr.context.board.cardsInPlay.player;
  const currA = curr.context.board.cardsInPlay.adversary;
  if (prevP === null && currP !== null) {
    out.push({ kind: 'card-played', nick: 'vos', cardId: currP, timestamp: now, id: nextId(now) });
  }
  if (prevA === null && currA !== null) {
    out.push({ kind: 'card-played', nick: 'rival', cardId: currA, timestamp: now, id: nextId(now) });
  }

  if (prev && prev.context.trucoState !== curr.context.trucoState && curr.context.trucoState !== 'none') {
    out.push({
      kind: 'bet-called',
      nick: nick(curr.context.betInitiator ?? curr.context.currentTurn),
      bet: curr.context.trucoState,
      stake: curr.context.roundStake,
      timestamp: now,
      id: nextId(now),
    });
  }

  if (prev && prev.context.envidoState !== curr.context.envidoState && curr.context.envidoState !== 'none') {
    out.push({
      kind: 'bet-called',
      nick: nick(curr.context.betInitiator ?? curr.context.currentTurn),
      bet: curr.context.envidoState,
      stake: curr.context.envidoStake,
      timestamp: now,
      id: nextId(now),
    });
  }

  if (prevValue === 'playing' && curr.value === 'trick_complete') {
    // XState may batch the final card-play and the transition into a single
    // React update, so `cardsInPlay` can already be cleared by the time we
    // see it. Fall back to the just-finished trick to emit any card-played
    // message we would have missed above.
    const finishedIdx = curr.context.board.currentTrick;
    const finished = curr.context.tricks?.[finishedIdx];
    if (finished) {
      const alreadyLoggedP = prevP !== null || currP !== null;
      const alreadyLoggedA = prevA !== null || currA !== null;
      if (!alreadyLoggedP && finished.player1Card) {
        out.push({
          kind: 'card-played',
          nick: 'vos',
          cardId: finished.player1Card,
          timestamp: now,
          id: nextId(now),
        });
      }
      if (!alreadyLoggedA && finished.player2Card) {
        out.push({
          kind: 'card-played',
          nick: 'rival',
          cardId: finished.player2Card,
          timestamp: now,
          id: nextId(now),
        });
      }
    }

    const w = curr.context.board.trickWinner;
    if (w === null) out.push({ kind: 'result', flavor: 'draw', text: 'parda', timestamp: now, id: nextId(now) });
    else if (w === 0) out.push({ kind: 'result', flavor: 'win', text: 'ganaste la baza', timestamp: now, id: nextId(now) });
    else out.push({ kind: 'result', flavor: 'loss', text: 'tanto para rival', timestamp: now, id: nextId(now) });
  }

  if ((prevValue === 'trick_complete' || prevValue === 'truco_betting') && curr.value === 'round_complete') {
    const w = curr.context.roundWinner;
    if (w === 0) out.push({ kind: 'result', flavor: 'win', text: '── ganaste la mano ──', timestamp: now, id: nextId(now) });
    else if (w === 1) out.push({ kind: 'result', flavor: 'loss', text: '── ganó la mano el rival ──', timestamp: now, id: nextId(now) });
  }

  if (prevValue !== 'game_over' && curr.value === 'game_over') {
    const w = curr.context.gameWinner;
    out.push({
      kind: 'result',
      flavor: w === 0 ? 'win' : 'loss',
      text: w === 0 ? '🏆 ganaste la partida' : 'ganó la partida el rival',
      timestamp: now,
      id: nextId(now),
    });
  }

  return out;
}
