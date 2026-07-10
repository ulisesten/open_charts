# Reglas de desarrollo - open_charts

## Arquitectura
- `ChartDrawer` (`src/chart/ChartDrawer.js`) es el **único** orquestador con estado. Los renderers en `src/chart/rendering/` deben ser **funciones puras** `(state, ctx) => void` sin mutar `state`.
- Toda configuración (URLs, colores, dimensiones, timings) vive en `src/chart/utils/constants.js` como `CHART_CONSTANTS` / `CHART_COLORS` / `CHART_DEFAULTS`. No hardcodear valores mágicos en renderers ni en `ChartDrawer`.
- Lógica de datos (fetch/formato) en `src/chart/utils/api.js` y `src/chart/utils/format.js`. Lógica de escala en `src/chart/utils/scales.js`.

## Render
- Todo redibujado pasa por `requestDraw()` (rAF). Nunca llamar a `ctx.*` directamente desde handlers de eventos: llamar a `requestDraw()`.
- Un único `requestAnimationFrame` pendiente a la vez (el guard `rafId` lo garantiza).
- `render()` no muta estado (excepto el decremento del fade del tooltip que programa el siguiente frame).
- Coordenadas consistentes: velas y ejes usan **`chartHeight`** (= `canvas.height - timeAxisHeight`), nunca `canvas.height` directo para Y de precio.
- Grid y ejes se calculan sobre el rango **visible** (`visiblePriceRange` en `scales.js`), no sobre el rango de datos. Slice del viewport X para eficiencia (`firstIdx`/`lastIdx` en `drawGrid`/`drawTimeScale`).
- Velas usan escalado manual (`x = plotLeft + panOffset + i * pixelsPerCandle`), **no** `ctx.scale()` — evita deformación de `lineWidth` al hacer zoom.

## Eventos y lifecycle
- `setupMouseEvents()` se llama **una sola vez** por instancia. Guardar handlers en `boundHandlers` para poder removerlos en `teardownMouseEvents()`.
- `teardownMouseEvents()` también remueve los touch events registrados por `_setupTouchEvents()`.
- Touch: 1 dedo = pan X/Y (con `dragMode` para SMI/ADX), 2 dedos = pinch zoom X/Y. Ancla del pinch usa `_pinchCenter` (centro inicial). `realScale = newZoom / initialZoom` (post-`clampZoom`) para el cálculo de pan, evitando drift en los límites de zoom.
- El sub-panel recibe `notifyXTransform()` → `applyXTransform` recalcula `widthScale` si es subpanel, `calculateScales` si es principal.
- Todo cleanup (WS, timers, rAF, listeners) se centraliza en `destroy()`.
- El componente React llama a `destroy()` en el cleanup del effect.
- CSS: `touch-action: none` en `.chart-wrapper`, `.chart-canvas`, `.chart-resize-handle` para evitar gestos del navegador que roben el touch. `100dvh` en `.chart-wrapper` para viewport móvil dinámico.
- Resize: `window.visualViewport.resize` también dispara `handleResize` en móvil.

## WebSocket
- Reconexión vía `wsReconnectTimer`; `closeWebSocket()` cancela el timer y pone `onclose = null` para evitar reconexiones zombis.
- `updateLastCandle(kline)` muta/pushea la última vela, recalc SMI/ADX/SMA, recalcula escalas y pide redraw.
- El sub-panel recibe klines vía `addKlineListener` → `sub.updateLastCandle(kline)`.

## Estilo de código
- Sin comentarios salvo que se pidan explícitamente.
- Nombres en inglés para código; comentarios/docs pueden ir en español.
- Sin emojis en el código.
- Funciones puras y small en `rendering/` y `utils/`.
- Preferir `const`/destructuring. Evitar clases monolíticas.

## Verificación
Antes de dar por terminada una tarea:
```
npx eslint --ext .js,.jsx src
npx react-scripts build
```
0 errores de lint y build exitoso obligatorios. Warnings de `no-unused-vars` solo permitidos para setters reservados a features pendientes (panel de controles).

## Pendientes conocidos
- Panel de controles (símbolo/intervalo) usará `setPairSymbol`/`setIntervalValue`.
- Heatmap definitivo requiere `candleIntervalMs` dinámico.
- Al cambiar `pairSymbol`, idealmente no recrear `ChartDrawer` (usar `setData` + `setupWebSocket`).
