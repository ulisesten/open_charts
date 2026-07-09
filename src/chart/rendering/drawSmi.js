import { CHART_COLORS } from '../utils/constants';
import { priceToY } from '../utils/scales';

const fillColor = (value, prev) => {
  const rising = value > prev;
  if (value >= 0) return rising ? CHART_COLORS.SMI_UP : CHART_COLORS.SMI_UP_DIM;
  return rising ? CHART_COLORS.SMI_DOWN_DIM : CHART_COLORS.SMI_DOWN;
};

const strokeColor = (value, prev) => {
  const rising = value > prev;
  if (value >= 0) return rising ? CHART_COLORS.SMI_UP : CHART_COLORS.SMI_UP_DIM;
  return rising ? CHART_COLORS.SMI_DOWN_DIM : CHART_COLORS.SMI_DOWN;
};

export const drawSmi = (state, ctx) => {
  const {
    smiData, data, widthScale, zoomLevel, panOffset,
    chartHeight, smiScale, leftAxisWidth, priceAxisWidth, canvasWidth,
  } = state;
  if (!smiData || !data || data.length === 0) return;

  const pixelsPerCandle = widthScale * zoomLevel;
  if (pixelsPerCandle <= 0) return;

  const plotLeft = leftAxisWidth || 0;
  const plotRight = canvasWidth - (priceAxisWidth || state.rightAxisWidth || 0);
  const zeroY = priceToY(0, smiScale.min, smiScale.heightScale, chartHeight, smiScale.zoomY, smiScale.panY);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, Math.max(0, plotRight - plotLeft), chartHeight);
  ctx.clip();

  const candleX = (i) => plotLeft + panOffset + i * pixelsPerCandle + pixelsPerCandle / 2;
  const valueY = (v) => priceToY(v, smiScale.min, smiScale.heightScale, chartHeight, smiScale.zoomY, smiScale.panY);

  const segments = [];
  let current = null;
  for (let i = 0; i < data.length; i++) {
    const item = smiData[i];
    const v = item && item.value !== null ? item.value : null;
    if (v === null) {
      if (current && current.points.length > 1) segments.push(current);
      current = null;
      continue;
    }
    if (!current) current = { points: [] };
    current.points.push({ x: candleX(i), y: valueY(v), value: v });
  }
  if (current && current.points.length > 1) segments.push(current);

  const halfW = pixelsPerCandle / 2;
  for (const seg of segments) {
    const pts = seg.points;

    const segFirstX = pts[0].x - halfW;
    const segLastX = pts[pts.length - 1].x + halfW;

    const buildAreaPath = () => {
      ctx.beginPath();
      ctx.moveTo(segFirstX, zeroY);
      ctx.lineTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) {
        ctx.lineTo(pts[k].x, pts[k].y);
      }
      ctx.lineTo(segLastX, zeroY);
      ctx.closePath();
    };

    const cuts = [];
    for (let k = 1; k < pts.length; k++) {
      const prevColor = fillColor(pts[k - 1].value, k > 1 ? pts[k - 2].value : pts[k - 1].value);
      const currColor = fillColor(pts[k].value, pts[k - 1].value);
      if (currColor !== prevColor) {
        cuts.push({ x: (pts[k - 1].x + pts[k].x) / 2, color: currColor, fromIdx: k });
      }
    }

    const colorAt = (idx) => fillColor(pts[idx].value, idx > 0 ? pts[idx - 1].value : pts[idx].value);

    const fillRange = (x, w, color) => {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, 0, w, chartHeight);
      ctx.clip();
      buildAreaPath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    if (cuts.length === 0) {
      buildAreaPath();
      ctx.fillStyle = colorAt(0);
      ctx.fill();
    } else {
      fillRange(segFirstX, cuts[0].x - segFirstX, colorAt(0));
      for (let c = 0; c < cuts.length; c++) {
        const startX = cuts[c].x;
        const endX = c < cuts.length - 1 ? cuts[c + 1].x : segLastX;
        fillRange(startX, endX - startX, cuts[c].color);
      }
    }

    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let k = 1; k < pts.length; k++) {
      ctx.lineTo(pts[k].x, pts[k].y);
    }
    const last = pts[pts.length - 1];
    const lastPrev = pts[pts.length - 2].value;
    ctx.strokeStyle = strokeColor(last.value, lastPrev);
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  for (let i = 0; i < data.length; i++) {
    const item = smiData[i];
    drawSqueezeDot(ctx, candleX(i), plotLeft, plotRight, item);
  }

  ctx.strokeStyle = CHART_COLORS.SMI_ZERO;
  ctx.setLineDash([4, 4]);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(plotLeft, zeroY);
  ctx.lineTo(plotRight, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
};

const drawSqueezeDot = (ctx, cx, plotLeft, plotRight, item) => {
  const size = 4;
  const x = cx - size / 2;
  if (x < plotLeft || x + size > plotRight) return;
  ctx.fillStyle = item && item.squeeze ? CHART_COLORS.SMI_SQUEEZE_ON : CHART_COLORS.SMI_SQUEEZE_OFF;
  ctx.fillRect(x, 6, size, size);
};