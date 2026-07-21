import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceToY } from '../utils/scales';

const findValidRange = (rsiData) => {
  let first = -1;
  let last = -1;
  for (let i = 0; i < rsiData.length; i++) {
    const item = rsiData[i];
    if (item && item.value !== null && item.value !== undefined) {
      if (first === -1) first = i;
      last = i;
    }
  }
  return { first, last };
};

export const drawRsi = (state, ctx) => {
  const {
    rsiData, data, widthScale, zoomLevel, panOffset,
    chartHeight, rsiScale, leftAxisWidth, priceAxisWidth, canvasWidth,
  } = state;
  if (!rsiData || !data || data.length === 0 || !rsiScale) return;

  const pixelsPerCandle = widthScale * zoomLevel;
  if (pixelsPerCandle <= 0) return;

  const plotLeft = leftAxisWidth || 0;
  const plotRight = canvasWidth - (priceAxisWidth || state.rightAxisWidth || 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, Math.max(0, plotRight - plotLeft), chartHeight);
  ctx.clip();

  const obLevel = CHART_DEFAULTS.RSI_OVERBOUGHT_LEVEL;
  const osLevel = CHART_DEFAULTS.RSI_OVERSOLD_LEVEL;
  const obY = priceToY(obLevel, rsiScale.min, rsiScale.heightScale, chartHeight, rsiScale.zoomY, rsiScale.panY);
  const osY = priceToY(osLevel, rsiScale.min, rsiScale.heightScale, chartHeight, rsiScale.zoomY, rsiScale.panY);

  const bandTop = Math.min(obY, osY);
  const bandBottom = Math.max(obY, osY);
  ctx.fillStyle = CHART_COLORS.RSI_CENTER_BAND;
  ctx.fillRect(plotLeft, bandTop, Math.max(0, plotRight - plotLeft), Math.max(0, bandBottom - bandTop));

  const { first, last } = findValidRange(rsiData);
  const candleCenterX = (i) => plotLeft + panOffset + i * pixelsPerCandle + pixelsPerCandle / 2;
  const limitLeft = first !== -1 ? Math.max(plotLeft, candleCenterX(first) - pixelsPerCandle / 2) : plotLeft;
  const limitRight = last !== -1 ? Math.min(plotRight, candleCenterX(last) + pixelsPerCandle / 2) : plotRight;

  if (limitLeft < limitRight) {
    ctx.beginPath();
    ctx.strokeStyle = CHART_COLORS.RSI_LINE;
    ctx.lineWidth = 1.5;
    let started = false;
    for (let i = first; i >= 0 && i <= last; i++) {
      const item = rsiData[i];
      const v = item && item.value !== null && item.value !== undefined ? item.value : null;
      if (v === null) {
        started = false;
        continue;
      }
      const x = candleCenterX(i);
      const y = priceToY(v, rsiScale.min, rsiScale.heightScale, chartHeight, rsiScale.zoomY, rsiScale.panY);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  const centerLevel = (CHART_DEFAULTS.RSI_VALUE_MIN + CHART_DEFAULTS.RSI_VALUE_MAX) / 2;
  const centerY = priceToY(centerLevel, rsiScale.min, rsiScale.heightScale, chartHeight, rsiScale.zoomY, rsiScale.panY);
  for (const lvlY of [obY, centerY, osY]) {
    ctx.strokeStyle = CHART_COLORS.RSI_KEY_LEVEL;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, lvlY);
    ctx.lineTo(plotRight, lvlY);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  ctx.restore();
};
