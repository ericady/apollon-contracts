import { Table, TableContainer, Typography } from '@mui/material';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function BalanceTable() {
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
            <TableRow>
              <TableCell>8%</TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.contrastText' }}>11363.21</Typography>
              </TableCell>
              <TableCell>
                <Label variant="none">dAAPL</Label>
              </TableCell>
              <TableCell>45.352,52 $</TableCell>
              <TableCell>534.64 $</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>8%</TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.contrastText' }}>34345.45</Typography>
              </TableCell>
              <TableCell>
                <Label variant="none">dTSLA</Label>
              </TableCell>
              <TableCell>45.352,52 $</TableCell>
              <TableCell>534.64 $</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>8%</TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.contrastText' }}>18632.78</Typography>
              </TableCell>
              <TableCell>
                <Label variant="none">dGLD</Label>
              </TableCell>
              <TableCell>45.352,52 $</TableCell>
              <TableCell>534.64 $</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      <TableContainer sx={{ borderLeft: '2px solid #1E1B27' }}>
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
            <TableRow>
              <TableCell>8%</TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.contrastText' }}>85314.78</Typography>
              </TableCell>
              <TableCell>
                <Label variant="none">BTC</Label>
              </TableCell>
              <TableCell align="right">45.352,52 $</TableCell>
              <TableCell>534.64 $</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>8%</TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.contrastText' }}>65448.78</Typography>
              </TableCell>
              <TableCell>
                <Label variant="none">ETH</Label>
              </TableCell>
              <TableCell align="right">45.352,52 $</TableCell>
              <TableCell>534.64 $</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>8%</TableCell>
              <TableCell align="right">
                <Typography sx={{ color: 'primary.contrastText' }}>19632.78</Typography>
              </TableCell>
              <TableCell>
                <Label variant="none">USDC</Label>
              </TableCell>
              <TableCell align="right">45.352,52 $</TableCell>
              <TableCell>534.64 $</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default BalanceTable;
