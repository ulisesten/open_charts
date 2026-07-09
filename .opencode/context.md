# open_charts - Contexto del proyecto

## Propósito
Librería JS para charts de trading, estilo TradingView, manteniendo simplicidad.

## Estructura
- `src/chart/`
  - `index.js` - Componente React `Chart` (carga datos, lifecycle, resize, orquesta drawer + sub-panel)
  - `ChartDrawer.js` - Único orquestador canvas: estado, escalas, eventos, WS, render loop rAF, persistencia paneo/zoom en localStorage
  - `utils/`
    - `constants.js` - `CHART_CONSTANTS` (URLs, symbols, intervals), `CHART_COLORS`, `CHART_DEFAULTS`, `TICK_OPTIONS`, `TIME_UNITS_MS`
    - `format.js` - `formatKlines`, `formatLiquidations`, `formatPrice`, `formatAxisTime`, `floor2`
    - `api.js` - `fetchKlines` (REST Binance)
    - `scales.js` - Helpers puros: `computePriceRange`, `priceTickValues`, `visiblePriceRange`, `chooseTimeUnit`, `labeledTimeIndices`, `priceToY`, `yToPrice`, `candleIndexAtX`, `optimalTickSize`
    - `sqzMomentum.js` - `calculateSmi` (SMI = Squeeze Momentum Indicator con histograma + colores up/down/dim)
    - `adx.js` - `calculateAdx`, `adxColor`, `ADX_KEY_LEVEL = 23` (umbral de tendencia)
    - `movingAverages.js` - `calculateSMA`, `calculateMovingAverages` (SMA 50/100/200, O(n) sliding window)
  - `rendering/` - Renderers puros `(state, ctx) => void` (no mutan estado):
    - `index.js` - Re-exports
    - `drawGrid.js` - Cuadrícula principal (precios via `visiblePriceRange`, líneas temporales con slice del viewport X)
    - `drawCandles.js` + `drawCandle.js` - Velas con escalado manual (NO usa `ctx.scale`, evita deformaciones de `lineWidth`)
    - `drawMovingAverages.js` - SMA 50 naranja / 100 morado / 200 blanco (más gruesa), segmentos continuos
    - `drawPriceScale.js` - Eje precio, label precio actual
    - `drawTimeScale.js` - Eje tiempo (calcula firstIdx/lastIdx del viewport X)
    - `drawCrosshair.js` - Crosshair
    - `drawTooltip.js` - Tooltip O/C/H/L coloreados por tendencia de la vela
    - `drawHeatmap.js` - Marcadores de liquidación
    - `drawSmi.js` - SMI con área rellena por tendencia (up/down/up_dim/down_dim), cortes verticales via `clip()`, squeeze dots
    - `drawAdx.js` - Línea ADX + key level @ 23 (sólida)
    - `drawIndicatorGrid.js` - Grid para sub-panel (precios SMI/ADX + líneas temporales)
    - `drawIndicatorScale.js` - `drawSmiScale`, `drawAdxScale` (ejes del sub-panel)
  - `styles/style.chart.css`
- `src/shared/styles/style.shared_chart.css` - Reset global
- `server/` - Proxy Express para liquidaciones de Binance (puerto 8080)
- `AGENTS.md` - Reglas de desarrollo (arquitectura, render, eventos, WS, estilo, verificación)

## Arquitectura
- `ChartDrawer` mantiene estado; los renderers son funciones puras que reciben un snapshot `state` (via `buildState()`) + `ctx`.
- Render loop con rAF: `requestDraw()` batchea redibujos en un único frame (guard `rafId`).
- Eventos únicos: `setupMouseEvents()` registra listeners una sola vez; `teardownMouseEvents()` los limpia en `destroy()`.
- Lifecycle: el componente React crea el `ChartDrawer` principal + sub-panel (SMI/ADX) y llama `destroy()` en cleanup.
- Sub-panel (`lockedX: true`) sincroniza su X con el principal via `addXTransformListener`/`applyXTransform`; recibe klines via `addKlineListener` → `sub.updateLastCandle(kline)`.

