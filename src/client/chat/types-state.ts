// src/client/chat/types-state.ts
// Structural subset of the state-machine snapshot used by the chat-side helpers.
// Keeps the chat module from depending on the full XState type signature.
export interface TrucoSnapshot {
  value: string;
  context: Record<string, unknown>;
}
