import { faker } from '@faker-js/faker';
import { graphql } from 'msw';
import { Query, QueryGetDebtTokensArgs, Token } from '../app/generated/gql-types';

// interface of apollo
interface GraphQLRequest {
  query: string;
  variables?: Record<string, any>;
}

const tokens: Token[] = Array(10)
  .fill(null)
  .map(() => ({
    address: faker.string.uuid(),
    symbol: faker.finance.currencyCode(),
    createdAt: faker.date.past().toISOString(),
    priceUSD: parseFloat(faker.finance.amount(1, 5000, 2)),
    priceUSD24hAgo: parseFloat(faker.finance.amount(1, 5000, 2)),
    isPoolToken: faker.datatype.boolean(),
  }));

export const handlers = [
  graphql.query<Query['getDebtTokens'], QueryGetDebtTokensArgs>('GetAllDebtTokens', (req, res, ctx) => {
    const { borrower } = req.variables;

    const result: Query['getDebtTokens'] = tokens.map((token) => ({
      token: token,
      walletAmount: borrower ? parseFloat(faker.finance.amount(0, 1000, 2)) : null,
      troveMintedAmount: borrower ? parseFloat(faker.finance.amount(0, 500, 2)) : null,
      stabilityLostAmount: borrower ? parseFloat(faker.finance.amount(0, 50, 2)) : null,
      totalDepositedStability: parseFloat(faker.finance.amount(1000, 5000, 2)),
      totalReserve: parseFloat(faker.finance.amount(1000, 5000, 2)),
      totalReserve24hAgo: parseFloat(faker.finance.amount(1000, 5000, 2)),
      totalSupplyUSD: parseFloat(faker.finance.amount(10000, 50000, 2)),
      totalSupplyUSD24hAgo: parseFloat(faker.finance.amount(10000, 50000, 2)),
    }));

    return res(ctx.data(result));
  }),
];
