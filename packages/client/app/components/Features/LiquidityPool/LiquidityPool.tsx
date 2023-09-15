'use client';

import { useState } from 'react';
import { GetBorrowerLiquidityPoolsQuery } from '../../../generated/gql-types';
import LiquidityDepositWithdraw from './LiquidityDepositWithdraw';
import LiquidityPoolsTable from './LiquidityPoolsTable';

const LiquidityPool = () => {
  const [selectedPool, setSelectedPool] = useState<GetBorrowerLiquidityPoolsQuery['getPools'][number] | null>(null);

  return (
    <>
      <div style={{ width: 'calc(calc(100% - 15% - 15%) * 0.3)', position: 'fixed' }}>
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
