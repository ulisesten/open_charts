import { CHART_COLORS } from '../utils/constants';
import { priceToY } from '../utils/scales';

// Dibuja marcadores de liquidación (heatmap básico).
// Requiere state.liquidations y state startTime/endTime visibles.
export const drawHeatmap = (state, ctx) => {
  const liquidations = state.liquidations;
  if (!liquidations || liquidations.length === 0 || !state.data.length) return;

  const { chartHeight, minPrice, heightScale, zoomLevelY, panOffsetY, leftAxisWidth } = state;
  const plotLeft = leftAxisWidth || 0;
  const lastTime = state.data[state.data.length - 1].time;
  const firstTime = state.data[0].time;
  const timeRange = (lastTime - firstTime) || 1;

  const widthScale = state.widthScale;

  for (let i = 0; i < liquidations.length; i++) {
    const liq = liquidations[i];
    const idx = Math.floor((liq.time - firstTime) / (timeRange / state.data.length));
    if (idx < 0 || idx >= state.data.length) continue;

    const x = plotLeft + idx * widthScale * state.zoomLevel + state.panOffset;
    const y = priceToY(liq.price, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
    if (y < 0 || y > chartHeight) continue;

    drawMarker(ctx, x, y, liq.side, liq.quantity);
  }
};

const drawMarker = (ctx, x, y, side, quantity) => {
  const size = Math.log(quantity + 1) * 8;
  ctx.fillStyle = side === 'SELL' ? CHART_COLORS.LIQ_SELL : CHART_COLORS.LIQ_BUY;
  ctx.beginPath();
  if (side === 'SELL') {
    ctx.moveTo(x - size, y + size);
    ctx.lineTo(x + size, y + size);
    ctx.lineTo(x, y - size);
  } else {
    ctx.moveTo(x - size, y - size);
    ctx.lineTo(x + size, y - size);
    ctx.lineTo(x, y + size);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
  ctx.stroke();
};