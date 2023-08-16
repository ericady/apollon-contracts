'use client';

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import FeatureBox from '../../FeatureBox/FeatureBox';

const DEMO_DATA = [
  {
    symbol: 'ISLA',
    price: 2398,
    change: 3.16,
    isFavorite: true,
  },
  {
    symbol: 'GKD',
    price: 13313,
    change: -9.18,
    isFavorite: true,
  },
  {
    symbol: 'AAPL',
    price: 4530,
    change: -6.23,
    isFavorite: false,
  },
  {
    symbol: 'ISLA',
    price: 2398,
    change: 3.47,
    isFavorite: false,
  },
  {
    symbol: 'GKD',
    price: 13313,
    change: -9.89,
    isFavorite: false,
  },
];

function Assets() {
  return (
    <FeatureBox title="Assets">
      <TableContainer component={Paper}>
        <Table sx={{ minWidth: 650 }} aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell>Type</TableCell>
              <TableCell align="right">$</TableCell>
              <TableCell align="right">%</TableCell>
              <TableCell></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {DEMO_DATA.map(({ change, isFavorite, price, symbol }) => (
              <TableRow key={symbol}>
                <TableCell>{symbol}</TableCell>
                <TableCell align="right">{price}</TableCell>
                <TableCell align="right">{change}</TableCell>
                <TableCell align="right">{isFavorite ? <PushPinIcon /> : <PushPinOutlinedIcon />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default Assets;
