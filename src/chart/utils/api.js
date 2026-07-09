import { CHART_CONSTANTS } from './constants';
import { formatKlines, formatLiquidations } from './format';

export const buildKlinesUrl = (symbol, interval) =>
  `${CHART_CONSTANTS.KLINES_URL}?symbol=${symbol}&interval=${interval}&limit=${CHART_CONSTANTS.DEFAULT_KLINES_LIMIT}`;

export const buildLiquidationsUrl = (symbol, days = CHART_CONSTANTS.LIQUIDATIONS_DAYS) => {
  if (!symbol) return CHART_CONSTANTS.PROXY_URL;
  const endTime = Date.now();
  const startTime = endTime - days * 24 * 60 * 60 * 1000;
  return `${CHART_CONSTANTS.PROXY_URL}?symbol=${symbol}&startTime=${startTime}&endTime=${endTime}&limit=${CHART_CONSTANTS.DEFAULT_LIQUIDATIONS_LIMIT}`;
};

export const fetchKlines = async (symbol, interval) => {
  try {
    const response = await fetch(buildKlinesUrl(symbol, interval));
    const raw = await response.json();
    return formatKlines(raw);
  } catch (error) {
    console.error('Error al cargar klines:', error);
    return [];
  }
};

export const fetchLiquidations = async (symbol) => {
  try {
    const response = await fetch(buildLiquidationsUrl(symbol));
    const raw = await response.json();
    return formatLiquidations(raw);
  } catch (error) {
    console.error('Error al cargar liquidaciones:', error);
    return [];
  }
};