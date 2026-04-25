import { legalCommands, type LegalCommand } from './legalCommands';
import type { TrucoSnapshot } from './types-state';

interface QuickReplyBarProps {
  state: TrucoSnapshot;
  onChip: (commandText: string) => void;
}

const ORDER: LegalCommand[] = [
  'start',
  'play',
  'truco',
  'retruco',
  'vale4',
  'envido',
  'real',
  'falta',
  'quiero',
  'noquiero',
  'mazo',
  'seguir',
  'restart',
  'help',
];

const COLOR: Partial<Record<LegalCommand, string>> = {
  quiero: 'bg-[#1c2a1f] text-[#9aff8b] border-[#2a3f2f]',
  noquiero: 'bg-[#2a1f1f] text-[#ff9080] border-[#3f2a2a]',
  retruco: 'bg-[#2a2516] text-[#ffd166] border-[#3f3820]',
  vale4: 'bg-[#2a2516] text-[#ffd166] border-[#3f3820]',
  truco: 'bg-[#2a1612] text-[#ff5470] border-[#3f1c18]',
  mazo: 'bg-[#1a1a1a] text-[#666] border-[#2a2a2a]',
};

export function QuickReplyBar({ state, onChip }: QuickReplyBarProps) {
  const set = legalCommands(state as never);
  const items = ORDER.filter((c) => set.has(c));
  if (items.length === 0) return null;

  return (
    <div
      data-testid="chat-chips"
      className="bg-[#101010] border-t border-[#1f1f1f] px-3 py-1.5 flex gap-1.5 flex-wrap"
    >
      {items.map((c) => {
        const cls = COLOR[c] ?? 'bg-[#1a1a1a] text-[#bdbdb0] border-[#2a2a2a]';
        const text = c === 'play' ? '/play <carta>' : `/${c}`;
        return (
          <button
            key={c}
            data-testid={`chat-chip-${c}`}
            onClick={() => onChip(text)}
            className={`px-2 py-0.5 text-[11px] font-mono border rounded-sm hover:brightness-125 ${cls}`}
          >
            {text}
          </button>
        );
      })}
    </div>
  );
}
