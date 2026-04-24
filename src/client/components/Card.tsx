import type { CSSProperties } from 'react';

interface CardProps {
  id: string;
  isSelected: boolean;
  isFlipped: boolean;
  onSelect: () => void;
  onToggleFlip: () => void;
}

const BASE_CLASS =
  'w-14 h-20 sm:w-20 sm:h-28 md:w-24 md:h-36 transition-all duration-300 cursor-pointer rounded-lg shadow-lg hover:shadow-xl';

const CARD_BACK_STYLE: CSSProperties = {
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
} as CSSProperties;

export const Card = ({ id, isSelected, isFlipped, onSelect, onToggleFlip }: CardProps) => {
  const cardPath = `/cards/${id}.svg`;

  const className = `${BASE_CLASS} ${
    isSelected
      ? 'ring-2 sm:ring-4 ring-yellow-400 transform scale-105 sm:scale-110 shadow-yellow-400/50'
      : 'hover:scale-105'
  }`;

  const handleClick = () => {
    if (isSelected) onToggleFlip();
    else onSelect();
  };

  return (
    <div className="flex flex-col items-center">
      {isFlipped ? (
        <div className={className} style={CARD_BACK_STYLE} onClick={handleClick} />
      ) : (
        <img
          className={`${className} object-cover`}
          src={cardPath}
          alt={`Card ${id}`}
          data-testid="player-card"
          data-card-id={id}
          onClick={handleClick}
        />
      )}
    </div>
  );
};
