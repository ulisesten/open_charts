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
        vol: parseFloat(el[5])
    }));

    /* 
    [
        [
            1499040000000,      // Open time
            "0.01634790",       // Open
            "0.80000000",       // High
            "0.01575800",       // Low
            "0.01577100",       // Close
            "148976.11427815",  // Volume
            1499644799999,      // Close time
            "2434.19055334",    // Quote asset volume
            308,                // Number of trades
            "1756.87402397",    // Taker buy base asset volume
            "28.46694368",      // Taker buy quote asset volume
            "17928899.62484339" // Ignore.
        ]
    ]
    */
};


export const funLiquidationDataUrl = (symbol, days = 7) => {

    const endTime = Date.now();
    const startTime = endTime - (days * 24 * 60 * 60 * 1000);

    const params = new URLSearchParams({
        symbol: symbol,
        startTime: startTime,
        endTime: endTime,
        limit: 1000
      });

    return `https://fapi.binance.com/fapi/v1/liquidationOrders?symbol=${symbol}&start_time=${startTime}&end_time=${endTime}&limit=100`;
}

export const funFormatLiquidationsData = (rawData) => {
    console.log(rawData)
    return rawData.map(item => ({
        price: parseFloat(item.price),
        side: item.side,
        quantity: parseFloat(item.executedQty),
        time: item.time
    }));
};