import { Card } from './Card';
import { useTranslation } from '../hooks/useTranslation';

interface PlayerSectionProps {
  playerCards: string[];
  isPlayerTurn: boolean;
  statusText: string;

  // Action availability
  canCallEnvido: boolean;
  canCallTruco: boolean;
  canCallRetruco: boolean;
  canCallValeCuatro: boolean;
  canCallMazo: boolean;

  // Action handlers
  onCardSelect: (cardId: string) => void;
  onCardToggleFlip: (cardId: string) => void;
  onEnvido: () => void;
  onRealEnvido: () => void;
  onFaltaEnvido: () => void;
  onTruco: () => void;
  onRetruco: () => void;
  onValeCuatro: () => void;
  onMazo: () => void;
}

export const PlayerSection = ({
  playerCards,
  isPlayerTurn,
  statusText,
  canCallEnvido,
  canCallTruco,
  canCallRetruco,
  canCallValeCuatro,
  canCallMazo,
  onCardSelect,
  onCardToggleFlip,
  onEnvido,
  onRealEnvido,
  onFaltaEnvido,
  onTruco,
  onRetruco,
  onValeCuatro,
  onMazo,
}: PlayerSectionProps) => {
  const { t } = useTranslation();

  // Highest legal truco escalation right now (if any).
  const trucoLabel = canCallValeCuatro
    ? t.playerSection.valeCuatro
    : canCallRetruco
    ? t.playerSection.retruco
    : t.playerSection.truco;
  const trucoHandler = canCallValeCuatro ? onValeCuatro : canCallRetruco ? onRetruco : onTruco;
  const trucoAction = canCallValeCuatro
    ? 'CALL_VALE_CUATRO'
    : canCallRetruco
    ? 'CALL_RETRUCO'
    : 'CALL_TRUCO';
  const trucoEnabled = isPlayerTurn && (canCallTruco || canCallRetruco || canCallValeCuatro);
  const mazoEnabled = isPlayerTurn && canCallMazo;
  const envidoEnabled = isPlayerTurn && canCallEnvido;

  const label = t.common.you;

  return (
    <div
      className="h-full flex flex-col bg-gradient-to-t from-slate-900/95 to-slate-800/90 backdrop-blur-sm"
      data-testid="player-section"
    >
      <div className="px-4 py-2 border-b border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {label.charAt(0)}
            </div>
            <div className="text-white text-sm font-medium" data-testid="player-name">
              {label}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-yellow-300 text-xs" data-testid="player-status">
              {statusText}
            </div>
            {isPlayerTurn && <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-4">
        <div className="flex justify-center gap-4">
          {playerCards.length === 0 ? (
            <div className="text-yellow-300/70 text-lg italic py-8">{t.playerSection.noCards}</div>
          ) : (
            playerCards.map((cardId) => (
              <div
                key={cardId}
                className="transform transition-all duration-200 hover:scale-110 active:scale-105 cursor-pointer hover:-translate-y-2"
              >
                <Card
                  id={cardId}
                  isSelected={false}
                  isFlipped={false}
                  onSelect={() => onCardSelect(cardId)}
                  onToggleFlip={() => onCardToggleFlip(cardId)}
                />
              </div>
            ))
          )}
        </div>
      </div>

      <div className="px-4 pb-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              data-testid={`action-${trucoAction}`}
              onClick={trucoHandler}
              disabled={!trucoEnabled}
              className={`py-4 px-4 rounded-xl text-base font-bold shadow-xl transition-all duration-200 transform ${
                trucoEnabled
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              🎯 {trucoLabel}
            </button>
            <button
              data-testid="action-MAZO"
              onClick={onMazo}
              disabled={!mazoEnabled}
              className={`py-4 px-4 rounded-xl text-base font-bold shadow-xl transition-all duration-200 transform ${
                mazoEnabled
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              🃏 {t.playerSection.mazo}
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              data-testid="action-CALL_ENVIDO"
              onClick={onEnvido}
              disabled={!envidoEnabled}
              className={`py-3 px-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 transform ${
                envidoEnabled
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t.playerSection.envido}
            </button>
            <button
              data-testid="action-CALL_REAL_ENVIDO"
              onClick={onRealEnvido}
              disabled={!envidoEnabled}
              className={`py-3 px-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 transform ${
                envidoEnabled
                  ? 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t.playerSection.realEnvido}
            </button>
            <button
              data-testid="action-CALL_FALTA_ENVIDO"
              onClick={onFaltaEnvido}
              disabled={!envidoEnabled}
              className={`py-3 px-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 transform ${
                envidoEnabled
                  ? 'bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              {t.playerSection.faltaEnvido}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
