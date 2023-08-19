'use client';

import { useQuery } from '@apollo/client';
import { useEffect } from 'react';
import { GetAllDebtTokensQuery } from '../generated/gql-types';
import { GET_ALL_DEBT_TOKENS } from '../queries';

function Test() {
  const { data } = useQuery<GetAllDebtTokensQuery>(GET_ALL_DEBT_TOKENS);

  // Initializes the service worker. TODO: Move it to a proper client-side location later.
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
      import('../../mocks').then((module) => {
        module.default();
      });
    }
  }, []);

  return <div data-test-id="test">Learn React</div>;
}

export default Test;
