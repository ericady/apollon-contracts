'use client';

import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import { IconButton } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useState } from 'react';
import FeatureBox from '../../FeatureBox/FeatureBox';
import HeaderCell from '../../Table/HeaderCell';

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
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);

  const toggleFavorite = (symbol: string) => {
    // TODO: To be implemented
  };

  return (
    <FeatureBox title="Assets" noPadding>
      <TableContainer>
        <Table size="small">
          <TableHead sx={{ borderBottom: '1px solid', borderBottomColor: 'background.paper' }}>
            <TableRow>
              <HeaderCell title="Type" />
              <HeaderCell title="$" cellProps={{ align: 'right' }} />
              <HeaderCell title="%" cellProps={{ align: 'right' }} />
              <HeaderCell title="" />
            </TableRow>
          </TableHead>
          <TableBody>
            {DEMO_DATA.map(({ change, isFavorite, price, symbol }) => (
              <TableRow
                key={symbol}
                hover
                onClick={() => setSelectedAsset(symbol)}
                sx={{ cursor: 'pointer', '& .MuiTableCell-root': { borderBottom: 'none' } }}
                selected={selectedAsset === symbol}
              >
                <TableCell>{symbol}</TableCell>
                <TableCell align="right">{price}</TableCell>
                <TableCell align="right" sx={{ color: change < 0 ? 'error.main' : 'success.main' }}>
                  <div style={{ display: 'flex', alignContent: 'center', justifyContent: 'flex-end' }}>
                    {change}
                    {change < 0 ? (
                      <KeyboardArrowDownOutlinedIcon fontSize="small" sx={{ pb: 0.5 }} />
                    ) : (
                      <KeyboardArrowUpOutlinedIcon fontSize="small" sx={{ pb: 0.5 }} />
                    )}
                  </div>
                </TableCell>
                <TableCell align="right">
                  <IconButton sx={{ height: 20, width: 20 }} size="small" onClick={() => toggleFavorite(symbol)}>
                    {isFavorite ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default Assets;
