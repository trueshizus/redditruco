#!/usr/bin/env node

// Spanish deck card generator
// 40 cards: 1-7, 10-12 for each suit
// Suits: espadas (E), bastos (B), copas (C), oros (O)

const suits = [
  { code: 'E', name: 'Espadas', color: '#2c3e50' },
  { code: 'B', name: 'Bastos', color: '#8b4513' },
  { code: 'C', name: 'Copas', color: '#e74c3c' },
  { code: 'O', name: 'Oros', color: '#f39c12' }
];

const numbers = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];

const numberNames = {
  1: 'As',
  2: 'Dos',
  3: 'Tres', 
  4: 'Cuatro',
  5: 'Cinco',
  6: 'Seis',
  7: 'Siete',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey'
};

// Generate all 40 cards
const cards = [];
suits.forEach(suit => {
  numbers.forEach(num => {
    cards.push({
      id: `${num.toString().padStart(2, '0')}_${suit.code}`,
      filename: `${num.toString().padStart(2, '0')}_${suit.code}.svg`,
      display: `${numberNames[num]} de ${suit.name}`,
      suit: suit.code,
      number: num,
      color: suit.color
    });
  });
});

console.log('Spanish Deck Cards (40 total):');
console.log('Naming convention: NN_S.svg (e.g., 01_E.svg, 12_O.svg)');
console.log('');

// Generate SVG function
function generateCardSVG(card) {
  return `<svg width="120" height="180" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
  <!-- Card background -->
  <rect x="5" y="5" width="110" height="170" rx="8" ry="8" 
        fill="white" stroke="#333" stroke-width="2"/>
  
  <!-- Card number/rank -->
  <text x="60" y="40" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="24" font-weight="bold" fill="${card.color}">${card.number}</text>
  
  <!-- Card suit name -->
  <text x="60" y="90" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="12" fill="${card.color}">${card.display.split(' de ')[1]}</text>
        
  <!-- Card full name -->
  <text x="60" y="130" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="10" fill="#666">${card.display}</text>
        
  <!-- Card ID -->
  <text x="60" y="160" text-anchor="middle" font-family="Arial, sans-serif" 
        font-size="8" fill="#999">${card.id}</text>
</svg>`;
}

// Export functions for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { cards, generateCardSVG };
} else {
  // CLI usage
  cards.forEach(card => {
    console.log(`${card.filename}: ${card.display}`);
  });
}