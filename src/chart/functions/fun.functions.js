export const funGetCandleData = async (prm_symbol, prm_interval) => {

    const url = funGenerateUrl(prm_symbol, prm_interval);

    try {
        const response = await fetch(url);
        const rawData = await response.json();
        return funFormatData(rawData);
    } catch (error) {
        console.error('Error al cargar datos:', error);
        return [];
    }

};


export const funGenerateUrl = (symbol, interval) => {
    return `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=100`;
};

export const funFormatData = (rawData) => {

    return rawData.map((el) => ({
        time: el[0], // Convertir a segundos Unix
        open: parseFloat(el[1]),
        high: parseFloat(el[2]),
        low: parseFloat(el[3]),
        close: parseFloat(el[4]),
    }));
};