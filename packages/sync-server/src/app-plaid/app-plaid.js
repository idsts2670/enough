import express from 'express';
import {
  Configuration,
  CountryCode,
  PersonalFinanceCategoryVersion,
  PlaidApi,
  PlaidEnvironments,
  Products,
} from 'plaid';

import { handleError } from '#app-gocardless/util/handle-error';
import { SecretName, secretsService } from '#services/secrets-service';
import {
  requestLoggerMiddleware,
  validateSessionMiddleware,
} from '#util/middlewares';

import { mapPfcToCategory } from './pfc-category-map.js';

const app = express();
export { app as handlers };

app.use(requestLoggerMiddleware);
app.use(express.json());
app.use(validateSessionMiddleware);

if (process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET) {
  secretsService.set(SecretName.plaid_client_id, process.env.PLAID_CLIENT_ID);
  secretsService.set(SecretName.plaid_secret, process.env.PLAID_SECRET);
  secretsService.set(
    SecretName.plaid_env,
    process.env.PLAID_ENV ?? 'production',
  );
}

function getPlaidClient() {
  const clientId = secretsService.get(SecretName.plaid_client_id);
  const secret = secretsService.get(SecretName.plaid_secret);
  const env = secretsService.get(SecretName.plaid_env) ?? 'production';

  if (!clientId || !secret) {
    throw new Error('Plaid credentials not configured');
  }

  return new PlaidApi(
    new Configuration({
      basePath:
        env === 'sandbox'
          ? PlaidEnvironments.sandbox
          : PlaidEnvironments.production,
      baseOptions: {
        headers: {
          'PLAID-CLIENT-ID': clientId,
          'PLAID-SECRET': secret,
        },
      },
    }),
  );
}

function getItemIds() {
  const raw = secretsService.get(SecretName.plaid_item_ids);

  try {
    return raw ? JSON.parse(raw) : [];
  } catch {
    console.error('plaid_item_ids is corrupt; treating as empty:', raw);
    return [];
  }
}

function addItemId(itemId) {
  const ids = getItemIds();

  if (!ids.includes(itemId)) {
    secretsService.set(
      SecretName.plaid_item_ids,
      JSON.stringify([...ids, itemId]),
    );
  }
}

function getCursor(itemId, accountId) {
  return secretsService.get(`plaid_cursor_${itemId}_${accountId}`) ?? undefined;
}

function saveCursor(itemId, accountId, cursor) {
  if (cursor) {
    secretsService.set(`plaid_cursor_${itemId}_${accountId}`, cursor);
  }
}

function parseAccountId(accountId) {
  const sep = accountId.indexOf('::');

  if (sep === -1) {
    return null;
  }

  return {
    itemId: accountId.slice(0, sep),
    plaidAccountId: accountId.slice(sep + 2),
  };
}

function toCents(amount) {
  return Math.round((amount ?? 0) * 100);
}

function getSignedBalance(account) {
  const current = account.balances?.current ?? account.balances?.available ?? 0;
  return account.type === 'credit' || account.type === 'loan'
    ? -toCents(current)
    : toCents(current);
}

function toActualAmount(plaidAmount) {
  return (-plaidAmount).toFixed(2);
}

async function getInstitutionName(client, accessToken) {
  try {
    const itemResponse = await client.itemGet({ access_token: accessToken });
    const institutionId = itemResponse.data.item.institution_id;

    if (!institutionId) {
      return null;
    }

    const institutionResponse = await client.institutionsGetById({
      institution_id: institutionId,
      country_codes: [CountryCode.Us],
    });

    return institutionResponse.data.institution.name;
  } catch (error) {
    console.warn('Unable to fetch Plaid institution name:', error?.message);
    return null;
  }
}

function mapTransaction(txn) {
  const pfcPrimary = txn.personal_finance_category?.primary ?? null;
  const pfcDetailed = txn.personal_finance_category?.detailed ?? null;

  return {
    transactionId: txn.transaction_id,
    date: txn.date,
    payeeName: txn.merchant_name ?? txn.name,
    notes: txn.name,
    transactionAmount: {
      amount: toActualAmount(txn.amount),
      currency: txn.iso_currency_code ?? 'USD',
    },
    booked: !txn.pending,
    pending: txn.pending ?? false,
    plaidCategory: pfcPrimary,
    plaidCategoryDetailed: pfcDetailed,
    plaidCategoryConfidence:
      txn.personal_finance_category?.confidence_level ?? null,
    plaidSuggestedCategory: mapPfcToCategory(pfcPrimary, pfcDetailed),
  };
}

app.post(
  '/status',
  handleError(async (_req, res) => {
    res.send({
      status: 'ok',
      data: {
        configured:
          secretsService.exists(SecretName.plaid_client_id) &&
          secretsService.exists(SecretName.plaid_secret),
      },
    });
  }),
);

