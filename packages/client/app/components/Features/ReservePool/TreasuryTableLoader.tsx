import { Skeleton } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FeatureBox from '../../FeatureBox/FeatureBox';
import HeaderCell from '../../Table/HeaderCell';

function TreasuryTableLoader() {
  return (
    <FeatureBox title="Treasury" noPadding border="full" borderRadius>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="Deposited Token" cellProps={{ align: 'right' }} />
              <HeaderCell title="Last 24h Difference" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
              <TableCell align="right">
                <Skeleton variant="text" />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default TreasuryTableLoader;
