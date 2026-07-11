import {
  CHART_COLORS, CHART_DEFAULTS, CHART_CONSTANTS,
} from './utils/constants';
import { computePriceRange, yToPrice, visiblePriceRange } from './utils/scales';
import { floor2 } from './utils/format';
import { calculateSmi } from './utils/sqzMomentum';
import { calculateAdx } from './utils/adx';
import { calculateMovingAverages } from './utils/movingAverages';
import { calculateVolumeProfile } from './utils/volumeProfile';
import {
  drawGrid, drawHeatmap, drawCandles, drawMovingAverages, drawPriceScale, drawTimeScale, drawCrosshair, drawTooltip,
  drawSmi, drawAdx, drawSmiScale, drawAdxScale, drawIndicatorGrid,
} from './rendering';

const DEFAULT_RENDER_STEPS = [
  drawGrid, drawHeatmap, drawCandles, drawMovingAverages, drawPriceScale, drawTimeScale, drawCrosshair, drawTooltip,
];

const SMI_RENDER_STEPS = [
  drawSmi, drawAdx, drawSmiScale, drawAdxScale, drawTimeScale, drawCrosshair,
];

export { SMI_RENDER_STEPS };

export class ChartDrawer {
  constructor(canvasRef, options = {}) {
    this.canvas = canvasRef.current;
    this.ctx = this.canvas.getContext('2d');

    this.lockedX = !!options.lockedX;
    this.isSubPanel = !!options.lockedX;
    this.smiEnabled = !!options.smi;
    this.adxEnabled = !!options.adx;

    this.data = [];
    this.smiData = [];
    this.adxData = [];
    this.movingAverages = [];
    this.liquidations = [];
    this._vpCache = null;
    this._vpCacheKey = '';
    this._vpThrottleTime = 0;
    this.symbol = CHART_CONSTANTS.DEFAULT_SYMBOL;
    this.interval = CHART_CONSTANTS.DEFAULT_INTERVAL;

    this.zoomLevel = 1;
    this.zoomLevelY = 1;
    this.panOffset = CHART_DEFAULTS.INITIAL_PAN_OFFSET_X;
    this.panOffsetY = 0;
    this.maxPanOffsetY = 0;

    this.rightAxisWidth = options.rightAxisWidth != null
      ? options.rightAxisWidth
      : CHART_DEFAULTS.PRICE_AXIS_WIDTH;
    this.priceAxisWidth = this.rightAxisWidth;
    this.leftAxisWidth = options.leftAxisWidth != null ? options.leftAxisWidth : 0;
    this.rightIndicator = options.rightIndicator || null;
    this.leftIndicator = options.leftIndicator || null;

    this.timeAxisHeight = options.timeAxisHeight != null
      ? options.timeAxisHeight
      : CHART_DEFAULTS.TIME_AXIS_HEIGHT;

    this.hoveredIndex = null;
    this.hoveredCandle = null;
    this.isDragging = false;
    this.isZoomingY = false;
    this.dragMode = null;
    this.activeZoomScale = null;
    this.activePanScale = null;
    this.zoomAnchorY = 0;
    this.zoomStartZoomY = 1;
    this.zoomStartPanY = 0;
    this.lastX = 0;
    this.lastY = 0;
    this.mousePosition = null;
    this.crosshairPoints = { x: null, y: null, price: null, time: null };

    this.tooltipAlpha = 1;
    this.tooltipTimeout = null;
    this.tooltipFadeInterval = null;

    this.rafId = null;
    this.needsRedraw = true;
    this.ws = null;
    this.wsReconnectTimer = null;
    this.boundHandlers = {};

    this.renderSteps = options.renderSteps || DEFAULT_RENDER_STEPS;
    this.hasTooltip = this.renderSteps.includes(drawTooltip);

    this.smiScale = {
      zoomY: 1, panY: 0, min: -100, max: 100, range: 200, heightScale: 1,
      axisWidth: this.rightAxisWidth,
    };
    this.adxScale = {
      zoomY: 1, panY: 0, min: 0, max: CHART_DEFAULTS.ADX_VALUE_MAX,
      range: CHART_DEFAULTS.ADX_VALUE_MAX, heightScale: 1,
      axisWidth: this.leftAxisWidth,
    };

    this.xTransformListeners = [];
    this.crosshairListeners = [];
    this.klineListeners = [];
    this.suppressXNotify = false;
    this.suppressCrosshairNotify = false;
  }

  setData(data) {
    this.data = data;
    this.hoveredIndex = null;
    this.hoveredCandle = null;
    this.movingAverages = calculateMovingAverages(data);
    if (this.smiEnabled) this.smiData = calculateSmi(data);
    if (this.adxEnabled) this.adxData = calculateAdx(data);
    this.calculateScales();
    if (!this.lockedX) {
      this.restoreState();
      this.fitToRightmost();
    }
    this.requestDraw();
    if (!this.lockedX) this.notifyXTransform();
  }

