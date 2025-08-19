import { Card } from './Card';
import { useTranslation } from '../hooks/useTranslation';

interface PlayerProps {
  id: string;
  cards: string[];
  selectedCardId: string | undefined;
  flippedCardId: string | undefined;
  onCardSelect: (cardId: string) => void;
  onCardToggleFlip: (cardId: string) => void;
  isCurrentPlayer?: boolean;
  isHumanPlayer?: boolean; // New prop to distinguish human vs opponent
  onEnvido?: () => void;
  onRealEnvido?: () => void;
  onFaltaEnvido?: () => void;
  onTruco?: () => void;
  onRetruco?: () => void;
  onValeCuatro?: () => void;
  onQuiero?: () => void;
  onNoQuiero?: () => void;
  onMazo?: () => void;
  canCallEnvido?: boolean;
  canCallTruco?: boolean;
  canRespond?: boolean;
  canCallMazo?: boolean;
}

export const Player = ({
  id,
  cards,
  selectedCardId,
  flippedCardId,
  onCardSelect,
  onCardToggleFlip,
  isCurrentPlayer = false,
  isHumanPlayer = false,
  onEnvido,
  onRealEnvido,
  onFaltaEnvido,
  onTruco,
  onRetruco,
  onValeCuatro,
  onQuiero,
  onNoQuiero,
  onMazo,
  canCallEnvido = false,
  canCallTruco = false,
  canRespond = false,
  canCallMazo = false,
}: PlayerProps) => {
  const { t } = useTranslation();
  
  // Render compact opponent view
  if (!isHumanPlayer) {
    return (
      <div className={`bg-green-500 flex-shrink-0 ${isCurrentPlayer ? 'ring-2 ring-yellow-400' : ''}`}>
        <div className="bg-red-400 text-center py-1">
          <span className="text-xs sm:text-sm">{id} {isCurrentPlayer ? t.player.currentTurn : ''}</span>
          <span className="text-xs ml-2">({cards.length} cards)</span>
        </div>
        {/* Compact Cards Section for Opponent */}
        <div className="flex justify-center items-center gap-1 p-1 h-[50px] sm:h-[60px]">
          {cards.length === 0 ? (
            <div className="text-gray-300 text-xs italic">{t.player.noCards}</div>
          ) : (
            cards.map((cardId) => (
              <div key={cardId} className="w-10 h-14 sm:w-12 sm:h-16 bg-blue-900 rounded border border-yellow-400 flex items-center justify-center">
                <span className="text-xs text-yellow-200">🂠</span>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }
  
  // Render full human player view
  return (
    <div className={`bg-green-500 flex-shrink-0 ${isCurrentPlayer ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="bg-red-400 text-center py-1">
        <span className="text-sm">{id} {isCurrentPlayer ? t.player.currentTurn : ''} - {t.player.cards(cards.length)}</span>
      </div>
      {/* Cards Section */}
      <div className="flex justify-center items-center gap-2 sm:gap-4 p-2 sm:p-4 h-[80px] sm:h-[100px]">
        {cards.length === 0 ? (
          <div className="text-gray-300 text-sm italic">{t.player.noCards}</div>
        ) : (
          cards.map((cardId) => (
            <Card
              key={cardId}
              id={cardId}
              isSelected={selectedCardId === cardId}
              isFlipped={flippedCardId === cardId}
              onSelect={() => onCardSelect(cardId)}
              onToggleFlip={() => onCardToggleFlip(cardId)}
            />
          ))
        )}
      </div>

      {/* Action Buttons Section */}
      {(isCurrentPlayer || canRespond) && (
        <div className="bg-slate-700 p-2 sm:p-3 space-y-1 sm:space-y-2">
          {/* Envido Buttons */}
          {isCurrentPlayer && canCallEnvido && (
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
              <button
                onClick={onEnvido}
                className="px-2 py-2 sm:px-3 sm:py-1 bg-blue-600 text-white text-xs sm:text-sm rounded hover:bg-blue-700 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.envido}
              </button>
              <button
                onClick={onRealEnvido}
                className="px-2 py-2 sm:px-3 sm:py-1 bg-blue-700 text-white text-xs sm:text-sm rounded hover:bg-blue-800 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.realEnvido}
              </button>
              <button
                onClick={onFaltaEnvido}
                className="px-2 py-2 sm:px-3 sm:py-1 bg-blue-800 text-white text-xs sm:text-sm rounded hover:bg-blue-900 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.faltaEnvido}
              </button>
            </div>
          )}

          {/* Truco Buttons */}
          {isCurrentPlayer && canCallTruco && (
            <div className="flex flex-wrap gap-1 sm:gap-2 justify-center">
              <button
                onClick={onTruco}
                className="px-2 py-2 sm:px-3 sm:py-1 bg-red-600 text-white text-xs sm:text-sm rounded hover:bg-red-700 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.truco}
              </button>
              <button
                onClick={onRetruco}
                className="px-2 py-2 sm:px-3 sm:py-1 bg-red-700 text-white text-xs sm:text-sm rounded hover:bg-red-800 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.retruco}
              </button>
              <button
                onClick={onValeCuatro}
                className="px-2 py-2 sm:px-3 sm:py-1 bg-red-800 text-white text-xs sm:text-sm rounded hover:bg-red-900 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.valeCuatro}
              </button>
            </div>
          )}

          {/* Response Buttons */}
          {canRespond && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={onQuiero}
                className="px-3 py-2 sm:px-4 sm:py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.quiero}
              </button>
              <button
                onClick={onNoQuiero}
                className="px-3 py-2 sm:px-4 sm:py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700 min-h-[40px] sm:min-h-auto flex-1 sm:flex-none"
              >
                {t.actions.buttons.noQuiero}
              </button>
            </div>
          )}

          {/* Other Actions */}
          {isCurrentPlayer && canCallMazo && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={onMazo}
                className="px-3 py-2 sm:px-3 sm:py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 min-h-[40px] sm:min-h-auto"
              >
                {t.actions.buttons.mazo}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
