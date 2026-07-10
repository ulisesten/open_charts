import { CHART_COLORS, CHART_DEFAULTS } from '../utils/constants';
import { priceToY } from '../utils/scales';
import { formatPrice } from '../utils/format';

export const drawVolumeProfile = (state, ctx) => {
  const {
    volumeProfile: vp, minPrice, heightScale,
    chartWidth, chartHeight, zoomLevelY, panOffsetY, leftAxisWidth,
  } = state;
  if (!vp || vp.bins.length === 0 || vp.maxBinVol === 0) return;

  const plotLeft = leftAxisWidth || 0;
  const plotRight = plotLeft + chartWidth;

  const visible = { min: vp._vMin, max: vp._vMax };

  const binCount = vp.bins.length;
  const binSize = (visible.max - visible.min) / binCount;
  const maxBarWidth = Math.min(chartWidth * CHART_DEFAULTS.VP_MAX_WIDTH_RATIO, 200);

  ctx.save();
  ctx.beginPath();
  ctx.rect(plotLeft, 0, chartWidth, chartHeight);
  ctx.clip();

  for (let b = 0; b < binCount; b++) {
    const priceLow = visible.min + b * binSize;
    const priceHigh = priceLow + binSize;
    const yHigh = priceToY(priceHigh, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
    const yLow = priceToY(priceLow, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
    const barHeight = Math.max(1, Math.abs(yLow - yHigh));
    const barWidth = (vp.bins[b] / vp.maxBinVol) * maxBarWidth;
    const barX = Math.max(plotLeft, plotRight - barWidth);

    if (b === vp.pocIndex) {
      ctx.fillStyle = CHART_COLORS.VP_HIST_POC;
    } else if (priceLow >= vp.val && priceHigh <= vp.vah) {
      ctx.fillStyle = CHART_COLORS.VP_HIST_VA;
    } else {
      ctx.fillStyle = CHART_COLORS.VP_HIST;
    }

    ctx.fillRect(barX, Math.min(yHigh, yLow), barWidth, barHeight);
  }

  const pocPrice = visible.min + (vp.pocIndex + 0.5) * binSize;
  const pocY = priceToY(pocPrice, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
  ctx.strokeStyle = CHART_COLORS.VP_POC_LINE;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 3]);
  ctx.beginPath();
  ctx.moveTo(plotLeft, pocY);
  ctx.lineTo(plotRight, pocY);
  ctx.stroke();
  ctx.setLineDash([]);

  const vahY = priceToY(vp.vah, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);
  const valY = priceToY(vp.val, minPrice, heightScale, chartHeight, zoomLevelY, panOffsetY);

  ctx.strokeStyle = CHART_COLORS.VP_VAH_LINE;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(plotLeft, vahY);
  ctx.lineTo(plotRight, vahY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(plotLeft, valY);
  ctx.lineTo(plotRight, valY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = `${CHART_DEFAULTS.FONT_SIZE_AXIS - 1}px ${CHART_DEFAULTS.FONT_FAMILY}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';

  const labelWidth = 80;
  const labelX = plotRight - maxBarWidth - labelWidth - 4;

  ctx.fillStyle = 'rgba(20, 24, 35, 0.8)';
  ctx.fillRect(labelX, pocY - 8, labelWidth, 16);
  ctx.fillStyle = CHART_COLORS.VP_POC_LABEL;
  ctx.fillText(`POC ${formatPrice(pocPrice)}`, labelX + labelWidth - 2, pocY);

  ctx.fillStyle = 'rgba(20, 24, 35, 0.8)';
  ctx.fillRect(labelX, vahY - 8, labelWidth, 16);
  ctx.fillStyle = CHART_COLORS.VP_VA_LABEL;
  ctx.fillText(`VAH ${formatPrice(vp.vah)}`, labelX + labelWidth - 2, vahY);

  ctx.fillStyle = 'rgba(20, 24, 35, 0.8)';
  ctx.fillRect(labelX, valY - 8, labelWidth, 16);
  ctx.fillStyle = CHART_COLORS.VP_VA_LABEL;
  ctx.fillText(`VAL ${formatPrice(vp.val)}`, labelX + labelWidth - 2, valY);

  ctx.restore();
};