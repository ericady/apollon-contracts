import { ApolloClient, ApolloProvider, InMemoryCache, ReactiveVar, makeVar } from '@apollo/client';
import { AddressLike } from 'ethers';
import { PropsWithChildren, useEffect } from 'react';
import { DebtToken } from '../../types/ethers-contracts';
import { Contracts, useEthers } from './EthersProvider';

// Define the structure for each property in ContractDataFreshness
type ContractData = Record<
  string,
  {
    fetch: Function;
    value: ReactiveVar<number>;
    lastFetched: number;
    timeout: number;
  }
>;

// Type that mirros the Contracts object with literal access to the contract addresses
type ContractDataFreshnessManager<T> = {
  [P in keyof T]: T[P] extends Record<string, string> ? { [Address in T[P][keyof T[P]]]: ContractData } : ContractData;
};

// FIXME: This is also not perfectly typesafe. The keys are not required.
export const ContractDataFreshnessManager: ContractDataFreshnessManager<typeof Contracts> = {
  ERC20: {
    [Contracts.ERC20.Ethereum]: {},
  },
  DebtToken: {
    [Contracts.DebtToken.DebtToken1]: {},
    [Contracts.DebtToken.DebtToken2]: {},
    [Contracts.DebtToken.DebtToken3]: {},
    [Contracts.DebtToken.DebtToken4]: {},
    [Contracts.DebtToken.DebtToken5]: {},
    [Contracts.DebtToken.DebtToken6]: {},
    [Contracts.DebtToken.JUSD]: {
      priceUSD: {
        fetch: async (debtTokenContract: DebtToken, borrower: AddressLike) => {
          // const balance = debtTokenContract.balanceOf(borrower);
          const balance = Math.random() * 1000;
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.lastFetched = Date.now();
          ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD]!.priceUSD.value(balance);
        },
        value: makeVar(0),
        lastFetched: 0,
        timeout: 1000 * 5,
      },
    },
  },
};

// FIXME: The cache needs to be initialized with the contracts data.

// FIXME: I am too stupid to make this typesafe for now. I must pass the exact Contract Data literally.
function isFieldOutdated(contract: ContractData, field: string) {
  return contract[field].lastFetched < Date.now() - contract[field].timeout;
}

export function CustomApolloProvider({ children }: PropsWithChildren<{}>) {
  const { debtTokenContract, address: borrower } = useEthers();

  const client = new ApolloClient({
    // TODO: replace with your own graphql server
    uri: 'https://flyby-router-demo.herokuapp.com/',

    connectToDevTools: true,
    cache: new InMemoryCache({
      typePolicies: {
        Token: {
          fields: {
            priceUSD: {
              read(existing, { readField }) {
                const address = readField('address');
                if (
                  address &&
                  isFieldOutdated(ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD], 'priceUSD')
                ) {
                  // Make smart contract call using the address
                  ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.fetch(
                    debtTokenContract!,
                    borrower,
                  );
                }

                return ContractDataFreshnessManager.DebtToken[Contracts.DebtToken.JUSD].priceUSD.value();
              },
            },
          },
        },

        Query: {
          fields: {
            getPositions: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: ['isOpen'],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = { positions: [] }, incoming) {
                return {
                  ...incoming,
                  positions: [...existing.positions, ...incoming.positions],
                };
              },
              read: (existing, args) => {
                return existing;
              },
            },

            getBorrowerStabilityHistory: {
              // Don't cache separate results based on
              // any of this field's arguments.
              keyArgs: [],
              // Concatenate the incoming list items with
              // the existing list items.
              merge(existing = { history: [] }, incoming) {
                return {
                  ...incoming,
                  history: [...existing.history, ...incoming.history],
                };
              },
              read: (existing, args) => {
                return existing;
              },
            },
          },
        },
      },
    }),
  });

  useEffect(() => {
    const intervall = setInterval(() => {
      ContractDataFreshness[Contracts.DebtToken.JUSD].priceUSD.fetch(debtTokenContract!, borrower);
    }, 1000 * 10);

    return () => {
      clearInterval(intervall);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <ApolloProvider client={client}>{children}</ApolloProvider>;
}
