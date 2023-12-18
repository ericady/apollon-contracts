'use client';

import { useQuery } from '@apollo/client';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import Typography from '@mui/material/Typography';
import { useEffect, useMemo } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import {
  GetBorrowerLiquidityPoolsQuery,
  GetBorrowerLiquidityPoolsQueryVariables,
  GetLiquidityPoolsQuery,
  GetLiquidityPoolsQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_LIQUIDITY_POOLS, GET_LIQUIDITY_POOLS } from '../../../queries';
import { displayPercentage, percentageChange, roundCurrency, stdFormatter } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DirectionIcon from '../../Icons/DirectionIcon';
import ExchangeIcon from '../../Icons/ExchangeIcon';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import LiquidityPoolsTableLoader from './LiquidityPoolsTableLoader';

type Props = {
  selectedPool: GetLiquidityPoolsQuery['getPools'][number] | null;
  setSelectedPool: (pool: GetLiquidityPoolsQuery['getPools'][number] | null) => void;
};

function LiquidityPoolsTable({ selectedPool, setSelectedPool }: Props) {
  const { address } = useEthers();

  const { data: allPoolsData } = useQuery<GetLiquidityPoolsQuery, GetLiquidityPoolsQueryVariables>(GET_LIQUIDITY_POOLS);
  const { data: borrowerPoolsData, loading } = useQuery<
    GetBorrowerLiquidityPoolsQuery,
    GetBorrowerLiquidityPoolsQueryVariables
  >(GET_BORROWER_LIQUIDITY_POOLS, { variables: { borrower: address }, skip: !address });

  // filter out all the pools in borrowerPoolsData.getPools that are already included in borrowerPoolsData.getPools.
  const allPoolsCombined: GetBorrowerLiquidityPoolsQuery['getPools'] = useMemo(
    () =>
      borrowerPoolsData
        ? borrowerPoolsData.getPools.concat(
            allPoolsData?.getPools.filter(
              (allPool) => !borrowerPoolsData.getPools.find((borrowerPool) => allPool.id === borrowerPool.id),
            ) ?? [],
          )
        : allPoolsData?.getPools ?? [],
    [allPoolsData, borrowerPoolsData],
  );

  useEffect(() => {
    // Select first pool by default
    if (allPoolsCombined.length > 0) {
      setSelectedPool(allPoolsCombined[0]);
    }
  }, [allPoolsCombined, setSelectedPool]);

  if (!allPoolsData || (!borrowerPoolsData && loading)) return <LiquidityPoolsTableLoader />;

  return (
    <FeatureBox title="Pools" noPadding headBorder="full">
      <TableContainer
        sx={{
          borderRight: '1px solid',
          borderLeft: '1px solid',
          borderColor: 'background.paper',
          // // screen - toolbar - feature box - padding top - padding bottom
          // maxHeight: 'calc(100vh - 64px - 54px - 20px - 20px)',
          // overflowY: 'scroll',
        }}
      >
        <Table stickyHeader>
          <TableHead>
            <TableRow>
              <HeaderCell title="Asset" cellProps={{ width: 1 }} />
              <HeaderCell title="" />
              <HeaderCell title="" />
              <HeaderCell title="" cellProps={{ align: 'right' }} />
              <HeaderCell title="" />
              <HeaderCell title="APY" cellProps={{ align: 'right' }} />
              <HeaderCell title="30d Volume" cellProps={{ align: 'right', colSpan: 2 }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {allPoolsCombined.map((pool) => {
              const { id, liquidity, volume30dUSD, volume30dUSD30dAgo, liquidityDepositAPY } = pool;
              const [tokenA, tokenB] = liquidity;
              const volumeChange = percentageChange(volume30dUSD, volume30dUSD30dAgo);

              return (
                <TableRow
                  key={id}
                  data-testid="apollon-liquidity-pool-table-row"
                  hover={selectedPool?.id !== id}
                  selected={selectedPool?.id === id}
                  sx={{
                    ':hover': {
                      cursor: selectedPool?.id !== id ? 'pointer' : 'default',
                    },
                  }}
                  onClick={() => setSelectedPool(pool)}
                >
                  <TableCell
                    align="right"
                    sx={{
                      borderLeft: selectedPool?.id === id ? '2px solid #33B6FF' : 'none',
                      pl: selectedPool?.id === id ? 0 : 2,
                    }}
                  >
                    <Typography fontWeight={400}>
                      {roundCurrency(tokenA.totalAmount, 5)}
                      <br />
                      <span
                        data-testid="apollon-liquidity-pool-table-row-borrower-amount-token-a"
                        style={{
                          color: '#827F8B',
                          fontSize: '11.7px',
                        }}
                      >
                        {!isNaN(tokenA.borrowerAmount!) ? roundCurrency(tokenA.borrowerAmount!) : 0}
                      </span>
                    </Typography>
                  </TableCell>

                  <TableCell sx={{ pl: 0, width: '50px', maxWidth: '200px' }} align="right">
                    <Label variant="none">{tokenA.token.symbol}</Label>
                  </TableCell>

                  <TableCell align="center" width={200}>
                    <ExchangeIcon />
                  </TableCell>

                  <TableCell sx={{ pr: 0, width: '50px', maxWidth: '200px' }}>
                    <Typography fontWeight={400}>
                      {roundCurrency(tokenB.totalAmount, 5)}
                      <br />
                      <span
                        data-testid="apollon-liquidity-pool-table-row-borrower-amount-token-b"
                        style={{
                          color: '#827F8B',
                          fontSize: '11.7px',
                        }}
                      >
                        {!isNaN(tokenB.borrowerAmount!) ? roundCurrency(tokenB.borrowerAmount!) : 0}
                      </span>
                    </Typography>
                  </TableCell>

                  <TableCell>
                    <Label variant="none">{tokenB.token.symbol}</Label>
                  </TableCell>
                  <TableCell align="right">{displayPercentage(liquidityDepositAPY)}</TableCell>

                  <TableCell align="right" sx={{ pr: 0, pl: 1, width: '50px', maxWidth: '200px' }}>
                    <Typography variant="caption" noWrap>
                      {stdFormatter.format(volume30dUSD)} $
                    </Typography>
                  </TableCell>
                  <TableCell align="right" width={125}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography
                        sx={{
                          color: volumeChange > 0 ? 'success.main' : 'error.main',
                        }}
                        fontWeight={400}
                      >
                        {displayPercentage(volumeChange, 'positive')}
                      </Typography>
                      <DirectionIcon showIncrease={volumeChange > 0} />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default LiquidityPoolsTable;
