import { CHART_COLORS } from '../utils/constants';
import { ADX_KEY_LEVEL } from '../utils/adx';
import { priceToY } from '../utils/scales';

export const drawAdx = (state, ctx) => {
  const {
    adxData, data, widthScale, zoomLevel, panOffset,
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

  const keyY = priceToY(ADX_KEY_LEVEL, adxScale.min, adxScale.heightScale, chartHeight, adxScale.zoomY, adxScale.panY);
  ctx.beginPath();
  ctx.strokeStyle = CHART_COLORS.ADX_KEY_LEVEL;
  ctx.lineWidth = 1;
  ctx.moveTo(plotLeft, keyY);
  ctx.lineTo(plotRight, keyY);
  ctx.stroke();

  ctx.restore();
};