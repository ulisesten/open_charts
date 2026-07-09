import { CHART_COLORS } from '../utils/constants';

export const drawCandle = (ctx, candle, x, candleWidth, minPrice, heightScale, chartHeight) => {
  const isBullish = candle.close >= candle.open;
  const color = isBullish ? CHART_COLORS.UP : CHART_COLORS.DOWN;

  const highY = chartHeight - (candle.high - minPrice) * heightScale;
  const lowY = chartHeight - (candle.low - minPrice) * heightScale;
  const openY = chartHeight - (candle.open - minPrice) * heightScale;
  const closeY = chartHeight - (candle.close - minPrice) * heightScale;

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
  ctx.strokeRect(x, bodyTop, candleWidth, bodyHeight);
};