import React from 'react';
import { Card } from './Card';

interface PlayerSectionProps {
  playerName: string;
  playerCards: string[];
  isPlayerTurn: boolean;
  canRespond: boolean;
  betInitiator: number | null;
  statusText: string;
  
  // Action availability
  canCallEnvido: boolean;
  canCallTruco: boolean;
  canCallMazo: boolean;
  
  // Action handlers
  onCardSelect: (cardId: string) => void;
  onCardToggleFlip: (cardId: string) => void;
  onEnvido: () => void;
  onRealEnvido: () => void;
  onFaltaEnvido: () => void;
  onTruco: () => void;
  onMazo: () => void;
}

export const PlayerSection = ({
  playerName,
  playerCards,
  isPlayerTurn,
  canRespond,
  betInitiator,
  statusText,
  canCallEnvido,
  canCallTruco,
  canCallMazo,
  onCardSelect,
  onCardToggleFlip,
  onEnvido,
  onRealEnvido,
  onFaltaEnvido,
  onTruco,
  onMazo
}: PlayerSectionProps) => {
  return (
    <div className="h-full flex flex-col bg-gradient-to-t from-slate-900/95 to-slate-800/90 backdrop-blur-sm">
      
      {/* Player Status - Compact header */}
      <div className="px-4 py-2 border-b border-yellow-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {playerName.charAt(0)}
            </div>
            <div className="text-white text-sm font-medium">{playerName}</div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="text-yellow-300 text-xs">{statusText}</div>
            {isPlayerTurn && (
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
      </div>
      
      {/* Cards Section - Large and prominent */}
      <div className="flex-1 flex flex-col justify-center px-4">
        <div className="flex justify-center gap-4">
          {playerCards.length === 0 ? (
            <div className="text-yellow-300/70 text-lg italic py-8">No cards in hand</div>
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
      
      {/* Action Buttons - Large and touch-friendly */}
      <div className="px-4 pb-4">
        <div className="space-y-3">
          
          {/* Primary Actions Row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onTruco}
              disabled={!(isPlayerTurn && canCallTruco)}
              className={`py-4 px-4 rounded-xl text-base font-bold shadow-xl transition-all duration-200 transform ${
                isPlayerTurn && canCallTruco
                  ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              🎯 Truco
            </button>
            <button
              onClick={onMazo}
              disabled={!(isPlayerTurn && canCallMazo)}
              className={`py-4 px-4 rounded-xl text-base font-bold shadow-xl transition-all duration-200 transform ${
                isPlayerTurn && canCallMazo
                  ? 'bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              🃏 Mazo
            </button>
          </div>

          {/* Envido Actions Row */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onEnvido}
              disabled={!(isPlayerTurn && canCallEnvido)}
              className={`py-3 px-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 transform ${
                isPlayerTurn && canCallEnvido
                  ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              Envido
            </button>
            <button
              onClick={onRealEnvido}
              disabled={!(isPlayerTurn && canCallEnvido)}
              className={`py-3 px-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 transform ${
                isPlayerTurn && canCallEnvido
                  ? 'bg-gradient-to-r from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              Real
            </button>
            <button
              onClick={onFaltaEnvido}
              disabled={!(isPlayerTurn && canCallEnvido)}
              className={`py-3 px-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 transform ${
                isPlayerTurn && canCallEnvido
                  ? 'bg-gradient-to-r from-blue-800 to-blue-900 hover:from-blue-700 hover:to-blue-800 text-white hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-gray-600/40 text-gray-400 cursor-not-allowed'
              }`}
            >
              Falta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};