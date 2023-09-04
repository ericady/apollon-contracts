import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DiagramPlaceholder from '../../Loader/DiagramPlaceholder';
import HeaderCell from '../../Table/HeaderCell';

function ReservePool() {
  return (
    <FeatureBox title="Reserve Pool" headBorder="bottom" icon="green">
      <div style={{ display: 'flex' }}>
        <div style={{ padding: '20px 10px 0 0' }}>
          <FeatureBox title="Reserve Pool value" border="full" noPadding>
            <DiagramPlaceholder />
          </FeatureBox>
        </div>
        <div style={{ width: '100%', padding: '20px 0 0 10px' }}>
          <FeatureBox title="Treasury" noPadding border="full">
            <div className="apollon-table-txt">
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
                    <TableRow>
                      <TableCell align="right"></TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </FeatureBox>
        </div>
      </div>
    </FeatureBox>
  );
}

export default ReservePool;
