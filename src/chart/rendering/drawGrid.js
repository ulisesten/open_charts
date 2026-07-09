import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceTickValues, chooseTimeUnit, labeledTimeIndices, priceToY, visiblePriceRange } from '../utils/scales';

export const drawGrid = (state, ctx) => {
  const {
    data, minPrice, heightScale, widthScale,
    chartWidth, chartHeight, zoomLevel, zoomLevelY, panOffset, panOffsetY,
    pricescaleIntervalCount, candleIntervalMs, leftAxisWidth,
  } = state;
  if (!data || data.length === 0) return;
  const plotLeft = leftAxisWidth || 0;
  const plotRight = plotLeft + chartWidth;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, chartWidth, chartHeight);
  ctx.clip();

  ctx.strokeStyle = CHART_COLORS.GRID;
  ctx.lineWidth = 1;

  const visible = visiblePriceRange(chartHeight, minPrice, heightScale, zoomLevelY, panOffsetY);
  const prices = priceTickValues(visible.min, visible.max, visible.range, pricescaleIntervalCount);
  for (let i = 0; i < prices.length; i++) {
    const y = priceToY(prices[i], minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
    if (y < 0 || y > chartHeight) continue;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
  }

  const pixelsPerCandle = widthScale * zoomLevel;
  const firstIdx = Math.max(0, Math.floor((plotLeft - panOffset) / pixelsPerCandle));
  const lastIdx = Math.min(data.length - 1, Math.ceil((plotRight - panOffset) / pixelsPerCandle));
  const visibleSlice = data.slice(firstIdx, lastIdx + 1);
  const unitMs = chooseTimeUnit(candleIntervalMs, pixelsPerCandle, CHART_DEFAULTS.MIN_TIME_LABEL_GAP_PX);
  const indices = labeledTimeIndices(visibleSlice, unitMs);
  for (let k = 0; k < indices.length; k++) {
    const i = indices[k] + firstIdx;
    const x = plotLeft + i * widthScale * zoomLevel + panOffset;
    if (x < plotLeft || x > plotRight) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, chartHeight);
    ctx.stroke();
  }

  ctx.restore();
};
