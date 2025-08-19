import React from 'react';

interface OpponentDebugPanelProps {
  isVisible: boolean;
  opponentCards: string[];
  canCallEnvido: boolean;
  canCallTruco: boolean;
  canCallMazo: boolean;
  onPlayCard: (cardId: string) => void;
  onCallEnvido: () => void;
  onCallRealEnvido: () => void;
  onCallFaltaEnvido: () => void;
  onCallTruco: () => void;
  onCallMazo: () => void;
}

export const OpponentDebugPanel = ({ 
  isVisible, 
  opponentCards, 
  canCallEnvido,
  canCallTruco,
  canCallMazo,
  onPlayCard,
  onCallEnvido,
  onCallRealEnvido,
  onCallFaltaEnvido,
  onCallTruco,
  onCallMazo
}: OpponentDebugPanelProps) => {
  if (!isVisible) return null;

  return (
    <div className="bg-orange-600/90 backdrop-blur-sm border-b border-orange-400/20 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="text-orange-100 text-sm font-medium">
          🤖 Opponent Actions (Debug Mode)
        </div>
        <div className="flex items-center gap-2">
          
          {/* Card Play Actions */}
          {opponentCards.length > 0 && (
            <>
              <span className="text-orange-200 text-xs">Play:</span>
              {opponentCards.map((cardId) => (
                <button
                  key={cardId}
                  onClick={() => onPlayCard(cardId)}
                  className="bg-orange-500 hover:bg-orange-400 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  {cardId}
                </button>
              ))}
            </>
          )}
          
          {/* Envido Actions */}
          {canCallEnvido && (
            <>
              <span className="text-orange-200 text-xs ml-4">Envido:</span>
              <button
                onClick={onCallEnvido}
                className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs font-medium"
              >
                Envido
              </button>
              <button
                onClick={onCallRealEnvido}
                className="bg-blue-700 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium"
              >
                Real
              </button>
              <button
                onClick={onCallFaltaEnvido}
                className="bg-blue-800 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium"
              >
                Falta
              </button>
            </>
          )}
          
          {/* Truco Actions */}
          {canCallTruco && (
            <>
              <span className="text-orange-200 text-xs ml-4">Truco:</span>
              <button
                onClick={onCallTruco}
                className="bg-red-600 hover:bg-red-500 text-white px-2 py-1 rounded text-xs font-medium"
              >
                Truco
              </button>
            </>
          )}
          
          {/* Mazo Action */}
          {canCallMazo && (
            <>
              <button
                onClick={onCallMazo}
                className="bg-orange-700 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs font-medium ml-4"
              >
                Mazo
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};