'use client';

import { useQuery } from '@apollo/client';
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
import { useMemo, useState } from 'react';
import { GetDebtTokensQuery, GetDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_ALL_DEBT_TOKENS } from '../../../queries';
import { roundCurrency } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import HeaderCell from '../../Table/HeaderCell';

export const FAVORITE_ASSETS_LOCALSTORAGE_KEY = 'favoriteAssets';

function Assets() {
  const [selectedAsset, setSelectedAsset] = useState<string | null>(null);
  const [favoritedAssets, setFavoritedAssets] = useState<string[]>(() =>
    JSON.parse(window.localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]'),
  );

  const { data } = useQuery<GetDebtTokensQuery, GetDebtTokensQueryVariables>(GET_ALL_DEBT_TOKENS);

  const tokens = useMemo(() => {
    // get token address from local storage and set isFavorite if it is present
    return data?.getDebtTokens
      .map(({ token, totalSupplyUSD }) => {
        return {
          ...token,
          totalSupplyUSD,
          // calculate change over last 24h
          change: roundCurrency((token.priceUSD - token.priceUSD24hAgo) / token.priceUSD24hAgo),
          isFavorite: favoritedAssets.find((address) => token.address === address) !== undefined ? true : false,
        };
      })
      .sort((a, b) => (a.isFavorite ? -1 : 1));
  }, [data, favoritedAssets]);

  if (!tokens) return null;

  const toggleFavorite = (address: string) => {
    const favoritedAssetsFromLS: string[] = JSON.parse(
      window.localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]',
    );
    const assetIncluded = favoritedAssetsFromLS.includes(address);

    if (assetIncluded) {
      const tokenInListIndex = favoritedAssetsFromLS.findIndex((addressInLS) => addressInLS === address);
      favoritedAssetsFromLS.splice(tokenInListIndex, 1);
      window.localStorage.setItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY, JSON.stringify(favoritedAssetsFromLS));
      setFavoritedAssets(favoritedAssetsFromLS);
    } else {
      favoritedAssetsFromLS.push(address);
      window.localStorage.setItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY, JSON.stringify(favoritedAssetsFromLS));
      setFavoritedAssets(favoritedAssetsFromLS);
    }
  };

  return (
    <FeatureBox title="Assets" noPadding>
      <TableContainer sx={{ maxHeight: 170, overflow: 'scroll' }}>
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
            {tokens.map(({ address, isFavorite, symbol, priceUSD, change }) => (
              <TableRow
                key={address}
                hover
                onClick={() => setSelectedAsset(address)}
                sx={{ cursor: 'pointer', '& .MuiTableCell-root': { borderBottom: 'none' } }}
                selected={selectedAsset === symbol}
              >
                <TableCell>{symbol}</TableCell>
                <TableCell align="right">{priceUSD}</TableCell>
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
                  <IconButton
                    sx={{ height: 20, width: 20 }}
                    size="small"
                    onClick={() => toggleFavorite(address)}
                    disableRipple
                  >
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
