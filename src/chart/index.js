import React, { useRef, useEffect, useState } from 'react';
import { ChartDrawer } from './functions/fun.classes';
import { funGenerateUrl, funFormatData, funLiquidationDataUrl, funFormatLiquidationsData } from './functions/fun.functions';
import '../shared/styles/style.shared_chart.css'

const Chart = () => {
    // Referencia al elemento canvas
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    let width = window.innerWidth;
    let height = window.innerHeight;
    const [pairSymbol, setPairSymbol] = useState('ETHUSDT');
    const [interval, setInterval] = useState('4h');
    const [isLoading, setIsLoading] = useState(false);
    const [isOrdersLoading, setIsOrdersLoading] = useState(false);
    const [chartData, setChartData] = useState([]);
    const [chartLiquidationsData, setChartLiquidationsData] = useState([]);

    const handleResize = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          // Ajustar el tamaño del canvas al tamaño de la ventana
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
          chartRef.current.draw();
        }
      };
    
    // Función para obtener datos de velas
    const funGetCandleData = async (prm_symbol, prm_interval) => {
        setIsLoading(true);
        const url = funGenerateUrl(prm_symbol, prm_interval);
        try {
            const response = await fetch(url);
            const rawData = await response.json();
            setChartData(funFormatData(rawData));
        } catch (error) {
            console.error('Error al cargar datos:', error);
            setChartData([]);
        } finally {
            setIsLoading(false);
        }
    };

    const funGetLiquidationsData = async (prm_symbol) => {
        setIsOrdersLoading(true);
        const url = funLiquidationDataUrl(prm_symbol);
    
        try {
            const response = await fetch(url);
            const rawData = await response.json();
            setChartLiquidationsData(funFormatLiquidationsData(rawData));
        } catch (error) {
            console.error('Error al cargar datos:', error);
            setChartLiquidationsData([])
        } finally {
            setIsOrdersLoading(false);
        }
    
    };

    // Cargar datos históricos al cambiar el símbolo o el intervalo
    useEffect(() => {
        funGetCandleData(pairSymbol, interval);
        //funGetLimitOrdersData(pairSymbol);
    }, [pairSymbol, interval]);

    useEffect(() => {
        //funGetLiquidationsData(pairSymbol);
    }, [pairSymbol]);

    useEffect(() => {
        if(!isLoading) {
            const chartDrawer = new ChartDrawer(canvasRef);
            chartRef.current = chartDrawer;
            chartRef.current.setData(chartData);
            chartRef.current.draw();
        }

        if(!isOrdersLoading) {
            //chartRef.current.setLiquidationsData(chartLiquidationsData)
            //console.log(chartLiquidationsData);
        }

    }, [chartData]);

    useEffect(() => {
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return (
    <canvas
        ref={canvasRef}
        width={width} // Ancho del canvas
        height={height} // Alto del canvas
        style={{ border: '1px solid gray' }} // Estilo opcional para visualizar el canvas
    />
    );
};

export default Chart;