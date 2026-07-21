import React, { useRef, useEffect, useState } from 'react';
import { ChartDrawer, SMI_RENDER_STEPS, RSI_RENDER_STEPS } from './ChartDrawer';
import { fetchKlines } from './utils/api';
import {
  drawGrid, drawHeatmap, drawCandles, drawVolumeProfile, drawMovingAverages, drawPriceScale, drawCrosshair, drawTooltip,
} from './rendering';
import { CHART_CONSTANTS, CHART_DEFAULTS, CHART_SYMBOLS, CHART_INTERVALS } from './utils/constants';
import '../shared/styles/style.shared_chart.css';
import './styles/style.chart.css';

const MAIN_RENDER_STEPS = [
  drawGrid, drawHeatmap, drawCandles, drawMovingAverages, drawVolumeProfile, drawPriceScale, drawCrosshair, drawTooltip,
];

const Chart = () => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const subCanvasRef = useRef(null);
    const subContainerRef = useRef(null);
    const rsiCanvasRef = useRef(null);
    const rsiContainerRef = useRef(null);
    const chartRef = useRef(null);
    const subChartRef = useRef(null);
    const rsiChartRef = useRef(null);
    const [pairSymbol, setPairSymbol] = useState(CHART_CONSTANTS.DEFAULT_SYMBOL);
    const [chartInterval, setIntervalValue] = useState(CHART_CONSTANTS.DEFAULT_INTERVAL);
    const [isLoading, setIsLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [subHeightVh, setSubHeightVh] = useState(CHART_DEFAULTS.SUB_PANEL_DEFAULT_VH);
    const [rsiHeightVh, setRsiHeightVh] = useState(CHART_DEFAULTS.RSI_PANEL_DEFAULT_VH);
    const draggingSubRef = useRef(false);
    const draggingRsiRef = useRef(false);

    const sizeCanvas = (canvas, container) => {
        if (!canvas || !container) return;
        const rect = container.getBoundingClientRect();
        canvas.width = Math.floor(rect.width);
        canvas.height = Math.floor(rect.height);
    };

    const sizeAll = () => {
        sizeCanvas(canvasRef.current, containerRef.current);
        sizeCanvas(subCanvasRef.current, subContainerRef.current);
        sizeCanvas(rsiCanvasRef.current, rsiContainerRef.current);
    };

    const recalcAll = () => {
        if (chartRef.current) {
            chartRef.current.calculateScales();
            chartRef.current.draw();
        }
        if (subChartRef.current) {
            subChartRef.current.calculateScales();
            subChartRef.current.draw();
        }
        if (rsiChartRef.current) {
            rsiChartRef.current.calculateScales();
            rsiChartRef.current.draw();
        }
    };

    const handleResize = () => {
        sizeAll();
        recalcAll();
    };

    const loadCandleData = async (symbol, timeInterval) => {
        setIsLoading(true);
        const data = await fetchKlines(symbol, timeInterval);
        setChartData(data);
        setIsLoading(false);
    };

    useEffect(() => {
        loadCandleData(pairSymbol, chartInterval);
    }, [pairSymbol, chartInterval]);

    useEffect(() => {
        if (isLoading || chartData.length === 0) return;
        if (!canvasRef.current || !subCanvasRef.current || !rsiCanvasRef.current) return;

        sizeAll();

        const drawer = new ChartDrawer(canvasRef, {
            renderSteps: MAIN_RENDER_STEPS,
            timeAxisHeight: 0,
            leftAxisWidth: CHART_DEFAULTS.INDICATOR_AXIS_WIDTH,
        });
        chartRef.current = drawer;
        drawer.setupMouseEvents();
        drawer.setData(chartData);

        const sub = new ChartDrawer(subCanvasRef, {
            renderSteps: SMI_RENDER_STEPS,
            lockedX: true,
            smi: true,
            adx: true,
            rightIndicator: 'smi',
            leftIndicator: 'adx',
            leftAxisWidth: CHART_DEFAULTS.INDICATOR_AXIS_WIDTH,
            timeAxisHeight: CHART_DEFAULTS.TIME_AXIS_HEIGHT,
        });
        subChartRef.current = sub;
        sub.setupMouseEvents();
        sub.setData(chartData);
        sub.applyXTransform(drawer.getPanX(), drawer.getZoomX());

        const rsi = new ChartDrawer(rsiCanvasRef, {
            renderSteps: RSI_RENDER_STEPS,
            lockedX: true,
            rsi: true,
            rightIndicator: 'rsi',
            leftAxisWidth: CHART_DEFAULTS.INDICATOR_AXIS_WIDTH,
            timeAxisHeight: CHART_DEFAULTS.TIME_AXIS_HEIGHT,
        });
        rsiChartRef.current = rsi;
        rsi.setupMouseEvents();
        rsi.setData(chartData);
        rsi.applyXTransform(drawer.getPanX(), drawer.getZoomX());

        const syncX = (source, ...targets) => {
            source.addXTransformListener((pan, zoom) => {
                targets.forEach((t) => t.applyXTransform(pan, zoom));
            });
        };
        syncX(drawer, sub, rsi);
        syncX(sub, drawer, rsi);
        syncX(rsi, drawer, sub);

        const syncCrosshair = (source, ...targets) => {
            source.addCrosshairListener((pts) => {
                targets.forEach((t) => t.setSyncedCrosshair(pts));
            });
        };
        syncCrosshair(drawer, sub, rsi);
        syncCrosshair(sub, drawer, rsi);
        syncCrosshair(rsi, drawer, sub);

        drawer.addKlineListener((kline) => sub.updateLastCandle(kline));
        drawer.addKlineListener((kline) => rsi.updateLastCandle(kline));

        drawer.setupWebSocket(pairSymbol, chartInterval);
        if (typeof window !== 'undefined') window.__drawer = drawer;

        return () => {
            drawer.destroy();
            sub.destroy();
            rsi.destroy();
            chartRef.current = null;
            subChartRef.current = null;
            rsiChartRef.current = null;
        };
    }, [chartData, isLoading]);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', handleResize);
        }
        handleResize();
        return () => {
            window.removeEventListener('resize', handleResize);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', handleResize);
            }
        };
    }, []);

    useEffect(() => {
        const onMove = (e) => {
            if (!draggingSubRef.current && !draggingRsiRef.current) return;
            if (e.cancelable) e.preventDefault();
            const clientY = e.clientY != null ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : null);
            if (clientY == null) return;
            const vh = window.visualViewport ? window.visualViewport.height : window.innerHeight;
            if (draggingSubRef.current) {
                const newSubVh = Math.max(
                    CHART_DEFAULTS.SUB_PANEL_MIN_VH,
                    Math.min(CHART_DEFAULTS.SUB_PANEL_MAX_VH, (vh - clientY) / vh * 100 - rsiHeightVh)
                );
                setSubHeightVh(newSubVh);
            } else if (draggingRsiRef.current) {
                const newRsiVh = Math.max(
                    CHART_DEFAULTS.RSI_PANEL_MIN_VH,
                    Math.min(CHART_DEFAULTS.RSI_PANEL_MAX_VH, (vh - clientY) / vh * 100)
                );
                setRsiHeightVh(newRsiVh);
            }
        };
        const onUp = () => {
            draggingSubRef.current = false;
            draggingRsiRef.current = false;
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        window.addEventListener('touchmove', onMove, { passive: false });
        window.addEventListener('touchend', onUp);
        window.addEventListener('touchcancel', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            window.removeEventListener('touchmove', onMove);
            window.removeEventListener('touchend', onUp);
            window.removeEventListener('touchcancel', onUp);
        };
    }, [rsiHeightVh]);

    useEffect(() => {
        sizeAll();
        recalcAll();
    }, [subHeightVh, rsiHeightVh]);

    return (
        <div className="chart-wrapper">
            <div className="chart-toolbar">
                <label>
                    Símbolo
                    <select
                        value={pairSymbol}
                        onChange={(e) => setPairSymbol(e.target.value)}
                    >
                        {CHART_SYMBOLS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                    </select>
                </label>
                <label>
                    Intervalo
                    <select
                        value={chartInterval}
                        onChange={(e) => setIntervalValue(e.target.value)}
                    >
                        {CHART_INTERVALS.map((i) => (
                            <option key={i} value={i}>{i}</option>
                        ))}
                    </select>
                </label>
            </div>
            <div
                ref={containerRef}
                className="chart-main"
                style={{ height: `calc(100dvh - ${subHeightVh}vh - ${rsiHeightVh}vh - 8px)` }}
            >
                <canvas ref={canvasRef} className="chart-canvas" />
            </div>
            <div
                className="chart-resize-handle"
                onMouseDown={(e) => { e.preventDefault(); draggingSubRef.current = true; }}
                onTouchStart={(e) => { e.preventDefault(); draggingSubRef.current = true; }}
            />
            <div
                ref={subContainerRef}
                className="chart-sub"
                style={{ height: `${subHeightVh}vh` }}
            >
                <canvas ref={subCanvasRef} className="chart-canvas" />
            </div>
            <div
                className="chart-resize-handle"
                onMouseDown={(e) => { e.preventDefault(); draggingRsiRef.current = true; }}
                onTouchStart={(e) => { e.preventDefault(); draggingRsiRef.current = true; }}
            />
            <div
                ref={rsiContainerRef}
                className="chart-sub"
                style={{ height: `${rsiHeightVh}vh` }}
            >
                <canvas ref={rsiCanvasRef} className="chart-canvas" />
            </div>
        </div>
    );
};

export default Chart;
