'use client';

import { useQuery } from '@apollo/client';
import ExpandMoreSharpIcon from '@mui/icons-material/ExpandMoreSharp';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import Typography from '@mui/material/Typography';
import { Fragment } from 'react';
import { useEthers } from '../../../context/EthersProvider';
import {
  GetBorrowerLiquidityPoolsQuery,
  GetBorrowerLiquidityPoolsQueryVariables,
  GetLiquidityPoolsQuery,
  GetLiquidityPoolsQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_LIQUIDITY_POOLS, GET_LIQUIDITY_POOLS } from '../../../queries';
import { percentageChange } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

type Props = {
  selectedPool: GetLiquidityPoolsQuery['getPools'][number] | null;
  setSelectedPool: (pool: GetLiquidityPoolsQuery['getPools'][number] | null) => void;
};

function LiquidityPoolsTable({ selectedPool, setSelectedPool }: Props) {
  const { address } = useEthers();

  const { data: allPoolsData } = useQuery<GetLiquidityPoolsQuery, GetLiquidityPoolsQueryVariables>(GET_LIQUIDITY_POOLS);
  const { data: borrowerPoolsData } = useQuery<GetBorrowerLiquidityPoolsQuery, GetBorrowerLiquidityPoolsQueryVariables>(
    GET_BORROWER_LIQUIDITY_POOLS,
    { variables: { borrower: address } },
  );

  if (!allPoolsData || !borrowerPoolsData) return null;

  // filter out all the pools in borrowerPoolsData.getPools that are already included in borrowerPoolsData.getPools.
  const allPoolsCombined = borrowerPoolsData.getPools.concat(
    allPoolsData.getPools.filter(
      (allPool) => !borrowerPoolsData.getPools.find((borrowerPool) => allPool.id === borrowerPool.id),
    ),
  );
  // move the pool with selectedPool to the top of the list
  if (selectedPool) {
    const index = allPoolsCombined.findIndex((pool) => pool.id === selectedPool.id);
    const selectedPoolItem = allPoolsCombined[index];
    allPoolsCombined.splice(index, 1);
    allPoolsCombined.unshift(selectedPoolItem);
  }

  return (
    <FeatureBox title="Pools" noPadding headBorder>
      <TableContainer
        sx={{
          borderRight: '1px solid',
          borderLeft: '1px solid',
          borderColor: 'background.paper',
          // screen - toolbar - feature box - padding top - padding bottom
          maxHeight: 'calc(100vh - 64px - 54px - 20px - 20px)',
          overflowY: 'scroll',
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
              <HeaderCell title="24h Volume" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>

          <TableBody>
            {allPoolsCombined.map((pool, index) => {
              const { id, liquidity, volume24hUSD, volume24hUSD24hAgo } = pool;
              const [tokenA, tokenB] = liquidity;
              const volumeChange = percentageChange(volume24hUSD, volume24hUSD24hAgo);

              return (
                <Fragment key={id}>
                  <TableRow
                    hover
                    sx={
                      selectedPool?.id === id
                        ? {
                            background: '#1E1A27',
                            borderLeft: '2px solid #33B6FF',
                            // TODO: Fixed breaks the table style. Have to do it some other way later...
                            position: 'fixed',
                            width: '1230px',
                          }
                        : {
                            ':hover': {
                              cursor: 'pointer',
                            },
                          }
                    }
                    onClick={() => setSelectedPool(pool)}
                  >
                    <TableCell align="right">
                      <Typography fontWeight={400}>
                        {tokenA.totalAmount}
                        <br />
                        <span
                          style={{
                            color: '#827F8B',
                            fontSize: '12px',
                          }}
                        >
                          {tokenA.borrowerAmount}
                        </span>
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Label variant="none">{tokenA.token.symbol}</Label>
                    </TableCell>

                    <TableCell align="right">
                      <SwapHorizIcon />
                    </TableCell>

                    <TableCell align="right">
                      <Typography fontWeight={400}>
                        {tokenB.totalAmount}
                        <br />
                        <span
                          style={{
                            color: '#827F8B',
                            fontSize: '12px',
                          }}
                        >
                          {tokenB.borrowerAmount}
                        </span>
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <Label variant="none">{tokenB.token.symbol}</Label>
                    </TableCell>

                    <TableCell>
                      <div className="flex">
                        <Typography variant="body2">{volume24hUSD}$</Typography>
                        <Typography sx={{ color: volumeChange > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}>
                          {volumeChange}%
                        </Typography>
                        <ExpandMoreSharpIcon
                          sx={{ color: volumeChange > 0 ? 'success.main' : 'error.main', ml: '-5px' }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>

                  {index === 0 && selectedPool && <TableRow sx={{ height: 64 }}></TableRow>}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default LiquidityPoolsTable;
