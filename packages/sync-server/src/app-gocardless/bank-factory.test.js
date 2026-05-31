import { describe, expect, it } from 'vitest';

import { isSpecialContinuousAccessBank } from './bank-factory';

describe('isSpecialContinuousAccessBank', () => {
  it('matches institutions after removing all wildcard markers', () => {
    expect(isSpecialContinuousAccessBank('LUMINOR_TESTBANK')).toBe(true);
    expect(isSpecialContinuousAccessBank('BANKINTER_BKBKESMM123')).toBe(true);
  });
});
