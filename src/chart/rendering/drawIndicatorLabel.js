import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';

const PAD_X = 10;
const PAD_Y = 6;
const FONT_SIZE = 12;
const LINE_H = 16;
const COL_GAP = 16;

const smiConfigText = () =>
  `SMI(${CHART_DEFAULTS.SMI_LENGTH}, ${CHART_DEFAULTS.SMI_BB_MULT}, ${CHART_DEFAULTS.SMI_KC_LENGTH}, ${CHART_DEFAULTS.SMI_KC_MULT})`;

const adxConfigText = () => `ADX(${CHART_DEFAULTS.ADX_LENGTH})`;

const rsiConfigText = () =>
  `RSI(${CHART_DEFAULTS.RSI_LENGTH}) ${CHART_DEFAULTS.RSI_OVERBOUGHT_LEVEL}/${CHART_DEFAULTS.RSI_OVERSOLD_LEVEL}`;

const drawPill = (ctx, text, color, x, y) => {
  ctx.font = `${FONT_SIZE}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(text).width;
  const h = LINE_H;
  const boxX = x - 4;
  const boxY = y - h / 2 - 2;
  const boxW = w + 8;
  const boxH = h + 4;
  ctx.fillStyle = 'rgba(20, 24, 35, 0.85)';
  ctx.fillRect(boxX, boxY, boxW, boxH);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(boxX + 0.5, boxY + 0.5, boxW - 1, boxH - 1);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  return boxW;
};

export const drawIndicatorLabel = (state, ctx) => {
  const {
    leftAxisWidth, rightIndicator, leftIndicator, rsiEnabled, smiEnabled,
    canvasHeight, timeAxisHeight,
  } = state;

  const startX = (leftAxisWidth || 0) + PAD_X;
  const y = PAD_Y + LINE_H / 2;
  if (y > canvasHeight - (timeAxisHeight || 0)) return;

  ctx.save();

  const pills = [];
  if (smiEnabled && (rightIndicator === 'smi' || leftIndicator === 'smi')) {
    pills.push({ text: smiConfigText(), color: CHART_COLORS.SMI_UP });
  }
  if (leftIndicator === 'adx') {
    pills.push({ text: adxConfigText(), color: CHART_COLORS.ADX });
  }
  if (rsiEnabled && rightIndicator === 'rsi') {
    pills.push({ text: rsiConfigText(), color: CHART_COLORS.RSI });
  }

  let cursorX = startX;
  for (const pill of pills) {
    const w = drawPill(ctx, pill.text, pill.color, cursorX, y);
    cursorX += w + COL_GAP;
  }

  ctx.restore();
};
