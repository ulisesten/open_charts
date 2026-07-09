import { CHART_COLORS, CHART_DEFAULTS } from './constants';

const sma = (values, period) => values.map((_, idx) => {
  if (idx < period - 1) return null;
  const slice = values.slice(idx - period + 1, idx + 1);
  if (slice.some(v => v === null)) return null;
  return slice.reduce((a, b) => a + b, 0) / period;
});

const trueRange = (high, low, prevClose) =>
  Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));

const atr = (highs, lows, closes, period) => {
  const tr = highs.map((h, i) => (i === 0 ? null : trueRange(h, lows[i], closes[i - 1])));
  return sma(tr, period);
};

const stdDev = (slice, mean, period) => {
  const variance = slice.reduce((acc, v) => acc + (v - mean) ** 2, 0) / period;
  return Math.sqrt(variance);
};

const linreg = (values, period) => values.map((_, idx) => {
  if (idx < period - 1) return null;
  const slice = values.slice(idx - period + 1, idx + 1);
  if (slice.some(v => v === null)) return null;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  for (let i = 0; i < period; i++) {
    sumX += i;
    sumY += slice[i];
    sumXY += i * slice[i];
    sumXX += i * i;
  }
  const slope = (period * sumXY - sumX * sumY) / (period * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / period;
  return slope * (period - 1) + intercept;
});

const smiColor = (value, prev) => {
  if (value > 0) return value > prev ? CHART_COLORS.SMI_UP : CHART_COLORS.SMI_UP_DIM;
  return value < prev ? CHART_COLORS.SMI_DOWN : CHART_COLORS.SMI_DOWN_DIM;
};

export const calculateSmi = (data, {
  length = CHART_DEFAULTS.SMI_LENGTH,
  mult = CHART_DEFAULTS.SMI_BB_MULT,
  lengthKC = CHART_DEFAULTS.SMI_KC_LENGTH,
  multKC = CHART_DEFAULTS.SMI_KC_MULT,
} = {}) => {
  if (!data || data.length === 0) return [];
  const closes = data.map(d => d.close);
  const highs = data.map(d => d.high);
  const lows = data.map(d => d.low);

  const bbMiddle = sma(closes, length);
  const bbUpper = bbMiddle.map((mid, i) => {
    if (mid === null) return null;
    const slice = closes.slice(i - length + 1, i + 1);
    return mid + mult * stdDev(slice, mid, length);
  });
  const bbLower = bbMiddle.map((mid, i) => {
    if (mid === null) return null;
    const slice = closes.slice(i - length + 1, i + 1);
    return mid - mult * stdDev(slice, mid, length);
  });

  const kcMiddle = sma(closes, lengthKC);
  const atrValues = atr(highs, lows, closes, lengthKC);
  const kcUpper = kcMiddle.map((mid, i) =>
    (mid == null || atrValues[i] == null) ? null : mid + atrValues[i] * multKC);
  const kcLower = kcMiddle.map((mid, i) =>
    (mid == null || atrValues[i] == null) ? null : mid - atrValues[i] * multKC);

  const squeezeOn = bbLower.map((bbL, i) =>
    bbL != null && kcLower[i] != null && bbL > kcLower[i] && bbUpper[i] < kcUpper[i]);

  const momentumInput = data.map((d, i) => {
    if (i < length - 1) return null;
    const slice = closes.slice(i - length + 1, i + 1);
    const s = slice.reduce((a, b) => a + b, 0) / length;
    return d.close - s;
  });

  const raw = linreg(momentumInput, length);
  const nonNull = raw.filter(v => v !== null).map(Math.abs);
  const maxAbs = nonNull.length ? Math.max(...nonNull) : 0;
  const scale = maxAbs > 0 ? 100 / maxAbs : 1;

  return data.map((d, i) => {
    const value = raw[i] === null ? null : raw[i] * scale;
    const prev = raw[i - 1] === null ? 0 : raw[i - 1] * scale;
    return {
      value,
      color: value === null ? null : smiColor(value, prev),
      squeeze: squeezeOn[i],
    };
  });
};