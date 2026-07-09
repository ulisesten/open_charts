export const calculateSMA = (data, period) => {
  if (!data || data.length === 0) return [];
  const result = new Array(data.length).fill(null);
  if (period <= 0) return result;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;
    count++;
    if (count > period) {
      sum -= data[i - period].close;
      count = period;
    }
    if (count === period) {
      result[i] = sum / period;
    }
  }
  return result;
};

const MA_PERIODS = [50, 100, 200];

export const calculateMovingAverages = (data) => {
  if (!data || data.length === 0) return [];
  const arrays = MA_PERIODS.map((p) => calculateSMA(data, p));
  const result = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = { ma50: arrays[0][i], ma100: arrays[1][i], ma200: arrays[2][i] };
  }
  return result;
};
