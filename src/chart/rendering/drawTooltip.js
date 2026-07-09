import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { formatPrice } from '../utils/format';

const BOX_W = 240;
const BOX_H = 60;
const PAD = 8;
const LINE_H = 16;

let backdropCanvas = null;
const getBackdrop = () => {
  if (!backdropCanvas) backdropCanvas = document.createElement('canvas');
  backdropCanvas.width = BOX_W;
  backdropCanvas.height = BOX_H;
  return backdropCanvas;
};

export const drawTooltip = (state, ctx) => {
  const { hoveredCandle, tooltipAlpha, leftAxisWidth } = state;
  if (!hoveredCandle || tooltipAlpha <= 0) return;
  const plotLeft = (leftAxisWidth || 0) + CHART_DEFAULTS.TOOLTIP_OFFSET_X;
  const boxX = plotLeft;
  const boxY = CHART_DEFAULTS.TOOLTIP_OFFSET_Y;
  const colLeftX = boxX + PAD;
  const colRightX = boxX + BOX_W / 2 + PAD / 2;
  const row1Y = boxY + LINE_H;
  const row2Y = boxY + LINE_H * 2;
  const row3Y = boxY + LINE_H * 3;

  const source = ctx.canvas;
  const off = getBackdrop();
  const offCtx = off.getContext('2d');
  offCtx.clearRect(0, 0, BOX_W, BOX_H);
  offCtx.drawImage(source, boxX, boxY, BOX_W, BOX_H, 0, 0, BOX_W, BOX_H);

  ctx.save();
  ctx.globalAlpha = tooltipAlpha;
  ctx.filter = `blur(${CHART_DEFAULTS.TOOLTIP_BLUR_PX}px)`;
  ctx.drawImage(off, boxX, boxY);
  ctx.filter = 'none';

  ctx.fillStyle = `rgba(20, 24, 35, ${CHART_DEFAULTS.TOOLTIP_OVERLAY_ALPHA})`;
  ctx.fillRect(boxX, boxY, BOX_W, BOX_H);

  ctx.strokeStyle = `rgba(255, 255, 255, 0.12)`;
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, BOX_W - 1, BOX_H - 1);

  ctx.globalAlpha = tooltipAlpha;
  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_TOOLTIP}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';

  const upColor = CHART_COLORS.UP;
  const downColor = CHART_COLORS.DOWN;

  ctx.fillStyle = `rgba(255, 255, 255, ${tooltipAlpha})`;
  const date = new Date(hoveredCandle.time).toLocaleString();
  ctx.fillText(`Fecha: ${date}`, colLeftX, row1Y);

  const drawColored = (label, value, color, x, y) => {
    ctx.fillStyle = `rgba(255, 255, 255, ${tooltipAlpha})`;
    ctx.fillText(label, x, y);
    const labelW = ctx.measureText(label).width;
    ctx.fillStyle = color;
    ctx.fillText(value, x + labelW, y);
  };

  drawColored('Apertura: ', formatPrice(hoveredCandle.open), hoveredCandle.open >= hoveredCandle.close ? downColor : upColor, colLeftX, row2Y);
  drawColored('Minimo: ', formatPrice(hoveredCandle.low), downColor, colLeftX, row3Y);
  drawColored('Cierre: ', formatPrice(hoveredCandle.close), hoveredCandle.close >= hoveredCandle.open ? upColor : downColor, colRightX, row2Y);
  drawColored('Maximo: ', formatPrice(hoveredCandle.high), upColor, colRightX, row3Y);

  ctx.restore();
};
