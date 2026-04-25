import { useEffect, useRef } from 'react';
import { decideBotEvent, type BotEvent } from './decideBotEvent';

interface UseCanillitaBotArgs {
  state: { value: string; context: never };
  send: (ev: BotEvent) => void;
  enabled: boolean;
}

const DELAY_PLAY = 600;
const DELAY_RESPONSE = 1200;
const JITTER = 250;

function delayFor(ev: BotEvent): number {
  const base = ev.type === 'PLAY_CARD' ? DELAY_PLAY : DELAY_RESPONSE;
  return base + (Math.random() * 2 - 1) * JITTER;
}

export function useCanillitaBot({ state, send, enabled }: UseCanillitaBotArgs): void {
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    if (pendingTimer.current) {
      clearTimeout(pendingTimer.current);
      pendingTimer.current = null;
    }

    const ev = decideBotEvent(state as never);
    if (!ev) return;

    pendingTimer.current = setTimeout(() => {
      pendingTimer.current = null;
      send(ev);
    }, delayFor(ev));

    return () => {
      if (pendingTimer.current) {
        clearTimeout(pendingTimer.current);
        pendingTimer.current = null;
      }
    };
  }, [state, send, enabled]);
}
