// Maps Plaid PFCv2 primary categories to display category names in Actual.
export const PFC_PRIMARY_TO_CATEGORY = {
  INCOME: 'Income',
  TRANSFER_IN: 'Transfers',
  TRANSFER_OUT: 'Transfers',
  LOAN_PAYMENTS: 'Loan Payments',
  BANK_FEES: 'Fees & Charges',
  ENTERTAINMENT: 'Entertainment',
  FOOD_AND_DRINK: 'Food & Drink',
  GENERAL_MERCHANDISE: 'Shopping',
  HOME_IMPROVEMENT: 'Home Improvement',
  MEDICAL: 'Health & Medical',
  PERSONAL_CARE: 'Personal Care',
  GENERAL_SERVICES: 'Services',
  GOVERNMENT_AND_NON_PROFIT: 'Government & Charity',
  TRANSPORTATION: 'Transportation',
  TRAVEL: 'Travel',
  RENT_AND_UTILITIES: 'Housing & Utilities',
};

export const PFC_DETAILED_OVERRIDES = {};

export function mapPfcToCategory(primary, detailed) {
  if (detailed && PFC_DETAILED_OVERRIDES[detailed]) {
    return PFC_DETAILED_OVERRIDES[detailed];
  }

  if (primary && PFC_PRIMARY_TO_CATEGORY[primary]) {
    return PFC_PRIMARY_TO_CATEGORY[primary];
  }

  return 'Uncategorized';
}
