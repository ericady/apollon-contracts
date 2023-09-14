import { Skeleton, Table, TableContainer } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import HeaderCell from '../../Table/HeaderCell';

function BalanceTableLoader() {
  return (
    <div style={{ display: 'flex' }}>
      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="%" />
              <HeaderCell title="Amount" cellProps={{ align: 'right' }} />
              <HeaderCell title="Symbol" />
              <HeaderCell title="Value" cellProps={{ align: 'right' }} />
              <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {Array(9)
              .fill(null)
              .map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell width={50}>
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer sx={{ borderLeft: '1px solid', borderColor: 'background.paper' }}>
        <Table>
          <TableHead>
            <TableRow>
              <HeaderCell title="%" />
              <HeaderCell title="Amount" cellProps={{ align: 'right' }} />
              <HeaderCell title="Symbol" />
              <HeaderCell title="Value" cellProps={{ align: 'right' }} />
              <HeaderCell title="Price" cellProps={{ align: 'right' }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {Array(9)
              .fill(null)
              .map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell width={50}>
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" />
                  </TableCell>
                  <TableCell align="right">
                    <Skeleton variant="text" />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default BalanceTableLoader;