  setSmiData(smiData) {
    this.smiData = smiData || [];
    this.requestDraw();
  }

  addXTransformListener(fn) {
    this.xTransformListeners.push(fn);
  }

  notifyXTransform() {
    if (this.suppressXNotify) return;
    const pan = this.panOffset;
    const zoom = this.zoomLevel;
    for (const fn of this.xTransformListeners) fn(pan, zoom);
  }

  applyXTransform(pan, zoom) {
    this.suppressXNotify = true;
    this.panOffset = pan;
    this.zoomLevel = Math.max(CHART_DEFAULTS.ZOOM_MIN, Math.min(CHART_DEFAULTS.ZOOM_MAX, zoom));
    if (this.isSubPanel) this.calculateWidthScale();
    else this.calculateScales();
    this.requestDraw();
    this.suppressXNotify = false;
  }

  addCrosshairListener(fn) {
    this.crosshairListeners.push(fn);
  }

  notifyCrosshair() {
    if (this.suppressCrosshairNotify) return;
    const pts = { ...this.crosshairPoints };
    for (const fn of this.crosshairListeners) fn(pts);
  }

  setSyncedCrosshair(points) {
    this.suppressCrosshairNotify = true;
    this.mousePosition = null;
    if (!points || points.x == null) {
      this.crosshairPoints = { x: null, y: null, price: null, time: null };
    } else {
      this.crosshairPoints = {
        x: points.x,
        y: null,
        price: null,
        time: points.time ?? null,
      };
    }
    this.requestDraw();
    this.suppressCrosshairNotify = false;
  }

  addKlineListener(fn) {
    this.klineListeners.push(fn);
  }

  notifyKline(kline) {
    for (const fn of this.klineListeners) fn(kline);
  }

  getPanX() {
    return this.panOffset;
  }

  setPanX(value) {
    this.panOffset = value;
    this.requestDraw();
    this.notifyXTransform();
  }

  getZoomX() {
    return this.zoomLevel;
  }

  setZoomX(value) {
    this.zoomLevel = Math.max(CHART_DEFAULTS.ZOOM_MIN, Math.min(CHART_DEFAULTS.ZOOM_MAX, value));
    this.requestDraw();
    this.notifyXTransform();
  }

  saveState() {
    if (this.lockedX) return;
    try {
      localStorage.setItem(CHART_CONSTANTS.STORAGE_KEY_PAN_X, String(this.panOffset));
      localStorage.setItem(CHART_CONSTANTS.STORAGE_KEY_ZOOM_X, String(this.zoomLevel));
    } catch (e) {
      console.warn('No se pudo guardar el estado en localStorage:', e);
    }
  }

  restoreState() {
    try {
      if (this.lockedX) return;
      const panX = localStorage.getItem(CHART_CONSTANTS.STORAGE_KEY_PAN_X);
      const zoomX = localStorage.getItem(CHART_CONSTANTS.STORAGE_KEY_ZOOM_X);
      if (panX !== null) this.panOffset = parseFloat(panX);
      if (zoomX !== null) this.zoomLevel = Math.max(CHART_DEFAULTS.ZOOM_MIN, Math.min(CHART_DEFAULTS.ZOOM_MAX, parseFloat(zoomX)));
    } catch (e) {
      console.warn('No se pudo restaurar el estado desde localStorage:', e);
    }
  }

  fitToRightmost() {
    if (this.lockedX) return;
    if (!this.data || this.data.length === 0 || !this.chartWidth) return;

    let zoomRestored = false;
    try {
      zoomRestored = localStorage.getItem(CHART_CONSTANTS.STORAGE_KEY_ZOOM_X) !== null;
    } catch { zoomRestored = false; }

    if (!zoomRestored) {
      const baseWidthScale = this.chartWidth / this.data.length;
      const target = CHART_DEFAULTS.TARGET_CANDLE_WIDTH_PX;
      const zoom = target / baseWidthScale;
      this.zoomLevel = Math.max(CHART_DEFAULTS.ZOOM_MIN, Math.min(CHART_DEFAULTS.ZOOM_MAX, zoom));
    }

    const baseWidthScale = this.chartWidth / Math.max(1, this.data.length);
    const lastX = this.data.length * baseWidthScale * this.zoomLevel;
    this.panOffset = this.chartWidth - lastX;
    if (!zoomRestored) {
      this.zoomLevelY = 1;
      this.panOffsetY = 0;
    }
    this.calculateScales();
  }

  setLiquidations(liquidations) {
    this.liquidations = liquidations;
    this.requestDraw();
  }

