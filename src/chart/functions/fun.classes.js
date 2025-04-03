export class CanvasDrawer {
    data = [];
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
    min_price = 0;
    max_price = 0;

    scrolled_distance = 0;
    pricescale_interval_count = 30;

    candle_positions = []

    constructor(canvasRef) {
        this.canvas = canvasRef.current;
        this.ctx = this.canvas.getContext('2d');
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
    drawCandle(data, position, color = 'green') {
        const { open, high, low, close } = data;

        const candleColor = close >= open ? 'green' : 'red';

        const yOpen = this.canvas.height - (open - this.minPrice) * this.priceScale;
        const yClose = this.canvas.height - (close - this.minPrice) * this.priceScale;
        const yHigh = this.canvas.height - (high - this.minPrice) * this.priceScale;
        const yLow = this.canvas.height - (low - this.minPrice) * this.priceScale;

        /* this.ctx.beginPath();
        this.ctx.moveTo( position, 0); // Comienza en el centro en el eje X
        this.ctx.lineTo( position, this.canvas.height); // Termina en el borde inferior en el centro del eje X
        this.ctx.strokeStyle = color;
        this.ctx.stroke(); */

        /* this.ctx.beginPath();
        this.ctx.moveTo(position, yHigh);
        this.ctx.lineTo(position, yLow);
        this.ctx.strokeStyle = candleColor;
        this.ctx.stroke(); */

        // Dibuja el cuerpo de la vela (rectángulo entre la apertura y el cierre)
        const candleWidth = 6; // Ancho de la vela
        this.ctx.fillStyle = candleColor;
        this.ctx.fillRect(position - candleWidth / 2, 10, candleWidth, 10);
      }
  
    // Método para dibujar ambas líneas
    drawLines() {
        this.clearCanvas();
        this.setRect();
        this.setMetricIntervals();
        //this.drawHorizontalLine();

        for(let i = 0; i < this.data.length; i++) {

            /** Lineas horizontales de cuadrícula */
            if( i < this.visible_timescale_lines.length) {
                const hor_line = this.visible_timescale_lines[i];
                this.drawVerticalLine(
                    this.horizontal_scale_positions[hor_line.index].position
                );
            }

            /** Lineas vericales de cuadrícula */
            if( i < this.visible_pricescale_lines.length) {
                const ver_line = this.visible_pricescale_lines[i];
                this.drawHorizontalLine(
                    this.vertical_scale_positions[ver_line.index].position
                );
            }

            this.drawCandle(
                this.candle_positions[i].data,
                this.candle_positions[i].position
            );
        }

        console.log('Fechas visibles', this.visible_timescale_lines.length)
        console.log('Precios visibles', this.visible_pricescale_lines.length)
    }



    setMinMaxScalePrice() {
        this.min_price = Math.floor(this.min_price - (this.min_price * 0.1));
        this.max_price = Math.floor(this.max_price + (this.max_price * 0.1));

        this.min_price = this.min_price - (this.min_price % 100);
        this.max_price = this.max_price - (this.max_price % 100);
    }
        
    setRect() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        //this.interval_width = this.width / 20;
    }

    resetBuffers() {
        this.visible_timescale_lines.length = [];
        this.visible_pricescale_lines.length = []
        this.vertical_scale_positions = [];
        this.horizontal_scale_positions = [];
        this.candle_positions = [];
    }

    setMetricIntervals() {
        this.resetBuffers();

        let visible = false;

        this.min_price = this.data[0].close;
        this.max_price = this.data[0].close;

        /// TimeScale metrics

        /// Index de la escala de tiempo
        let i_time = 0;
        for(let i = 0; i < this.data.length; i++) {

            if( this.positions_per_interval_count >= this.points_per_time_interval )
                this.positions_per_interval_count = 0;

            /// Obtenienfo Máximos
            if( this.data[i].close > this.max_price ) {
                this.max_price = this.data[i].close;
            }

            /// Obteniendo mínimos
            if( this.data[i].close < this.min_price ) {
                this.main_price = this.data[i].close;
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

            /** Obteniendo velas visibles */
            this.candle_positions.push({
                data: this.data[i],
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
        this.pricescale_interval_count = scaleprice_height / this.interval_height

        console.log('Altura', scaleprice_height)
        console.log('Altura', this.interval_height)
        console.log('cantidad de escalas', this.pricescale_interval_count)
        
        /// Recorre el alto de la escala de precios
        for(let i = 0; i < this.pricescale_interval_count; i++) {

            /// Calcula el precio que se convertirá en una métrica
            const vert_scale_position = this.height - (i * this.interval_height)

            /// Establece el rango visible de la escala de precios
            if(vert_scale_position < this.height && vert_scale_position > 0 )
                visible = true;

            /// Almacena las métricas de precios
            this.vertical_scale_positions.push({position: vert_scale_position, visible: visible});

            /// Almacena las métricas visibles de la escala de precios
            if( visible )
                this.visible_pricescale_lines.push(
                    {
                        index: i
                    }
                )

            visible = false;
        }
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