'use client';

import { useState } from 'react';
import { GetBorrowerLiquidityPoolsQuery } from '../../../generated/gql-types';
import LiquidityDepositWithdraw from './LiquidityDepositWithdraw';
import LiquidityPoolsTable from './LiquidityPoolsTable';

const LiquidityPool = () => {
  const [selectedPool, setSelectedPool] = useState<GetBorrowerLiquidityPoolsQuery['pools'][number] | null>(null);

  return (
    <>
      <div style={{ width: 'calc(1350px * 0.3)', position: 'fixed' }}>
        {selectedPool && <LiquidityDepositWithdraw selectedPool={selectedPool} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '70%' }}>
          <LiquidityPoolsTable selectedPool={selectedPool} setSelectedPool={setSelectedPool} />
        </div>
      </div>
    </>
  );
};

export default LiquidityPool;