  getCrossHairPoints() {
    return { ...this.crosshairPoints };
  }

  setCrossHairPoints(points) {
    if (!points) {
      this.crosshairPoints = { x: null, y: null, price: null, time: null };
    } else {
      this.crosshairPoints = {
        x: points.x ?? this.crosshairPoints.x,
        y: points.y ?? this.crosshairPoints.y,
        price: points.price ?? this.crosshairPoints.price,
        time: points.time ?? this.crosshairPoints.time,
      };
    }
    this.requestDraw();
  }

  calculateScales() {
    if (!this.canvas) return;
    const chartWidth = Math.max(1, this.canvas.width - this.rightAxisWidth - this.leftAxisWidth);
    const chartHeight = Math.max(1, this.canvas.height - this.timeAxisHeight);

    this.chartWidth = chartWidth;
    this.chartHeight = chartHeight;
    this.maxPanOffsetY = this.canvas.height * 0.4 * Math.max(1, this.zoomLevelY);

    if (this.data.length && !this.isSubPanel) {
      const { min, max, range } = computePriceRange(this.data);
      this.minPrice = min;
      this.maxPrice = max;
      this.priceRange = range;
      this.heightScale = (chartHeight * 0.9) / this.priceRange;
    }

    this.widthScale = chartWidth / Math.max(1, this.data.length);
    this.candleWidth = this.widthScale * CHART_DEFAULTS.CANDLE_BODY_RATIO;
    this.candleIntervalMs = this.data.length > 1
      ? this.data[1].time - this.data[0].time
      : 0;
    this.pricescaleIntervalCount = Math.max(8, Math.round((chartHeight * 0.9 * this.zoomLevelY) / CHART_DEFAULTS.PRICE_TICK_TARGET_PX));

    if (this.rightIndicator === 'smi') {
      let maxAbs = 0;
      for (const d of this.smiData) {
        if (d && d.value != null) maxAbs = Math.max(maxAbs, Math.abs(d.value));
      }
      if (maxAbs === 0) maxAbs = 100;
      this.smiScale.min = -maxAbs;
      this.smiScale.max = maxAbs;
      this.smiScale.range = 2 * maxAbs;
      this.smiScale.heightScale = (chartHeight * CHART_DEFAULTS.INDICATOR_USABLE_HEIGHT_RATIO) / this.smiScale.range;
    }

    if (this.leftIndicator === 'adx') {
      this.adxScale.min = 0;
      this.adxScale.max = CHART_DEFAULTS.ADX_VALUE_MAX;
      this.adxScale.range = CHART_DEFAULTS.ADX_VALUE_MAX;
      this.adxScale.heightScale = (chartHeight * CHART_DEFAULTS.INDICATOR_USABLE_HEIGHT_RATIO) / this.adxScale.range;
    }
  }

  calculateWidthScale() {
    if (!this.canvas) return;
    const chartWidth = Math.max(1, this.canvas.width - this.rightAxisWidth - this.leftAxisWidth);
    const chartHeight = Math.max(1, this.canvas.height - this.timeAxisHeight);
    this.chartWidth = chartWidth;
    this.chartHeight = chartHeight;
    this.widthScale = chartWidth / Math.max(1, this.data.length);
    this.candleWidth = this.widthScale * CHART_DEFAULTS.CANDLE_BODY_RATIO;
  }

  setupWebSocket(symbol, interval) {
    this.closeWebSocket();
    this.symbol = symbol || this.symbol;
    this.interval = interval || this.interval;
    const stream = `${this.symbol.toLowerCase()}@kline_${this.interval}`;
    this.ws = new WebSocket(`${CHART_CONSTANTS.WS_BASE_URL}/${stream}`);

    this.ws.onopen = () => console.log(`WebSocket conectado: ${stream}`);
    this.ws.onmessage = (event) => this.handleWsMessage(event);
    this.ws.onerror = (err) => console.error('WebSocket error:', err);
    this.ws.onclose = () => {
      console.log('WebSocket cerrado. Reconectando...');
      this.wsReconnectTimer = setTimeout(
        () => this.setupWebSocket(this.symbol, this.interval),
        CHART_DEFAULTS.RECONNECT_DELAY
      );
    };
  }

  handleWsMessage(event) {
    const payload = JSON.parse(event.data);
    if (payload.e !== 'kline' || !payload.k) return;
    const k = payload.k;
    const kline = {
      time: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      vol: parseFloat(k.v),
      closed: k.x === true,
    };
    this.updateLastCandle(kline);
    this.notifyKline(kline);
  }

  closeWebSocket() {
    if (this.wsReconnectTimer) {
      clearTimeout(this.wsReconnectTimer);
      this.wsReconnectTimer = null;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
      this.ws = null;
    }
  }

