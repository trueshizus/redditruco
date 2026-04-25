import type { ChatMessage } from './types';
import { formatCardGlyph } from './cardGlyph';
import { formatTimestamp } from './types';

interface MessageProps {
  message: ChatMessage;
}

const NICK_COLOR = {
  vos: 'text-[#7afff7]',
  rival: 'text-[#ff9351]',
};

export function Message({ message: m }: MessageProps) {
  const ts = formatTimestamp(m.timestamp);
  const ts_dim = <span className="text-[#5a5a5a]">[{ts}]</span>;

  switch (m.kind) {
    case 'system':
      return (
        <div data-testid="chat-message" data-kind="system" className="text-[#7afff7]">
          {ts_dim} {m.text}
        </div>
      );
    case 'hint':
      return (
        <div data-testid="chat-message" data-kind="hint" className="text-[#5a5a5a]">
          {ts_dim} <span className="text-[#bdbdb0]">[hint]</span> {m.text}
        </div>
      );
    case 'topic':
      return (
        <div data-testid="chat-message" data-kind="topic" className="text-[#9aff8b]">
          {ts_dim} *** topic: {m.topic}
        </div>
      );
    case 'user':
      return (
        <div data-testid="chat-message" data-kind="user" className="text-[#bdbdb0]">
          {ts_dim} <span className={NICK_COLOR[m.nick]}>&lt;{m.nick}&gt;</span> {m.text}
        </div>
      );
    case 'opponent':
      return (
        <div data-testid="chat-message" data-kind="opponent" className="text-[#bdbdb0]">
          {ts_dim} <span className={NICK_COLOR[m.nick]}>&lt;{m.nick}&gt;</span> {m.text}
        </div>
      );
    case 'card-played':
      return (
        <div data-testid="chat-message" data-kind="card-played" className="text-[#bdbdb0]">
          {ts_dim} <span className={NICK_COLOR[m.nick]}>&lt;{m.nick}&gt;</span> tiró{' '}
          <span className="text-[#ffd166]">{formatCardGlyph(m.cardId)}</span>
        </div>
      );
    case 'bet-called':
      return (
        <div data-testid="chat-message" data-kind="bet" className="text-[#bdbdb0]">
          {ts_dim} ⚡ <span className="text-[#ff5470] font-bold">{m.bet}</span> en juego ·{' '}
          <span className="text-[#ffd166]">valor: {m.stake}</span>
        </div>
      );
    case 'result': {
      const color =
        m.flavor === 'win'
          ? 'text-[#9aff8b]'
          : m.flavor === 'loss'
            ? 'text-[#ff5470]'
            : 'text-[#ffd166]';
      return (
        <div data-testid="chat-message" data-kind="result" className={color}>
          {ts_dim} {m.text}
        </div>
      );
    }
    case 'thinking':
      return (
        <div data-testid="chat-message" data-kind="thinking" className="text-[#5a5a5a] italic">
          {ts_dim} &lt;{m.nick}&gt; está pensando…
        </div>
      );
  }
}
