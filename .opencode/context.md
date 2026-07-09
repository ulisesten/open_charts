# open_charts - Contexto del proyecto

## Propósito
Librería JS para charts de trading, estilo TradingView, manteniendo simplicidad.

## Estructura
- `src/chart/`
  - `index.js` - Componente React `Chart` (carga datos, lifecycle, resize)
  - `ChartDrawer.js` - Orquestador canvas: estado, escalas, eventos, WS, render loop rAF, persistencia paneo/zoom en localStorage
  - `utils/` - `constants.js` (URLs, colores, defaults), `format.js`, `api.js`, `scales.js` (helpers puros)
  - `rendering/` - Renderers puros `(state, ctx) => void`: `drawCandles`, `drawPriceScale`, `drawTimeScale`, `drawCrosshair`, `drawTooltip`, `drawGrid`, `drawHeatmap`
  - `styles/style.chart.css`
- `src/shared/styles/style.shared_chart.css` - Reset global
- `server/` - Proxy Express para liquidaciones de Binance (puerto 8080)

## Arquitectura
- `ChartDrawer` mantiene estado; los renderers son funciones puras que reciben un snapshot `state` + `ctx`.
- Render loop con rAF: `requestDraw()` batchea redibujos en un único frame.
- Eventos únicos: `setupMouseEvents()` registra listeners una sola vez; `teardownMouseEvents()` los limpia.
- Lifecycle: el componente React crea el `ChartDrawer` y llama `destroy()` en cleanup.

## Features
- Velas japonesas con datos de Binance API (klines REST + WS kline-stream en tiempo real)
- Interacción: drag X/Y, zoom horizontal/vertical (rueda), zoom vertical por drag en eje de precios, paneo Shift+rueda
- Ejes de precios y tiempo con grid alineado, crosshair, tooltip con blur
- Crosshair sincronizable (`getCrossHairPoints`/`setCrossHairPoints`)
- Paneo/zoom persistente en localStorage (`getPanX`/`setPanX`/`getZoomX`/`setZoomX`/`saveState`/`restoreState`)
- `fitToRightmost`: viewport inicial muestra últimas velas cómodamente (si no hay estado guardado)
- Canvas responsivo (100vw × 100vh)
- Heatmap de liquidaciones (estructura lista)

## Próximos pasos
- Panel de controles (símbolo, intervalo) — `setPairSymbol`/`setIntervalValue` ya expuestos
- Heatmap definitivo con `candleIntervalMs` dinámico
- Evitar recrear `ChartDrawer` al cambiar símbolo (usar `setData` + `setupWebSocket`)