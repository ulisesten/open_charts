import { CHART_CONSTANTS, CHART_DEFAULTS, CHART_SYMBOLS, CHART_INTERVALS } from './constants';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const SETTING_DEFS = {
  symbol: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_SYMBOL,
    defaultValue: CHART_CONSTANTS.DEFAULT_SYMBOL,
    parse: (value) => String(value).toUpperCase(),
    validate: (value) => CHART_SYMBOLS.includes(value),
  },
  interval: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_INTERVAL,
    defaultValue: CHART_CONSTANTS.DEFAULT_INTERVAL,
    parse: (value) => String(value).toLowerCase(),
    validate: (value) => CHART_INTERVALS.includes(value),
  },
  zoomX: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_ZOOM_X,
    defaultValue: 1,
    parse: (value) => parseFloat(value),
    clamp: (value) => clamp(value, CHART_DEFAULTS.ZOOM_MIN, CHART_DEFAULTS.ZOOM_MAX),
    validate: (value) => Number.isFinite(value) && value > 0,
  },
  zoomY: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_ZOOM_Y,
    defaultValue: 1,
    parse: (value) => parseFloat(value),
    clamp: (value) => clamp(value, CHART_DEFAULTS.ZOOM_MIN, CHART_DEFAULTS.ZOOM_MAX),
    validate: (value) => Number.isFinite(value) && value > 0,
  },
  panX: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_PAN_X,
    defaultValue: CHART_DEFAULTS.INITIAL_PAN_OFFSET_X,
    parse: (value) => parseFloat(value),
    validate: (value) => Number.isFinite(value),
  },
  panY: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_PAN_Y,
    defaultValue: 0,
    parse: (value) => parseFloat(value),
    validate: (value) => Number.isFinite(value),
  },
  subHeightVh: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_SUB_PANEL_VH,
    defaultValue: CHART_DEFAULTS.SUB_PANEL_DEFAULT_VH,
    parse: (value) => parseFloat(value),
    clamp: (value) => clamp(value, CHART_DEFAULTS.SUB_PANEL_MIN_VH, CHART_DEFAULTS.SUB_PANEL_MAX_VH),
    validate: (value) => Number.isFinite(value),
  },
  rsiHeightVh: {
    storageKey: CHART_DEFAULTS.STORAGE_KEY_RSI_PANEL_VH,
    defaultValue: CHART_DEFAULTS.RSI_PANEL_DEFAULT_VH,
    parse: (value) => parseFloat(value),
    clamp: (value) => clamp(value, CHART_DEFAULTS.RSI_PANEL_MIN_VH, CHART_DEFAULTS.RSI_PANEL_MAX_VH),
    validate: (value) => Number.isFinite(value),
  },
};

const storage = typeof window !== 'undefined' ? window.localStorage : null;

const safeGet = (key) => {
  try {
    return storage ? storage.getItem(key) : null;
  } catch (error) {
    console.warn('No se pudo leer de localStorage:', error);
    return null;
  }
};

const safeSet = (key, value) => {
  try {
    if (storage) storage.setItem(key, String(value));
  } catch (error) {
    console.warn('No se pudo escribir en localStorage:', error);
  }
};

const safeRemove = (key) => {
  try {
    if (storage) storage.removeItem(key);
  } catch (error) {
    console.warn('No se pudo borrar de localStorage:', error);
  }
};

const parseSetting = (def, rawValue) => {
  let value = def.parse(rawValue);
  if (def.clamp) value = def.clamp(value);
  if (def.validate && !def.validate(value)) return null;
  return value;
};

export const getChartSetting = (name) => {
  const def = SETTING_DEFS[name];
  if (!def) return undefined;
  const rawValue = safeGet(def.storageKey);
  if (rawValue === null) return def.defaultValue;
  const value = parseSetting(def, rawValue);
  return value == null ? def.defaultValue : value;
};

export const getChartSettings = () => {
  const settings = {};
  for (const name of Object.keys(SETTING_DEFS)) {
    settings[name] = getChartSetting(name);
  }
  return settings;
};

export const getDefaultChartSettings = () => {
  const settings = {};
  for (const name of Object.keys(SETTING_DEFS)) {
    settings[name] = SETTING_DEFS[name].defaultValue;
  }
  return settings;
};

export const setChartSetting = (name, value) => {
  const def = SETTING_DEFS[name];
  if (!def) return;
  const parsed = def.parse(value);
  const finalValue = def.clamp ? def.clamp(parsed) : parsed;
  if (def.validate && !def.validate(finalValue)) return;
  safeSet(def.storageKey, finalValue);
};

export const setChartSettings = (settings) => {
  for (const [name, value] of Object.entries(settings)) {
    setChartSetting(name, value);
  }
};

export const hasChartSetting = (name) => {
  const def = SETTING_DEFS[name];
  if (!def) return false;
  return safeGet(def.storageKey) !== null;
};

export const resetChartSetting = (name) => {
  const def = SETTING_DEFS[name];
  if (!def) return;
  safeRemove(def.storageKey);
};

export const registerChartSetting = (name, definition) => {
  if (!name || !definition || typeof definition.parse !== 'function') return;
  SETTING_DEFS[name] = definition;
};
