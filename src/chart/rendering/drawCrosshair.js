import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { formatPrice, formatTimeLabel } from '../utils/format';

export const drawCrosshair = (state, ctx) => {
  const pos = state.mousePosition;
  const x = pos ? pos.x : state.crosshairPoints?.x;
  const y = pos ? pos.y : null;
  if (x == null && y == null) return;

  const {
    canvasWidth, canvasHeight, priceAxisWidth, timeAxisHeight, leftAxisWidth,
  } = state;
  const plotLeft = leftAxisWidth || 0;

  const overPriceAxis = x != null && x >= canvasWidth - priceAxisWidth;
  const overTimeAxis = y != null && y >= canvasHeight - timeAxisHeight;

  const candle = state.hoveredCandle;
  const dirColor = candle
    ? (candle.close >= candle.open ? CHART_COLORS.PRICE_UP : CHART_COLORS.PRICE_DOWN)
    : null;

  ctx.save();
  ctx.setLineDash([5, 3]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = CHART_COLORS.CROSSHAIR;

  if (x != null && !overTimeAxis) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight - timeAxisHeight);
    ctx.stroke();
  }

  if (y != null && !overPriceAxis) {
    ctx.strokeStyle = dirColor || CHART_COLORS.CROSSHAIR;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(canvasWidth - priceAxisWidth, y);
    ctx.stroke();
  }

  ctx.setLineDash([]);

  if (y != null && !overPriceAxis && state.crosshairPoints.price != null) {
    drawPriceTag(ctx, canvasWidth - priceAxisWidth, y, formatPrice(state.crosshairPoints.price), dirColor);
  }

  if (x != null && !overTimeAxis && state.crosshairPoints.time != null) {
    drawTimeTag(ctx, x, canvasHeight - timeAxisHeight, formatTimeLabel(new Date(state.crosshairPoints.time)));
  }

  ctx.restore();
};

const drawPriceTag = (ctx, axisX, y, text, dirColor) => {
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(axisX + 4, y - 10, 52, 20);
  ctx.fillStyle = dirColor || CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_CROSSHAIR_PRICE}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, axisX + 8, y + 5);
};

const drawTimeTag = (ctx, x, axisY, text) => {
  const tagX = Math.min(x - 20, ctx.canvas.width - 60);
  ctx.fillStyle = '#1f1f1f';
  ctx.fillRect(tagX, axisY + 3, 60, 18);
  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_CROSSHAIR_TIME}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.fillText(text, tagX + 5, axisY + 15);
};