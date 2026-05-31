import { describe, expect, it } from 'vitest';

import * as monthUtils from './months';

test('range returns a full range', () => {
  expect(monthUtils.range('2016-10', '2018-01')).toMatchSnapshot();
});

describe('month/year display helpers', () => {
  it('collapses repeated separators after removing day tokens', () => {
    expect(monthUtils.getMonthYearFormat('dd//MM//yyyy')).toBe('MM/yyyy');
    expect(monthUtils.getMonthYearFormat('dd..MM..yyyy')).toBe('MM.yyyy');
    expect(monthUtils.getMonthYearFormat('dd--MM--yyyy')).toBe('MM-yyyy');
  });

  it('builds regexes from formats with repeated separators', () => {
    const regex = monthUtils.getMonthYearRegex('dd//MM//yyyy');

    expect(regex.test('05/2026')).toBe(true);
    expect(regex.test('/05/2026')).toBe(false);
  });
});
