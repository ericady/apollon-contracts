'use client';

import { useQuery } from '@apollo/client';
import { GetAllDebtTokensQuery } from '../generated/gql-types';
import { GET_ALL_DEBT_TOKENS } from '../queries';

function Test() {
  const { data, refetch } = useQuery<GetAllDebtTokensQuery>(GET_ALL_DEBT_TOKENS);

  console.log('data: ', data);

  return (
    <>
      <div data-test-id="test">Learn React</div>
      <button onClick={() => refetch()}>Refetch</button>
    </>
  );
}

export default Test;
