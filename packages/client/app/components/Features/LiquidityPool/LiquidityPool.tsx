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
      <div style={{ display: 'flex' }}>
        <div className="poolwidget-block" style={{ width: '30%' }}>
          <div className="liquidity-block" style={{ border: '1px solid #25222E', borderRadius: '5px 0 0 5px' }}>
            {selectedPool && <LiquidityDepositWithdraw selectedPool={selectedPool} />}
          </div>
        </div>

        <div className="table-styles" style={{ width: '70%' }}>
          <LiquidityPoolsTable selectedPool={selectedPool} setSelectedPool={setSelectedPool} />
        </div>
      </div>
    </PageLayout>
  );
};

export default LiquidityPool;
