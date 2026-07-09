const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Proxy corriendo en puerto ${PORT}`));