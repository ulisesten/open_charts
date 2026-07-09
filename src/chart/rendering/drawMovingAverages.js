import { CHART_COLORS } from '../utils/constants';
import { priceToY } from '../utils/scales';

const LINES = [
  { key: 'ma50', color: CHART_COLORS.MA_50, width: 1.5 },
  { key: 'ma100', color: CHART_COLORS.MA_100, width: 1.5 },
  { key: 'ma200', color: CHART_COLORS.MA_200, width: 2.5 },
];

export const drawMovingAverages = (state, ctx) => {
  const {
    movingAverages, data, minPrice, heightScale, widthScale, zoomLevel,
    panOffset, panOffsetY, zoomLevelY, chartWidth, chartHeight, leftAxisWidth,
  } = state;
  if (!movingAverages || !data || data.length === 0) return;

  const plotLeft = leftAxisWidth || 0;
  const pixelsPerCandle = widthScale * zoomLevel;

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, chartWidth, chartHeight);
  ctx.clip();

  const candleX = (i) => plotLeft + panOffset + i * pixelsPerCandle + pixelsPerCandle / 2;
  const valueY = (v) => priceToY(v, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);

  for (const line of LINES) {
    ctx.beginPath();
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.lineJoin = 'round';
    let started = false;
    for (let i = 0; i < data.length; i++) {
      const v = movingAverages[i] && movingAverages[i][line.key];
      if (v == null) {
        started = false;
        continue;
      }
      const x = candleX(i);
      const y = valueY(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  ctx.restore();
};
