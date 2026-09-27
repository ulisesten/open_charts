import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CHART_CONSTANTS, CHART_DEFAULTS } from './utils/constants';
import { getChartSetting, setChartSetting } from './utils/storage';

const PriceSidebar = ({ onSelectSymbol, currentSymbol }) => {
  const [symbols, setSymbols] = useState(() => getChartSetting('watchSymbols'));
  const [prices, setPrices] = useState({});
  const [open, setOpen] = useState(() => getChartSetting('sidebarOpen'));
  const [search, setSearch] = useState('');
  const [symbolsIndex, setSymbolsIndex] = useState(null);
  const [coinInfo, setCoinInfo] = useState(null);
  const wsRef = useRef(null);
  const reconnectRef = useRef(null);
  const symbolsIndexRef = useRef(null);

  const fmtCompact = (value) => {
    if (value == null || !Number.isFinite(value)) return '—';
    return Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 2 }).format(value);
  };

  const fmtPrice = (value) => {
    if (value == null || !Number.isFinite(value)) return '—';
    return value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: value < 1 ? 6 : 2,
    });
  };

  useEffect(() => {
    if (!currentSymbol) return;
    let cancelled = false;
    const base = currentSymbol.replace(/USDT$/, '').toUpperCase();
    const load = async () => {
      try {
        const searchRes = await fetch(`${CHART_CONSTANTS.COINGECKO_SEARCH_URL}?query=${base}`);
        const searchJson = await searchRes.json();
        const coins = Array.isArray(searchJson.coins) ? searchJson.coins : [];
        const coin = coins.find((c) => c.symbol && c.symbol.toUpperCase() === base) || coins[0];
        if (!coin || cancelled) return;
        const marketsRes = await fetch(
          `${CHART_CONSTANTS.COINGECKO_MARKETS_URL}?vs_currency=usd&ids=${coin.id}&price_change_percentage=24h`
        );
        const markets = await marketsRes.json();
        if (!cancelled) {
          setCoinInfo((Array.isArray(markets) && markets[0]) || { market_cap_rank: coin.market_cap_rank });
        }
      } catch {
        if (!cancelled) setCoinInfo((prev) => prev);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [currentSymbol]);

  useEffect(() => {
    setChartSetting('sidebarOpen', open);
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('resize'));
  }, [open]);

  useEffect(() => {
    setChartSetting('watchSymbols', symbols);
  }, [symbols]);

  const loadSymbolsIndex = () => {
    if (symbolsIndexRef.current) {
      setSymbolsIndex(symbolsIndexRef.current);
      return;
    }
    fetch(CHART_CONSTANTS.TICKER_PRICES_URL)
      .then((res) => res.json())
      .then((arr) => {
        const list = (Array.isArray(arr) ? arr : [])
          .map((t) => t.symbol)
          .filter((s) => typeof s === 'string' && s.endsWith('USDT'))
          .sort();
        symbolsIndexRef.current = list;
        setSymbolsIndex(list);
      })
      .catch(() => {});
  };

  useEffect(() => {
    const connect = () => {
      if (!symbols.length) return;
      const streams = symbols.map((s) => `${s.toLowerCase()}@miniTicker`).join('/');
      const ws = new WebSocket(`${CHART_CONSTANTS.WS_STREAM_BASE_URL}${streams}`);
      wsRef.current = ws;
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        const d = payload.data || payload;
        if (!d || !d.s) return;
        const price = parseFloat(d.c);
        const open = parseFloat(d.o);
        if (!Number.isFinite(price)) return;
        const up = Number.isFinite(open) ? price >= open : null;
        const pct = Number.isFinite(open) && open > 0 ? ((price - open) / open) * 100 : null;
        setPrices((prev) => ({
          ...prev,
          [d.s]: { price, up, pct },
        }));
      };
      ws.onclose = () => {
        if (reconnectRef.current) clearTimeout(reconnectRef.current);
        reconnectRef.current = setTimeout(connect, CHART_DEFAULTS.RECONNECT_DELAY);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [symbols]);

  const suggestions = useMemo(() => {
    const q = search.trim().toUpperCase();
    if (!q || !symbolsIndex) return [];
    return symbolsIndex.filter((s) => s.includes(q) && !symbols.includes(s)).slice(0, 20);
  }, [search, symbolsIndex, symbols]);

  const addSymbol = (symbol) => {
    const s = (symbol || search).trim().toUpperCase();
    if (!s) return;
    setSymbols((prev) => (prev.includes(s) ? prev : [...prev, s]));
    setSearch('');
  };

  const removeSymbol = (symbol) => {
    setSymbols((prev) => prev.filter((s) => s !== symbol));
  };

  const panelTick = currentSymbol ? prices[currentSymbol] : null;
  const panelPrice = (panelTick && panelTick.price) || (coinInfo && coinInfo.current_price) || null;
  const panelUp = panelTick
    ? panelTick.up
    : coinInfo && coinInfo.price_change_percentage_24h != null
      ? coinInfo.price_change_percentage_24h >= 0
      : null;
  const rangePct = coinInfo && coinInfo.ath != null && coinInfo.atl != null
    && Number.isFinite(coinInfo.ath) && Number.isFinite(coinInfo.atl)
    && coinInfo.atl > 0
    ? ((coinInfo.ath - coinInfo.atl) / coinInfo.atl) * 100
    : null;

  return (
    <>
      <div className={`chart-sidebar ${open ? 'chart-sidebar--open' : ''}`}>
        {open && (
          <div className="chart-sidebar-content">
            <div className="chart-sidebar-head">
              <span>Watchlist</span>
            </div>
            <div className="chart-sidebar-add">
              <div className="chart-sidebar-search">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    loadSymbolsIndex();
                  }}
                  onFocus={loadSymbolsIndex}
                  onKeyDown={(e) => e.key === 'Enter' && addSymbol()}
                  placeholder="Buscar símbolo (ej. ARBUSDT)"
                />
                {search.trim() && suggestions.length > 0 && (
                  <ul className="chart-sidebar-suggestions">
                    {suggestions.map((s) => (
                      <li
                        key={s}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          addSymbol(s);
                        }}
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                )}
                {search.trim() && symbolsIndex && suggestions.length === 0 && (
                  <div className="chart-sidebar-nosuggest">Sin resultados</div>
                )}
              </div>
              <button type="button" onClick={() => addSymbol()}>+</button>
            </div>
            <ul className="chart-sidebar-list">
              {symbols.map((symbol) => {
                const tick = prices[symbol];
                const price = tick ? tick.price : null;
                const up = tick ? tick.up : null;
                const pct = tick ? tick.pct : null;
                return (
                  <li
                    key={symbol}
                    className="chart-sidebar-item"
                    onClick={() => onSelectSymbol && onSelectSymbol(symbol)}
                  >
                    <img
                      className="chart-sidebar-thumb"
                      src={`https://assets.coincap.io/assets/icons/${symbol.replace(/USDT$/, '').toLowerCase()}@2x.png`}
                      alt=""
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                    <span
                      className={`chart-sidebar-symbol ${up === null ? '' : up ? 'is-up' : 'is-down'}`}
                    >
                      {symbol}
                    </span>
                    <span className="chart-sidebar-quote">
                      <span
                        className={`chart-sidebar-price ${up === null ? '' : up ? 'is-up' : 'is-down'}`}
                      >
                        {price != null ? fmtPrice(price) : '—'}
                      </span>
                      {pct != null && (
                        <span className={`chart-sidebar-pct ${up ? 'is-up' : 'is-down'}`}>
                          {up ? '▲' : '▼'} {pct >= 0 ? '+' : ''}{pct.toFixed(2)}%
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="chart-sidebar-remove"
                      onClick={() => removeSymbol(symbol)}
                      title={`Quitar ${symbol}`}
                    >
                      x
                    </button>
                  </li>
                );
              })}
            </ul>
            {currentSymbol && (
              <div className="chart-sidebar-info">
                <div className="chart-sidebar-info-head">
                  <img
                    className="chart-sidebar-thumb chart-sidebar-info-thumb"
                    src={`https://assets.coincap.io/assets/icons/${currentSymbol.replace(/USDT$/, '').toLowerCase()}@2x.png`}
                    alt=""
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <div>
                    <div className="chart-sidebar-info-symbol">{currentSymbol}</div>
                    <div className="chart-sidebar-info-name">{coinInfo ? coinInfo.name : ''}</div>
                  </div>
                </div>
                <div
                  className={`chart-sidebar-info-price ${panelUp === null ? '' : panelUp ? 'is-up' : 'is-down'}`}
                >
                  ${fmtPrice(panelPrice)}
                </div>
                <div className="chart-sidebar-info-grid">
                  <div>
                    <span>Rank</span>
                    <b>{coinInfo && coinInfo.market_cap_rank != null ? `#${coinInfo.market_cap_rank}` : '—'}</b>
                  </div>
                  <div>
                    <span>Cap. mercado</span>
                    <b>{fmtCompact(coinInfo && coinInfo.market_cap)}</b>
                  </div>
                  <div>
                    <span>Cambio 24h</span>
                    <b className={`${coinInfo && coinInfo.price_change_percentage_24h != null ? (coinInfo.price_change_percentage_24h >= 0 ? 'is-up' : 'is-down') : ''}`}>
                      {coinInfo && coinInfo.price_change_percentage_24h != null
                        ? `${coinInfo.price_change_percentage_24h >= 0 ? '+' : ''}${coinInfo.price_change_percentage_24h.toFixed(2)}%`
                        : '—'}
                    </b>
                  </div>
                  <div>
                    <span>Vol 24h</span>
                    <b>{fmtCompact(coinInfo && coinInfo.total_volume)}</b>
                  </div>
                  <div>
                    <span>Máx 24h</span>
                    <b>${fmtPrice(coinInfo && coinInfo.high_24h)}</b>
                  </div>
                  <div>
                    <span>Mín 24h</span>
                    <b>${fmtPrice(coinInfo && coinInfo.low_24h)}</b>
                  </div>
                  <div>
                    <span>Máx histórico</span>
                    <b>${fmtPrice(coinInfo && coinInfo.ath)}</b>
                  </div>
                  <div>
                    <span>Mín histórico</span>
                    <b>${fmtPrice(coinInfo && coinInfo.atl)}</b>
                  </div>
                  <div>
                    <span>Max Incremento histórico</span>
                    <b>{rangePct != null
                      ? `${rangePct.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
                      : '—'}</b>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="chart-rail">
        <button
          type="button"
          className="chart-sidebar-toggle"
          onClick={() => setOpen((v) => !v)}
          title="Lista de precios"
        >
          {open ? '»' : '«'}
        </button>
      </div>
    </>
  );
};

export default PriceSidebar;