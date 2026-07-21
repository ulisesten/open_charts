import { CHART_COLORS } from '../utils/constants';
import { priceToY } from '../utils/scales';

const firstValidIndex = (arr, getter) => {
  for (let i = 0; i < arr.length; i++) {
    const v = getter(arr[i]);
    if (v !== null && v !== undefined) return i;
  }
  return -1;
};

const lastValidIndex = (arr, getter) => {
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = getter(arr[i]);
    if (v !== null && v !== undefined) return i;
  }
  return -1;
};

export const drawAdx = (state, ctx) => {
  const {
    adxData, smiData, data, widthScale, zoomLevel, panOffset,
    chartHeight, adxScale, leftAxisWidth, priceAxisWidth, canvasWidth,
  } = state;
  if (!adxData || !data || data.length === 0) return;

  const pixelsPerCandle = widthScale * zoomLevel;
  if (pixelsPerCandle <= 0) return;

  const plotLeft = leftAxisWidth || 0;
  const plotRight = canvasWidth - (priceAxisWidth || state.rightAxisWidth || 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, Math.max(0, plotRight - plotLeft), chartHeight);
  ctx.clip();

  ctx.beginPath();
  ctx.strokeStyle = CHART_COLORS.ADX;
  ctx.lineWidth = 2;
  let started = false;
  for (let i = 0; i < data.length; i++) {
    const v = adxData[i] ? adxData[i].adx : null;
    const x = plotLeft + panOffset + i * pixelsPerCandle + pixelsPerCandle / 2;
    if (v == null) {
      started = false;
      continue;
    }
    const y = priceToY(v, adxScale.min, adxScale.heightScale, chartHeight, adxScale.zoomY, adxScale.panY);
    if (!started) {
      ctx.moveTo(x, y);
      started = true;
    } else {
      ctx.lineTo(x, y);
    }
  }
  ctx.stroke();

  const adxFirst = firstValidIndex(adxData, (d) => d && d.adx);
  const adxLast = lastValidIndex(adxData, (d) => d && d.adx);
  const smiFirst = smiData ? firstValidIndex(smiData, (d) => d && d.value) : -1;
  const smiLast = smiData ? lastValidIndex(smiData, (d) => d && d.value) : -1;
  const rangeFirst = Math.max(
    adxFirst === -1 ? 0 : adxFirst,
    smiFirst === -1 ? 0 : smiFirst
  );
  const rangeLast = Math.min(
    adxLast === -1 ? data.length - 1 : adxLast,
    smiLast === -1 ? data.length - 1 : smiLast
  );

  const keyLevel = adxScale.keyLevel ?? (adxScale.max / 2);
  const keyY = priceToY(keyLevel, adxScale.min, adxScale.heightScale, chartHeight, adxScale.zoomY, adxScale.panY);
  if (rangeFirst <= rangeLast) {
    const candleX = (i) => plotLeft + panOffset + i * pixelsPerCandle + pixelsPerCandle / 2;
    const keyLeft = Math.max(plotLeft, candleX(rangeFirst) - pixelsPerCandle / 2);
    const keyRight = Math.min(plotRight, candleX(rangeLast) + pixelsPerCandle / 2);
    ctx.beginPath();
    ctx.strokeStyle = CHART_COLORS.ADX_KEY_LEVEL;
    ctx.lineWidth = 1;
    ctx.moveTo(keyLeft, keyY);
    ctx.lineTo(keyRight, keyY);
    ctx.stroke();
  }

  ctx.restore();
};