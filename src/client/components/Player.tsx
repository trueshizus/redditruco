import { Card } from './Card';

interface PlayerProps {
  id: string;
  cards: string[];
  selectedCardId: string | undefined;
  flippedCardId: string | undefined;
  onCardSelect: (cardId: string) => void;
  onCardToggleFlip: (cardId: string) => void;
  isCurrentPlayer?: boolean;
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
}

export const Player = ({
  id,
  cards,
  selectedCardId,
  flippedCardId,
  onCardSelect,
  onCardToggleFlip,
  isCurrentPlayer = false,
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
}: PlayerProps) => {
  return (
    <div className={`bg-green-500 ${isCurrentPlayer ? 'ring-2 ring-yellow-400' : ''}`}>
      <div className="bg-red-400 text-center my-2">
        {id} {isCurrentPlayer ? '(Current Turn)' : ''} - Cards: {cards.length}
      </div>
      {/* Cards Section */}
      <div className="flex justify-center items-center gap-4 p-4 min-h-[120px]">
        {cards.length === 0 ? (
          <div className="text-gray-300 text-sm italic">No cards dealt</div>
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
        <div className="bg-slate-700 p-3 space-y-2">
          {/* Envido Buttons */}
          {isCurrentPlayer && canCallEnvido && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={onEnvido}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Envido
              </button>
              <button
                onClick={onRealEnvido}
                className="px-3 py-1 bg-blue-700 text-white text-sm rounded hover:bg-blue-800"
              >
                Real Envido
              </button>
              <button
                onClick={onFaltaEnvido}
                className="px-3 py-1 bg-blue-800 text-white text-sm rounded hover:bg-blue-900"
              >
                Falta Envido
              </button>
            </div>
          )}

          {/* Truco Buttons */}
          {isCurrentPlayer && canCallTruco && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={onTruco}
                className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
              >
                Truco
              </button>
              <button
                onClick={onRetruco}
                className="px-3 py-1 bg-red-700 text-white text-sm rounded hover:bg-red-800"
              >
                Retruco
              </button>
              <button
                onClick={onValeCuatro}
                className="px-3 py-1 bg-red-800 text-white text-sm rounded hover:bg-red-900"
              >
                Vale Cuatro
              </button>
            </div>
          )}

          {/* Response Buttons */}
          {canRespond && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={onQuiero}
                className="px-4 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
              >
                Quiero
              </button>
              <button
                onClick={onNoQuiero}
                className="px-4 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
              >
                No Quiero
              </button>
            </div>
          )}

          {/* Other Actions */}
          {isCurrentPlayer && (
            <div className="flex gap-2 justify-center">
              <button
                onClick={onMazo}
                className="px-3 py-1 bg-orange-600 text-white text-sm rounded hover:bg-orange-700"
              >
                Mazo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
