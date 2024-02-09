import { ApolloClient, ApolloProvider, InMemoryCache, TypePolicies, TypePolicy } from '@apollo/client';
import { PropsWithChildren } from 'react';
import { SystemInfo } from '../generated/gql-types';

type Props = {
  Token_priceUSDOracleValue: bigint;
  DebtTokenMeta_walletAmount: bigint;
  DebtTokenMeta_troveMintedAmount: bigint;
  DebtTokenMeta_troveRepableDebtAmount: bigint;
  DebtTokenMeta_providedStability: bigint;
  DebtTokenMeta_compoundedDeposit: bigint;
  CollateralTokenMeta_walletAmount: bigint;
  CollateralTokenMeta_troveLockedAmount: bigint;
  CollateralTokenMeta_stabilityGainedAmount: bigint;
  Pool_swapFee: bigint;
  Pool_borrowerAmount: bigint;
  TroveManager_borrowingRate: bigint;
  SystemInfo_totalCollateralRatio: bigint;
};

export function CustomApolloProvider_DevMode({
  children,

  ...props
}: PropsWithChildren<Partial<Props>>) {
  const cacheConfig = getProductionCacheConfig(props);

  const client = new ApolloClient({
    // TODO: replace with our deployed graphql endpoint
    uri: 'http://localhost:8000/subgraphs/name/subgraph',

    connectToDevTools: true,
    cache: new InMemoryCache({
      typePolicies: {
        ...cacheConfig.fields,

        Query: {
          fields: {
            ...cacheConfig.Query.fields,

            swapEvents: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: [],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
              read: (existing) => {
                return existing;
              },
            },

            borrowerHistories: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: [],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = [], incoming) {
                return [...existing, ...incoming];
              },
              read: (existing) => {
                return existing;
              },
            },
          },
        },
      },
    }),
  });
  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}

const getProductionCacheConfig = ({
  CollateralTokenMeta_stabilityGainedAmount = BigInt(100000000000000000000),
  CollateralTokenMeta_troveLockedAmount = BigInt(100000000000000000000),
  CollateralTokenMeta_walletAmount = BigInt(100000000000000000000),
  DebtTokenMeta_compoundedDeposit = BigInt(7000000000000000000),
  DebtTokenMeta_providedStability = BigInt(10000000000000000000),
  DebtTokenMeta_troveMintedAmount = BigInt(10000000000000000000),
  DebtTokenMeta_troveRepableDebtAmount = BigInt(10000000000000000000),
  DebtTokenMeta_walletAmount = BigInt(10000000000000000000),
  Pool_borrowerAmount = BigInt(10000000000000000000),
  Pool_swapFee = BigInt(50000),
  SystemInfo_totalCollateralRatio = BigInt(100000000000000000),
  Token_priceUSDOracleValue = BigInt(10000000000000000000),
  TroveManager_borrowingRate = BigInt(100000000000000000),
}: Partial<Props>): { fields: TypePolicies; Query: TypePolicy } => ({
  fields: {
    Token: {
      fields: {
        priceUSDOracle: {
          read() {
            return Token_priceUSDOracleValue;
          },
        },
      },
    },

    DebtTokenMeta: {
      fields: {
        walletAmount: {
          read() {
            return DebtTokenMeta_walletAmount;
          },
        },

        troveMintedAmount: {
          read() {
            return DebtTokenMeta_troveMintedAmount;
          },
        },

        troveRepableDebtAmount: {
          read() {
            return DebtTokenMeta_troveRepableDebtAmount;
          },
        },

        providedStability: {
          read() {
            return DebtTokenMeta_providedStability;
          },
        },

        compoundedDeposit: {
          read() {
            return DebtTokenMeta_compoundedDeposit;
          },
        },
      },
    },

    CollateralTokenMeta: {
      fields: {
        walletAmount: {
          read() {
            return CollateralTokenMeta_walletAmount;
          },
        },

        troveLockedAmount: {
          read() {
            return CollateralTokenMeta_troveLockedAmount;
          },
        },

        stabilityGainedAmount: {
          read() {
            return CollateralTokenMeta_stabilityGainedAmount;
          },
        },
      },
    },

    Pool: {
      fields: {
        swapFee: {
          read() {
            return Pool_swapFee;
          },
        },

        borrowerAmount: {
          read() {
            return Pool_borrowerAmount;
          },
        },
      },
    },
  },

  Query: {
    fields: {
      getSystemInfo: {
        read: () => {
          return {
            __typename: 'SystemInfo',
            id: 'SystemInfo',
            totalCollateralRatio: SystemInfo_totalCollateralRatio,
            recoveryModeActive: true,
          } as SystemInfo;
        },
      },
    },
  },
});
