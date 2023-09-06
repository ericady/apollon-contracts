import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FeatureBox from '../../../FeatureBox/FeatureBox';
import HeaderCell from '../../../Table/HeaderCell';

const CollateralTokenTableLoader = () => {
  return (
    <FeatureBox title="Collateral Token" noPadding border="full" borderRadius>
      <div className="apollon-table-txt">
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell title="Wallet" cellProps={{ align: 'right' }} />
                <HeaderCell title="Your Trove" cellProps={{ align: 'right' }} />
                <HeaderCell title="Token" cellProps={{ align: 'right' }} />
                <HeaderCell title="TVL" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
                <TableCell align="right"></TableCell>
              </TableRow>
              <TableRow>
                <TableCell align="right" style={{ padding: '2px' }}></TableCell>
                <TableCell align="right" style={{ padding: '2px' }}>
                  <Button>UPDATE</Button>
                </TableCell>
                <TableCell align="right" style={{ padding: '2px' }}></TableCell>
                <TableCell align="right" style={{ padding: '2px' }}></TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </FeatureBox>
  );
};

export default CollateralTokenTableLoader;
