import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceToY, priceTickValues, chooseTimeUnit, labeledTimeIndices } from '../utils/scales';

export const drawIndicatorGrid = (state, ctx) => {
  const {
    data, widthScale, zoomLevel, panOffset, chartWidth, chartHeight,
    smiScale, adxScale, candleIntervalMs, leftAxisWidth,
    canvasWidth, priceAxisWidth, rightAxisWidth,
  } = state;
  if (!data || data.length === 0) return;

  const plotLeft = leftAxisWidth || 0;
  const plotRight = canvasWidth - (priceAxisWidth || rightAxisWidth || 0);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, Math.max(0, plotRight - plotLeft), chartHeight);
  ctx.clip();

  ctx.strokeStyle = CHART_COLORS.GRID;
  ctx.lineWidth = 1;

  if (state.rightIndicator === 'smi' && state.smiScale) {
    const prices = priceTickValues(state.smiScale.min, state.smiScale.max, state.smiScale.range, 5);
    for (let i = 0; i < prices.length; i++) {
      const y = priceToY(prices[i], state.smiScale.min, state.smiScale.heightScale, chartHeight, state.smiScale.zoomY, state.smiScale.panY);
      if (y < 0 || y > chartHeight) continue;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }
  }

  if (state.leftIndicator === 'adx' && state.adxScale) {
    const prices = priceTickValues(state.adxScale.min, state.adxScale.max, state.adxScale.range, 5);
    for (let i = 0; i < prices.length; i++) {
      const y = priceToY(prices[i], state.adxScale.min, state.adxScale.heightScale, chartHeight, state.adxScale.zoomY, state.adxScale.panY);
      if (y < 0 || y > chartHeight) continue;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }
  }

  const pixelsPerCandle = widthScale * zoomLevel;
  const unitMs = chooseTimeUnit(candleIntervalMs, pixelsPerCandle, CHART_DEFAULTS.MIN_TIME_LABEL_GAP_PX);
  const indices = labeledTimeIndices(data, unitMs);

  for (let k = 0; k < indices.length; k++) {
    const i = indices[k];
    const x = plotLeft + i * widthScale * zoomLevel + panOffset;
    if (x < plotLeft || x > plotRight) continue;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, chartHeight);
    ctx.stroke();
  }

  ctx.restore();
};