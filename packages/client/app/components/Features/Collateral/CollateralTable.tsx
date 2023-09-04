import { useQuery } from '@apollo/client';
import Square from '@mui/icons-material/Square';
import { Box } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEthers } from '../../../context/EthersProvider';
import { GetCollateralTokensQuery, GetCollateralTokensQueryVariables } from '../../../generated/gql-types';
import { GET_ALL_COLLATERAL_TOKENS } from '../../../queries';
import { roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import CollateralUpdateDialog from './CollateralUpdateDialog';

function CollateralTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetCollateralTokensQuery, GetCollateralTokensQueryVariables>(GET_ALL_COLLATERAL_TOKENS, {
    variables: { borrower: address },
  });

  if (!data) return null;

  const borrowerCollateralTokens = data.getCollateralTokens.filter((token) => token.walletAmount! > 0);

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '40%' }}></div>
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <Typography
              sx={{ fontFamily: 'Space Grotesk Variable', color: 'info.main', fontWeight: '700', fontSize: '20px' }}
            >
              174 %
            </Typography>

            <img
              src="assets/svgs/Star24_white.svg"
              alt="White colored diamond shape"
              height="11"
              typeof="image/svg+xml"
            />

            <Typography variant="h4">Collateral Ratio</Typography>
          </Box>

          <CollateralUpdateDialog collateralData={data} buttonVariant="outlined" />
        </div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell title="Trove" cellProps={{ align: 'right' }} />
                <HeaderCell title="Wallet" cellProps={{ align: 'right' }} />
                <HeaderCell title="Symbol" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {borrowerCollateralTokens.map(({ token, walletAmount, troveLockedAmount }) => (
                <TableRow key={token.address}>
                  <TableCell align="right">
                    <div className="flex">
                      <Square
                        sx={{
                          color: 'info.main',
                          fontSize: '14px',
                        }}
                      />
                      <Typography color="primary.contrastText" fontSize={14.3}>
                        {roundCurrency(troveLockedAmount!, 5)}
                      </Typography>
                    </div>
                  </TableCell>
                  <TableCell align="right">{roundCurrency(walletAmount!, 5)}</TableCell>
                  <TableCell align="right">
                    <Label variant="none">{token.symbol}</Label>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

export default CollateralTable;
