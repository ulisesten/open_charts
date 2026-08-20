import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceTickValues, optimalTickSize, priceToY, visiblePriceRange } from '../utils/scales';
import { formatPrice } from '../utils/format';

export const drawPriceScale = (state, ctx) => {
  const {
    canvasWidth, priceAxisWidth,
    chartHeight, minPrice, heightScale,
    zoomLevelY, panOffsetY, pricescaleIntervalCount,
  } = state;

  ctx.save();
  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_AXIS}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const minLabelY = CHART_DEFAULTS.PRICE_LABEL_AREA;
  const maxLabelY = chartHeight - CHART_DEFAULTS.PRICE_LABEL_AREA;
  const axisX = canvasWidth - priceAxisWidth + CHART_DEFAULTS.PRICE_LABEL_PADDING;
  const visible = visiblePriceRange(chartHeight, minPrice, heightScale, zoomLevelY, panOffsetY);
  const tickSize = optimalTickSize(visible.range, pricescaleIntervalCount);
  const prices = priceTickValues(visible.min, visible.max, visible.range, pricescaleIntervalCount);

  for (let i = 0; i < prices.length; i++) {
    const y = priceToY(prices[i], minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
    if (y >= minLabelY && y <= maxLabelY) {
      ctx.fillText(formatPrice(prices[i], tickSize), axisX, y);
    }
  }

  ctx.strokeStyle = CHART_COLORS.AXIS;
  ctx.beginPath();
  ctx.moveTo(canvasWidth - priceAxisWidth, 0);
  ctx.lineTo(canvasWidth - priceAxisWidth, chartHeight);
  ctx.stroke();

  drawCurrentPriceLabel(state, ctx);

  ctx.restore();
};

const drawCurrentPriceLabel = (state, ctx) => {
  const {
    data, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY,
    canvasWidth, priceAxisWidth, leftAxisWidth,
  } = state;
  if (!data || data.length === 0) return;
  const plotLeft = leftAxisWidth || 0;

  const currentPrice = data[data.length - 1].close;
  const priceY = priceToY(currentPrice, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);

  ctx.save();
  ctx.setLineDash([3, 3]);
  ctx.strokeStyle = CHART_COLORS.CURRENT_PRICE_LINE;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotLeft, priceY);
  ctx.lineTo(canvasWidth - priceAxisWidth, priceY);
  ctx.stroke();
  ctx.restore();

  const labelWidth = 54;
  const labelHeight = 20;
  const labelX = canvasWidth - priceAxisWidth;
  const labelY = priceY - labelHeight / 2;

  ctx.fillStyle = CHART_COLORS.CURRENT_PRICE_BG;
  ctx.fillRect(labelX, labelY, labelWidth, labelHeight);

  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `bold ${CHART_DEFAULTS.FONT_SIZE_CURRENT_PRICE}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(formatPrice(currentPrice), labelX + 4, priceY);
};