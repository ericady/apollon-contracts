'use client';

import { useTheme } from '@mui/material';
import { useEffect } from 'react';
import '../../external/charting_library/charting_library';
import { IChartingLibraryWidget } from '../../external/charting_library/charting_library';
import { UDFCompatibleDatafeed } from '../../external/datafeeds/udf/dist/bundle.esm';
import TradingViewHeader from './TradingViewHeader';

function TradingViewComponent() {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  useEffect(() => {
    let chart: IChartingLibraryWidget;
    if (window.TradingView) {
      // @ts-ignore
      chart = new TradingView.widget({
        container: 'apollon-trading-view',
        locale: 'en',
        library_path: 'charting_library/',
        datafeed: new UDFCompatibleDatafeed('https://demo-feed-data.tradingview.com'),
        symbol: 'AAPL',
        // @ts-ignore
        interval: '1D',
        fullscreen: false,
        debug: process.env.NODE_ENV === 'development',
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
