'use client';

import { ChartOptions, ColorType, CrosshairMode, LineStyle, createChart } from 'lightweight-charts';
import { useEffect } from 'react';
import TradingViewHeader from './TradingViewHeader';
import areaSeriesDemoData from './areaSeriesDemoData.json';
import candleStickSeriesDemoData from './candleStickSeriesDemoData.json';

const chartOptions: Partial<ChartOptions> = {
  grid: {
    vertLines: {
      style: LineStyle.Solid,
      visible: true,
      color: '#282531',
    },
    horzLines: {
      style: LineStyle.Solid,
      visible: true,
      color: '#282531',
    },
  },
  layout: {
    textColor: '#B4B1BD',
    fontFamily: 'Space Grotesk Variable',
    fontSize: 11,
    background: { type: ColorType.Solid, color: '#1e1b27' },
  },
  crosshair: {
    horzLine: {
      visible: true,
      labelVisible: true,
      color: '#e04a4a',
      labelBackgroundColor: '#e04a4a',
      style: LineStyle.Dashed,
      width: 1,
    },
    vertLine: {
      visible: true,
      labelVisible: true,
      color: '#e04a4a',
      labelBackgroundColor: '#e04a4a',
      style: LineStyle.Dashed,
      width: 1,
    },
    mode: CrosshairMode.Normal,
  },
  autoSize: true,
};

function TradingView() {
  useEffect(() => {
    const chart = createChart(document.getElementById('apollon-trading-view')!, chartOptions);
    const areaSeries = chart.addAreaSeries({
      lineColor: '#2962FF',
      topColor: '#2962FF',
      bottomColor: 'rgba(41, 98, 255, 0.28)',
    });
    areaSeries.setData(areaSeriesDemoData);

    const candlestickSeries = chart.addCandlestickSeries({
      priceLineColor: '#3dd755',
      upColor: '#3dd755',
      downColor: '#e04a4a',
      borderVisible: false,
      wickUpColor: '#3dd755',
      wickDownColor: '#e04a4a',
    });
    candlestickSeries.setData(candleStickSeriesDemoData);

    return () => {
      chart.remove();
    };
  }, []);

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

export default TradingView;
