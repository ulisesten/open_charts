import { TICK_OPTIONS, TIME_UNITS_MS } from './constants';

const DAY_MS = 86_400_000;

export const computePriceRange = (data) => {
  if (!data.length) return { min: 0, max: 0, range: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < data.length; i++) {
    if (data[i].low < min) min = data[i].low;
    if (data[i].high > max) max = data[i].high;
  }
  return { min, max, range: max - min || 1 };
};

export const optimalTickSize = (range, targetCount) => {
  const maxTick = range / Math.max(1, targetCount);
  for (let i = 0; i < TICK_OPTIONS.length; i++) {
    if (TICK_OPTIONS[i] > maxTick) return TICK_OPTIONS[i];
  }
  return Math.pow(10, Math.floor(Math.log10(maxTick)));
};

export const floorPrice = (min) => Math.floor(min / 10) * 10;

export const priceTickValues = (minPrice, maxPrice, priceRange, intervalCount) => {
  const ticks = [];
  const tickSize = optimalTickSize(priceRange, intervalCount);
  let price = floorPrice(minPrice);
  let i = 0;
  while (price < maxPrice + tickSize && i < 200) {
    if (price >= minPrice) ticks.push(price);
    price += tickSize;
    i++;
  }
  return ticks;
};

export const visiblePriceRange = (chartHeight, minPrice, heightScale, zoomY, panY) => {
  const maxY = yToPrice(0, minPrice, heightScale, chartHeight, zoomY, panY);
  const minY = yToPrice(chartHeight, minPrice, heightScale, chartHeight, zoomY, panY);
  return {
    min: Math.min(minY, maxY),
    max: Math.max(minY, maxY),
    range: Math.abs(maxY - minY) || 1,
  };
};

export const chooseTimeUnit = (intervalMs, pixelsPerCandle, minGap) => {
  const interval = Math.max(1, intervalMs || 0);
  const px = Math.max(0.0001, pixelsPerCandle);
  for (let i = 0; i < TIME_UNITS_MS.length; i++) {
    const unit = TIME_UNITS_MS[i];
    if ((unit / interval) * px >= minGap) return unit;
  }
  return TIME_UNITS_MS[TIME_UNITS_MS.length - 1];
};

export const labeledTimeIndices = (data, unitMs) => {
  const indices = [];
  if (!data || data.length === 0) return indices;

  if (unitMs < DAY_MS) {
    for (let i = 0; i < data.length; i++) {
      if (data[i].time % unitMs === 0) indices.push(i);
    }
  } else {
    const dayStep = Math.max(1, Math.round(unitMs / DAY_MS));
    let lastDay = Number.NaN;
    let count = 0;
    for (let i = 0; i < data.length; i++) {
      const dayNum = Math.floor(data[i].time / DAY_MS);
      if (dayNum !== lastDay) {
        if (count % dayStep === 0) indices.push(i);
        lastDay = dayNum;
        count++;
      }
    }
  }
  return indices;
};

export const priceToY = (price, minPrice, heightScale, chartHeight, zoomY, panY) =>
  (chartHeight - (price - minPrice) * heightScale) * zoomY + panY;

export const yToPrice = (y, minPrice, heightScale, chartHeight, zoomY, panY) =>
  minPrice + (chartHeight - (y - panY) / zoomY) / heightScale;

export const candleIndexAtX = (x, panOffset, zoom, widthScale) =>
  Math.floor((x - panOffset) / zoom / widthScale);