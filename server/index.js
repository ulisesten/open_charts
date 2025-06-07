const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/liquidations', async (req, res) => {
  try {
    const { symbol, startTime, endTime, limit } = req.query;
    const response = await axios.get('https://fapi.binance.com/fapi/v1/liquidationOrders', {
      params: { symbol, startTime, endTime, limit }
    });
    console.log(response)
    console.log(response.data)
    
    res.json(response.data);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(8080, () => console.log('Proxy corriendo en puerto 8080'));