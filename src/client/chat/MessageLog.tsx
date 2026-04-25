import { StickToBottom } from 'use-stick-to-bottom';
import type { ChatMessage } from './types';
import { Message } from './Message';

interface MessageLogProps {
  messages: ChatMessage[];
}

export function MessageLog({ messages }: MessageLogProps) {
  return (
    <StickToBottom
      className="flex-1 overflow-hidden bg-[#0c0c0c]"
      resize="smooth"
      initial="instant"
    >
      <StickToBottom.Content
        data-testid="chat-log"
        className="px-3 py-2 font-mono text-[12px] leading-[1.55] text-[#bdbdb0]"
      >
        {messages.map((m) => (
          <Message key={m.id} message={m} />
        ))}
      </StickToBottom.Content>
    </StickToBottom>
  );
}
