import { Button, Skeleton } from '@mui/material';
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
      <div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell title="Wallet" cellProps={{ align: 'right', sx: { borderRight: '1px solid' } }} />
                <HeaderCell title="Your Trove" cellProps={{ align: 'right', sx: { borderRight: '1px solid' } }} />
                <HeaderCell title="Token" />
                <HeaderCell title="TVL" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {Array(4)
                .fill(null)
                .map((_, index) => (
                  <TableRow key={index}>
                    <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'table.border' }}>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'table.border' }}>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'table.border' }}>
                      <Skeleton variant="text" />
                    </TableCell>
                    <TableCell align="right">
                      <Skeleton variant="text" />
                    </TableCell>
                  </TableRow>
                ))}

              <TableRow>
                <TableCell
                  align="right"
                  sx={{ borderRight: '1px solid', borderColor: 'table.border', padding: '2px' }}
                ></TableCell>
                <TableCell align="right" sx={{ borderRight: '1px solid', borderColor: 'table.border', padding: '2px' }}>
                  <Button
                    sx={{
                      width: '100%',
                      p: '6px 8px',
                    }}
                  >
                    Update
                  </Button>
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
