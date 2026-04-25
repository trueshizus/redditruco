import { useEffect, useRef, useState } from 'react';
import type { ChatMessage } from './types';
import { deriveMessages } from './deriveMessages';

export function useChatLog(state: { value: string; context: never }): {
  messages: ChatMessage[];
  pushUser: (text: string) => void;
  pushHint: (text: string) => void;
  clear: () => void;
} {
  const prevRef = useRef<typeof state | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    const newMsgs = deriveMessages(prevRef.current as never, state as never, Date.now());
    if (newMsgs.length > 0) setMessages((m) => [...m, ...newMsgs]);
    prevRef.current = state;
  }, [state]);

  return {
    messages,
    pushUser: (text) =>
      setMessages((m) => [...m, { kind: 'user', nick: 'vos', text, timestamp: Date.now(), id: `u-${Date.now()}-${m.length}` }]),
    pushHint: (text) =>
      setMessages((m) => [...m, { kind: 'hint', text, timestamp: Date.now(), id: `h-${Date.now()}-${m.length}` }]),
    clear: () => setMessages([]),
  };
}
