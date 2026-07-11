import { CHART_COLORS, CHART_DEFAULTS } from './constants';

const wilderSmoothing = (values, period) => {
  const out = new Array(values.length).fill(null);
  if (values.length < period) return out;
  let sum = 0;
  for (let i = 0; i < period; i++) sum += values[i];
  out[period - 1] = sum;
  for (let i = period; i < values.length; i++) {
    out[i] = out[i - 1] - out[i - 1] / period + values[i];
  }
  return out;
};

export const ADX_KEY_LEVEL_DEFAULT = 23;

export const calculateAdx = (data, {
  length = CHART_DEFAULTS.ADX_LENGTH,
} = {}) => {
  if (!data || data.length < length + 1) {
    return (data || []).map(() => ({ adx: null, plusDI: null, minusDI: null }));
  }

  const plusDM = new Array(data.length).fill(0);
  const minusDM = new Array(data.length).fill(0);
  const tr = new Array(data.length).fill(0);

  for (let i = 1; i < data.length; i++) {
    const up = data[i].high - data[i - 1].high;
    const down = data[i - 1].low - data[i].low;
    plusDM[i] = (up > down && up > 0) ? up : 0;
    minusDM[i] = (down > up && down > 0) ? down : 0;

    const hl = data[i].high - data[i].low;
    const hc = Math.abs(data[i].high - data[i - 1].close);
    const lc = Math.abs(data[i].low - data[i - 1].close);
    tr[i] = Math.max(hl, hc, lc);
  }

  const trSmooth = wilderSmoothing(tr.slice(1), length);
  const plusSmooth = wilderSmoothing(plusDM.slice(1), length);
  const minusSmooth = wilderSmoothing(minusDM.slice(1), length);

  const out = new Array(data.length).fill(null).map(() => ({ adx: null, plusDI: null, minusDI: null }));

  const dxValues = new Array(data.length).fill(null);
  for (let i = 0; i < data.length - 1; i++) {
    const s = trSmooth[i];
    if (s == null || s === 0) continue;
    const pdi = 100 * (plusSmooth[i] / s);
    const mdi = 100 * (minusSmooth[i] / s);
    const denom = pdi + mdi;
    const dx = denom === 0 ? 0 : 100 * Math.abs(pdi - mdi) / denom;
    dxValues[i + 1] = dx;
    out[i + 1] = { adx: null, plusDI: pdi, minusDI: mdi };
  }

  const adxSmooth = wilderSmoothing(
    dxValues.filter((v) => v != null),
    length
  );

  let adxIdx = 0;
  for (let i = 0; i < data.length; i++) {
    if (dxValues[i] == null) continue;
    if (adxIdx < adxSmooth.length && adxSmooth[adxIdx] != null) {
      out[i].adx = adxSmooth[adxIdx] / length;
    }
    adxIdx++;
  }

  return out;
};

export const adxColor = (value) =>
  value >= 25 ? CHART_COLORS.ADX : CHART_COLORS.ADX_DIM;