## Mapa feature → ubicación (file:line aprox.)
| Feature | Dónde |
|---|---|
| Render loop / rAF | `ChartDrawer.js` `requestDraw` (~437) |
| Snapshot de estado | `ChartDrawer.js` `buildState` (~400) |
| Cálculo de escalas | `ChartDrawer.js` `calculateScales` (~270) |
| WebSocket (klines live) | `ChartDrawer.js` `setupWebSocket`/`handleWsMessage`/`updateLastCandle` (~320/340/375) |
| Persistencia pan/zoom | `ChartDrawer.js` `saveState`/`restoreState`/`fitToRightmost` (~200/210/221) |
| Eventos mouse | `ChartDrawer.js` `setupMouseEvents` (~470) |
| Zoom Y en eje precio | `ChartDrawer.js` `applyVerticalZoom` (~645) |
| Hover/detección vela | `ChartDrawer.js` `detectHoveredCandle` (~660) |
| Sync X entre paneles | `index.js` `addXTransformListener`/`applyXTransform` (~91-92) |
| Sync crosshair | `index.js` `addCrosshairListener`/`setSyncedCrosshair` (~93-94) |
| Sync WS kline | `index.js` `addKlineListener` → `sub.updateLastCandle` (~95) |
| Rango precio visible | `scales.js` `visiblePriceRange` (~39) |
| Color por tendencia (SMI) | `drawSmi.js` `fillColor`/`strokeColor` (~4-14) |
| Key level ADX | `adx.js` `ADX_KEY_LEVEL = 23`; `drawAdx.js` (~45) |
| Cólores de velas | `constants.js` `CHART_COLORS.UP`/`DOWN`/`BORDER_*` (~16-21) |
| Sizes default | `constants.js` `CHART_DEFAULTS.*` (~48-87) |

## Flujo de datos
1. **Carga inicial**: `index.js` `loadCandleData` → `fetchKlines` → `drawer.setData(data)` → `calculateScales` + `fitToRightmost` + WS setup.
2. **WS live**: Binance kline event → `handleWsMessage` → `updateLastCandle(kline)` → muta/push última vela → recalc SMI/ADX/SMA + `requestDraw` → notifica `klineListeners` (sub-panel replica).
3. **Render**: `requestDraw` (rAF) → `render()` → `calculateScales` → `buildState` → ejecuta `renderSteps` en orden → fade del tooltip si procede.

## Convenciones
- `state` siempre pasa `chartHeight` (= `canvas.height - timeAxisHeight`), nunca `canvas.height` para Y de precio.
- Coordenadas: `plotLeft = leftAxisWidth`, `plotRight = canvasWidth - priceAxisWidth`, `x = plotLeft + panOffset + i*pixelsPerCandle + halfW`.
- Escalas de indicators: `smiScale` (eje derecho), `adxScale` (eje izquierdo) tienen `min/max/range/heightScale/zoomY/panY`.
- `zoomLevel` y `panOffset` son X; `zoomLevelY`/`panOffsetY` son Y del precio principal; SMI/ADX tienen sus propios `zoomY`/`panY`.

## Features
- Velas japonesas con datos de Binance (klines REST + WS kline-stream en tiempo real)
- Medias móviles 50/100/200 (naranja/morado/blanco gruesa)
- SMI (Squeeze Momentum) con área rellena por tendencia y squeeze dots
- ADX con key level @ 23 (sólida)
- Tooltip O/C/H/L coloreados por tendencia de vela
- Interacción: drag X/Y, zoom horizontal/vertical (rueda), zoom vertical por drag en eje de precios, paneo Shift+rueda
- Grid + ejes calculados sobre el rango **visible** (no solo sobre velas)
- Crosshair y tooltip sincronizables entre paneles
- Paneo/zoom persistente en localStorage; al cargar, siempre posiciona a la derecha (mantiene zoom guardado)
- Canvas responsivo; sub-panel también ajusta zoom vertical al resize
- Heatmap de liquidaciones (estructura lista)

## Verificación
```
npx eslint --ext .js,.jsx src
npx react-scripts build
```
0 errores de lint y build exitoso obligatorios. Warnings de `no-unused-vars` solo permitidos para setters reservados a features pendientes.

## Próximos pasos
- Panel de controles (símbolo, intervalo) — `setPairSymbol`/`setIntervalValue` ya expuestos
- Heatmap definitivo con `candleIntervalMs` dinámico
- Evitar recrear `ChartDrawer` al cambiar símbolo (usar `setData` + `setupWebSocket`)
- Conectar `drawIndicatorGrid` a los `SMI_RENDER_STEPS` (importado pero no usado todavía)
