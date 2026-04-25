import { describe, it, expect } from 'vitest';
import {
  pickCard,
  respondToEnvido,
  respondToTruco,
} from '../../src/client/chat/canillitaStrategy';

describe('pickCard', () => {
  it('lead trick → median rank', () => {
    const hand = ['01_E', '07_C', '04_O']; // strongest, mid, weakest
    const got = pickCard(hand, { lead: null });
    expect(got).toBe('07_C'); // median
  });

  it('respond and can beat → lowest beating', () => {
    // 01_E (rank 0) and 07_C (rank 10) both beat 06_E (rank 11); 04_O (rank 13) does not.
    // Pick the weakest winning card → 07_C.
    const hand = ['01_E', '07_C', '04_O'];
    const got = pickCard(hand, { lead: '06_E' });
    expect(got).toBe('07_C');
  });

  it('respond and cannot beat → weakest', () => {
    const hand = ['04_O', '05_C'];
    const got = pickCard(hand, { lead: '03_E' });
    expect(got).toBe('04_O');
  });
});

describe('respondToEnvido', () => {
  const high = ['07_E', '06_E', '04_B']; // 33
  const mid = ['05_C', '04_C', '12_E']; // 29
  const low = ['12_E', '11_B', '10_C']; // 0

  it('≥28 → quiero', () => {
    expect(respondToEnvido(high, 2)).toBe('quiero');
    expect(respondToEnvido(mid, 2)).toBe('quiero');
  });

  it('23–27 + base envido → quiero', () => {
    const m = ['05_C', '02_C', '12_E']; // 27
    expect(respondToEnvido(m, 2)).toBe('quiero');
  });

  it('23–27 + raised → no_quiero', () => {
    const m = ['05_C', '02_C', '12_E']; // 27
    expect(respondToEnvido(m, 5)).toBe('no_quiero');
  });

  it('low → no_quiero', () => {
    expect(respondToEnvido(low, 2)).toBe('no_quiero');
  });
});

describe('respondToTruco', () => {
  const strongHand = ['01_E', '01_B', '07_E'];
  const oneStrong = ['01_E', '04_O', '05_C'];
  const noneStrong = ['04_O', '05_C', '06_B'];

  it('three strong → quiero (or retruco)', () => {
    const got = respondToTruco(strongHand, { trucoState: 'truco' });
    expect(['quiero', 'retruco']).toContain(got);
  });

  it('one strong + truco → quiero', () => {
    expect(respondToTruco(oneStrong, { trucoState: 'truco' })).toBe('quiero');
  });

  it('one strong + retruco → no_quiero', () => {
    expect(respondToTruco(oneStrong, { trucoState: 'retruco' })).toBe('no_quiero');
  });

  it('no strong → no_quiero', () => {
    expect(respondToTruco(noneStrong, { trucoState: 'truco' })).toBe('no_quiero');
  });
});
