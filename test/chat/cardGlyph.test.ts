import { describe, it, expect } from 'vitest';
import { formatCardGlyph, parseCardArg } from '../../src/client/chat/cardGlyph';
import { generateFullDeck } from '../../src/shared/truco';

describe('formatCardGlyph', () => {
  it('formats As de Espadas', () => {
    expect(formatCardGlyph('01_E')).toBe('[1♠]');
  });
  it('formats numeric cards by suit', () => {
    expect(formatCardGlyph('07_O')).toBe('[7♦]');
    expect(formatCardGlyph('07_C')).toBe('[7♥]');
    expect(formatCardGlyph('07_B')).toBe('[7♣]');
  });
  it('formats face cards as their numeric rank', () => {
    expect(formatCardGlyph('10_C')).toBe('[10♥]');
    expect(formatCardGlyph('11_B')).toBe('[11♣]');
    expect(formatCardGlyph('12_E')).toBe('[12♠]');
  });
  it('throws on unknown card', () => {
    expect(() => formatCardGlyph('99_X')).toThrow();
  });
});

describe('parseCardArg', () => {
  it('parses short forms', () => {
    expect(parseCardArg('1e')).toBe('01_E');
    expect(parseCardArg('7o')).toBe('07_O');
    expect(parseCardArg('12B')).toBe('12_B');
  });
  it('parses internal NN_S form', () => {
    expect(parseCardArg('01_E')).toBe('01_E');
  });
  it('parses suit-name forms', () => {
    expect(parseCardArg('1 espadas')).toBe('01_E');
    expect(parseCardArg('1 espada')).toBe('01_E');
    expect(parseCardArg('7 oros')).toBe('07_O');
  });
  it('parses face-card synonyms', () => {
    expect(parseCardArg('as de espadas')).toBe('01_E');
    expect(parseCardArg('sota de copas')).toBe('10_C');
    expect(parseCardArg('caballo de oros')).toBe('11_O');
    expect(parseCardArg('rey de bastos')).toBe('12_B');
  });
  it('returns null on ambiguity (no suit)', () => {
    expect(parseCardArg('1')).toBeNull();
    expect(parseCardArg('rey')).toBeNull();
  });
  it('returns null on garbage', () => {
    expect(parseCardArg('xyz')).toBeNull();
    expect(parseCardArg('')).toBeNull();
  });
  it('roundtrips every card in the deck', () => {
    for (const cardId of generateFullDeck()) {
      const glyph = formatCardGlyph(cardId);
      const inner = glyph.slice(1, -1);
      const rank = cardId.split('_')[0]!.replace(/^0/, '');
      const suit = cardId.split('_')[1]!.toLowerCase();
      expect(parseCardArg(`${rank}${suit}`)).toBe(cardId);
      expect(inner).toBeTruthy();
    }
  });
});
