import assert from 'node:assert/strict';

import { describe, it } from 'vitest';

import {
  mapPfcToCategory,
  PFC_DETAILED_OVERRIDES,
} from './pfc-category-map.js';

describe('mapPfcToCategory', () => {
  it('maps a known primary category', () => {
    assert.equal(mapPfcToCategory('FOOD_AND_DRINK', null), 'Food & Drink');
  });

  it('maps another known primary category', () => {
    assert.equal(mapPfcToCategory('TRANSPORTATION', null), 'Transportation');
  });

  it('returns Uncategorized for an unknown primary category', () => {
    assert.equal(
      mapPfcToCategory('FUTURE_PLAID_CATEGORY', null),
      'Uncategorized',
    );
  });

  it('returns Uncategorized when both categories are missing', () => {
    assert.equal(mapPfcToCategory(null, null), 'Uncategorized');
  });

  it('falls back to primary when detailed has no override', () => {
    assert.equal(
      mapPfcToCategory('FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES'),
      'Food & Drink',
    );
  });

  it('prefers detailed overrides over primary categories', () => {
    PFC_DETAILED_OVERRIDES.FOOD_AND_DRINK_GROCERIES = 'Groceries';
    assert.equal(
      mapPfcToCategory('FOOD_AND_DRINK', 'FOOD_AND_DRINK_GROCERIES'),
      'Groceries',
    );
    delete PFC_DETAILED_OVERRIDES.FOOD_AND_DRINK_GROCERIES;
  });
});
