'use client';

import { useQuery } from '@apollo/client';
import KeyboardArrowDownOutlinedIcon from '@mui/icons-material/KeyboardArrowDownOutlined';
import KeyboardArrowUpOutlinedIcon from '@mui/icons-material/KeyboardArrowUpOutlined';
import { IconButton } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEffect, useMemo, useState } from 'react';
import { SelectedToken, useSelectedToken } from '../../../context/SelectedTokenProvider';
import { GetDebtTokensQuery, GetDebtTokensQueryVariables } from '../../../generated/gql-types';
import { GET_ALL_DEBT_TOKENS } from '../../../queries';
import { roundCurrency } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import HeaderCell from '../../Table/HeaderCell';

export const FAVORITE_ASSETS_LOCALSTORAGE_KEY = 'favoriteAssets';

function Assets() {
  const [favoritedAssets, setFavoritedAssets] = useState<string[]>([]);

  // FIXME: Cant access LS in useState initializer because of page pre-rendering.
  useEffect(() => {
    setFavoritedAssets(JSON.parse(window.localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]'));
  }, []);

  const { selectedToken, setSelectedToken } = useSelectedToken();

  const { data } = useQuery<GetDebtTokensQuery, GetDebtTokensQueryVariables>(GET_ALL_DEBT_TOKENS);

  const tokens = useMemo<SelectedToken[] | undefined>(() => {
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
      .sort((a) => (a.isFavorite ? -1 : 1));
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
    <FeatureBox title="Assets" noPadding border="bottom">
      <TableContainer sx={{ maxHeight: 170, overflowY: 'scroll' }}>
        <Table stickyHeader size="small">
          <TableHead sx={{ borderBottom: '1px solid', borderBottomColor: 'background.paper' }}>
            <TableRow>
              <HeaderCell title="Type" />
              <HeaderCell title="$" cellProps={{ align: 'right' }} />
              <HeaderCell title="%" cellProps={{ align: 'right' }} />
              <HeaderCell title="" />
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map((token) => {
              const { address, isFavorite, symbol, priceUSD, change } = token;

              return (
                <TableRow
                  key={address}
                  hover
                  onClick={() => setSelectedToken(token)}
                  sx={{ cursor: 'pointer', '& .MuiTableCell-root': { borderBottom: 'none' } }}
                  selected={selectedToken?.symbol === symbol}
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
                      {isFavorite ? (
                        <img
                          src="assets/svgs/Pinned_active.svg"
                          alt="a white pin icon with a transparant body"
                          height="13"
                          width="12"
                          typeof="image/svg+xml"
                        />
                      ) : (
                        <img
                          src="assets/svgs/Pinned_inactive.svg"
                          alt="a grey pin icon with a transparant body"
                          height="13"
                          width="12"
                          typeof="image/svg+xml"
                        />
                      )}
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </FeatureBox>
  );
}

export default Assets;
