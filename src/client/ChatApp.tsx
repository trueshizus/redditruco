import { useEffect, useState } from 'react';
import { useMachine } from '@xstate/react';
import { trucoStateMachine } from '../machines/truco';
import { ChatLayout } from './chat/ChatLayout';
import { ChannelHeader } from './chat/ChannelHeader';
import { MessageLog } from './chat/MessageLog';
import { QuickReplyBar } from './chat/QuickReplyBar';
import { CommandInput } from './chat/CommandInput';
import { useChatLog } from './chat/useChatLog';
import { useCanillitaBot } from './chat/useCanillitaBot';
import { parseCommand } from './chat/parseCommand';

export function ChatApp() {
  const [state, send] = useMachine(trucoStateMachine);
  const { messages, pushUser, pushHint, clear } = useChatLog(state as never);
  const [prefill, setPrefill] = useState<string>('');

  useCanillitaBot({
    state: state as never,
    send: send as never,
    enabled: true,
  });

  // Dev hook: expose state for Playwright assertions (mirrors App.tsx).
  useEffect(() => {
    if (import.meta.env.DEV) {
      (window as unknown as { __trucoState: unknown }).__trucoState = {
        value: state.value,
        context: state.context,
      };
    }
  });

  const handleSubmit = (text: string) => {
    const result = parseCommand(text, state as never);
    pushUser(text);
    if (result.kind === 'event') {
      send(result.event as never);
    } else if (result.kind === 'banter') {
      // already pushed as user message; nothing else
    } else if (result.kind === 'invalid') {
      pushHint(result.reason);
    } else if (result.kind === 'help') {
      pushHint(
        'comandos: /start /play <carta> /envido /real /falta /truco /retruco /vale4 /quiero /noquiero /mazo /seguir /restart /help /clear',
      );
    } else if (result.kind === 'clear') {
      clear();
    }
  };

  return (
    <ChatLayout
      header={
        <ChannelHeader
          scorePlayer={state.context.player.score}
          scoreAdversary={state.context.adversary.score}
          manoNick={state.context.mano === 0 ? 'vos' : 'rival'}
          gameValue={String(state.value)}
        />
      }
      log={<MessageLog messages={messages} />}
      chips={<QuickReplyBar state={state as never} onChip={(c) => setPrefill(c + ' ')} />}
      input={<CommandInput onSubmit={handleSubmit} prefill={prefill} />}
    />
  );
}
