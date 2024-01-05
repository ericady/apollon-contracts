'use client';

import { useApolloClient } from '@apollo/client';
import { useTheme } from '@mui/material';
import { useEffect } from 'react';
import '../../external/charting_library/charting_library';
import {
  DatafeedConfiguration,
  IChartingLibraryWidget,
  LibrarySymbolInfo,
  ResolutionString,
} from '../../external/charting_library/charting_library';
import { GetTradingViewCandlesQuery, GetTradingViewCandlesQueryVariables } from '../../generated/gql-types';
import { GET_TRADING_VIEW_CANDLES } from '../../queries';
import TradingViewHeader from './TradingViewHeader';

function TradingViewComponent() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  const client = useApolloClient();

  useEffect(() => {
    let chart: IChartingLibraryWidget;
    if (window.TradingView) {
      // @ts-ignore
      chart = new TradingView.widget({
        container: 'apollon-trading-view',
        locale: 'en',
        library_path: 'charting_library/',
        // datafeed: new UDFCompatibleDatafeed('https://demo-feed-data.tradingview.com'),
        datafeed: {
          getQuotes(symbols, onDataCallback, onErrorCallback) {
            console.log('Quotes', symbols);
          },
          searchSymbols(userInput, exchange, symbolType, onResult) {
            console.log('Search Symbols', userInput, exchange, symbolType);
          },
          subscribeBars(symbolInfo, resolution, onTick, listenerGuid, onResetCacheNeededCallback) {
            console.log('Subscribe Bars', symbolInfo, resolution, listenerGuid);
            onTick({ time: Date.now(), open: 154, high: 156, low: 150, close: 155, volume: 1100 });

            onResetCacheNeededCallback();
          },
          unsubscribeBars(listenerGuid) {
            console.log('Unsubscribe Bars', listenerGuid);
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
                console.log('res: ', res);
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
        symbol: 'AAPL',
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
      chart.remove();
    };
  }, [isDarkMode]);

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
