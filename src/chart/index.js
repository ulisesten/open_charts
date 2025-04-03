import React, { useRef, useEffect, useState } from 'react';
import { CanvasDrawer } from './functions/fun.classes';
import { funGenerateUrl, funFormatData } from './functions/fun.functions';
import '../shared/styles/style.shared_chart.css'

const Chart = () => {
    // Referencia al elemento canvas
    const canvasRef = useRef(null);
    const chartRef = useRef(null);
    let width = 1200;
    let height = 600;
    const [pairSymbol, setPairSymbol] = useState('BTCUSDT');
    const [interval, setInterval] = useState('4h');
    const [isLoading, setIsLoading] = useState(true);
    const [chartData, setChartData] = useState([]);

    const handleResize = () => {
        const canvas = canvasRef.current;
        if (canvas) {
          // Ajustar el tamaño del canvas al tamaño de la ventana
          canvas.width = window.innerWidth;
          canvas.height = window.innerHeight;
    
          // Opcional: Redibujar el contenido del canvas
          //const ctx = canvas.getContext('2d');
          //drawContent(ctx);
          chartRef.current.drawLines()
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

    // Cargar datos históricos al cambiar el símbolo o el intervalo
    useEffect(() => {
        funGetCandleData(pairSymbol, interval);
    }, [pairSymbol, interval]);

    useEffect(() => {
        if(!isLoading) {
            const canvasDrawer = new CanvasDrawer(canvasRef);
            chartRef.current = canvasDrawer;
            chartRef.current.setData(chartData);
            chartRef.current.drawLines();
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