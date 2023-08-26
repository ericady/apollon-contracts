import Square from '@mui/icons-material/Square';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import Label from '../../Label/Label';
import HeaderCell from '../../Table/HeaderCell';

function CollateralTable() {
  return (
    <div style={{ display: 'flex' }}>
      <div style={{ width: '40%' }}></div>
      <div style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 0px',
          }}
        >
          <Typography
            variant="body1"
            sx={{ color: '#303A4C', fontSize: '24px', display: 'flex', alignItems: 'center', gap: '15px' }}
          >
            <span style={{ color: '#1e89da' }}>174 %</span>
            <Square sx={{ color: '#fff', fontSize: '14px' }} />
            Collateral Ratio
          </Typography>
          <Button
            variant="outlined"
            sx={{
              width: 'auto',
              padding: '0 50px',
            }}
          >
            UPDATE
          </Button>
        </div>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <HeaderCell title="Locked" cellProps={{ align: 'right' }} />
                <HeaderCell title="Avaiable" cellProps={{ align: 'right' }} />
                <HeaderCell title="Symbol" cellProps={{ align: 'right' }} />
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Typography sx={{ color: 'primary.contrastText' }}>
                    <div className="flex">
                      <Square
                        sx={{
                          color: '#33B6FF',
                          fontSize: '14px',
                        }}
                      />
                      3.03656
                    </div>
                  </Typography>
                </TableCell>
                <TableCell align="right">1,35644</TableCell>
                <TableCell align="right">
                  <Label variant="none">BTC</Label>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography sx={{ color: 'primary.contrastText' }}>
                    <div className="flex">
                      <Square
                        sx={{
                          color: '#E04A4A',
                          fontSize: '14px',
                        }}
                      />
                      0.00143
                    </div>
                  </Typography>
                </TableCell>
                <TableCell align="right">18,44356</TableCell>
                <TableCell align="right">
                  <Label variant="none">ETH</Label>
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>
                  <Typography sx={{ color: 'primary.contrastText' }}>
                    <div className="flex">
                      <Square
                        sx={{
                          color: '#3DD755',
                          fontSize: '14px',
                        }}
                      />
                      345.423,34563
                    </div>
                  </Typography>
                </TableCell>
                <TableCell align="right">3.481,84567</TableCell>
                <TableCell align="right">
                  <Label variant="none">Jelly</Label>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </div>
    </div>
  );
}

export default CollateralTable;
