import { theme } from '@actual-app/components/theme';

export type CategoryColor = {
  color: string;
  tint: string;
};

const categoryColorTokens = [
  {
    key: 'housing',
    words: ['housing', 'home', 'rent', 'mortgage'],
    color: theme.categoryHousing,
    tint: theme.categoryHousingTint,
  },
  {
    key: 'food',
    words: ['food', 'drink', 'grocery', 'restaurant'],
    color: theme.categoryFood,
    tint: theme.categoryFoodTint,
  },
  {
    key: 'transport',
    words: ['transport', 'car', 'transit', 'gas'],
    color: theme.categoryTransport,
    tint: theme.categoryTransportTint,
  },
  {
    key: 'shopping',
    words: ['shopping', 'retail'],
    color: theme.categoryShopping,
    tint: theme.categoryShoppingTint,
  },
  {
    key: 'bills',
    words: ['bill', 'subscription', 'utility'],
    color: theme.categoryBills,
    tint: theme.categoryBillsTint,
  },
  {
    key: 'health',
    words: ['health', 'medical', 'fitness', 'pharmacy'],
    color: theme.categoryHealth,
    tint: theme.categoryHealthTint,
  },
  {
    key: 'entertainment',
    words: ['entertainment', 'hobby', 'media'],
    color: theme.categoryEntertainment,
    tint: theme.categoryEntertainmentTint,
  },
  {
    key: 'travel',
    words: ['travel', 'flight', 'hotel'],
    color: theme.categoryTravel,
    tint: theme.categoryTravelTint,
  },
  {
    key: 'income',
    words: ['income', 'transfer'],
    color: theme.categoryIncome,
    tint: theme.categoryIncomeTint,
  },
  {
    key: 'debt',
    words: ['debt', 'loan', 'payment'],
    color: theme.categoryDebt,
    tint: theme.categoryDebtTint,
  },
  {
    key: 'savings',
    words: ['saving', 'investment'],
    color: theme.categorySavings,
    tint: theme.categorySavingsTint,
  },
  {
    key: 'personal',
    words: ['personal'],
    color: theme.categoryPersonal,
    tint: theme.categoryPersonalTint,
  },
];

function stableHash(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const genericCategoryGroups = new Set([
  'categories',
  'general',
  'other',
  'plaid categories',
  'usual expenses',
]);

export function getCategoryColor(
  groupName: string,
  categoryName?: string | null,
): CategoryColor {
  const normalized = groupName.toLowerCase();
  const normalizedCategory = categoryName?.toLowerCase() ?? '';
  const shouldPreferCategory = genericCategoryGroups.has(normalized);
  const textToMatch = shouldPreferCategory
    ? `${normalizedCategory} ${normalized}`
    : `${normalized} ${normalizedCategory}`;
  const namedToken = categoryColorTokens.find(
    token =>
      textToMatch.includes(token.key) ||
      token.words.some(word => textToMatch.includes(word)),
  );

  return (
    namedToken ??
    categoryColorTokens[
      stableHash(normalizedCategory || normalized) % categoryColorTokens.length
    ]
  );
}
