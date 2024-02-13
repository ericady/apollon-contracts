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
import {
  GetAllPoolsQuery,
  GetAllPoolsQueryVariables,
  GetPastTokenPricesQuery,
  GetPastTokenPricesQueryVariables,
} from '../../../generated/gql-types';
import { GET_ALL_POOLS, GET_TOKEN_PRICES_24h_AGO } from '../../../queries';
import { WIDGET_HEIGHTS } from '../../../utils/contants';
import { getCheckSum } from '../../../utils/crypto';
import {
  bigIntStringToFloat,
  dangerouslyConvertBigIntToNumber,
  displayPercentage,
  divBigIntsToFloat,
  roundCurrency,
} from '../../../utils/math';
import FeatureBox from '../../FeatureBox/FeatureBox';
import DirectionIcon from '../../Icons/DirectionIcon';
import PinnedIcon from '../../Icons/PinnedIcon';
import HeaderCell from '../../Table/HeaderCell';
import AssetsLoader from './AssetsLoader';
import { Contracts } from '../../../context/contracts.config';

export const FAVORITE_ASSETS_LOCALSTORAGE_KEY = 'favoriteAssets';
// FIXME: Hardcode address for stability once its there.
export const JUSD_SYMBOL = 'JUSD';

function Assets() {
  const [favoritedAssets, setFavoritedAssets] = useState<string[]>([]);

  // FIXME: Cant access LS in useState initializer because of page pre-rendering.
  useEffect(() => {
    setFavoritedAssets(JSON.parse(window.localStorage.getItem(FAVORITE_ASSETS_LOCALSTORAGE_KEY) ?? '[]'));
  }, []);

  const { selectedToken, setSelectedToken, JUSDToken } = useSelectedToken();

  // TODO: Implement a filter for only JUSD to subgraph
  const { data } = useQuery<GetAllPoolsQuery, GetAllPoolsQueryVariables>(GET_ALL_POOLS);
  const { data: pastTokenPrices } = useQuery<GetPastTokenPricesQuery, GetPastTokenPricesQueryVariables>(
    GET_TOKEN_PRICES_24h_AGO,
  );

  const tokens = useMemo<SelectedToken[]>(() => {
    const jUSDPools =
      data?.pools.filter(({ liquidity }) => {
        const [tokenA, tokenB] = liquidity;

        return (
          getCheckSum(tokenA.token.address) === getCheckSum(Contracts.DebtToken.STABLE) ||
          getCheckSum(tokenB.token.address) === getCheckSum(Contracts.DebtToken.STABLE)
        );
      }) ?? [];

    // get token address from local storage and set isFavorite if it is present
    return jUSDPools
      .map<SelectedToken>(({ id, address, liquidity, swapFee, volume30dUSD }) => {
        const [tokenA, tokenB] = liquidity;
        const token =
          getCheckSum(tokenA.token.address) === getCheckSum(Contracts.DebtToken.STABLE) ? tokenB.token : tokenA.token;

        const pastToken = pastTokenPrices?.tokenCandles.find(
          ({ token: pastToken }) => token.address === pastToken.address,
        );
        const pastPrice = pastToken?.close ? BigInt(pastToken?.close) : BigInt(0);

        return {
          ...token,
          priceUSD: BigInt(token.priceUSD),
          priceUSD24hAgo: pastPrice,
          swapFee: BigInt(swapFee),
          // calculate change over last 24h
          change:
            (bigIntStringToFloat(token.priceUSD) - dangerouslyConvertBigIntToNumber(pastPrice, 9, 9)) /
            dangerouslyConvertBigIntToNumber(pastPrice, 9, 9),
          isFavorite: favoritedAssets.find((address) => token.address === address) !== undefined ? true : false,
          volume30dUSD: BigInt(volume30dUSD.value),
          pool: {
            id,
            address,
            liqudityPair:
              getCheckSum(tokenA.token.address) === getCheckSum(Contracts.DebtToken.STABLE)
                ? [BigInt(tokenA.totalAmount), BigInt(tokenB.totalAmount)]
                : [BigInt(tokenB.totalAmount), BigInt(tokenA.totalAmount)],
          },
        };
      })
      .sort((a) => (a.isFavorite ? -1 : 1));
  }, [data, favoritedAssets, pastTokenPrices]);

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
                <HeaderCell title="jUSD" cellProps={{ align: 'right', sx: { p: 0.5 } }} />
                <HeaderCell
                  title="SF %"
                  cellProps={{ align: 'right', sx: { p: 0.5 } }}
                  tooltipProps={{
                    title: 'Dynamic swap fee, which is based on the difference between oracle and DEX price.',
                    arrow: true,
                    placement: 'right',
                  }}
                />
                <HeaderCell
                  title="24h"
                  cellProps={{ align: 'right', sx: { p: 0.5 } }}
                  tooltipProps={{
                    title: '24h price movement.',
                    arrow: true,
                    placement: 'right',
                  }}
                />
                <HeaderCell title="" cellProps={{ sx: { p: 0.5, pr: 2 } }} />
              </TableRow>
            </TableHead>
            <TableBody>
              {tokens.map((token) => {
                const { address, isFavorite, symbol, priceUSD, change, swapFee } = token;

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
                      <Typography fontWeight={400}>
                        {JUSDToken ? roundCurrency(divBigIntsToFloat(priceUSD, BigInt(JUSDToken.priceUSD), 5)) : '-'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ p: 0.5 }} align="right" width={60}>
                      <Typography fontWeight={400} sx={{ color: swapFee < 0 ? 'success.main' : 'error.main' }}>
                        {displayPercentage(dangerouslyConvertBigIntToNumber(swapFee, 0, 6), 'omit')}
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
                        {displayPercentage(change, 'omit')} <DirectionIcon showIncrease={change > 0} fontSize="small" />
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
