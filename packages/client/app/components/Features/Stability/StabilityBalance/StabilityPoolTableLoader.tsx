import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { BUTTON_BORDER } from '../../../../theme';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import HeaderCell from '../../../Table/HeaderCell';

function StabilityPoolTableLoader() {
  return (
    <FeatureBox title="Stability Pool" noPadding border="full" borderRadius>
      <div className="apollon-table-txt" style={{ display: 'flex', alignItems: 'center' }}>
        <TableContainer>
          <Table sx={{ borderRight: '1px solid', borderColor: BUTTON_BORDER }}>
            <TableHead>
              <TableRow>
                <HeaderCell title="Lost Stability" cellProps={{ align: 'right' }} />
                <HeaderCell title="Gained collateral" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
        <div style={{ minWidth: 190, margin: '0 30px' }}>
          <Button variant="contained">History</Button>

          <div style={{ marginTop: '10px' }}>
            <Button variant="outlined">UPDATE</Button>
          </div>

          <Button variant="outlined" sx={{ marginTop: '10px' }}>
            CLAIM
          </Button>
        </div>
      </div>
    </FeatureBox>
  );
}

export default StabilityPoolTableLoader;
