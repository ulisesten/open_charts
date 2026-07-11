export const calculateVolumeProfile = (data, minPrice, maxPrice, {
  binCount,
  valueAreaRatio,
} = {}) => {
  const finalBinCount = binCount || 100;
  const finalValueAreaRatio = valueAreaRatio != null ? valueAreaRatio : 0.7;
  if (!data || data.length === 0 || maxPrice <= minPrice) {
    return { bins: [], pocIndex: 0, vah: maxPrice, val: minPrice, totalVolume: 0 };
  }

  const bins = new Array(finalBinCount).fill(0);
  const binSize = (maxPrice - minPrice) / finalBinCount;

  for (let i = 0; i < data.length; i++) {
    const candle = data[i];
    const vol = candle.vol || 0;
    if (vol === 0) continue;

    const lowIdx = Math.floor((candle.low - minPrice) / binSize);
    const highIdx = Math.ceil((candle.high - minPrice) / binSize);
    const clampedLow = Math.max(0, Math.min(finalBinCount - 1, lowIdx));
    const clampedHigh = Math.max(0, Math.min(finalBinCount - 1, highIdx));
    const span = clampedHigh - clampedLow + 1;

    const volPerBin = vol / span;
    for (let b = clampedLow; b <= clampedHigh; b++) {
      bins[b] += volPerBin;
    }
  }

  let totalVolume = 0;
  let pocIndex = 0;
  let maxVol = 0;
  for (let b = 0; b < finalBinCount; b++) {
    totalVolume += bins[b];
    if (bins[b] > maxVol) {
      maxVol = bins[b];
      pocIndex = b;
    }
  }

  let vah = maxPrice;
  let val = minPrice;

  if (totalVolume > 0) {
    const targetVol = totalVolume * finalValueAreaRatio;
    let accumulated = bins[pocIndex];
    let lowIdx = pocIndex - 1;
    let highIdx = pocIndex + 1;

    while (accumulated < targetVol && (lowIdx >= 0 || highIdx < finalBinCount)) {
      const lowVol = lowIdx >= 0 ? bins[lowIdx] : -1;
      const highVol = highIdx < finalBinCount ? bins[highIdx] : -1;

      if (highVol >= lowVol) {
        accumulated += bins[highIdx];
        highIdx++;
      } else {
        accumulated += bins[lowIdx];
        lowIdx--;
      }
    }

    val = minPrice + Math.max(0, lowIdx + 1) * binSize;
    vah = minPrice + Math.min(finalBinCount, highIdx) * binSize;
  }

  const maxBinVol = maxVol || 1;

  return { bins, pocIndex, vah, val, totalVolume, maxBinVol, _vMin: minPrice, _vMax: maxPrice };
};
