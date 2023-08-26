import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function HistoryTable() {
  return (
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <HeaderCell title="Opening" />
            <HeaderCell title="Type" />
            <HeaderCell title="Size" cellProps={{ align: 'right' }} />
            <HeaderCell title="Total position" cellProps={{ align: 'right' }} />
            <HeaderCell title="Price per unit" cellProps={{ align: 'right' }} />
            <HeaderCell title="Fee" cellProps={{ align: 'right' }} />
            <HeaderCell title="PNL" cellProps={{ align: 'right' }} />
          </TableRow>
        </TableHead>
        <TableBody>
          <TableRow>
            <TableCell>12.06.2023 12:34 (-12d)</TableCell>
            <TableCell>
              <Label variant="success">Long</Label>
            </TableCell>
            <TableCell align="right">
              <div className="flex">
                <Typography sx={{ color: 'primary.contrastText' }}>18,54453</Typography>
                <Label variant="none">dAAPL</Label>
              </div>
            </TableCell>
            <TableCell align="right">
              <div className="flex">
                <Typography sx={{ color: 'primary.contrastText' }}>34.345,45</Typography>

                <Label variant="none">jUSD</Label>
              </div>
            </TableCell>
            <TableCell align="right">453,45 jUSD</TableCell>
            <TableCell align="right">0.00036 jUSD </TableCell>
            <TableCell align="right">
              <div className="flex">
                <Typography sx={{ color: 'success.main', fontWeight: '400' }}>5.624,65 jUSD</Typography>
                <Typography sx={{ color: 'success.main', fontWeight: '400' }}>3.43 %</Typography>
              </div>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell>06.06.2023 12:24 (-18d)</TableCell>
            <TableCell>
              <Label variant="error">Short</Label>
            </TableCell>
            <TableCell align="right">
              <div className="flex">
                <Typography sx={{ color: 'primary.contrastText' }}>23,5432</Typography>
                <Label variant="none">dAAPL</Label>
              </div>
            </TableCell>
            <TableCell align="right">
              <div className="flex">
                <Typography sx={{ color: 'primary.contrastText' }}>54.523,12</Typography>
                <Label variant="none">jUSD</Label>
              </div>
            </TableCell>
            <TableCell align="right">399,23 jUSD</TableCell>
            <TableCell align="right">0.00021 jUSD</TableCell>
            <TableCell align="right">
              <div className="flex">
                <Typography sx={{ color: 'error.main', fontWeight: '400' }}>3.122,16 jUSD</Typography>
                <Typography sx={{ color: 'error.main', fontWeight: '400' }}>-1.16 %</Typography>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default HistoryTable;
