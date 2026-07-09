import { CHART_COLORS } from '../utils/constants';
import { priceToY } from '../utils/scales';

export const drawCandles = (state, ctx) => {
  const {
    data, minPrice, heightScale, widthScale, candleWidth,
    chartWidth, chartHeight, panOffset, panOffsetY, zoomLevel, zoomLevelY,
    leftAxisWidth,
  } = state;
  const plotLeft = leftAxisWidth || 0;
  const plotRight = plotLeft + chartWidth;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, chartWidth, chartHeight);
  ctx.clip();

  const pixelsPerCandle = widthScale * zoomLevel;
  const visibleCandleWidth = candleWidth * zoomLevel;
  const padding = (pixelsPerCandle - visibleCandleWidth) / 2;

  const firstVisibleIdx = Math.max(0, Math.floor((plotLeft - panOffset) / pixelsPerCandle));
  const lastVisibleIdx = Math.min(data.length - 1, Math.ceil((plotRight - panOffset) / pixelsPerCandle));

  for (let i = firstVisibleIdx; i <= lastVisibleIdx; i++) {
    const x = plotLeft + panOffset + i * pixelsPerCandle + padding;
    drawCandle(ctx, data[i], x, visibleCandleWidth, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
  }

  ctx.restore();

  drawHoverHighlight(state, ctx);
};

const drawCandle = (ctx, candle, x, candleWidth, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY) => {
  const isBullish = candle.close >= candle.open;
  const color = isBullish ? CHART_COLORS.UP : CHART_COLORS.DOWN;

  const highY = priceToY(candle.high, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
  const lowY = priceToY(candle.low, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
  const openY = priceToY(candle.open, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
  const closeY = priceToY(candle.close, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);

  const wickX = x + candleWidth / 2;
  ctx.beginPath();
  ctx.moveTo(wickX, highY);
  ctx.lineTo(wickX, lowY);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();

  const bodyTop = Math.min(openY, closeY);
  const bodyHeight = Math.max(1, Math.abs(openY - closeY));
  ctx.fillStyle = color;
  ctx.fillRect(x, bodyTop, candleWidth, bodyHeight);
  ctx.strokeStyle = isBullish ? CHART_COLORS.BORDER_UP : CHART_COLORS.BORDER_DOWN;
  ctx.lineWidth = 1;
  ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
};

const drawHoverHighlight = (state, ctx) => {
  const { hoveredIndex, widthScale, chartWidth, chartHeight,
    panOffset, zoomLevel, leftAxisWidth } = state;
  const plotLeft = leftAxisWidth || 0;

  if (hoveredIndex == null || hoveredIndex < 0) return;

  const cellX = hoveredIndex * widthScale;
  const screenX = plotLeft + panOffset + cellX * zoomLevel;
  const screenW = widthScale * zoomLevel;

  if (screenX + screenW < plotLeft || screenX > plotLeft + chartWidth) return;

  ctx.save();
  ctx.strokeStyle = CHART_COLORS.HOVER_HIGHLIGHT;
  ctx.lineWidth = 2;
  ctx.strokeRect(screenX, 0, screenW, chartHeight);
  ctx.restore();
};