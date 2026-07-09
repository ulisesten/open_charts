import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { chooseTimeUnit, labeledTimeIndices } from '../utils/scales';
import { formatAxisTime } from '../utils/format';

export const drawTimeScale = (state, ctx) => {
  const {
    data, widthScale, zoomLevel, panOffset, canvasWidth, priceAxisWidth,
    canvasHeight, timeAxisHeight, candleIntervalMs, leftAxisWidth,
  } = state;
  if (!data || data.length === 0) return;

  const plotLeft = leftAxisWidth || 0;
  const plotRight = canvasWidth - priceAxisWidth;

  ctx.save();
  ctx.fillStyle = CHART_COLORS.TEXT;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_TIME}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const separatorY = canvasHeight - timeAxisHeight;
  const axisY = separatorY + timeAxisHeight / 2;
  const pixelsPerCandle = widthScale * zoomLevel;
  const unitMs = chooseTimeUnit(candleIntervalMs, pixelsPerCandle, CHART_DEFAULTS.MIN_TIME_LABEL_GAP_PX);

  const firstIdx = Math.max(0, Math.floor((plotLeft - panOffset) / pixelsPerCandle));
  const lastIdx = Math.min(data.length - 1, Math.ceil((plotRight - panOffset) / pixelsPerCandle));
  const visibleSlice = data.slice(firstIdx, lastIdx + 1);
  const indices = labeledTimeIndices(visibleSlice, unitMs);

  for (let k = 0; k < indices.length; k++) {
    const i = indices[k] + firstIdx;
    const x = plotLeft + i * widthScale * zoomLevel + panOffset;
    if (x < plotLeft || x > plotRight) continue;

    const date = new Date(data[i].time);
    ctx.fillText(formatAxisTime(date, unitMs), x, axisY);
  }

  ctx.strokeStyle = CHART_COLORS.AXIS;
  ctx.beginPath();
  ctx.moveTo(plotLeft, separatorY);
  ctx.lineTo(plotRight, separatorY);
  ctx.stroke();

  ctx.restore();
};
