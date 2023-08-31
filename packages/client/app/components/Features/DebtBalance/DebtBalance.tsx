import { Button } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DiagramPlaceholder from '../../Loader/DiagramPlaceholder';

function DebtBalance() {
  return (
    <FeatureBox title="Collateral" headBorder="bottom">
      <div style={{ display: 'flex', width: '100%' }}>
        <div style={{ display: 'flex', width: '25%', flexWrap: 'wrap', flexDirection: 'column' }}>
          <div style={{ padding: '20px 10px 0 0' }}>
            <FeatureBox title="Total value minted" border="full">
              <DiagramPlaceholder />
            </FeatureBox>
          </div>

          <div style={{ padding: '20px 10px 0 0' }}>
            <FeatureBox title="System collateral ratio" border="full">
              <DiagramPlaceholder />
            </FeatureBox>
          </div>
        </div>

        <div style={{ display: 'flex', width: '75%', flexWrap: 'wrap', flexDirection: 'column' }}>
          <div style={{ padding: '20px 0 0 10px' }}>
            <FeatureBox title="Stability Pool" noPadding border="full">
              <div className="apollon-table">
                <div className="apollon-table-box">
                  <div className="apollon-table-txt" style={{ display: 'flex', alignItems: 'center' }}>
                    <TableContainer>
                      <Table sx={{ borderRight: '1px solid #25222E' }}>
                        <TableHead>
                          <TableRow>
                            <TableCell className="table-hdng">Lost Stability</TableCell>
                            <TableCell className="table-hdng">Gained collateral</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </TableContainer>
                    <div className="apollon-table-btns" style={{ padding: '0 30px' }}>
                      <Button variant="contained">History</Button>
                      <Button variant="outlined" sx={{ marginTop: '10px' }}>
                        UPDATE
                      </Button>
                      <Button variant="outlined" sx={{ marginTop: '10px' }}>
                        CLAIM
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </FeatureBox>
          </div>

          <div style={{ padding: '20px 0 0 10px' }}>
            <FeatureBox title="Debt Token" noPadding border="full">
              <div className="apollon-table">
                <div className="apollon-table-box">
                  <div className="apollon-table-txt">
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell className="table-hdng">Minted</TableCell>
                            <TableCell className="table-hdng">Deposited Stability</TableCell>
                            <TableCell className="table-hdng">Token</TableCell>
                            <TableCell className="table-hdng">Total Supply</TableCell>
                            <TableCell className="table-hdng">Total Stability</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          <TableRow>
                            <TableCell></TableCell>
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
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
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
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
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
                            <TableCell></TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell></TableCell>
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
      </div>
    </FeatureBox>
  );
}

export default DebtBalance;
