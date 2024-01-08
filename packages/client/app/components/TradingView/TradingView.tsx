'use client';

import { useApolloClient, useQuery } from '@apollo/client';
import { useTheme } from '@mui/material';
import { useEffect, useRef } from 'react';
import { useSelectedToken } from '../../context/SelectedTokenProvider';
import '../../external/charting_library/charting_library';
import {
  DatafeedConfiguration,
  IChartingLibraryWidget,
  LibrarySymbolInfo,
  ResolutionString,
  SubscribeBarsCallback,
} from '../../external/charting_library/charting_library';
import { UDFCompatibleDatafeed } from '../../external/datafeeds/udf/src/udf-compatible-datafeed';
import {
  GetTradingViewCandlesQuery,
  GetTradingViewCandlesQueryVariables,
  GetTradingViewLatestCandleQuery,
  GetTradingViewLatestCandleQueryVariables,
} from '../../generated/gql-types';
import { GET_TRADING_VIEW_CANDLES, GET_TRADING_VIEW_LATEST_CANDLE } from '../../queries';
import TradingViewHeader from './TradingViewHeader';

const devMode = process.env.NEXT_PUBLIC_API_MOCKING === 'enabled';

function TradingViewComponent() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  const client = useApolloClient();

  const updateLatestCandleCallback = useRef<SubscribeBarsCallback>();
  const currentChart = useRef<IChartingLibraryWidget>();

  const { selectedToken } = useSelectedToken();

  const { data } = useQuery<GetTradingViewLatestCandleQuery, GetTradingViewLatestCandleQueryVariables>(
    GET_TRADING_VIEW_LATEST_CANDLE,
    {
      // TODO: That is right around the block time but use Subscriptions instead
      pollInterval: 30000,
      skip: !selectedToken,
      variables: {
        id: `TokenCandleSingleton-${selectedToken?.address}-60`,
      },
      fetchPolicy: 'network-only',
    },
  );

  useEffect(() => {
    if (data && updateLatestCandleCallback.current) {
      const {
        tokenCandleSingleton: { close, high, low, open, timestamp, volume },
      } = data;
      updateLatestCandleCallback.current({ time: timestamp, open, high, low, close, volume });
    }
  }, [data]);

  useEffect(() => {
    if (currentChart.current && selectedToken && !devMode) {
      currentChart.current.setSymbol(selectedToken.symbol, '1D' as ResolutionString, () => {});
    }
  }, [selectedToken]);

  useEffect(() => {
    if (window.TradingView && selectedToken && !currentChart.current) {
      // @ts-ignore
      currentChart.current = new TradingView.widget({
        container: 'apollon-trading-view',
        locale: 'en',
        library_path: 'charting_library/',

        datafeed: devMode
          ? new UDFCompatibleDatafeed('https://demo-feed-data.tradingview.com')
          : {
              getQuotes(symbols, onDataCallback, onErrorCallback) {
                console.log('Quotes', symbols);
              },
              searchSymbols(userInput, exchange, symbolType, onResult) {
                console.log('Search Symbols', userInput, exchange, symbolType);
              },
              subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
                updateLatestCandleCallback.current = onTick;
              },
              unsubscribeBars(listenerGuid) {
                updateLatestCandleCallback.current = undefined;
              },
              subscribeQuotes(symbols, fastSymbols, onRealtimeCallback, listenerGUID) {
                console.log('Subscribe Quotes', symbols, fastSymbols, listenerGUID);
              },
              unsubscribeQuotes(listenerGUID) {
                console.log('Unsubscribe Quotes', listenerGUID);
              },

              onReady(callback) {
                const config: DatafeedConfiguration = {
                  currency_codes: ['USD'],
                  symbols_types: [],
                  supported_resolutions: ['1', '10', '60', '360', '1D', '1W'] as ResolutionString[],
                  supports_marks: false,
                  supports_timescale_marks: false,
                  supports_time: false,
                };
                callback(config);
              },
              // Not enabled yet
              // searchSymbols()

              resolveSymbol: async (symbolName, onSymbolResolvedCallback, onResolveErrorCallback, extension) => {
                try {
                  const symbolInfo: LibrarySymbolInfo = {
                    ticker: symbolName,
                    name: symbolName,
                    full_name: symbolName,
                    description: '',
                    type: '',
                    session: '24x7',
                    timezone: 'Etc/UTC',
                    exchange: '',
                    minmov: 1,
                    pricescale: 100,
                    has_intraday: true,
                    visible_plots_set: 'ohlcv',
                    has_weekly_and_monthly: true,
                    supported_resolutions: ['1', '10', '60', '360', '1D', '1W'] as ResolutionString[],
                    volume_precision: 2,
                    data_status: 'streaming',
                    format: 'price',
                    listed_exchange: '',
                  };
                  onSymbolResolvedCallback(symbolInfo);
                } catch (err: any) {
                  onResolveErrorCallback(err.message);
                }
              },

              getBars(symbolInfo, resolution, periodParams, onHistoryCallback, onErrorCallback) {
                const resolutionMapper = {
                  '1': 1, // 1 minute in milliseconds
                  '10': 10, // 5 minutes
                  '60': 60, // 1 hour
                  '360': 360, // 6 hour
                  '1D': 1440, // 1 day
                  '1W': 10080, // 1 day
                  // Add more resolutions as needed
                };

                client
                  .query<GetTradingViewCandlesQuery, GetTradingViewCandlesQueryVariables>({
                    query: GET_TRADING_VIEW_CANDLES,
                    variables: {
                      where: {
                        // @ts-ignore
                        candleSize: resolutionMapper[resolution],
                        timestamp_gte: periodParams.from,
                        timestamp_lte: periodParams.to,
                        token: symbolInfo.full_name,
                      },
                    },
                  })
                  .then((res) => {
                    const bars = res.data.tokenCandles.map(({ close, high, low, open, timestamp, volume }) => ({
                      close,
                      high,
                      low,
                      open,
                      time: timestamp,
                      volume,
                    }));
                    onHistoryCallback(bars, { noData: false });
                  })
                  .catch(() => {
                    onErrorCallback('Error fetching candles');
                  });
              },

              // Only updates the most recent bar. Not needed yet.
              // subscribeBars() also needs unsubscribeBars()
            },

        // General config
        symbol: process.env.NEXT_PUBLIC_API_MOCKING === 'enabled' ? 'AAPL' : selectedToken.symbol,
        // @ts-ignore
        // interval: '1D',
        autosize: true,

        // debug: process.env.NODE_ENV === 'development',
        theme: isDarkMode ? 'dark' : 'light',
        // TODO: Maybe implement later for diffing
        disabled_features: ['header_symbol_search', 'header_compare'],

        // Override in  light mode because it looks terrible
        settings_overrides: !isDarkMode
          ? {
              'paneProperties.backgroundType': 'solid',
              'paneProperties.background': '#ffffff',
              'paneProperties.vertGridProperties.color': 'rgba(42, 46, 57, 0.06)',
              'paneProperties.horzGridProperties.color': 'rgba(42, 46, 57, 0.06)',
            }
          : undefined,
        overrides: {
          'linetoolexecution.fontFamily': 'Space Grotesk Variable',
          'linetoolorder.bodyFontFamily': 'Space Grotesk Variable',
          'linetoolposition.bodyFontFamily': 'Space Grotesk Variable',
          'linetoolorder.quantityFontFamily': 'Space Grotesk Variable',
          'linetoolposition.quantityFontFamily': 'Space Grotesk Variable',
        },
      });
    }

    return () => {
      if (currentChart.current) {
        currentChart.current.remove();
        currentChart.current = undefined;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isDarkMode, selectedToken]);

  return (
    <>
      <TradingViewHeader />
      <div
        // Must have the height fixed in order to resize properly. We adapt via a CSS custom property.
        // Whole screen - navigation - TV header - current table size - resize handler
        style={{ height: 'calc(100vh - 48px - 74px - var(--apollon-drag-queen-height, 330px) - 25px)', width: '100%' }}
        id="apollon-trading-view-container"
      >
        <div style={{ height: '100%' }} id="apollon-trading-view"></div>
      </div>
    </>
  );
}

export default TradingViewComponent;