  updateLastCandle(kline) {
    if (!this.data || this.data.length === 0) return;
    const last = this.data[this.data.length - 1];
    const klineTime = new Date(kline.time).getTime();
    const lastTime = new Date(last.time).getTime();

    if (klineTime === lastTime) {
      last.open = kline.open;
      last.high = kline.high;
      last.low = kline.low;
      last.close = kline.close;
      last.vol = kline.vol;
    } else if (klineTime > lastTime) {
      this.data.push({
        time: kline.time,
        open: kline.open,
        high: kline.high,
        low: kline.low,
        close: kline.close,
        vol: kline.vol,
      });
    } else {
      return;
    }

    if (this.smiEnabled) this.smiData = calculateSmi(this.data);
    if (this.adxEnabled) this.adxData = calculateAdx(this.data);
    this.movingAverages = calculateMovingAverages(this.data);
    if (this.isSubPanel) this.calculateWidthScale();
    else this.calculateScales();
    this.requestDraw();
  }

  _updateVpCache() {
    if (this.isSubPanel || !this.chartWidth || this.data.length === 0) return;
    const pixelsPerCandle = this.widthScale * this.zoomLevel;
    if (pixelsPerCandle <= 0) return;
    const plotLeft = this.leftAxisWidth;
    const plotRight = plotLeft + this.chartWidth;
    const firstIdx = Math.max(0, Math.floor((plotLeft - this.panOffset) / pixelsPerCandle) - 1);
    const lastIdx = Math.min(this.data.length - 1, Math.ceil((plotRight - this.panOffset) / pixelsPerCandle) + 1);
    const visible = visiblePriceRange(this.chartHeight, this.minPrice, this.heightScale, this.zoomLevelY, this.panOffsetY);
    const vpKey = `${firstIdx}-${lastIdx}-${visible.min.toFixed(2)}-${visible.max.toFixed(2)}-${this.data.length}`;
    const now = performance.now();
    if (vpKey !== this._vpCacheKey && now - this._vpThrottleTime > CHART_DEFAULTS.VP_THROTTLE_MS) {
      const slice = this.data.slice(firstIdx, lastIdx + 1);
      this._vpCache = calculateVolumeProfile(slice, visible.min, visible.max, {
        binCount: CHART_DEFAULTS.VP_BIN_COUNT,
        valueAreaRatio: CHART_DEFAULTS.VP_VALUE_AREA_RATIO,
      });
      this._vpCacheKey = vpKey;
      this._vpThrottleTime = now;
    }
  }

  buildState() {
    return {
      data: this.data,
      smiData: this.smiData,
      adxData: this.adxData,
      movingAverages: this.movingAverages,
      volumeProfile: this._vpCache,
      liquidations: this.liquidations,
      hoveredIndex: this.hoveredIndex,
      hoveredCandle: this.hoveredCandle,
      mousePosition: this.mousePosition,
      crosshairPoints: this.crosshairPoints,
      tooltipAlpha: this.tooltipAlpha,
      canvasWidth: this.canvas.width,
      canvasHeight: this.canvas.height,
      chartWidth: this.chartWidth,
      chartHeight: this.chartHeight,
      timeAxisHeight: this.timeAxisHeight,
      priceAxisWidth: this.rightAxisWidth,
      rightAxisWidth: this.rightAxisWidth,
      leftAxisWidth: this.leftAxisWidth,
      minPrice: this.minPrice,
      maxPrice: this.maxPrice,
      priceRange: this.priceRange,
      heightScale: this.heightScale,
      widthScale: this.widthScale,
      candleWidth: this.candleWidth,
      candleIntervalMs: this.candleIntervalMs,
      zoomLevel: this.zoomLevel,
      zoomLevelY: this.zoomLevelY,
      panOffset: this.panOffset,
      panOffsetY: this.panOffsetY,
      maxPanOffsetY: this.maxPanOffsetY,
      pricescaleIntervalCount: this.pricescaleIntervalCount,
      smiScale: this.smiScale,
      adxScale: this.adxScale,
    };
  }

  requestDraw() {
    if (this.rafId != null) return;
    this.rafId = requestAnimationFrame(() => {
      this.rafId = null;
      this.render();
    });
  }

  render() {
    if (this.isSubPanel) this.calculateWidthScale();
    else this.calculateScales();
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = CHART_COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.data || this.data.length === 0) return;

    this._updateVpCache();
    const state = this.buildState();

    for (const step of this.renderSteps) step(state, ctx);

