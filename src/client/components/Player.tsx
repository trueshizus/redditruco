import { Card } from './Card';

interface PlayerProps {
  id: string;
  cards: string[];
  selectedCardId?: string | null;
  flippedCardId?: string | null;
  onCardSelect: (cardId: string) => void;
  onCardToggleFlip: (cardId: string) => void;
}

export const Player = ({ 
  id, 
  cards, 
  selectedCardId, 
  flippedCardId, 
  onCardSelect, 
  onCardToggleFlip 
}: PlayerProps) => {
  return (
    <div className="flex justify-center items-center gap-4 p-4">
      <div className="text-sm text-gray-600 mr-4">{id}</div>
      <div className="flex gap-2">
        {cards.map((cardId) => (
          <Card
            key={cardId}
            id={cardId}
            isSelected={selectedCardId === cardId}
            isFlipped={flippedCardId === cardId}
            onSelect={() => onCardSelect(cardId)}
            onToggleFlip={() => onCardToggleFlip(cardId)}
          />
        ))}
      </div>
    </div>
  );
};