app.post(
  '/create-link-token',
  handleError(async (req, res) => {
    const { item_id: itemId } = req.body || {};
    const client = getPlaidClient();
    const request = {
      user: { client_user_id: 'actual-budget-user' },
      client_name: 'Enough',
      country_codes: [CountryCode.Us],
      language: 'en',
    };

    if (itemId) {
      const accessToken = secretsService.get(`plaid_access_token_${itemId}`);

      if (!accessToken) {
        res.status(400).send({
          status: 'error',
          reason: `No access token for Plaid item ${itemId}`,
        });
        return;
      }

      request.access_token = accessToken;
    } else {
      request.products = [Products.Transactions];
      request.transactions = { days_requested: 730 };
    }

    const response = await client.linkTokenCreate(request);

    res.send({
      status: 'ok',
      data: { link_token: response.data.link_token },
    });
  }),
);

app.post(
  '/exchange-token',
  handleError(async (req, res) => {
    const { public_token: publicToken } = req.body || {};

    if (!publicToken) {
      res.status(400).send({ status: 'error', reason: 'Missing public_token' });
      return;
    }

    const client = getPlaidClient();
    const response = await client.itemPublicTokenExchange({
      public_token: publicToken,
    });
    const { access_token: accessToken, item_id: itemId } = response.data;

    secretsService.set(`plaid_access_token_${itemId}`, accessToken);
    addItemId(itemId);

    res.send({ status: 'ok', data: { item_id: itemId } });
  }),
);

app.post(
  '/accounts',
  handleError(async (_req, res) => {
    const client = getPlaidClient();
    const itemIds = getItemIds();
    const results = await Promise.all(
      itemIds.map(async itemId => {
        const accessToken = secretsService.get(`plaid_access_token_${itemId}`);

        if (!accessToken) {
          console.warn(`No Plaid access token for item ${itemId}; skipping`);
          return [];
        }

        const [accountsResponse, institutionName] = await Promise.all([
          client.accountsGet({ access_token: accessToken }),
          getInstitutionName(client, accessToken),
        ]);

        return accountsResponse.data.accounts.map(account => ({
          account_id: `${itemId}::${account.account_id}`,
          name: account.name,
          official_name: account.official_name ?? account.name,
          institution: institutionName ?? 'Plaid',
          orgId: itemId,
          orgDomain: itemId,
          mask: account.mask ?? '',
          balance: getSignedBalance(account),
          type: account.type,
          subtype: account.subtype,
        }));
      }),
    );

    res.send({ status: 'ok', data: { accounts: results.flat() } });
  }),
);

app.post(
  '/transactions',
  handleError(async (req, res) => {
    const { accountId, startDate } = req.body || {};

    if (!accountId || !startDate) {
      res.status(400).send({
        status: 'error',
        reason: 'Missing accountId or startDate',
      });
      return;
    }

    const parsed = parseAccountId(accountId);
    if (!parsed) {
      res.status(400).send({
        status: 'error',
        reason: 'Invalid Plaid accountId format',
      });
      return;
    }

    const { itemId, plaidAccountId } = parsed;
    const accessToken = secretsService.get(`plaid_access_token_${itemId}`);

    if (!accessToken) {
      res.send({
        status: 'ok',
        data: {
          error_type: 'INVALID_INPUT',
          error_code: 'INVALID_ACCESS_TOKEN',
          reason: `No access token for Plaid item ${itemId}`,
        },
      });
      return;
    }

    const client = getPlaidClient();
    const accountsResponse = await client.accountsGet({
      access_token: accessToken,
    });
    const account = accountsResponse.data.accounts.find(
      ({ account_id: id }) => id === plaidAccountId,
    );

    if (!account) {
      res.send({
        status: 'ok',
        data: {
          error_type: 'ITEM_ERROR',
          error_code: 'NO_ACCOUNTS',
          reason: `Plaid account ${plaidAccountId} was not found`,
        },
      });
      return;
    }

    let cursor = getCursor(itemId, plaidAccountId);
    let hasMore = true;
    const added = [];
    const modified = [];
    const removed = [];
    const startMs = new Date(startDate).getTime();

    while (hasMore) {
      const response = await client.transactionsSync({
        access_token: accessToken,
        cursor,
        options: {
          account_id: plaidAccountId,
          include_personal_finance_category: true,
          personal_finance_category_version: PersonalFinanceCategoryVersion.V2,
          days_requested: 730,
        },
      });

      const data = response.data;
      cursor = data.next_cursor;
      hasMore = data.has_more;

      for (const transaction of data.added) {
        if (new Date(transaction.date).getTime() >= startMs) {
          added.push(mapTransaction(transaction));
        }
      }

      for (const transaction of data.modified) {
        modified.push(mapTransaction(transaction));
      }

      for (const transaction of data.removed) {
        removed.push({ transactionId: transaction.transaction_id });
      }
    }

    saveCursor(itemId, plaidAccountId, cursor);

    const all = [...added, ...modified].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    res.send({
      status: 'ok',
      data: {
        balances: [
          {
            balanceAmount: {
              amount: String(getSignedBalance(account) / 100),
              currency: account.balances?.iso_currency_code ?? 'USD',
            },
            balanceType: 'expected',
            referenceDate: new Date().toISOString().split('T')[0],
          },
        ],
        startingBalance: getSignedBalance(account),
        transactions: {
          all,
          booked: all.filter(transaction => transaction.booked),
          pending: all.filter(transaction => transaction.pending),
          removed,
        },
      },
    });
  }),
);
