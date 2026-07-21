import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceToY } from '../utils/scales';

const fmt = (v) => {
  if (Math.abs(v) >= 10) return String(Math.round(v));
  return (Math.round(v * 10) / 10).toString();
};

export const drawSmiScale = (state, ctx) => {
  const { canvasWidth, priceAxisWidth, chartHeight, smiScale } = state;
  if (!smiScale) return;

  const axisX = canvasWidth - (priceAxisWidth || state.rightAxisWidth);
  ctx.save();
  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_AXIS}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const maxVal = smiScale.max;
  const step = CHART_DEFAULTS.INDICATOR_TICK_STEP;
  for (let v = -maxVal; v <= maxVal + 1e-9; v += step) {
    const y = priceToY(v, smiScale.min, smiScale.heightScale, chartHeight, smiScale.zoomY, smiScale.panY);
    if (y >= -CHART_DEFAULTS.INDICATOR_LABEL_MARGIN && y <= chartHeight + CHART_DEFAULTS.INDICATOR_LABEL_MARGIN) {
      ctx.fillText(fmt(v), axisX + CHART_DEFAULTS.PRICE_LABEL_PADDING, y);
    }
  }

  ctx.strokeStyle = CHART_COLORS.TEXT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(axisX, 0);
  ctx.lineTo(axisX, chartHeight);
  ctx.stroke();
  ctx.restore();
};

export const drawRsiScale = (state, ctx) => {
  const { canvasWidth, priceAxisWidth, chartHeight, rsiScale } = state;
  if (!rsiScale) return;

  const axisX = canvasWidth - (priceAxisWidth || state.rightAxisWidth);
  ctx.save();
  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_AXIS}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const step = CHART_DEFAULTS.INDICATOR_TICK_STEP;
  for (let v = rsiScale.min; v <= rsiScale.max + 1e-9; v += step) {
    const y = priceToY(v, rsiScale.min, rsiScale.heightScale, chartHeight, rsiScale.zoomY, rsiScale.panY);
    if (y >= -CHART_DEFAULTS.INDICATOR_LABEL_MARGIN && y <= chartHeight + CHART_DEFAULTS.INDICATOR_LABEL_MARGIN) {
      ctx.fillText(fmt(v), axisX + CHART_DEFAULTS.PRICE_LABEL_PADDING, y);
    }
  }

  ctx.strokeStyle = CHART_COLORS.TEXT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(axisX, 0);
  ctx.lineTo(axisX, chartHeight);
  ctx.stroke();
  ctx.restore();
};

export const drawAdxScale = (state, ctx) => {
  const { leftAxisWidth, chartHeight, adxScale } = state;
  if (!adxScale || !leftAxisWidth) return;

  ctx.save();

  // Axis line - thin and clean
  ctx.strokeStyle = CHART_COLORS.TEXT;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(leftAxisWidth, 0);
  ctx.lineTo(leftAxisWidth, chartHeight);
  ctx.stroke();

  // Labels
  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_AXIS}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const step = CHART_DEFAULTS.INDICATOR_TICK_STEP;
  for (let v = 0; v <= adxScale.max + 1e-9; v += step) {
    const y = priceToY(v, adxScale.min, adxScale.heightScale, chartHeight, adxScale.zoomY, adxScale.panY);
    if (y >= -CHART_DEFAULTS.INDICATOR_LABEL_MARGIN && y <= chartHeight + CHART_DEFAULTS.INDICATOR_LABEL_MARGIN) {
      ctx.fillText(fmt(v), leftAxisWidth - CHART_DEFAULTS.PRICE_LABEL_PADDING, y);
    }
  }

  ctx.restore();
};