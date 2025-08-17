import React from 'react';

interface BoardProps {
  children?: React.ReactNode;
}

export const Board = ({ children }: BoardProps) => {
  return (
    <div className="flex-1 flex flex-col justify-center items-center bg-gradient-to-br from-green-700 to-green-800 border-4 border-yellow-600 rounded-xl m-6 shadow-2xl relative overflow-hidden">
      {/* Felt texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-green-600/20 to-transparent"></div>
      
      {/* Game area */}
      <div className="relative z-10 flex flex-col items-center justify-center h-full">
        <div className="text-center text-yellow-100 font-bold text-xl mb-4">
          TRUCO
        </div>
        
        {/* Card play areas */}
        <div className="flex gap-8 mb-6">
          <div className="w-20 h-28 border-2 border-dashed border-yellow-400/50 rounded-lg flex items-center justify-center">
            <span className="text-yellow-300/70 text-xs">Player 1</span>
          </div>
          <div className="w-20 h-28 border-2 border-dashed border-yellow-400/50 rounded-lg flex items-center justify-center">
            <span className="text-yellow-300/70 text-xs">Player 2</span>
          </div>
        </div>
        
        <div className="text-yellow-200/80 text-sm">
          {children || "Select and play your cards"}
        </div>
      </div>
    </div>
  );
};
