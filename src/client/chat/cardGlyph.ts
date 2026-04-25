import { isValidCard } from '../../shared/truco';

const SUIT_GLYPH: Record<string, string> = {
  E: '♠',
  B: '♣',
  C: '♥',
  O: '♦',
};

const SUIT_FROM_NAME: Record<string, string> = {
  e: 'E', espada: 'E', espadas: 'E',
  b: 'B', basto: 'B', bastos: 'B',
  c: 'C', copa: 'C', copas: 'C',
  o: 'O', oro: 'O', oros: 'O',
};

const RANK_FROM_NAME: Record<string, string> = {
  as: '01',
  sota: '10',
  caballo: '11',
  rey: '12',
};

export function formatCardGlyph(cardId: string): string {
  if (!isValidCard(cardId)) throw new Error(`Unknown card: ${cardId}`);
  const [rank, suit] = cardId.split('_');
  const rankNum = parseInt(rank!, 10);
  const glyph = SUIT_GLYPH[suit!];
  if (!glyph) throw new Error(`Unknown suit: ${suit}`);
  return `[${rankNum}${glyph}]`;
}

export function parseCardArg(input: string): string | null {
  const text = input.trim().toLowerCase();
  if (!text) return null;

  if (/^\d{2}_[ebco]$/i.test(text)) {
    const cardId = text.toUpperCase().replace(/^(.)(.)_/, (_m, a, b) => `${a}${b}_`);
    return isValidCard(cardId) ? cardId : null;
  }

  const compact = text.replace(/\s+/g, '');
  const m = /^(\d{1,2})([ebco])$/.exec(compact);
  if (m) {
    const rank = m[1]!.padStart(2, '0');
    const suit = m[2]!.toUpperCase();
    const cardId = `${rank}_${suit}`;
    return isValidCard(cardId) ? cardId : null;
  }

  const tokens = text.split(/\s+/).filter((t) => t !== 'de' && t !== 'del');
  if (tokens.length === 2) {
    const [first, second] = tokens;
    const rank = RANK_FROM_NAME[first!] ?? (/^\d{1,2}$/.test(first!) ? first!.padStart(2, '0') : null);
    const suit = SUIT_FROM_NAME[second!];
    if (rank && suit) {
      const cardId = `${rank}_${suit}`;
      return isValidCard(cardId) ? cardId : null;
    }
  }

  return null;
}
