'use client';

import { useState } from 'react';
import { GetBorrowerLiquidityPoolsQuery } from '../../../generated/gql-types';
import PageLayout from '../../Layout/PageLayout';
import LiquidityDepositWithdraw from './LiquidityDepositWithdraw';
import LiquidityPoolsTable from './LiquidityPoolsTable';

const LiquidityPool = () => {
  const [selectedPool, setSelectedPool] = useState<GetBorrowerLiquidityPoolsQuery['getPools'][number] | null>(null);

  return (
    <PageLayout>
      <div style={{ width: 'calc(calc(100% - 330px - 330px) * 0.3)', position: 'fixed' }}>
        {selectedPool && <LiquidityDepositWithdraw selectedPool={selectedPool} />}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ width: '70%' }}>
          <LiquidityPoolsTable selectedPool={selectedPool} setSelectedPool={setSelectedPool} />
        </div>
      </div>
    </PageLayout>
  );
};

export default LiquidityPool;
