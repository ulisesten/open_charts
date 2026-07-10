# OpenCharts

Plataforma gratuita de gráficos de trading en tiempo real para criptomonedas, con datos de Binance. Velas japonesas, indicadores técnicos (SMI, ADX, medias móviles) y interacción completa (mouse + touch). Sin registro, sin costos, código abierto.

## Características

- **Velas japonesas en vivo** — datos de Binance vía REST (klines) + WebSocket (kline stream), sin delays
- **Indicadores técnicos:**
  - SMA 50 (naranja), 100 (morado), 200 (blanco grueso)
  - SMI (Squeeze Momentum Indicator) con área coloreada por tendencia y squeeze dots
  - ADX con key level @ 23, +DI/-DI
- **Interacción completa:**
  - Mouse: drag X/Y, zoom con rueda (X/Y), zoom vertical arrastrando en eje de precio, paneo Shift+rueda
  - Touch: 1 dedo = pan, 2 dedos = pinch zoom X/Y
  - Crosshair y tooltip O/C/H/L coloreados
- **Responsive** — funciona en escritorio, tablet y móvil (`100dvh`, `visualViewport.resize`)
- **Persistencia** — paneo/zoom guardados en localStorage
- **Código abierto** — React + Canvas API, sin dependencias pesadas

## Arquitectura

```
src/chart/
├── index.js              Componente React (lifecycle, resize, orquesta drawer + sub-panel)
├── ChartDrawer.js        Único orquestador con estado (escalas, eventos, WS, render loop rAF)
├── utils/
│   ├── constants.js      URLs, colores, defaults (CHART_CONSTANTS / CHART_COLORS / CHART_DEFAULTS)
│   ├── scales.js         Helpers puros: priceToY, visiblePriceRange, priceTickValues, etc.
│   ├── format.js         formatKlines, formatPrice, formatAxisTime
│   ├── api.js            fetchKlines (REST Binance)
│   ├── sqzMomentum.js    calculateSmi
│   ├── adx.js            calculateAdx, ADX_KEY_LEVEL
│   └── movingAverages.js calculateSMA, calculateMovingAverages
├── rendering/            Funciones puras (state, ctx) => void
│   ├── drawGrid.js       Cuadrícula sobre el rango visible
│   ├── drawCandles.js    Velas con escalado manual (sin ctx.scale)
│   ├── drawMovingAverages.js
│   ├── drawPriceScale.js
│   ├── drawTimeScale.js
│   ├── drawCrosshair.js
│   ├── drawTooltip.js
│   ├── drawSmi.js        Área por tendencia con cortes verticales
│   ├── drawAdx.js        Línea ADX + key level sólido
│   └── ...
└── styles/style.chart.css
server/
└── index.js              Proxy Express para liquidaciones de Binance (puerto configurable)
```

### Principios de diseño

- **`ChartDrawer`** es el único componente con estado. Los renderers en `rendering/` son funciones puras `(state, ctx) => void` que no mutan `state`.
- Todo redibujado pasa por `requestDraw()` (rAF) — un único frame pendiente a la vez.
- Las velas usan escalado manual (`x = plotLeft + panOffset + i * pixelsPerCandle`), no `ctx.scale()`, para evitar deformación de `lineWidth` al hacer zoom.
- Grid y ejes se calculan sobre el rango **visible** (`visiblePriceRange` en `scales.js`), no sobre el rango de datos.

## Requisitos

- Node.js 18+
- pnpm

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/anomalyco/open_charts.git
cd open_charts

# Instalar dependencias del cliente
pnpm install

# Instalar dependencias del proxy server
cd server && pnpm install && cd ..

# Copiar .env
cp .env.example .env
```

## Configuración

Editar `.env`:

```
PORT=8080   # Puerto del proxy de liquidaciones
```

## Uso

### Script de arranque

```bash
./start.sh
```

Inicia el proxy server en background y el cliente React en `http://localhost:3000`.

### Manual

```bash
# Proxy server (terminal 1)
cd server && pnpm start

# Cliente React (terminal 2)
pnpm start
```

### Build de producción

```bash
pnpm build
```

### Lint

```bash
pnpm exec eslint --ext .js,.jsx src
```

## Despliegue con nginx

1. **Build del cliente:**
   ```bash
   pnpm build
   ```

2. **Proxy server:** Arrancar `node server/index.js` (lee `PORT` desde `.env`).

3. **nginx:** Servir `build/` como estático y proxyar `/liquidations` al proxy server:

   ```nginx
   server {
       listen 80;
       server_name opencharts.app;

       root /path/to/open_charts/build;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html;
       }

       location /liquidations {
           proxy_pass http://localhost:8080;
       }
   }
   ```

## Datos

Los datos de mercado provienen de la API pública de Binance:
- **Klines (REST):** `https://api.binance.com/api/v3/klines`
- **WebSocket:** `wss://stream.binance.com:9443/ws` (kline stream en tiempo real)
- **Liquidaciones:** `https://fapi.binance.com/fapi/v1/liquidationOrders` (vía proxy)

OpenCharts no está afiliado con Binance.

## Tecnologías

- React 19
- Canvas 2D API (renderizado manual, sin librerías de charting)
- WebSocket (datos en tiempo real)
- Express (proxy de liquidaciones)
- pnpm

## Licencia

MIT
