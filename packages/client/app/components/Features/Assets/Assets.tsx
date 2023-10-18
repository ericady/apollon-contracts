'use client';

import { useQuery } from '@apollo/client';
import { Box, IconButton, Typography } from '@mui/material';
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
import { WIDGET_HEIGHTS } from '../../../utils/contants';
import { displayPercentage, roundCurrency, stdFormatter } from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DirectionIcon from '../../Icons/DirectionIcon';
import PinnedIcon from '../../Icons/PinnedIcon';
import HeaderCell from '../../Table/HeaderCell';
import AssetsLoader from './AssetsLoader';

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

  const tokens = useMemo<SelectedToken[]>(() => {
    const jUSDPools =
      data?.getPools.filter(({ liquidity }) => {
        const [tokenA, tokenB] = liquidity;
        return tokenA.token.symbol === JUSD_SYMBOL || tokenB.token.symbol === JUSD_SYMBOL;
      }) ?? [];

    // get token address from local storage and set isFavorite if it is present
    return jUSDPools
      .map(({ liquidity, openingFee, volume24hUSD }) => {
        const [tokenA, tokenB] = liquidity;
        const token = tokenA.token.symbol === JUSD_SYMBOL ? tokenB.token : tokenA.token;

        return {
          ...token,
          openingFee,
          // calculate change over last 24h
          change: (token.priceUSD - token.priceUSD24hAgo) / token.priceUSD24hAgo,
          isFavorite: favoritedAssets.find((address) => token.address === address) !== undefined ? true : false,
          volume24hUSD,
        };
      })
      .sort((a) => (a.isFavorite ? -1 : 1));
  }, [data, favoritedAssets]);

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

  useEffect(() => {
    if (tokens.length && !selectedToken) {
      // Selectes the first token which is usually a favorited or just the first
      setSelectedToken(tokens[0]);
    }
  }, [tokens, setSelectedToken, selectedToken]);

  return (
    <FeatureBox
      title="Assets"
      noPadding
      border="bottom"
      isDraggable={{
        y: '0',
        gsHeight: WIDGET_HEIGHTS['apollon-assets-widget'].toString(),
        gsWidth: '1',
        id: 'apollon-assets-widget',
      }}
    >
      {tokens.length === 0 ? (
        <AssetsLoader />
      ) : (
        <TableContainer sx={{ maxHeight: 170, overflowY: 'scroll' }}>
          <Table stickyHeader size="small">
            <TableHead sx={{ borderBottom: '1px solid', borderBottomColor: 'background.paper' }}>
              <TableRow>
                <HeaderCell title="Type" cellProps={{ sx: { p: 0.5, pl: 2 } }} />
                <HeaderCell title="$" cellProps={{ align: 'right', sx: { p: 0.5 } }} />
                <HeaderCell
                  title="OF %"
                  cellProps={{ align: 'right', sx: { p: 0.5 } }}
                  tooltipProps={{
                    title: 'Opening Fee, one time fee to open a new position.',
                    arrow: true,
                    placement: 'right',
                  }}
                />
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
                    data-testid="apollon-assets-row"
                    hover
                    onClick={() => setSelectedToken(token)}
                    sx={{ cursor: 'pointer', '& .MuiTableCell-root': { borderBottom: 'none' } }}
                    selected={selectedToken?.address === address}
                  >
                    <TableCell sx={{ p: 0.5, pl: 2 }}>
                      <Typography fontWeight={400}>{symbol}</Typography>
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }} align="right">
                      <Typography fontWeight={400}>{stdFormatter.format(priceUSD)}</Typography>
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }} align="right" width={60}>
                      <Typography fontWeight={400} sx={{ color: openingFee > 0 ? 'success.main' : 'error.main' }}>
                        {displayPercentage(openingFee, 'omit')}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }} align="right" width={80}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignContent: 'center',
                          justifyContent: 'flex-end',
                          gap: 0.5,
                          color: change < 0 ? 'error.main' : 'success.main',
                        }}
                      >
                        {roundCurrency(change)} <DirectionIcon showIncrease={change > 0} fontSize="small" />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ p: 0.5, pr: 2, minWidth: '30px' }} align="right" width={50}>
                      <IconButton
                        data-testid="apollon-assets-favorite"
                        sx={{ height: 20, width: 20 }}
                        size="small"
                        onClick={() => toggleFavorite(address)}
                        disableRipple
                      >
                        <PinnedIcon isFavorite={isFavorite} />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </FeatureBox>
  );
}

export default Assets;
