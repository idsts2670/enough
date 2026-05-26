import * as colorPalette from '#style/palette';

export type CategoryColor = {
  color: string;
  tint: string;
};

type CategoryColorToken = CategoryColor & {
  key: string;
  words: string[];
};

type CategoryColorFamily = CategoryColor & {
  key: string;
  words: string[];
  categories: CategoryColorToken[];
};

const categoryColorFamilies: CategoryColorFamily[] = [
  {
    key: 'fixed',
    words: ['fixed', 'fixed expense', 'fixed expenses'],
    color: colorPalette.transactionCategoryFixed,
    tint: colorPalette.transactionCategoryFixedTint,
    categories: [
      {
        key: 'fixed-rent',
        words: ['rent', 'mortgage', 'housing', 'home'],
        color: colorPalette.transactionCategoryFixedDeep,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-transport',
        words: ['transport', 'transportation', 'transit', 'car', 'gas'],
        color: colorPalette.transactionCategoryFixedCyan,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-subscriptions',
        words: ['subscription', 'subscriptions', 'recurring'],
        color: colorPalette.transactionCategoryFixedIndigo,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-insurance',
        words: ['insurance'],
        color: colorPalette.transactionCategoryFixedStrong,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-phone',
        words: ['phone', 'mobile', 'cell'],
        color: colorPalette.transactionCategoryFixedMid,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-internet',
        words: ['internet', 'wifi', 'broadband'],
        color: colorPalette.transactionCategoryFixedSlate,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-utilities',
        words: ['utility', 'utilities', 'electric', 'water', 'gas'],
        color: colorPalette.transactionCategoryFixedSoft,
        tint: colorPalette.transactionCategoryFixedTint,
      },
      {
        key: 'fixed-groceries',
        words: ['grocery', 'groceries'],
        color: colorPalette.transactionCategoryFixedMid,
        tint: colorPalette.transactionCategoryFixedTint,
      },
    ],
  },
  {
    key: 'fun',
    words: ['fun', 'lifestyle', 'discretionary'],
    color: colorPalette.transactionCategoryFun,
    tint: colorPalette.transactionCategoryFunTint,
    categories: [
      {
        key: 'fun-personal-care',
        words: ['personal care', 'beauty', 'haircut', 'wellness'],
        color: colorPalette.transactionCategoryFunStrong,
        tint: colorPalette.transactionCategoryFunTint,
      },
      {
        key: 'fun-shopping',
        words: ['shopping', 'retail', 'shop'],
        color: colorPalette.transactionCategoryFunAmber,
        tint: colorPalette.transactionCategoryFunTint,
      },
      {
        key: 'fun-entertainment',
        words: ['entertainment', 'movie', 'media', 'event'],
        color: colorPalette.transactionCategoryFunOrange,
        tint: colorPalette.transactionCategoryFunTint,
      },
      {
        key: 'fun-hobbies',
        words: ['hobby', 'hobbies', 'game', 'sport'],
        color: colorPalette.transactionCategoryFunDeep,
        tint: colorPalette.transactionCategoryFunTint,
      },
      {
        key: 'fun-restaurants',
        words: ['restaurant', 'restaurants', 'dining', 'bar', 'coffee'],
        color: colorPalette.transactionCategoryFunBurnt,
        tint: colorPalette.transactionCategoryFunTint,
      },
      {
        key: 'fun-groceries',
        words: ['grocery', 'groceries', 'food'],
        color: colorPalette.transactionCategoryFunHoney,
        tint: colorPalette.transactionCategoryFunTint,
      },
    ],
  },
  {
    key: 'trading-investment',
    words: [
      'trading',
      'investment',
      'investments',
      'brokerage',
      'crypto',
      'stock',
      'stocks',
    ],
    color: colorPalette.transactionCategoryTradingInvestment,
    tint: colorPalette.transactionCategoryTradingInvestmentTint,
    categories: [
      {
        key: 'trading-brokerage-fees',
        words: ['brokerage', 'fee', 'fees'],
        color: colorPalette.transactionCategoryTradingInvestmentDeep,
        tint: colorPalette.transactionCategoryTradingInvestmentTint,
      },
      {
        key: 'trading-crypto',
        words: ['crypto', 'bitcoin', 'ethereum'],
        color: colorPalette.transactionCategoryTradingInvestmentRose,
        tint: colorPalette.transactionCategoryTradingInvestmentTint,
      },
      {
        key: 'trading-stocks',
        words: ['stock', 'stocks', 'etf', 'etfs', 'equity'],
        color: colorPalette.transactionCategoryTradingInvestmentMid,
        tint: colorPalette.transactionCategoryTradingInvestmentTint,
      },
      {
        key: 'trading-losses',
        words: ['loss', 'losses', 'interest'],
        color: colorPalette.transactionCategoryTradingInvestmentRed,
        tint: colorPalette.transactionCategoryTradingInvestmentTint,
      },
      {
        key: 'trading-investment',
        words: ['invest', 'investment', 'portfolio'],
        color: colorPalette.transactionCategoryTradingInvestmentStrong,
        tint: colorPalette.transactionCategoryTradingInvestmentTint,
      },
    ],
  },
  {
    key: 'other',
    words: [
      'other',
      'misc',
      'miscellaneous',
      'uncategorized',
      'fallback',
      'categories',
      'plaid categories',
      'general',
    ],
    color: colorPalette.transactionCategoryOther,
    tint: colorPalette.transactionCategoryOtherTint,
    categories: [
      {
        key: 'other-misc',
        words: ['misc', 'miscellaneous', 'uncategorized', 'general'],
        color: colorPalette.transactionCategoryOtherStrong,
        tint: colorPalette.transactionCategoryOtherTint,
      },
      {
        key: 'other-work',
        words: ['work', 'business', 'reimburse'],
        color: colorPalette.transactionCategoryOtherDeep,
        tint: colorPalette.transactionCategoryOtherTint,
      },
      {
        key: 'other-fallback',
        words: ['other', 'fallback'],
        color: colorPalette.transactionCategoryOther,
        tint: colorPalette.transactionCategoryOtherTint,
      },
      {
        key: 'other-custom',
        words: ['custom'],
        color: colorPalette.transactionCategoryOtherSlate,
        tint: colorPalette.transactionCategoryOtherTint,
      },
      {
        key: 'other-plaid',
        words: ['plaid'],
        color: colorPalette.transactionCategoryOtherCool,
        tint: colorPalette.transactionCategoryOtherTint,
      },
    ],
  },
  {
    key: 'future-me',
    words: [
      'future me',
      'future',
      'education',
      'learning',
      'career',
      'self improvement',
      'self-improvement',
    ],
    color: colorPalette.transactionCategoryFutureMe,
    tint: colorPalette.transactionCategoryFutureMeTint,
    categories: [
      {
        key: 'future-me-education',
        words: ['education', 'school', 'tuition', 'class', 'course'],
        color: colorPalette.transactionCategoryFutureMeStrong,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-learning',
        words: ['learning', 'book', 'books', 'training'],
        color: colorPalette.transactionCategoryFutureMeMid,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-career',
        words: ['career', 'certification', 'conference', 'networking'],
        color: colorPalette.transactionCategoryFutureMeDeep,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-retirement',
        words: ['retirement', 'retire', 'ira', '401k', '401 k'],
        color: colorPalette.transactionCategoryFutureMeDeep,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-savings',
        words: ['savings transfer', 'saving transfer', 'savings', 'saving'],
        color: colorPalette.transactionCategoryFutureMeMid,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-emergency',
        words: ['emergency', 'emergency fund', 'reserve'],
        color: colorPalette.transactionCategoryFutureMeSlate,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-health',
        words: ['health', 'fitness', 'therapy', 'wellness'],
        color: colorPalette.transactionCategoryFutureMeMuted,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-growth',
        words: ['growth', 'personal development', 'self improvement'],
        color: colorPalette.transactionCategoryFutureMeSlate,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
      {
        key: 'future-me-fallback',
        words: ['future', 'future me'],
        color: colorPalette.transactionCategoryFutureMeSoft,
        tint: colorPalette.transactionCategoryFutureMeTint,
      },
    ],
  },
  {
    key: 'income',
    words: ['income', 'salary', 'paycheck', 'revenue'],
    color: colorPalette.transactionCategoryIncome,
    tint: colorPalette.transactionCategoryIncomeTint,
    categories: [
      {
        key: 'income-salary',
        words: ['salary', 'paycheck', 'payroll', 'wage'],
        color: colorPalette.transactionCategoryIncomeDeep,
        tint: colorPalette.transactionCategoryIncomeTint,
      },
      {
        key: 'income-bonus',
        words: ['bonus', 'commission'],
        color: colorPalette.transactionCategoryIncomeStrong,
        tint: colorPalette.transactionCategoryIncomeTint,
      },
      {
        key: 'income-transfer',
        words: ['transfer', 'deposit'],
        color: colorPalette.transactionCategoryIncomeMid,
        tint: colorPalette.transactionCategoryIncomeTint,
      },
      {
        key: 'income-interest',
        words: ['interest', 'dividend'],
        color: colorPalette.transactionCategoryIncomeSlate,
        tint: colorPalette.transactionCategoryIncomeTint,
      },
      {
        key: 'income-other',
        words: ['income', 'revenue'],
        color: colorPalette.transactionCategoryIncomeSoft,
        tint: colorPalette.transactionCategoryIncomeTint,
      },
    ],
  },
];

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stableHash(value: string) {
  let hash = 2166136261;
  for (const char of value) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function matchesAny(text: string, words: string[]) {
  return words.some(word => text.includes(normalizeName(word)));
}

function findFamily(groupName: string) {
  const normalizedGroupName = normalizeName(groupName);

  return (
    categoryColorFamilies.find(
      family =>
        normalizedGroupName === family.key ||
        matchesAny(normalizedGroupName, family.words),
    ) ??
    categoryColorFamilies.find(family => family.key === 'other') ??
    categoryColorFamilies[0]
  );
}

export function getCategoryColor(
  groupName: string,
  categoryName?: string | null,
): CategoryColor {
  const family = findFamily(groupName);

  if (!categoryName) {
    return { color: family.color, tint: family.tint };
  }

  const normalizedCategoryName = normalizeName(categoryName);
  const namedCategory = family.categories.find(category =>
    matchesAny(normalizedCategoryName, category.words),
  );

  return (
    namedCategory ??
    family.categories[
      stableHash(normalizedCategoryName || normalizeName(groupName)) %
        family.categories.length
    ] ?? { color: family.color, tint: family.tint }
  );
}