    if (this.hasTooltip && this.tooltipAlpha > 0 && this.hoveredIndex === null) {
      this.tooltipAlpha = Math.max(0, this.tooltipAlpha - CHART_DEFAULTS.TOOLTIP_FADE_STEP);
      if (this.tooltipAlpha > 0) this.requestDraw();
    }
  }

  draw() {
    this.requestDraw();
  }

  setupMouseEvents() {
    if (this.boundHandlers._registered) return;
    this.boundHandlers._registered = true;

    const onMouseMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.mousePosition = { x: mouseX, y: mouseY };
      const prevHovered = this.hoveredIndex;

      if (this.isZoomingY) {
        this.applyVerticalZoom(mouseY);
      } else if (this.isDragging) {
        const dx = mouseX - this.lastX;
        const dy = mouseY - this.lastY;
        this.lastX = mouseX;
        this.lastY = mouseY;

        if (this.dragMode === 'panSmiY') {
          this.smiScale.panY += dy;
        } else if (this.dragMode === 'panAdxY') {
          this.adxScale.panY += dy;
        } else {
          this.panOffset += dx;
          if (!this.isSubPanel) {
            this.panOffsetY += dy;
          }
          if (!this._saveTimer) {
            this._saveTimer = setTimeout(() => {
              this._saveTimer = null;
              this.saveState();
            }, 1000);
          }
          this.notifyXTransform();
        }
      }

      this.detectHoveredCandle(mouseX, mouseY);
      this.updateCrosshairPoints(mouseX, mouseY);

      if (this.hasTooltip) {
        if (this.hoveredIndex !== null && this.hoveredIndex !== prevHovered) {
          this.tooltipAlpha = 1;
          if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
          this.stopTooltipFade();
        } else if (this.hoveredIndex === null && prevHovered !== null) {
          this.startTooltipFadeOut();
        }
      }

      this.requestDraw();
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      this.lastX = mouseX;
      this.lastY = mouseY;

      if (this.isSubPanel && this.isOverRightAxis(mouseX)) {
        this.isDragging = true;
        this.dragMode = 'panSmiY';
        this.canvas.style.cursor = 'ns-resize';
      } else if (this.isSubPanel && this.isOverLeftAxis(mouseX) && this.leftIndicator) {
        this.isDragging = true;
        this.dragMode = 'panAdxY';
        this.canvas.style.cursor = 'ns-resize';
      } else if (!this.isSubPanel && this.isOverRightAxis(mouseX)) {
        this.isZoomingY = true;
        this.zoomAnchorY = mouseY;
        this.zoomTarget = 'price';
        this.activeZoomScale = null;
        this.zoomStartZoomY = this.zoomLevelY;
        this.zoomStartPanY = this.panOffsetY;
        this.canvas.style.cursor = 'ns-resize';
      } else {
        this.isDragging = true;
        this.dragMode = 'panX';
        this.canvas.style.cursor = 'grabbing';
      }
    };

    const onMouseUp = (e) => {
      if (e.button !== 0) return;
      this.isDragging = false;
      this.isZoomingY = false;
      this.dragMode = null;
      this.zoomTarget = null;
      this.activeZoomScale = null;
      this.canvas.style.cursor = 'default';
      if (!this.isSubPanel) this.saveState();
    };

    const onWheel = (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      if (mouseX >= this.canvas.width - this.rightAxisWidth) {
        if (this.rightIndicator) {
          const oldZoom = this.smiScale.zoomY;
          this.smiScale.zoomY = clampZoom(this.smiScale.zoomY - e.deltaY * CHART_DEFAULTS.WHEEL_ZOOM_Y_SENSITIVITY);
          this.smiScale.panY = mouseY - (mouseY - this.smiScale.panY) * (this.smiScale.zoomY / oldZoom);
        } else {
          const oldZoom = this.zoomLevelY;
          this.zoomLevelY = clampZoom(this.zoomLevelY - e.deltaY * CHART_DEFAULTS.WHEEL_ZOOM_Y_SENSITIVITY);
          this.panOffsetY = mouseY - (mouseY - this.panOffsetY) * (this.zoomLevelY / oldZoom);
        }
      } else if (this.leftIndicator && mouseX <= this.leftAxisWidth) {
        const oldZoom = this.adxScale.zoomY;
        this.adxScale.zoomY = clampZoom(this.adxScale.zoomY - e.deltaY * CHART_DEFAULTS.WHEEL_ZOOM_Y_SENSITIVITY);
        this.adxScale.panY = mouseY - (mouseY - this.adxScale.panY) * (this.adxScale.zoomY / oldZoom);
      } else if (e.shiftKey) {
        this.panOffset -= e.deltaY * CHART_DEFAULTS.WHEEL_PAN_SENSITIVITY;
        this.notifyXTransform();
      } else {
        const oldZoom = this.zoomLevel;
        const relX = mouseX - this.leftAxisWidth;
        this.zoomLevel = clampZoom(this.zoomLevel - e.deltaY * CHART_DEFAULTS.WHEEL_ZOOM_X_SENSITIVITY * CHART_DEFAULTS.WHEEL_ZOOM_X_MODIFIER);
        this.panOffset = relX - (relX - this.panOffset) * (this.zoomLevel / oldZoom);
        this.notifyXTransform();
      }

      this.requestDraw();
      if (!this.isSubPanel) this.saveState();
    };

    const onContext = (e) => e.preventDefault();
    const onBeforeUnload = () => this.saveState();

    this.canvas.addEventListener('mousemove', onMouseMove);
    this.canvas.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mouseup', onMouseUp);
    this.canvas.addEventListener('wheel', onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', onContext);
    window.addEventListener('beforeunload', onBeforeUnload);

    this.boundHandlers = {
      _registered: true,
      mousemove: onMouseMove,
      mousedown: onMouseDown,
      mouseup: onMouseUp,
      wheel: onWheel,
      contextmenu: onContext,
      beforeunload: onBeforeUnload,
    };

    this._setupTouchEvents(onMouseDown, onMouseUp, onMouseMove);
  }

  _setupTouchEvents(onMouseDown, onMouseUp, onMouseMove) {
    if (this.boundHandlers._touchRegistered) return;
    this.boundHandlers._touchRegistered = true;

    this._pinchInitialDist = null;
    this._pinchInitialZoom = 1;
    this._pinchInitialPan = 0;
    this._pinchCenter = null;

    const toCanvasCoords = (touch) => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    };

    const onTouchStart = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const { x, y } = toCanvasCoords(e.touches[0]);
        const fakeEvent = { button: 0, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
        onMouseDown(fakeEvent);
        this.detectHoveredCandle(x, y);
        this.updateCrosshairPoints(x, y);
      } else if (e.touches.length === 2) {
        this.isDragging = false;
        this.dragMode = null;
        const t0 = toCanvasCoords(e.touches[0]);
        const t1 = toCanvasCoords(e.touches[1]);
        const cx = (t0.x + t1.x) / 2;
        const cy = (t0.y + t1.y) / 2;
        this._pinchCenter = { x: cx, y: cy };
        this._pinchInitialDist = Math.hypot(t0.x - t1.x, t0.y - t1.y);
        this._pinchInitialZoom = this.zoomLevel;
        this._pinchInitialPan = this.panOffset;
        this._pinchInitialZoomY = this.zoomLevelY;
        this._pinchInitialPanY = this.panOffsetY;
        this._pinchInitialSmiZoomY = this.smiScale.zoomY;
        this._pinchInitialSmiPanY = this.smiScale.panY;
        this._pinchInitialAdxZoomY = this.adxScale.zoomY;
        this._pinchInitialAdxPanY = this.adxScale.panY;
      }
      this.requestDraw();
    };

    const onTouchMove = (e) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const { x, y } = toCanvasCoords(e.touches[0]);

        if (this.isZoomingY) {
          this.applyVerticalZoom(y);
        } else if (this.isDragging) {
          const dx = x - this.lastX;
          const dy = y - this.lastY;
          this.lastX = x;
          this.lastY = y;

          if (this.dragMode === 'panSmiY') {
            this.smiScale.panY += dy;
          } else if (this.dragMode === 'panAdxY') {
            this.adxScale.panY += dy;
          } else {
            this.panOffset += dx;
            if (!this.isSubPanel) {
              this.panOffsetY += dy;
            }
            if (!this._saveTimer) {
              this._saveTimer = setTimeout(() => {
                this._saveTimer = null;
                this.saveState();
              }, 1000);
            }
            this.notifyXTransform();
          }
        }
      } else if (e.touches.length === 2) {
        const t0 = toCanvasCoords(e.touches[0]);
        const t1 = toCanvasCoords(e.touches[1]);
        const newDist = Math.hypot(t0.x - t1.x, t0.y - t1.y);
        const cx = (t0.x + t1.x) / 2;
        const cy = (t0.y + t1.y) / 2;

        if (!this._pinchInitialDist || !this._pinchCenter) {
          this._pinchCenter = { x: cx, y: cy };
          this._pinchInitialDist = Math.max(1, newDist);
          this._pinchInitialZoom = this.zoomLevel;
          this._pinchInitialPan = this.panOffset;
          this._pinchInitialZoomY = this.zoomLevelY;
          this._pinchInitialPanY = this.panOffsetY;
          this._pinchInitialSmiZoomY = this.smiScale.zoomY;
          this._pinchInitialSmiPanY = this.smiScale.panY;
          this._pinchInitialAdxZoomY = this.adxScale.zoomY;
          this._pinchInitialAdxPanY = this.adxScale.panY;
          this.requestDraw();
          return;
        }

        const scale = Math.max(0.01, newDist / this._pinchInitialDist);
        const anchorRelX = this._pinchCenter.x - this.leftAxisWidth;
        const anchorY = this._pinchCenter.y;
        const deltaCx = cx - this._pinchCenter.x;
        const deltaCy = cy - this._pinchCenter.y;

        const onPriceAxis = this._pinchCenter.x >= this.canvas.width - this.rightAxisWidth;
        const onLeftAxis = this._pinchCenter.x <= this.leftAxisWidth;

        if (this.isSubPanel && (onPriceAxis || onLeftAxis)) {
          const targetScale = onLeftAxis ? this.adxScale : this.smiScale;
          const initialZoom = onLeftAxis ? this._pinchInitialAdxZoomY : this._pinchInitialSmiZoomY;
          const initialPan = onLeftAxis ? this._pinchInitialAdxPanY : this._pinchInitialSmiPanY;
          const newZoom = clampZoom(initialZoom * scale);
          const realScale = newZoom / (initialZoom || CHART_DEFAULTS.EPS);
          targetScale.zoomY = newZoom;
          targetScale.panY = anchorY - (anchorY - initialPan) * realScale + deltaCy;
        } else if (onPriceAxis) {
          const newZoom = clampZoom(this._pinchInitialZoomY * scale);
          const realScale = newZoom / (this._pinchInitialZoomY || CHART_DEFAULTS.EPS);
          this.zoomLevelY = newZoom;
          this.panOffsetY = anchorY - (anchorY - this._pinchInitialPanY) * realScale + deltaCy;
        } else {
          const newZoom = clampZoom(this._pinchInitialZoom * scale);
          const realScale = newZoom / (this._pinchInitialZoom || CHART_DEFAULTS.EPS);
          this.zoomLevel = newZoom;
          this.panOffset = anchorRelX - (anchorRelX - this._pinchInitialPan) * realScale + deltaCx;
          if (this.isSubPanel) this.calculateWidthScale();
          this.notifyXTransform();
        }
      }
      this.requestDraw();
    };

    const onTouchEnd = (e) => {
      e.preventDefault();
      if (e.touches.length === 0) {
        const fakeEvent = { button: 0 };
        onMouseUp(fakeEvent);
        this._pinchInitialDist = null;
        this._pinchInitialZoom = 1;
        this._pinchInitialPan = 0;
        this._pinchCenter = null;
      } else if (e.touches.length === 1) {
        const { x, y } = toCanvasCoords(e.touches[0]);
        this.isDragging = true;
        this.dragMode = 'panX';
        this.lastX = x;
        this.lastY = y;
      }
      this.requestDraw();
    };

    const onTouchCancel = () => {
      this.isDragging = false;
      this.isZoomingY = false;
      this.dragMode = null;
      this._pinchInitialDist = null;
      this._pinchInitialZoom = 1;
      this._pinchInitialPan = 0;
      this._pinchCenter = null;
      this.requestDraw();
    };

    this.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    this.canvas.addEventListener('touchcancel', onTouchCancel, { passive: false });
    this.boundHandlers.touchstart = onTouchStart;
    this.boundHandlers.touchmove = onTouchMove;
    this.boundHandlers.touchend = onTouchEnd;
    this.boundHandlers.touchcancel = onTouchCancel;
  }

  teardownMouseEvents() {
    if (!this.boundHandlers._registered) return;
    this.canvas.removeEventListener('mousemove', this.boundHandlers.mousemove);
    this.canvas.removeEventListener('mousedown', this.boundHandlers.mousedown);
    document.removeEventListener('mouseup', this.boundHandlers.mouseup);
    this.canvas.removeEventListener('wheel', this.boundHandlers.wheel);
    this.canvas.removeEventListener('contextmenu', this.boundHandlers.contextmenu);
    window.removeEventListener('beforeunload', this.boundHandlers.beforeunload);
    if (this.boundHandlers._touchRegistered) {
      this.canvas.removeEventListener('touchstart', this.boundHandlers.touchstart);
      this.canvas.removeEventListener('touchmove', this.boundHandlers.touchmove);
      this.canvas.removeEventListener('touchend', this.boundHandlers.touchend);
      this.canvas.removeEventListener('touchcancel', this.boundHandlers.touchcancel);
    }
    this.boundHandlers = {};
  }

  isOverRightAxis(x) {
    return x >= this.canvas.width - this.rightAxisWidth;
  }

  isOverLeftAxis(x) {
    return this.leftAxisWidth > 0 && x <= this.leftAxisWidth;
  }

  isOverPriceAxis(x) {
    return this.isOverRightAxis(x);
  }

  applyVerticalZoom(mouseY) {
    const chartHeight = this.chartHeight || 1;
    const factor = (this.zoomAnchorY - mouseY) / chartHeight;
    const newZoom = clampZoom(this.zoomStartZoomY * (1 + factor));
    const baseY = (this.zoomAnchorY - this.zoomStartPanY) / Math.max(CHART_DEFAULTS.EPS, this.zoomStartZoomY);
    if (this.zoomTarget === 'price') {
      this.zoomLevelY = newZoom;
      this.panOffsetY = this.zoomAnchorY - baseY * newZoom;
      this.maxPanOffsetY = this.canvas.height * 0.4 * Math.max(1, this.zoomLevelY);
    } else if (this.zoomTarget === 'indicator' && this.activeZoomScale) {
      this.activeZoomScale.zoomY = newZoom;
      this.activeZoomScale.panY = this.zoomAnchorY - baseY * newZoom;
    }
    if (this.isSubPanel) this.calculateWidthScale();
    else this.calculateScales();
  }

  detectHoveredCandle(mouseX, mouseY) {
    if (!this.data || this.data.length === 0) return;
    const plotLeft = this.leftAxisWidth;

    const overChart = mouseY >= 0 && mouseY <= this.chartHeight
      && mouseX >= plotLeft && mouseX <= plotLeft + this.chartWidth;
    if (!overChart) {
      if (this.hasTooltip && this.hoveredIndex !== null) this.startTooltipFadeOut();
      this.hoveredIndex = null;
      return;
    }

    const adjustedX = (mouseX - plotLeft - this.panOffset) / Math.max(CHART_DEFAULTS.EPS, this.zoomLevel);
    const idx = Math.floor(adjustedX / Math.max(CHART_DEFAULTS.EPS, this.widthScale));

    if (idx < 0 || idx >= this.data.length) {
      if (this.hasTooltip && this.hoveredIndex !== null) this.startTooltipFadeOut();
      this.hoveredIndex = null;
      return;
    }

    const prev = this.hoveredIndex;
    this.hoveredIndex = idx;
    this.hoveredCandle = this.data[idx];
    this.tooltipAlpha = 1;
    if (this.hasTooltip && prev !== idx) this.stopTooltipFade();
  }

  updateCrosshairPoints(mouseX, mouseY) {
    if (!this.data || this.data.length === 0 || !this.chartHeight) {
      this.crosshairPoints = { x: null, y: null, price: null, time: null };
      this.notifyCrosshair();
      return;
    }
    const plotLeft = this.leftAxisWidth;
    const overPriceAxis = mouseX >= this.canvas.width - this.rightAxisWidth;
    const overTimeAxis = mouseY >= this.canvas.height - this.timeAxisHeight;

    const price = (overPriceAxis || this.lockedX)
      ? null
      : floor2(
        yToPrice(mouseY, this.minPrice, this.heightScale, this.chartHeight, this.zoomLevelY, this.panOffsetY)
      );
    const adjustedX = (mouseX - plotLeft - this.panOffset) / Math.max(CHART_DEFAULTS.EPS, this.zoomLevel);
    const idx = Math.floor(adjustedX / Math.max(CHART_DEFAULTS.EPS, this.widthScale));
    const time = (!overTimeAxis && idx >= 0 && idx < this.data.length) ? this.data[idx].time : null;

    this.crosshairPoints = { x: mouseX, y: this.lockedX ? null : mouseY, price, time };
    this.notifyCrosshair();
  }

  startTooltipFadeOut() {
    if (this.tooltipFadeInterval) return;
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    this.tooltipTimeout = setTimeout(() => {
      this.tooltipFadeInterval = setInterval(() => {
        this.tooltipAlpha = Math.max(0, this.tooltipAlpha - CHART_DEFAULTS.TOOLTIP_FADE_STEP);
        if (this.tooltipAlpha <= 0) this.stopTooltipFade();
        this.requestDraw();
      }, CHART_DEFAULTS.TOOLTIP_FADE_INTERVAL);
    }, CHART_DEFAULTS.TOOLTIP_FADE_DELAY);
  }

  stopTooltipFade() {
    if (this.tooltipFadeInterval) {
      clearInterval(this.tooltipFadeInterval);
      this.tooltipFadeInterval = null;
    }
  }

  destroy() {
    this.saveState();
    if (this._saveTimer) { clearTimeout(this._saveTimer); this._saveTimer = null; }
    this.closeWebSocket();
    this.teardownMouseEvents();
    this.stopTooltipFade();
    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }
}

const clampZoom = (z) => Math.max(CHART_DEFAULTS.ZOOM_MIN, Math.min(CHART_DEFAULTS.ZOOM_MAX, z));