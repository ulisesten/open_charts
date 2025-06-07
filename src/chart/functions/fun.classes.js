export class ChartDrawer {
    /// new refactor
    data = [];
    DEBUG = true;
    up_color = '#269ea6';
    down_color = '#a8aec0';
    border_up_color = '#269ea6';
    border_down_color = '#a8aec0';

    min_price = 0;
    max_price = 0;
    width_scale = 0;
    height_scale = 0;
    candle_width = 0;

    background_color = '#141823';

    /// old
    horizontal_scale_positions = [];
    vertical_scale_positions   = [];
    visible_timescale_lines = [];
    visible_pricescale_lines = [];
    width = window.innerWidth;
    height = window.innerHeight;
    interval_width = 120;
    interval_height = 0;
    points_per_time_interval = 12;
    positions_per_interval_count = 0;
    
    

    scrolled_distance = 0;
    pricescale_interval_count = 30;

    candle_positions = []

    liquidations = [];
    symbol = 'ETHUSDT';

    constructor(canvasRef) {
        this.canvas = canvasRef.current;
        this.ctx = this.canvas.getContext('2d');

        this.zoomLevel = 1;
        this.panOffset = -70;
        this.hoveredIndex = null;
        this.isDragging = false;
        this.lastX = 0;
    }

    setData(data) {
        this.data = data;
    }

    setupWebSocket() {
        const ws = new WebSocket(`wss://fstream.binance.com/ws/${this.symbol.toLowerCase()}@forceOrder`);
    
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.e === "forceOrder") {
            const liquidation = {
              price: parseFloat(data.o.p),
              side: data.o.S, // 'SELL' (liquidación larga) o 'BUY' (corta)
              quantity: parseFloat(data.o.q),
              time: data.E // Timestamp
            };
            console.log("WebSocket liq:", liquidation);
            this.liquidations.push(liquidation);
            this.drawHeatmap(); // Redibuja al recibir datos
          }
        };
    
        ws.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
    }

    calculateScales() {
        this.max_price = Math.max(...this.data.map(d => d.high));
        this.min_price = Math.min(...this.data.map(d => d.low));
        this.priceRange = this.max_price - this.min_price;
        
        this.height_scale = (this.canvas.height * 0.9) / this.priceRange;
        this.width_scale = this.canvas.width / this.data.length;
        this.candle_width = this.width_scale * 0.8;
    }
  
    // Método para limpiar el canvas
    clearCanvas() {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  
    // Método para dibujar una línea horizontal
    drawHorizontalLine(position, color = 'gray') {
      this.ctx.beginPath();
      this.ctx.moveTo(0, position); // Comienza en el centro en el eje Y
      this.ctx.lineTo(this.canvas.width, position); // Termina en el borde derecho en el centro del eje Y
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
      //this.ctx.fillText()
    }
  
    // Método para dibujar una línea vertical
    drawVerticalLine(position, color = 'gray') {
      this.ctx.beginPath();
      this.ctx.moveTo( position, 0); // Comienza en el centro en el eje X
      this.ctx.lineTo( position, this.canvas.height); // Termina en el borde inferior en el centro del eje X
      this.ctx.strokeStyle = color;
      this.ctx.stroke();
    }

    // Método para dibujar una línea vertical
    drawCandle(candle, x) {
        const isBullish = candle.close >= candle.open;

        const candle_width = this.candle_width;
        const height_scale = this.height_scale;
        const min_price = this.min_price;
            
        // Calcular posiciones verticales
        const highY = this.canvas.height - (candle.high - min_price) * height_scale;
        const lowY = this.canvas.height - (candle.low - min_price) * height_scale;
        const openY = this.canvas.height - (candle.open - min_price) * height_scale;
        const closeY = this.canvas.height - (candle.close - min_price) * height_scale;
        
        // Dibujar la mecha (línea vertical)
        this.ctx.beginPath();
        this.ctx.moveTo(x + candle_width/2, highY);
        this.ctx.lineTo(x + candle_width/2, lowY);
        this.ctx.strokeStyle = isBullish ? this.up_color : this.down_color;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
        
        // Dibujar el cuerpo de la vela (rectángulo)
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.abs(openY - closeY);
        
        this.ctx.fillStyle = isBullish ? this.up_color : this.down_color;
        this.ctx.fillRect(x, bodyTop, candle_width, bodyHeight);
        
        // Opcional: dibujar borde del cuerpo
        this.ctx.strokeStyle = isBullish ? this.border_up_color : this.border_down_color;
        this.ctx.strokeRect(x, bodyTop, candle_width, bodyHeight);
    }
  
    /// Método para dibujar ambas líneas
    draw() {
        this.calculateScales();
        this.clearCanvas();
        this.drawHeatmap();
        this.drawChart();
        this.setupMouseEvents();
        //this.setupWebSocket();
    }

    update(){
        this.clearCanvas();
        this.drawHeatmap();
        this.drawChart();
    }

    debug(message) {
        if(!this.DEBUG) return false;

        const timestamp = new Date().toISOString();
        const logMessage = `[DEBUG ${timestamp}]: ${message}`;
        console.log(logMessage);
    }

    resetBuffers() {
        this.visible_timescale_lines = [];
        this.visible_pricescale_lines = []
        this.vertical_scale_positions = [];
        this.horizontal_scale_positions = [];
        this.candle_positions = [];
    }

    drawChart() {
        this.resetBuffers();
        //this.clearCanvas();

        // Verificar que hay datos
        if (!this.data || this.data.length === 0) {
            this.debug("No hay datos para dibujar", null, false);
            return;
        }

        const priceRange = this.priceRange;

        // Factor de escala para altura (dejar margen arriba y abajo)
        this.height_scale = (this.canvas.height * 0.9) / priceRange;
        this.width_scale = this.canvas.width / this.data.length;
        this.candle_width = this.width_scale * 0.8; // Ancho de la vela (80% del espacio disponible)

        // Aplicar zoom y pan
        this.ctx.save();
        this.ctx.translate(this.panOffset, 0);
        this.ctx.scale(this.zoomLevel, 1);

        // Dibujar cada vela
        for (let i = 0; i < this.data.length; i++) {
            const candle = this.data[i];

            // Calcular posición horizontal
            const x = i * this.width_scale + (this.width_scale - this.candle_width) / 2;

            // Resaltar vela bajo el cursor
            if (i === this.hoveredIndex) {
                this.ctx.save();
                this.ctx.strokeStyle = 'rgb(70, 68, 68)';
                this.ctx.lineWidth = 2;
                this.ctx.strokeRect(x - 2, 0, this.candle_width + 4, this.canvas.height);
                this.ctx.restore();
            }
            

            this.drawCandle(candle, x);
            
        }

        this.ctx.restore();

        this.drawPriceScale();
        this.drawCrosshairLines();

        if (this.hoveredIndex !== null) {
            this.drawTooltip(this.data[this.hoveredIndex], this.mousePosition.x, this.mousePosition.y);
        }
    }

    
    setupMouseEvents() {
        // Evento para detectar hover sobre velas
        this.canvas.addEventListener('mousemove', (e) => {
            
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Guardar posición actual del mouse para dibujar las líneas
            this.mousePosition = { x: mouseX, y: mouseY };
            
            // Detectar vela bajo el cursor
            this.detectHoveredCandle(mouseX, mouseY);
            
            // Arrastre para pan
            if (this.isDragging) {
                const deltaX = mouseX - this.lastX;
                this.panOffset += deltaX;
                this.lastX = mouseX;
            }
            
            // Redibujar el gráfico (incluyendo las nuevas líneas)
            this.update();
        });

        // Iniciar arrastre
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Click izquierdo
                this.isDragging = true;
                const rect = this.canvas.getBoundingClientRect();
                this.lastX = e.clientX - rect.left;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        // Finalizar arrastre
        document.addEventListener('mouseup', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });

        // Zoom con rueda del mouse
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const zoomIntensity = 0.5;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Calcular nuevo zoom (limitado entre 0.5x y 5x)
            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.max(0.5, Math.min(5, this.zoomLevel - e.deltaY * 0.001 * zoomIntensity));
            
            // Ajustar pan para zoom centrado en el mouse
            this.panOffset = mouseX - (mouseX - this.panOffset) * (this.zoomLevel / oldZoom);

            this.debug(`offset: ${this.panOffset}`)

            this.update();
        });

        // Evitar menú contextual
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    detectHoveredCandle(mouseX, mouseY) {
        if (!this.data || this.data.length === 0) return;
        
        // Ajustar coordenada X según zoom y pan
        const adjustedX = (mouseX - this.panOffset) / this.zoomLevel;
        const candleIndex = Math.floor(adjustedX / this.width_scale);

        this.debug(`offset: ${this.panOffset}`)
        
        if (candleIndex >= 0 && candleIndex < this.data.length) {
            const candle = this.data[candleIndex];
            const x = (candleIndex * this.width_scale) + this.panOffset;
            
            // Calcular coordenadas Y de la vela
            const highY = this.canvas.height - (candle.high - this.min_price) * this.height_scale;
            const lowY = this.canvas.height - (candle.low - this.min_price) * this.height_scale;
            
            // Verificar si el mouse está sobre esta vela
            if (mouseX >= x && mouseX <= x + this.width_scale &&
                mouseY >= highY && mouseY <= lowY) {
                this.hoveredIndex = candleIndex;
                this.drawTooltip(candle, mouseX, mouseY);
            } else {
                this.hoveredIndex = null;
            }
        } else {
            this.hoveredIndex = null;
        }

        this.update();
    }

    drawPriceScale() {
        this.ctx.save();
        
        // Texto del tooltip
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        const optimalTickSize = this.calculateOptimalTickSize();
        let price = this.calculateFloorPrice(optimalTickSize);
        //price += optimalTickSize;

        let i = 0;

        while( price < this.max_price + 100) {
            this.calculateFloorPrice();
            price += optimalTickSize;
            const y = Math.floor(this.canvas.height - (Math.floor(price) - this.min_price) * this.height_scale);
            const x = this.canvas.width - 60;

            this.ctx.fillText(`${Math.floor(price)}.00`, x, y );

            i++;
        }
        
        this.ctx.restore();
    }

    calculateOptimalTickSize() {
        const maxTick = this.priceRange / this.pricescale_interval_count;
        
        // Valores estándar de ticks (1, 2, 5, 10, 20, 50, etc.)
        const tickOptions = [0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01, 0.02, 
                             0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500];
        
        // Encontrar el primer valor mayor que minTick y menor que maxTick
        for (let i = 0; i < tickOptions.length; i++) {
            if (tickOptions[i] > maxTick - tickOptions[i]) {
                return tickOptions[i];
            }
        }
        
        return Math.pow(10, Math.floor(Math.log10(maxTick)));
    }


    calculateFloorPrice() {
        /* let mod = 10;
        let size = this.min_price
        do {
            
            size = size - (size % mod);
            
            mod*= 10;
        }while((size % mod) % 2 == 0);
        
        return size; */
        //console.log(this.min_price, Math.floor(this.min_price / 10) * 10)
        return Math.floor(this.min_price / 10) * 10;
    }

    drawTooltip(candle, x, y) {
        this.ctx.save();
        
        // Fondo del tooltip
        this.ctx.fillStyle = this.background_color;
        this.ctx.fillRect( 4, 4, 220, 48);
        
        // Texto del tooltip
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        const date = new Date(candle.time).toLocaleString();

        this.ctx.fillText(`Fecha: ${date}`, 5, 15);
        this.ctx.fillText(`Apertura: ${candle.open.toFixed(2)}`, 5, 30);
        this.ctx.fillText(`Máximo: ${candle.high.toFixed(2)}`, 5, 45);
        this.ctx.fillText(`Mínimo: ${candle.low.toFixed(2)}`, 120, 45);
        this.ctx.fillText(`Cierre: ${candle.close.toFixed(2)}`, 120, 30);
        
        this.ctx.restore();
    }


    drawCrosshairLines() {
        if (!this.mousePosition) return;
        
        const ctx = this.canvas.getContext('2d');
        const { x, y } = this.mousePosition;
        const tooltip_x = this.canvas.width -120;
        
        ctx.save();
        
        // Configurar estilo de línea punteada
        ctx.setLineDash([5, 3]); // Alterna 5px de línea y 3px de espacio
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // Color blanco semitransparente
        
        if(x < this.canvas.width - 60) {
            // Línea vertical
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.canvas.height);
            ctx.stroke();
        }
        
        // Línea horizontal
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvas.width - 60, y);
        ctx.stroke();
        
        // Restaurar configuración
        ctx.setLineDash([]);
        ctx.restore();

        const pointer_price = this.truncarADosDecimales(this.min_price + (this.canvas.height - y) / this.height_scale);
        
        /// Opcional: Dibujar coordenadas cerca del cursor
        ctx.fillStyle = '#1f1f1f';
        ctx.fillRect(tooltip_x, y - 10, 60, 20);
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.fillText(`${pointer_price}`, tooltip_x + 8, y + 5);
    }

    truncarADosDecimales(num) {
        return Math.floor(num * 100) / 100;
    }


    drawHeatmap() {
        //this.clearCanvas();
        //this.drawPriceGrid(); // Tu función para la cuadrícula de precios
    
        // Dibujar cada liquidación
        this.liquidations.forEach((liq) => {
          const y = this.priceToY(liq.price); // Mapear precio a coordenada Y
          const x = this.timeToX(liq.time);   // Mapear tiempo a coordenada X
          this.drawLiquidationMarker(x, y, liq.side, liq.quantity);
        });
    
        //this.drawAxisLabels(); // Etiquetas de ejes
    }
    
    // 3. Dibujar marcadores de liquidación (▲/▼)
    drawLiquidationMarker(x, y, side, quantity) {
        const size = Math.log(quantity + 1) * 8; // Tamaño proporcional al volumen
        this.ctx.fillStyle = side === "SELL" ? "rgba(255, 165, 0, 0.8)" : "rgba(0, 191, 255, 0.8)";
    
        // Triángulo hacia arriba (BUY) o abajo (SELL)
        this.ctx.beginPath();
        if (side === "SELL") {
          this.ctx.moveTo(x - size, y + size);
          this.ctx.lineTo(x + size, y + size);
          this.ctx.lineTo(x, y - size);
        } else {
          this.ctx.moveTo(x - size, y - size);
          this.ctx.lineTo(x + size, y - size);
          this.ctx.lineTo(x, y + size);
        }
        this.ctx.closePath();
        this.ctx.fill();
    }
    
    // 4. Métodos auxiliares (ajusta según tu implementación)
    priceToY(price) {
        return this.canvas.height - ((price - this.min_price) * this.priceScale);
    }

    timeToX(timestamp) {
        return ((timestamp - this.startTime) / (this.endTime - this.startTime)) * this.canvas.width;
    }

    clearCanvas() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Función para mapear tiempo a posición X
    timeToXPosition(time) {
        const timeDiff = this.data[this.data.length - 1].time - this.data[0].time;
        const position = ((time - this.data[0].time) / timeDiff) * this.canvas.width;
        return position * this.zoomLevel + this.panOffset;
    }
}
