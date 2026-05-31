export type PaymentTransferCandidate = {
  accountName?: string | null;
  categoryName?: string | null;
  categoryGroupName?: string | null;
  payeeName?: string | null;
  importedPayee?: string | null;
  notes?: string | null;
};

export const PAYMENT_TRANSFER_GROUP_NAME = 'Transfers & Payments';
export const CREDIT_CARD_PAYMENTS_CATEGORY_NAME = 'Credit Card Payments';

const paymentTransferPatterns = [
  /\bautomatic\s+payment\b/i,
  /\bautomatic\s+pay\b/i,
  /\bautomatic\s+pymt\b/i,
  /\bauto\s+payment\b/i,
  /\bauto\s+pay\b/i,
  /\bautopay\b/i,
  /\bautopmt\b/i,
  /\bcredit\s+crd\s+autopay\b/i,
  /\bcredit\s+card\s+payment\b/i,
  /\bcard\s+payment\b/i,
  /\bpayment\s+thank\s+you\b/i,
];

function hasExactPaymentName(value: string) {
  const normalized = value.trim().toLowerCase();
  return normalized === 'payment' || normalized === 'credit card payment';
}

function normalizeValue(value: string | null | undefined) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function hasKnownAccountScopedPaymentName(
  transaction: PaymentTransferCandidate,
) {
  const accountName = normalizeValue(transaction.accountName);
  const candidateNames = [
    transaction.payeeName,
    transaction.importedPayee,
    transaction.notes,
  ].map(normalizeValue);

  return (
    (accountName === 'total checking' &&
      candidateNames.includes('robinhood')) ||
    (accountName === '360 checking' && candidateNames.includes('capital one'))
  );
}

export function isPaymentTransferLike(transaction: PaymentTransferCandidate) {
  const exactPaymentFields = [
    transaction.payeeName,
    transaction.importedPayee,
  ].filter((value): value is string => typeof value === 'string');
  const fields = [
    transaction.payeeName,
    transaction.importedPayee,
    transaction.notes,
  ].filter((value): value is string => typeof value === 'string');

  return (
    hasKnownAccountScopedPaymentName(transaction) ||
    exactPaymentFields.some(hasExactPaymentName) ||
    fields.some(value =>
      paymentTransferPatterns.some(pattern => pattern.test(value)),
    )
  );
}

export function isPaymentTransferCategory({
  categoryName,
  categoryGroupName,
}: Pick<PaymentTransferCandidate, 'categoryName' | 'categoryGroupName'>) {
  return (
    categoryName === CREDIT_CARD_PAYMENTS_CATEGORY_NAME ||
    categoryGroupName === PAYMENT_TRANSFER_GROUP_NAME
  );
}

export function isReportingExcludedPaymentTransfer(
  transaction: PaymentTransferCandidate,
) {
  return (
    isPaymentTransferCategory(transaction) || isPaymentTransferLike(transaction)
  );
}
