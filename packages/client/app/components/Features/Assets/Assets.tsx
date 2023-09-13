'use client';

import { useQuery } from '@apollo/client';
import { IconButton, Typography } from '@mui/material';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { useEffect, useMemo, useState } from 'react';
import { SelectedToken, useSelectedToken } from '../../../context/SelectedTokenProvider';
import { GetAllPoolsQuery, GetAllPoolsQueryVariables } from '../../../generated/gql-types';
import { GET_ALL_POOLS } from '../../../queries';
import { displayPercentage, roundCurrency, stdFormatter } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DirectionIcon from '../../Icons/DirectionIcon';
import HeaderCell from '../../Table/HeaderCell';

export const FAVORITE_ASSETS_LOCALSTORAGE_KEY = 'favoriteAssets';
// FIXME: Hardcode address for stability once its there.
export const JUSD_SYMBOL = 'JUSD';

function Assets() {
  const [favoritedAssets, setFavoritedAssets] = useState<string[]>([]);

  // FIXME: Cant access LS in useState initializer because of page pre-rendering.
  useEffect(() => {
    setFavoritedAssets(JSON.parse(window.localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]'));
  }, []);

  const { selectedToken, setSelectedToken } = useSelectedToken();

  const { data } = useQuery<GetAllPoolsQuery, GetAllPoolsQueryVariables>(GET_ALL_POOLS);

  const tokens = useMemo<SelectedToken[] | undefined>(() => {
    const jUSDPools =
      data?.getPools.filter(({ liquidity }) => {
        const [tokenA, tokenB] = liquidity;
        return tokenA.token.symbol === JUSD_SYMBOL || tokenB.token.symbol === JUSD_SYMBOL;
      }) ?? [];

    // get token address from local storage and set isFavorite if it is present
    return jUSDPools
      .map(({ liquidity, openingFee }) => {
        const [tokenA, tokenB] = liquidity;
        const token = tokenA.token.symbol === JUSD_SYMBOL ? tokenB.token : tokenA.token;

        return {
          ...token,
          openingFee,
          // calculate change over last 24h
          change: (token.priceUSD - token.priceUSD24hAgo) / token.priceUSD24hAgo,
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
    <FeatureBox
      title="Assets"
      noPadding
      border="bottom"
      isDraggable={{ y: '0', gsHeight: '22', gsWidth: '1', id: 'apollon-assets-widget' }}
    >
      <TableContainer sx={{ maxHeight: 170, overflowY: 'scroll' }}>
        <Table stickyHeader size="small">
          <TableHead sx={{ borderBottom: '1px solid', borderBottomColor: 'background.paper' }}>
            <TableRow>
              <HeaderCell title="Type" cellProps={{ sx: { p: 0.5, pl: 2 } }} />
              <HeaderCell title="$" cellProps={{ align: 'right', sx: { p: 0.5 } }} />
              <HeaderCell title="OF %" cellProps={{ align: 'right', sx: { p: 0.5 } }} />
              <HeaderCell title="%" cellProps={{ align: 'right', sx: { p: 0.5 } }} />
              <HeaderCell title="" cellProps={{ sx: { p: 0.5, pr: 2 } }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {tokens.map((token) => {
              const { address, isFavorite, symbol, priceUSD, change, openingFee } = token;

              return (
                <TableRow
                  key={address}
                  hover
                  onClick={() => setSelectedToken(token)}
                  sx={{ cursor: 'pointer', '& .MuiTableCell-root': { borderBottom: 'none' } }}
                  selected={selectedToken?.symbol === symbol}
                >
                  <TableCell sx={{ p: 0.5, pl: 2 }}>
                    <Typography fontWeight={400}>{symbol}</Typography>
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }} align="right">
                    <Typography fontWeight={400}>{stdFormatter.format(priceUSD)}</Typography>
                  </TableCell>
                  <TableCell sx={{ p: 0.5 }} align="right" width={65}>
                    <Typography fontWeight={400} sx={{ color: openingFee > 0 ? 'success.main' : 'error.main' }}>
                      {displayPercentage(openingFee, true)}
                    </Typography>
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{ color: change < 0 ? 'error.main' : 'success.main', p: 0.5 }}
                    width={85}
                  >
                    <div style={{ display: 'flex', alignContent: 'center', justifyContent: 'flex-end', gap: 4 }}>
                      {roundCurrency(change)} <DirectionIcon showIncrease={change > 0} fontSize="small" />
                    </div>
                  </TableCell>
                  <TableCell sx={{ p: 0.5, pr: 2 }} align="right" width={55}>
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
                          height="17"
                          width="15.6"
                          typeof="image/svg+xml"
                        />
                      ) : (
                        <img
                          src="assets/svgs/Pinned_inactive.svg"
                          alt="a grey pin icon with a transparant body"
                          height="17"
                          width="15.6"
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
