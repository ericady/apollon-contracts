'use client';

import { useQuery } from '@apollo/client';
import ExpandMoreSharpIcon from '@mui/icons-material/ExpandMoreSharp';
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
import { displayPercentage, percentageChange } from '../../../utils/math';
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
                      }}
                    >
                      <Typography fontWeight={400}>
                        {tokenA.totalAmount}
                        <br />
                        <span
                          style={{
                            color: '#827F8B',
                            fontSize: '11.7px',
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
                      <img
                        src="assets/svgs/Exchange.svg"
                        alt="Arrow indicating trading direction"
                        height="21"
                        typeof="image/svg+xml"
                      />
                    </TableCell>

                    <TableCell align="right">
                      <Typography fontWeight={400}>
                        {tokenB.totalAmount}
                        <br />
                        <span
                          style={{
                            color: '#827F8B',
                            fontSize: '11.7px',
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
                      <div className="flex" style={{ justifyContent: 'flex-end' }}>
                        <Typography variant="caption">{volume24hUSD}$</Typography>
                        <Typography sx={{ color: volumeChange > 0 ? 'success.main' : 'error.main', fontWeight: '400' }}>
                          {displayPercentage(volumeChange)}
                        </Typography>
                        <ExpandMoreSharpIcon
                          sx={{ color: volumeChange > 0 ? 'success.main' : 'error.main', ml: '-5px' }}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
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
