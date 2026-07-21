import { CHART_COLORS, CHART_DEFAULTS } from './constants';

export const RSI_DEFAULT_LENGTH = 14;

export const calculateRsi = (data, {
  length = CHART_DEFAULTS.RSI_LENGTH,
} = {}) => {
  if (!data || data.length === 0) return [];
  const out = new Array(data.length).fill(null);
  if (data.length < length + 1) return out;

  let gainSum = 0;
  let lossSum = 0;
  for (let i = 1; i <= length; i++) {
    const change = data[i].close - data[i - 1].close;
    if (change >= 0) gainSum += change;
    else lossSum -= change;
  }
  let avgGain = gainSum / length;
  let avgLoss = lossSum / length;

  out[length] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = length + 1; i < data.length; i++) {
    const change = data[i].close - data[i - 1].close;
    const gain = change >= 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (length - 1) + gain) / length;
    avgLoss = (avgLoss * (length - 1) + loss) / length;
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss;
    out[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);
  }

  return out.map((v) => (v == null ? null : {
    value: v,
    overbought: v >= 70,
    oversold: v <= 30,
  }));
};

export const rsiColor = () => CHART_COLORS.RSI;
