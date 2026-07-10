const DEFAULT_BIN_COUNT = 100;
const DEFAULT_VALUE_AREA_RATIO = 0.7;

export const calculateVolumeProfile = (data, minPrice, maxPrice, {
  binCount = DEFAULT_BIN_COUNT,
  valueAreaRatio = DEFAULT_VALUE_AREA_RATIO,
} = {}) => {
  if (!data || data.length === 0 || maxPrice <= minPrice) {
    return { bins: [], pocIndex: 0, vah: maxPrice, val: minPrice, totalVolume: 0 };
  }

  const bins = new Array(binCount).fill(0);
  const binSize = (maxPrice - minPrice) / binCount;

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const vol = candle.vol || 0;
    if (vol === 0) continue;

    const lowIdx = Math.floor((candle.low - minPrice) / binSize);
    const highIdx = Math.ceil((candle.high - minPrice) / binSize);
    const clampedLow = Math.max(0, Math.min(binCount - 1, lowIdx));
    const clampedHigh = Math.max(0, Math.min(binCount - 1, highIdx));
    const span = clampedHigh - clampedLow + 1;

    const volPerBin = vol / span;
    for (let b = clampedLow; b <= clampedHigh; b++) {
      bins[b] += volPerBin;
    }
  }

  let totalVolume = 0;
  let pocIndex = 0;
  let maxVol = 0;
  for (let b = 0; b < binCount; b++) {
    totalVolume += bins[b];
    if (bins[b] > maxVol) {
      maxVol = bins[b];
      pocIndex = b;
    }
  }

  let vah = maxPrice;
  let val = minPrice;

  if (totalVolume > 0) {
    const targetVol = totalVolume * valueAreaRatio;
    let accumulated = bins[pocIndex];
    let lowIdx = pocIndex - 1;
    let highIdx = pocIndex + 1;

    while (accumulated < targetVol && (lowIdx >= 0 || highIdx < binCount)) {
      const lowVol = lowIdx >= 0 ? bins[lowIdx] : -1;
      const highVol = highIdx < binCount ? bins[highIdx] : -1;

      if (highVol >= lowVol) {
        accumulated += bins[highIdx];
        highIdx++;
      } else {
        accumulated += bins[lowIdx];
        lowIdx--;
      }
    }

    val = minPrice + Math.max(0, lowIdx + 1) * binSize;
    vah = minPrice + Math.min(binCount, highIdx) * binSize;
  }

  const maxBinVol = maxVol || 1;

  return { bins, pocIndex, vah, val, totalVolume, maxBinVol, _vMin: minPrice, _vMax: maxPrice };
};
