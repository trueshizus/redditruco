import { useState, useRef } from 'react';
import Draggable from 'react-draggable';

interface OpponentDebugPanelProps {
  isVisible: boolean;
  opponentCards: string[];
  canCallEnvido: boolean;
  canCallTruco: boolean;
  canCallMazo: boolean;
  canRespond: boolean;
  trucoState: 'none' | 'truco' | 'retruco' | 'vale_cuatro';
  onPlayCard: (cardId: string) => void;
  onCallEnvido: () => void;
  onCallRealEnvido: () => void;
  onCallFaltaEnvido: () => void;
  onCallTruco: () => void;
  onCallMazo: () => void;
  onQuiero: () => void;
  onNoQuiero: () => void;
  onRetruco: () => void;
  onValeCuatro: () => void;
}

export const OpponentDebugPanel = ({ 
  isVisible, 
  opponentCards, 
  canCallEnvido,
  canCallTruco,
  canCallMazo,
  canRespond,
  trucoState,
  onPlayCard,
  onCallEnvido,
  onCallRealEnvido,
  onCallFaltaEnvido,
  onCallTruco,
  onCallMazo,
  onQuiero,
  onNoQuiero,
  onRetruco,
  onValeCuatro
}: OpponentDebugPanelProps) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const nodeRef = useRef(null);

  if (!isVisible) return null;

  return (
    <Draggable
      handle=".drag-handle"
      defaultPosition={{ x: 20, y: 20 }}
      bounds="parent"
      nodeRef={nodeRef}
    >
      <div ref={nodeRef} className="fixed z-50 w-96 bg-gradient-to-br from-slate-900/98 to-slate-800/98 backdrop-blur-xl border border-blue-500/30 rounded-2xl shadow-2xl">
        
        {/* Draggable Header */}
        <div className="drag-handle cursor-move px-4 py-3 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-t-2xl border-b border-blue-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
              <h3 className="text-blue-200 text-sm font-semibold select-none">Debug Panel</h3>
              <div className="px-2 py-1 bg-blue-600/30 rounded-md">
                <span className="text-blue-300 text-xs font-medium">🤖 AI</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsMinimized(!isMinimized)}
                className="w-6 h-6 bg-blue-600/20 hover:bg-blue-600/40 rounded-md flex items-center justify-center text-blue-300 hover:text-blue-200 transition-all duration-200"
              >
                {isMinimized ? '⬆' : '⬇'}
              </button>
            </div>
          </div>
        </div>

        {/* Panel Content */}
        {!isMinimized && (
          <div className="p-4 max-h-96 overflow-y-auto">
            <div className="space-y-4">
              
              {/* Card Play Section */}
              {opponentCards.length > 0 && (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center">
                    <span className="text-base mr-2">🃏</span>
                    Play Card
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {opponentCards.map((cardId) => (
                      <button
                        key={cardId}
                        onClick={() => onPlayCard(cardId)}
                        className="bg-gradient-to-br from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95"
                      >
                        {cardId}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Envido Section */}
              {canCallEnvido && (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center">
                    <span className="text-base mr-2">⚡</span>
                    Envido Bets
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={onCallEnvido}
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                    >
                      Envido
                    </button>
                    <button
                      onClick={onCallRealEnvido}
                      className="bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                    >
                      Real
                    </button>
                    <button
                      onClick={onCallFaltaEnvido}
                      className="bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                    >
                      Falta
                    </button>
                  </div>
                </div>
              )}
              
              {/* Response Actions (Quiero/No Quiero/Escalation) */}
              {canRespond && (
                <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                  <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center">
                    <span className="text-base mr-2">⚡</span>
                    Response
                  </h4>
                  <div className="space-y-2">
                    {/* Accept/Reject Row */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={onQuiero}
                        className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                      >
                        ✓ Quiero
                      </button>
                      <button
                        onClick={onNoQuiero}
                        className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-500 hover:to-gray-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                      >
                        ✗ No Quiero
                      </button>
                    </div>
                    
                    {/* Escalation Options */}
                    {trucoState === 'truco' && (
                      <button
                        onClick={onRetruco}
                        className="w-full bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                      >
                        🎯 Quiero Re-Truco
                      </button>
                    )}
                    
                    {trucoState === 'retruco' && (
                      <button
                        onClick={onValeCuatro}
                        className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                      >
                        🎯 Quiero Vale Cuatro
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {/* Truco & Other Actions */}
              <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
                <h4 className="text-slate-300 text-sm font-medium mb-3 flex items-center">
                  <span className="text-base mr-2">🎯</span>
                  Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {canCallTruco && (
                    <button
                      onClick={onCallTruco}
                      className="bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                    >
                      🎯 Truco
                    </button>
                  )}
                  {canCallMazo && (
                    <button
                      onClick={onCallMazo}
                      className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white px-2 py-1 rounded-md text-xs font-semibold transition-all duration-200"
                    >
                      🃏 Mazo
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Draggable>
  );
};