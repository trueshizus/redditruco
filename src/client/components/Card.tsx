import { useMachine } from '@xstate/react';
import { cardMachine } from '../machines/cardMachine';

interface CardProps {
  id: string;
}

export const Card = ({ id }: CardProps) => {
  const [state, send] = useMachine(cardMachine);
  const cardPath = `/cards/${id}`;
  const cardBackPath = `/cards/card-back.svg`;
  
  const getCardClass = () => {
    let baseClass = "w-24 h-36 object-contain transition-all duration-300 cursor-pointer";
    
    if (state.matches('selected')) {
      baseClass += " ring-4 ring-blue-500 transform scale-105";
    }
    
    return baseClass;
  };
  
  const handleClick = () => {
    if (state.matches('idle')) {
      send({ type: 'SELECT' });
    } else if (state.matches('selected')) {
      send({ type: 'FLIP' });
    } else if (state.matches('flipped')) {
      send({ type: 'UNFLIP' });
    }
  };
  
  const isFlipped = state.matches('flipped');
  
  return (
    <div className="inline-block">
      <img 
        src={isFlipped ? cardBackPath : cardPath}
        alt={isFlipped ? 'Card back' : `Card ${id}`}
        className={getCardClass()}
        onClick={handleClick}
      />
      <div className="text-center mt-2 text-sm text-gray-600">
        State: {String(state.value)}
      </div>
    </div>
  );
};