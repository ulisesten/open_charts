import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceToY, priceTickValues, chooseTimeUnit, labeledTimeIndices } from '../utils/scales';

export const drawIndicatorGrid = (state, ctx) => {
  const {
    data, widthScale, zoomLevel, panOffset, chartHeight,
    candleIntervalMs, leftAxisWidth, canvasWidth, priceAxisWidth, rightAxisWidth,
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

  const drawHGrid = (scale) => {
    if (!scale) return;
    const prices = priceTickValues(scale.min, scale.max, scale.range, 5);
    for (let i = 0; i < prices.length; i++) {
      const y = priceToY(prices[i], scale.min, scale.heightScale, chartHeight, scale.zoomY, scale.panY);
      if (y < 0 || y > chartHeight) continue;
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.stroke();
    }
  };

  if (state.rightIndicator === 'smi') drawHGrid(state.smiScale);
  if (state.leftIndicator === 'adx') drawHGrid(state.adxScale);
  if (state.rightIndicator === 'rsi') drawHGrid(state.rsiScale);

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