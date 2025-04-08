export class CanvasDrawer {
    /// new refactor
    data = [];
    DEBUG = true;
    up_color = 'green';
    down_color = 'red';
    border_up_color = 'green';
    border_down_color = 'red';

    min_price = 0;
    max_price = 0;
    width_scale = 0;
    height_scale = 0;
    candle_width = 0;

    

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

    constructor(canvasRef) {
        this.canvas = canvasRef.current;
        this.ctx = this.canvas.getContext('2d');

        this.zoomLevel = 1;
        this.panOffset = 0;
        this.hoveredIndex = null;
        this.isDragging = false;
        this.lastX = 0;
    }

    setData(data) {
        this.data = data;
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
  
    // Método para dibujar ambas líneas
    drawLines() {
        this.clearCanvas();
        this.setRect();
        this.draw();
        this.setupMouseEvents()
    }

    debug(message) {
        if(!this.DEBUG) return false;

        const timestamp = new Date().toISOString();
        const logMessage = `[DEBUG ${timestamp}]: ${message}`;
        console.log(logMessage);
    }



    setMinMaxScalePrice() {
        //console.log('min price', this.min_price, 'max price', this.max_price);

        this.min_price = Math.floor(this.min_price - (this.min_price * 0.1));
        this.max_price = Math.floor(this.max_price + (this.max_price * 0.1));

        this.min_price = this.min_price - (this.min_price % 100);
        this.max_price = this.max_price - (this.max_price % 100);

        //console.log('min price', this.min_price, 'max price', this.max_price);
        //console.log('scale price hight', (this.max_price - this.min_price));
    }
        
    setRect() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        //this.interval_width = this.width / 20;
    }

    resetBuffers() {
        this.visible_timescale_lines = [];
        this.visible_pricescale_lines = []
        this.vertical_scale_positions = [];
        this.horizontal_scale_positions = [];
        this.candle_positions = [];
    }

    setMetricIntervalsV2() {

    }

    draw() {
        this.resetBuffers();
        this.clearCanvas();

        // Verificar que hay datos
        if (!this.data || this.data.length === 0) {
            this.debug("No hay datos para dibujar", null, false);
            return;
        }

        // Calcular factores de escala
        this.max_price = Math.max(...this.data.map(d => d.high));
        this.min_price = Math.min(...this.data.map(d => d.low));
        const priceRange = this.max_price - this.min_price;
        
        this.debug(`Rango de precios: ${this.min_price} - ${this.max_price} (rango: ${priceRange})`);

        // Factor de escala para altura (dejar margen arriba y abajo)
        this.height_scale = (this.canvas.height * 0.9) / priceRange;
        this.width_scale = this.canvas.width / this.data.length;
        this.candle_width = this.width_scale * 0.8; // Ancho de la vela (80% del espacio disponible)

        this.debug(`Escala vertical: ${this.height_scale}`);
        this.debug(`Escala horizontal: ${this.width_scale}`);
        this.debug(`Ancho de vela: ${this.candle_width}`);

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

        this.drawCrosshairLines();

        if (this.hoveredIndex !== null) {
            this.drawTooltip(this.data[this.hoveredIndex], this.mousePosition.x, this.mousePosition.y);
        }
    }

    setMetricIntervals() {
        this.resetBuffers();

        let visible = false;

        this.min_price = this.data[0].high;
        this.max_price = this.data[0].low;

        /// TimeScale metrics
        /// Index de la escala de tiempo
        let i_time = 0;

        for(let i = 0; i < this.data.length; i++) {

            if( this.positions_per_interval_count >= this.points_per_time_interval )
                this.positions_per_interval_count = 0;

            /// Obteniendo Máximos
            if( this.data[i].close > this.max_price ) {
                this.max_price = this.data[i].high;
            }

            /// Obteniendo mínimos
            if( this.data[i].close < this.min_price ) {
                this.main_price = this.data[i].low;
            }

            /// Estableciendo lineas del timeScale
            /// Cada escala tendrá 12 velas
            const horiz_scale_positon = this.width - (i * (this.interval_width / 12));

            /// Establece el rango visible de la escala de tiempo
            if(horiz_scale_positon < this.width && horiz_scale_positon > 0)
                visible = true;
            
            /** Solo se toma la posición 0 y se inserta una linea de cuadrícula
             * las demás posisciones son para velas
            */
            if( this.positions_per_interval_count === 0 ) {

                this.horizontal_scale_positions.push({ position: horiz_scale_positon, visible: visible });
                if( visible )
                    this.visible_timescale_lines.push(
                        {
                            data: this.data[i_time],
                            index: i_time
                        }
                    )
                
                i_time++;
            }

            //let d = this.data[i];

            /** Obteniendo velas visibles */
            this.candle_positions.push({
                position: horiz_scale_positon,
                visible: visible
            })

            visible = false;
            this.positions_per_interval_count++;
        }

        i_time = 0;


        /// PriceScale metrics
        this.setMinMaxScalePrice()

        const scaleprice_height = this.max_price - this.min_price;
        
        this.interval_height = Math.floor(( scaleprice_height / this.height ));
        this.pricescale_interval_count = Math.floor(scaleprice_height / this.interval_height)

        console.log('Altura', scaleprice_height)
        console.log('Altura intervalo', this.interval_height)
        console.log('cantidad de escalas', this.pricescale_interval_count)
        let scale_increment = Math.floor(scaleprice_height / this.pricescale_interval_count);
        //scale_increment -= (scale_increment % 100);
        let scale_price = this.min_price;

        console.log('increment', scale_increment)

        /// Recorre el alto de la escala de precios
        for(let i = 0; i < this.data.length; i++) {

            /// Calcula el precio que se convertirá en una métrica
            const vert_scale_position = this.height - (i * this.interval_height)

            /// Establece el rango visible de la escala de precios
            if(vert_scale_position < this.height && vert_scale_position > 0 )
                visible = true;

            scale_price += scale_increment;

            console.log(scale_price);
            /// Almacena las métricas de precios
            this.vertical_scale_positions.push({
                position: vert_scale_position,
                visible: visible,
                price: scale_price
            });

            /// Almacena las métricas visibles de la escala de precios
            if( visible ){
                this.visible_pricescale_lines.push(
                    {
                        index: i
                    }
                )
            }

            let d = this.data[i];
           
            this.candle_positions[i].data =
                {
                    open: this.calcularAltura(d.open),
                    close: this.calcularAltura(d.close),
                    high: this.calcularAltura(d.high),
                    low: this.calcularAltura(d.low)
                }

            //console.log(this.candle_positions[i].data)

            visible = false;
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
            this.draw();
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
            const zoomIntensity = 0.2;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            
            // Calcular nuevo zoom (limitado entre 0.5x y 5x)
            const oldZoom = this.zoomLevel;
            this.zoomLevel = Math.max(0.5, Math.min(5, this.zoomLevel - e.deltaY * 0.001 * zoomIntensity));
            
            // Ajustar pan para zoom centrado en el mouse
            this.panOffset = mouseX - (mouseX - this.panOffset) * (this.zoomLevel / oldZoom);
            
            this.draw();
        });

        // Evitar menú contextual
        this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    detectHoveredCandle(mouseX, mouseY) {
        if (!this.data || this.data.length === 0) return;
        
        // Ajustar coordenada X según zoom y pan
        const adjustedX = (mouseX - this.panOffset) / this.zoomLevel;
        const candleIndex = Math.floor(adjustedX / this.width_scale);

        this.debug(`X ajustada: ${adjustedX}`)
        this.debug(`X mouse: ${mouseX}`)
        this.debug(`X offset: ${this.panOffset}`)
        this.debug(`X candle index: ${candleIndex}`)
        
        if (candleIndex >= 0 && candleIndex < this.data.length) {
            const candle = this.data[candleIndex];
            const x = (candleIndex * this.width_scale) + this.panOffset;

            this.debug(`X x: ${x}`)
            
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
        
        this.draw(); // Redibujar para mostrar cambios
    }

    drawTooltip(candle, x, y) {
        this.ctx.save();
        
        // Fondo del tooltip
        this.ctx.fillStyle = 'rgb(36, 35, 35)';
        //this.ctx.fillRect(x - 100, y - 80, 220, 80);
        this.ctx.fillRect( 4, 4, 220, 48);
        
        // Texto del tooltip
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        const date = new Date(candle.time).toLocaleString();
        /* this.ctx.fillText(`Fecha: ${date}`, x - 90, y - 60);
        this.ctx.fillText(`Apertura: ${candle.open.toFixed(2)}`, x - 90, y - 40);
        this.ctx.fillText(`Máximo: ${candle.high.toFixed(2)}`, x - 90, y - 20);
        this.ctx.fillText(`Mínimo: ${candle.low.toFixed(2)}`, x + 10, y - 40);
        this.ctx.fillText(`Cierre: ${candle.close.toFixed(2)}`, x + 10, y - 20); */

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
        
        ctx.save();
        
        // Configurar estilo de línea punteada
        ctx.setLineDash([5, 3]); // Alterna 5px de línea y 3px de espacio
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)'; // Color blanco semitransparente
        
        // Línea vertical
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, this.canvas.height);
        ctx.stroke();
        
        // Línea horizontal
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(this.canvas.width, y);
        ctx.stroke();
        
        // Restaurar configuración
        ctx.setLineDash([]);
        ctx.restore();
        
        // Opcional: Dibujar coordenadas cerca del cursor
        ctx.fillStyle = 'white';
        ctx.fillRect(x + 10, y - 20, 60, 20);
        ctx.fillStyle = 'black';
        ctx.font = '10px Arial';
        ctx.fillText(`(${x}, ${y})`, x + 15, y - 5);
    }
}


