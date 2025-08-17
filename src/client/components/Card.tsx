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
    let baseClass = "w-24 h-36 object-cover transition-all duration-300 cursor-pointer rounded-lg shadow-lg hover:shadow-xl";
    
    if (isSelected) {
      baseClass += " ring-4 ring-yellow-400 transform scale-110 shadow-yellow-400/50";
    } else {
      baseClass += " hover:scale-105";
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
    <div className="flex flex-col items-center">
      <img 
        className={getCardClass()}
        src={isFlipped ? cardBackPath : cardPath}
        alt={isFlipped ? 'Card back' : `Card ${id}`}
        onClick={handleClick}
      />
      {/* Optional debug info - can be removed for production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-center mt-1 text-xs text-gray-400">
          {getCardState()}
        </div>
      )}
    </div>
  );
};
