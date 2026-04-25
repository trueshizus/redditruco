import { useTranslation } from '../hooks/useTranslation';

interface ChannelHeaderProps {
  scorePlayer: number;
  scoreAdversary: number;
  manoNick: 'vos' | 'rival';
  gameValue: string;
}

export function ChannelHeader({
  scorePlayer,
  scoreAdversary,
  manoNick,
  gameValue,
}: ChannelHeaderProps) {
  const { t } = useTranslation();
  return (
    <div
      data-testid="chat-channel-header"
      className="bg-[#101010] text-[#a0a0a0] text-[11px] px-3 py-1.5 border-b border-[#1f1f1f] flex justify-between font-mono"
    >
      <span>
        <b className="text-[#9aff8b]">{t.chat.channelTitle}</b>{' '}
        <span className="text-[#5a5a5a]">·</span> mano:{' '}
        <span className={manoNick === 'vos' ? 'text-[#7afff7]' : 'text-[#ff9351]'}>
          {manoNick}
        </span>{' '}
        <span className="text-[#5a5a5a]">·</span> puntos:{' '}
        <span className="text-[#ffd166]" data-testid="chat-score">
          vos {scorePlayer} — rival {scoreAdversary}
        </span>{' '}
        <span className="text-[#5a5a5a]">·</span> estado:{' '}
        <span className="text-[#bdbdb0]">{gameValue}</span>
      </span>
      <span className="text-[#5a5a5a]">/help</span>
    </div>
  );
}
