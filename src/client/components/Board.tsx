import React from 'react';
import { useTranslation } from '../hooks/useTranslation';

interface Trick {
  player1Card: string | null;
  player2Card: string | null;
  winner: number | null;
}

interface BoardProps {
  children?: React.ReactNode;
  currentTrick: Trick;
  trickNumber: number;
  tricks: [Trick, Trick, Trick];
  cardsInPlay: {
    player: string | null;
    adversary: string | null;
  };
  logs: string[];
  playerScore: number;
  adversaryScore: number;
  envidoState: 'none' | 'envido' | 'real_envido' | 'falta_envido';
  trucoState: 'none' | 'truco' | 'retruco' | 'vale_cuatro';
  envidoStake: number;
  roundStake: number;
  language: 'en' | 'es';
  setLanguage: (lang: 'en' | 'es') => void;
}

export const Board = ({ 
  children, 
  currentTrick, 
  trickNumber, 
  tricks, 
  cardsInPlay, 
  logs, 
  playerScore, 
  adversaryScore, 
  envidoState, 
  trucoState, 
  envidoStake, 
  roundStake, 
  language, 
  setLanguage 
}: BoardProps) => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col relative bg-gradient-to-br from-emerald-900/40 to-green-900/40 backdrop-blur-sm">
      
      {/* Compact Header - Score & Settings */}
      <div className="px-4 py-2 bg-black/20 backdrop-blur-md border-b border-yellow-500/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="text-white font-bold text-base">
              <span className="text-yellow-300">{playerScore}</span>
              <span className="text-yellow-200 mx-1">-</span>
              <span className="text-yellow-300">{adversaryScore}</span>
            </div>
            <div className="text-yellow-200/80 text-sm">
              Round {Math.floor((playerScore + adversaryScore) / 2) + 1}
            </div>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 text-xs rounded-md transition-all duration-200 ${
                language === 'en' 
                  ? 'bg-yellow-600 text-white shadow-md' 
                  : 'bg-yellow-200/20 text-yellow-200 hover:bg-yellow-200/30'
              }`}
            >
              EN
            </button>
            <button 
              onClick={() => setLanguage('es')}
              className={`px-2 py-1 text-xs rounded-md transition-all duration-200 ${
                language === 'es' 
                  ? 'bg-yellow-600 text-white shadow-md' 
                  : 'bg-yellow-200/20 text-yellow-200 hover:bg-yellow-200/30'
              }`}
            >
              ES
            </button>
          </div>
        </div>
      </div>

      {/* Betting Status Bar */}
      {(envidoState !== 'none' || trucoState !== 'none') && (
        <div className="px-4 py-2 bg-gradient-to-r from-yellow-600/30 to-orange-600/30 border-b border-yellow-500/40">
          <div className="text-center">
            {envidoState !== 'none' && (
              <span className="text-yellow-100 text-sm font-semibold">
                ⚡ Envido: {envidoStake} pts
              </span>
            )}
            {trucoState !== 'none' && (
              <span className="text-yellow-100 text-sm font-semibold">
                🎯 Truco: {roundStake} pts
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main Play Area */}
      <div className="flex-1 flex items-center justify-center px-4">
        <div className="flex items-center gap-8">
          
          {/* Player Card */}
          <div className="flex flex-col items-center space-y-2">
            <div className="text-yellow-200 text-xs font-medium">You</div>
            <div className="w-24 h-36 bg-gradient-to-br from-green-600/20 to-emerald-700/20 border-2 border-dashed border-yellow-400/50 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-sm">
              {(cardsInPlay.player || currentTrick.player1Card) ? (
                <img
                  src={`/cards/${cardsInPlay.player || currentTrick.player1Card}.svg`}
                  alt={`Card ${cardsInPlay.player || currentTrick.player1Card}`}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-yellow-300/40 text-sm">🂠</div>
              )}
            </div>
          </div>

          {/* VS & Trick Progress */}
          <div className="flex flex-col items-center space-y-3">
            <div className="text-yellow-100 text-xl font-bold">VS</div>
            <div className="flex space-x-2">
              {[0, 1, 2].map((trickIndex) => {
                const trick = tricks[trickIndex];
                const isCurrentTrick = trickIndex === trickNumber;
                const trickWinner = trick?.winner;
                
                return (
                  <div
                    key={trickIndex}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      isCurrentTrick
                        ? 'bg-yellow-500 text-gray-900 animate-pulse scale-110 shadow-lg'
                        : trickWinner === 0
                        ? 'bg-green-500 text-white shadow-md'
                        : trickWinner === 1
                        ? 'bg-red-500 text-white shadow-md'
                        : 'bg-gray-600/40 text-gray-400'
                    }`}
                  >
                    {trickIndex + 1}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Opponent Card */}
          <div className="flex flex-col items-center space-y-2">
            <div className="text-yellow-200 text-xs font-medium">Opp</div>
            <div className="w-24 h-36 bg-gradient-to-br from-red-600/20 to-orange-700/20 border-2 border-dashed border-yellow-400/50 rounded-xl flex items-center justify-center shadow-xl backdrop-blur-sm">
              {(cardsInPlay.adversary || currentTrick.player2Card) ? (
                <img
                  src={`/cards/${cardsInPlay.adversary || currentTrick.player2Card}.svg`}
                  alt={`Card ${cardsInPlay.adversary || currentTrick.player2Card}`}
                  className="w-full h-full object-contain rounded-lg"
                />
              ) : (
                <div className="text-yellow-300/40 text-sm">🂠</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Game State Messages */}
      <div className="px-4 pb-3">
        {children}
      </div>
    </div>
  );
};