import React from 'react';

interface CardProps {
  id: string;
  isSelected: boolean;
  isFlipped: boolean;
  onSelect: () => void;
  onToggleFlip: () => void;
}

export const Card = ({ id, isSelected, isFlipped, onSelect, onToggleFlip }: CardProps) => {
  const cardPath = `/cards/${id}`;

  const getCardClass = () => {
    let baseClass =
      'w-24 h-36 transition-all duration-300 cursor-pointer rounded-lg shadow-lg hover:shadow-xl';

    if (isSelected) {
      baseClass += ' ring-4 ring-yellow-400 transform scale-110 shadow-yellow-400/50';
    } else {
      baseClass += ' hover:scale-105';
    }

    return baseClass;
  };

  const getCardBackStyle = () => {
    return {
      '--s': '30px',
      '--c1': '#00a3d7',
      '--c2': '#ebebeb',
      '--_g': `
        var(--c1) 0% 5%, var(--c2) 6% 15%, var(--c1) 16% 25%, var(--c2) 26% 35%, var(--c1) 36% 45%,
        var(--c2) 46% 55%, var(--c1) 56% 65%, var(--c2) 66% 75%, var(--c1) 76% 85%, var(--c2) 86% 95%,
        #0000 96%
      `,
      background: `
        radial-gradient(50% 50% at 100% 0, var(--_g)),
        radial-gradient(50% 50% at 0 100%, var(--_g)),
        radial-gradient(50% 50%, var(--_g)),
        radial-gradient(50% 50%, var(--_g)) calc(var(--s)/2) calc(var(--s)/2) var(--c1)
      `,
      backgroundSize: 'var(--s) var(--s)',
    } as React.CSSProperties;
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
      {isFlipped ? (
        <div className={getCardClass()} style={getCardBackStyle()} onClick={handleClick} />
      ) : (
        <img
          className={`${getCardClass()} object-cover`}
          src={cardPath}
          alt={`Card ${id}`}
          onClick={handleClick}
        />
      )}
      {/* Optional debug info - can be removed for production */}
      {import.meta.env.DEV && (
        <div className="text-center mt-1 text-xs text-gray-400">{getCardState()}</div>
      )}
    </div>
  );
};
