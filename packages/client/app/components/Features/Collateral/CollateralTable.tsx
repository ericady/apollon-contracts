import { useQuery } from '@apollo/client';
import Square from '@mui/icons-material/Square';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEthers } from '../../../context/EthersProvider';
import {
  GetBorrowerCollateralTokensQuery,
  GetBorrowerCollateralTokensQueryVariables,
} from '../../../generated/gql-types';
import { GET_BORROWER_COLLATERAL_TOKENS } from '../../../queries';
import { roundCurrency } from '../../../utils/math';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';
import CollateralUpdateDialog from './CollateralUpdateDialog';

function CollateralTable() {
  const { address } = useEthers();

  const { data } = useQuery<GetBorrowerCollateralTokensQuery, GetBorrowerCollateralTokensQueryVariables>(
    GET_BORROWER_COLLATERAL_TOKENS,
    { variables: { borrower: address } },
  );

  if (!data) return null;

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
          <Typography
            variant="body1"
            sx={{ color: '#303A4C', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}
          >
            <span style={{ color: '#1e89da' }}>174 %</span>
            <Square sx={{ color: '#fff', fontSize: '14px' }} />
            Collateral Ratio
          </Typography>

          <CollateralUpdateDialog collateralData={data} />
        </div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell title="Locked" cellProps={{ align: 'right' }} />
                <HeaderCell title="Avaiable" cellProps={{ align: 'right' }} />
                <HeaderCell title="Symbol" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {data.getCollateralTokens.map(({ token, troveLockedAmount, stabilityGainedAmount }) => (
                <TableRow key={token.address}>
                  <TableCell>
                    <div className="flex">
                      <Square
                        sx={{
                          color: '#33B6FF',
                          fontSize: '14px',
                        }}
                      />
                      <Typography sx={{ color: 'primary.contrastText' }}>
                        {roundCurrency(troveLockedAmount!, 5)}
                      </Typography>
                    </div>
                  </TableCell>
                  <TableCell align="right">{roundCurrency(stabilityGainedAmount! - troveLockedAmount!, 5)}</TableCell>
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
