import {
  CREDIT_CARD_PAYMENTS_CATEGORY_NAME,
  isPaymentTransferCategory,
  isPaymentTransferLike,
  isReportingExcludedPaymentTransfer,
  PAYMENT_TRANSFER_GROUP_NAME,
} from './payment-transfers';

describe('payment transfer detection', () => {
  it('detects exact payment payees', () => {
    expect(isPaymentTransferLike({ payeeName: 'Payment' })).toBe(true);
    expect(isPaymentTransferLike({ payeeName: 'Credit Card Payment' })).toBe(
      true,
    );
  });

  it('detects common automatic card payment descriptions', () => {
    expect(
      isPaymentTransferLike({
        importedPayee: 'CHASE CREDIT CARD AUTOMATIC PAYMENT',
      }),
    ).toBe(true);
    expect(
      isPaymentTransferLike({
        importedPayee: 'CHASE CREDIT CRD AUTOPAY PPD ID: 4760039224',
      }),
    ).toBe(true);
    expect(
      isPaymentTransferLike({
        payeeName: 'AUTOMATIC PAYMENT - THANK',
      }),
    ).toBe(true);
    expect(isPaymentTransferLike({ notes: 'Payment thank you - web' })).toBe(
      true,
    );
    expect(
      isPaymentTransferLike({ importedPayee: 'CAPITAL ONE AUTOPAY' }),
    ).toBe(true);
  });

  it('does not treat ordinary payment wording as a transfer by default', () => {
    expect(
      isPaymentTransferLike({ payeeName: 'Insurance Payment Center' }),
    ).toBe(false);
    expect(isPaymentTransferLike({ notes: 'Payment for invoice 123' })).toBe(
      false,
    );
    expect(isPaymentTransferLike({ notes: 'Payment' })).toBe(false);
    expect(isPaymentTransferLike({ payeeName: 'Venmo' })).toBe(false);
    expect(isPaymentTransferLike({ payeeName: 'Zelle payment to V' })).toBe(
      false,
    );
    expect(
      isPaymentTransferLike({ payeeName: 'Ups My Choice Membership' }),
    ).toBe(false);
  });

  it('detects user-approved account-scoped credit card payment names', () => {
    expect(
      isPaymentTransferLike({
        accountName: 'TOTAL CHECKING',
        payeeName: 'Robinhood',
      }),
    ).toBe(true);
    expect(
      isPaymentTransferLike({
        accountName: '360 Checking',
        importedPayee: 'CAPITAL ONE',
      }),
    ).toBe(true);
  });

  it('does not treat known payment counterparties as transfers without the approved source account', () => {
    expect(isPaymentTransferLike({ payeeName: 'Robinhood' })).toBe(false);
    expect(isPaymentTransferLike({ payeeName: 'CAPITAL ONE' })).toBe(false);
    expect(
      isPaymentTransferLike({
        accountName: 'Robinhood Credit Card',
        payeeName: 'CAPITAL ONE',
      }),
    ).toBe(false);
  });

  it('excludes the dedicated payment category from reporting', () => {
    expect(
      isPaymentTransferCategory({
        categoryName: CREDIT_CARD_PAYMENTS_CATEGORY_NAME,
      }),
    ).toBe(true);
    expect(
      isPaymentTransferCategory({
        categoryGroupName: PAYMENT_TRANSFER_GROUP_NAME,
      }),
    ).toBe(true);
    expect(
      isReportingExcludedPaymentTransfer({
        categoryName: CREDIT_CARD_PAYMENTS_CATEGORY_NAME,
        payeeName: 'Ups My Choice Membership',
      }),
    ).toBe(true);
  });
});
