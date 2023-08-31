import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DiagramPlaceholder from '../../Loader/DiagramPlaceholder';

const CollateralBalance = () => {
  return (
    <FeatureBox title="Collateral" headBorder="bottom">
      <div style={{ display: 'flex' }}>
        <div style={{ width: '25%', padding: '20px 10px 0 0' }}>
          <FeatureBox title="Total value locked" border>
            <DiagramPlaceholder />
          </FeatureBox>
        </div>
        <div style={{ width: '75%', padding: '20px 0 0 10px' }}>
          <FeatureBox title="Collateral Token" noPadding border>
            <div className="apollon-table">
              <div className="apollon-table-box">
                <div className="apollon-table-txt">
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell className="table-hdng">Wallet</TableCell>
                          <TableCell className="table-hdng">Your Trove</TableCell>
                          <TableCell className="table-hdng">Token</TableCell>
                          <TableCell className="table-hdng">TVL</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell></TableCell>
                          <TableCell>
                            <Button>UPDATE</Button>
                          </TableCell>
                          <TableCell></TableCell>
                          <TableCell></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </div>
            </div>
          </FeatureBox>
        </div>
      </div>
    </FeatureBox>
  );
};

export default CollateralBalance;
