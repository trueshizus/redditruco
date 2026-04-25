// src/client/chat/types.ts

/**
 * The IRC-style chat surface renders a stream of ChatMessage values.
 * `kind` discriminates the rendering and styling.
 */
export type ChatMessage =
  | { kind: 'system'; text: string; timestamp: number; id: string }
  | { kind: 'topic'; topic: string; timestamp: number; id: string }
  | { kind: 'user'; nick: 'vos'; text: string; timestamp: number; id: string }
  | { kind: 'opponent'; nick: 'rival'; text: string; timestamp: number; id: string }
  | { kind: 'card-played'; nick: 'vos' | 'rival'; cardId: string; timestamp: number; id: string }
  | { kind: 'bet-called'; nick: 'vos' | 'rival'; bet: string; stake: number; timestamp: number; id: string }
  | { kind: 'result'; text: string; flavor: 'win' | 'loss' | 'draw'; timestamp: number; id: string }
  | { kind: 'hint'; text: string; timestamp: number; id: string }
  | { kind: 'thinking'; nick: 'rival'; timestamp: number; id: string };

/** Counter used to mint stable React keys for messages added in the same tick. */
export type MessageId = string;

/** Helper used by deriveMessages and useChatLog to format the time prefix. */
export function formatTimestamp(ms: number): string {
  const d = new Date(ms);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}
