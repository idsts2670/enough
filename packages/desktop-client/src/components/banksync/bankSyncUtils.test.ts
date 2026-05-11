import { generateAccount } from '@actual-app/core/mocks';
import { describe, expect, it } from 'vitest';

import { getSyncSourceReadable, groupBankSyncAccounts } from './bankSyncUtils';

describe('bankSyncUtils', () => {
  it('groups open accounts by provider and leaves unlinked last', () => {
    const legacyGoCardlessAccount = generateAccount(
      'GoCardless',
      true,
      false,
    );
    const pluggyAccount = {
      ...generateAccount('Pluggy', true, false),
      account_sync_source: 'pluggyai' as const,
    };
    const simpleFinAccount = {
      ...generateAccount('SimpleFIN', true, false),
      account_sync_source: 'simpleFin' as const,
    };
    const plaidAccount = {
      ...generateAccount('Plaid', true, false),
      account_sync_source: 'plaid' as const,
    };
    const unlinkedAccount = generateAccount('Manual', false, false);
    const closedAccount = {
      ...generateAccount('Closed', true, false),
      closed: 1 as const,
    };

    const groupedAccounts = groupBankSyncAccounts([
      unlinkedAccount,
      simpleFinAccount,
      closedAccount,
      pluggyAccount,
      plaidAccount,
      legacyGoCardlessAccount,
    ]);

    expect(Object.keys(groupedAccounts)).toEqual(['plaid', 'unlinked']);
    expect(groupedAccounts.plaid).toEqual([plaidAccount]);
    expect(groupedAccounts.unlinked).toEqual([
      unlinkedAccount,
      simpleFinAccount,
      pluggyAccount,
      legacyGoCardlessAccount,
    ]);
  });

  it('returns stable readable provider labels', () => {
    const readable = getSyncSourceReadable(
      (key: string) => `translated:${key}`,
    );

    expect(readable.plaid).toBe('Plaid');
    expect(readable.unlinked).toBe('translated:Unlinked');
  });
});
