interface CardProps {
  id: string;
  isSelected: boolean;
  isFlipped: boolean;
  onSelect: () => void;
  onToggleFlip: () => void;
}

export const Card = ({ id, isSelected, isFlipped, onSelect, onToggleFlip }: CardProps) => {
  const cardPath = `/cards/${id}`;
  const cardBackPath = `/cards/card-back.svg`;
  
  const getCardClass = () => {
    let baseClass = "w-24 h-36 object-cover transition-all duration-300 cursor-pointer rounded-lg";
    
    if (isSelected) {
      baseClass += " ring-4 ring-blue-500 transform scale-110";
    }
    
    return baseClass;
  };
  
  const handleClick = () => {
    if (isSelected) {
      onToggleFlip();
    } else {
      onSelect();
    }
  };
  
  const getCardState = () => {
    if (isFlipped && isSelected) return 'active & back';
    if (isFlipped) return 'back';
    if (isSelected) return 'active';
    return 'idle';
  };
  
  return (
    <div className="grid grid-rows-3 place-items-center">
      <img 
        className={`row-span-2 ${getCardClass()}`}
        src={isFlipped ? cardBackPath : cardPath}
        alt={isFlipped ? 'Card back' : `Card ${id}`}
        onClick={handleClick}
      />
      <div className="text-center mt-2 text-sm text-gray-600 row-span-1">
        State: {getCardState()}
      </div>
    </div>
  );
};