class MouseEventsDetector {
    constructor(element) {
        // Elemento al que se asociarán los eventos
        this.element = element || window;

        // Estado para el arrastre (drag)
        this.isDragging = false;
        this.startX = 0;
        this.startY = 0;

        // Callbacks para los eventos
        this.onScrollCallback = null;
        this.onDragStartCallback = null;
        this.onDragMoveCallback = null;
        this.onDragEndCallback = null;

        // Vincular los eventos
        this._bindEvents();
    }

    // Método para vincular los eventos al elemento
    _bindEvents() {
        // Evento de scroll
        this.element.addEventListener('scroll', (event) => {
            if (this.onScrollCallback) {
                this.onScrollCallback(event);
            }
        });

        // Eventos de arrastre (drag)
        this.element.addEventListener('mousedown', (event) => {
            this.isDragging = true;
            this.startX = event.clientX;
            this.startY = event.clientY;

            if (this.onDragStartCallback) {
                this.onDragStartCallback({ x: this.startX, y: this.startY });
            }
        });

        this.element.addEventListener('mousemove', (event) => {
            if (this.isDragging && this.onDragMoveCallback) {
                const offsetX = event.clientX - this.startX;
                const offsetY = event.clientY - this.startY;
                this.onDragMoveCallback({ x: event.clientX, y: event.clientY, offsetX, offsetY });
            }
        });

        this.element.addEventListener('mouseup', () => {
            if (this.isDragging && this.onDragEndCallback) {
                this.onDragEndCallback();
            }
            this.isDragging = false;
        });

        this.element.addEventListener('mouseleave', () => {
            if (this.isDragging && this.onDragEndCallback) {
                this.onDragEndCallback();
            }
            this.isDragging = false;
        });
    }

    // Métodos para registrar callbacks
    onScroll(callback) {
        this.onScrollCallback = callback;
    }

    onDragStart(callback) {
        this.onDragStartCallback = callback;
    }

    onDragMove(callback) {
        this.onDragMoveCallback = callback;
    }

    onDragEnd(callback) {
        this.onDragEndCallback = callback;
    }
}