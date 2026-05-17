import { describe, expect, it } from 'vitest';

import { normalizePayeeName } from './payee-normalizer';

describe('normalizePayeeName', () => {
  it('removes restaurant processor prefixes and reconstructs obvious truncation', () => {
    expect(normalizePayeeName("TST* MO'S IRISH PU...")).toBe("Mo's Irish Pub");
  });

  it('removes Square processor prefixes', () => {
    expect(normalizePayeeName('SQ *MERCHANT NAME')).toBe('Merchant Name');
  });

  it('removes common network and website noise without mutating raw input storage', () => {
    expect(normalizePayeeName('PAYPAL *SPOTIFY USA 123456')).toBe('Spotify');
    expect(normalizePayeeName('UBER TRIP HELP.UBER.COM')).toBe('Uber Trip');
  });
});
