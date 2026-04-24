import { useTranslation } from '../hooks/useTranslation';

interface OpponentStatusBarProps {
  cardCount: number;
  isOpponentTurn: boolean;
}

export const OpponentStatusBar = ({ cardCount, isOpponentTurn }: OpponentStatusBarProps) => {
  const { t } = useTranslation();
  const label = t.common.opponent;

  return (
    <div className="bg-gradient-to-r from-slate-800/90 to-slate-700/90 backdrop-blur-sm border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
          {label.charAt(0)}
        </div>
        <div>
          <div className="text-white text-sm font-medium">{label}</div>
          <div className="text-yellow-300 text-xs" data-testid="opponent-card-count">
            {t.opponentStatus.cardsCount(cardCount)}
          </div>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {Array.from({ length: cardCount }, (_, index) => (
          <div
            key={index}
            className="w-4 h-6 bg-gradient-to-b from-blue-600 to-blue-800 rounded-sm border border-blue-400/50"
          ></div>
        ))}
        {isOpponentTurn && <div className="ml-2 w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>}
      </div>
    </div>
  );
};
