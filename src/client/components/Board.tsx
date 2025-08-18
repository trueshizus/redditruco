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
}

export const Board = ({ children, currentTrick, trickNumber, tricks }: BoardProps) => {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-green-700 to-green-800 border-4 border-yellow-600 rounded-xl m-6 shadow-2xl relative overflow-hidden">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-green-600/20 to-transparent"></div>

      {/* Game area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <div className="text-center text-yellow-100 font-bold text-xl mb-4">{t.board.title}</div>

        {/* Trick status */}
        <div className="text-center text-yellow-100 text-sm mb-2">{t.board.trickStatus(trickNumber + 1)}</div>

        {/* Card play areas */}
        <div className="flex gap-8 mb-4">
          <div className="w-20 h-28 border-2 border-dashed border-yellow-400/50 rounded-lg flex items-center justify-center">
            {currentTrick.player1Card ? (
              <img
                src={`/cards/${currentTrick.player1Card}`}
                alt={`Played card ${currentTrick.player1Card}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-yellow-300/70 text-xs">{t.board.playAreas.player1}</span>
            )}
          </div>
          <div className="w-20 h-28 border-2 border-dashed border-yellow-400/50 rounded-lg flex items-center justify-center">
            {currentTrick.player2Card ? (
              <img
                src={`/cards/${currentTrick.player2Card}`}
                alt={`Played card ${currentTrick.player2Card}`}
                className="w-full h-full object-contain"
              />
            ) : (
              <span className="text-yellow-300/70 text-xs">{t.board.playAreas.player2}</span>
            )}
          </div>
        </div>

        {/* Trick history */}
        <div className="flex gap-2 mb-4 text-xs text-yellow-200">
          {tricks.map((trick, index) => (
            <div
              key={index}
              className={`px-2 py-1 rounded ${
                trick.winner !== null
                  ? trick.winner === 0
                    ? 'bg-blue-600'
                    : 'bg-red-600'
                  : 'bg-gray-600'
              }`}
            >
              T{index + 1}: {trick.winner !== null ? (trick.winner === 0 ? 'P1' : 'P2') : '-'}
            </div>
          ))}
        </div>

        <div className="text-yellow-200/80 text-sm">{children || t.board.description}</div>
      </div>
    </div>
  );
};
