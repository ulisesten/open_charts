export const formatKlines = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((el) => ({
    time: el[0],
    open: parseFloat(el[1]),
    high: parseFloat(el[2]),
    low: parseFloat(el[3]),
    close: parseFloat(el[4]),
    vol: parseFloat(el[5]),
  }));
};

export const formatLiquidations = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => ({
    price: parseFloat(item.price),
    side: item.side,
    quantity: parseFloat(item.executedQty),
    time: item.time,
  }));
};

export const floor2 = (num) => Math.floor(num * 100) / 100;

export const formatPrice = (price, tickSize) => {
  if (price == null || Number.isNaN(price)) return '';
  let decimals = price >= 1 ? 2 : 4;
  if (tickSize && tickSize > 0) {
    decimals = Math.max(0, Math.min(8, Math.ceil(-Math.log10(tickSize))));
  }
  return price.toFixed(decimals);
};

export const formatTimeLabel = (date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const DAY_MS = 86_400_000;

export const formatAxisTime = (date, unitMs) => {
  const isMidnight = date.getUTCHours() === 0 && date.getUTCMinutes() === 0;
  if (unitMs >= DAY_MS || isMidnight) {
    return date.toLocaleDateString([], { day: '2-digit', month: 'short' });
  }
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};