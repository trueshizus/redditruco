#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

function generateCardSVG(suit, number) {
  const suitName = suits.find(s => s.code === suit.code).name;
  const cardName = numberNames[number];
  const fullName = `${cardName} de ${suitName}`;
  const cardId = `${number.toString().padStart(2, '0')}_${suit.code}`;

  return `<svg width="120" height="180" viewBox="0 0 120 180" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Gradient for card background -->
    <radialGradient id="cardGradient" cx="50%" cy="30%" r="80%">
      <stop offset="0%" style="stop-color:#fff8dc;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f5f5dc;stop-opacity:1" />
    </radialGradient>
    
    <!-- Pattern for subtle texture -->
    <pattern id="texture" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="10" cy="10" r="1" fill="#000" opacity="0.02"/>
    </pattern>
    
    <!-- Shadow filter -->
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <!-- Card shadow -->
  <rect x="3" y="3" width="114" height="174" rx="8" ry="8" fill="#000" opacity="0.1"/>
  
  <!-- Main card background -->
  <rect x="5" y="5" width="110" height="170" rx="8" ry="8" 
        fill="url(#cardGradient)" stroke="#8b7355" stroke-width="2"/>
  
  <!-- Subtle texture overlay -->
  <rect x="5" y="5" width="110" height="170" rx="8" ry="8" fill="url(#texture)"/>
  
  <!-- Decorative corner flourishes -->
  <g fill="${suit.color}" opacity="0.3">
    <path d="M15,15 Q20,10 25,15 Q20,20 15,15" />
    <path d="M105,15 Q100,10 95,15 Q100,20 105,15" />
    <path d="M15,165 Q20,160 25,165 Q20,170 15,165" />
    <path d="M105,165 Q100,160 95,165 Q100,170 105,165" />
  </g>
  
  <!-- Central decorative element -->
  <g transform="translate(60, 90)" fill="${suit.color}" opacity="0.1">
    <circle cx="0" cy="0" r="25"/>
    <path d="M-15,-15 L15,15 M15,-15 L-15,15" stroke="${suit.color}" stroke-width="1" opacity="0.2"/>
  </g>
  
  <!-- Card number/rank -->
  <text x="60" y="45" text-anchor="middle" font-family="Georgia, serif" 
        font-size="32" font-weight="bold" fill="${suit.color}" filter="url(#shadow)">${number}</text>
  
  <!-- Card suit name -->
  <text x="60" y="130" text-anchor="middle" font-family="Georgia, serif" 
        font-size="16" font-weight="600" fill="${suit.color}">${suitName}</text>
        
  <!-- Card full name -->
  <text x="60" y="150" text-anchor="middle" font-family="Georgia, serif" 
        font-size="11" fill="#5a4a3a" font-style="italic">${fullName}</text>
        
  <!-- Card ID -->
  <text x="60" y="165" text-anchor="middle" font-family="monospace" 
        font-size="9" fill="#8a7a6a">${cardId}</text>
</svg>`;
}

// Create cards directory  
const cardsDir = path.join(__dirname, '..', 'src', 'client', 'public', 'cards');
if (!fs.existsSync(cardsDir)) {
  fs.mkdirSync(cardsDir, { recursive: true });
}

// Generate all cards
let count = 0;
suits.forEach(suit => {
  numbers.forEach(number => {
    const filename = `${number.toString().padStart(2, '0')}_${suit.code}.svg`;
    const svgContent = generateCardSVG(suit, number);
    const filepath = path.join(cardsDir, filename);
    
    fs.writeFileSync(filepath, svgContent);
    count++;
    console.log(`Generated: ${filename}`);
  });
});

console.log(`\nGenerated ${count} card SVG files in ${cardsDir}`);