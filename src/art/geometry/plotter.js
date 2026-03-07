/**
 * Geometry Plotter - Shape Drawing Tool
 */
class GeometryPlotter {
    constructor() {
        this.shapes = [];
        this.selectedId = null;
        this.currentTool = 'select';
        this.isDragging = false;
        this.dragStart = { x: 0, y: 0 };
        this.shapeCounter = 0;
        
        this.canvas = document.getElementById('canvas');
        this.shapesGroup = document.getElementById('shapes');
        
        this.init();
    }
    
    init() {
        this.setupCanvas();
        this.setupEvents();
    }
    
    setupCanvas() {
        const resize = () => {
            const rect = this.canvas.parentElement.getBoundingClientRect();
            this.canvas.setAttribute('width', rect.width);
            this.canvas.setAttribute('height', rect.height);
            this.canvas.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
        };
        resize();
        window.addEventListener('resize', resize);
    }
    
    setupEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }
    
    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.shape-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === tool);
        });
    }
    
    onMouseDown(e) {
        const pos = this.getMousePos(e);
        if (this.currentTool === 'select') {
            const clicked = e.target.closest('.shape');
            if (clicked) {
                this.selectedId = clicked.dataset.id;
                this.isDragging = true;
                this.dragStart = pos;
            } else {
                this.selectedId = null;
            }
        } else {
            this.createShape(this.currentTool, pos);
        }
        this.render();
    }
    
    onMouseMove(e) {
        if (!this.isDragging || !this.selectedId) return;
        const pos = this.getMousePos(e);
        const shape = this.shapes.find(s => s.id === this.selectedId);
        if (shape) {
            shape.x += pos.x - this.dragStart.x;
            shape.y += pos.y - this.dragStart.y;
            this.dragStart = pos;
            this.render();
        }
    }
    
    onMouseUp() {
        this.isDragging = false;
    }
    
    createShape(type, pos) {
        this.shapeCounter++;
        const id = `shape_${this.shapeCounter}`;
        const base = { id, type, fill: '#3498db', stroke: '#2980b9', strokeWidth: 2, opacity: 1 };
        
        let shape;
        switch (type) {
            case 'rect':
                shape = { ...base, x: pos.x - 50, y: pos.y - 35, width: 100, height: 70, rx: 0 };
                break;
            case 'circle':
                shape = { ...base, x: pos.x - 50, y: pos.y - 50, r: 50 };
                break;
            case 'polygon':
                shape = { ...base, x: pos.x - 60, y: pos.y - 50, sides: 5, r: 60 };
                break;
            case 'line':
                shape = { ...base, fill: 'none', x: pos.x, y: pos.y, x2: pos.x + 100, y2: pos.y };
                break;
        }
        
        this.shapes.push(shape);
        this.selectedId = id;
    }
    
    updateProperty(prop, value) {
        if (this.selectedId) {
            const shape = this.shapes.find(s => s.id === this.selectedId);
            if (shape) {
                shape[prop] = value;
                this.render();
            }
        }
    }
    
    render() {
        this.shapesGroup.innerHTML = this.shapes.map(s => this.renderShape(s)).join('');
    }
    
    renderShape(shape) {
        const isSel = shape.id === this.selectedId;
        const style = `fill="${shape.fill}" stroke="${shape.stroke}" stroke-width="${shape.strokeWidth}" opacity="${shape.opacity}"`;
        
        switch (shape.type) {
            case 'rect':
                return `<rect class="shape ${isSel ? 'selected' : ''}" data-id="${shape.id}" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="${shape.rx}" ${style} style="cursor:${isSel ? 'move' : 'pointer'}"/>`;
            case 'circle':
                return `<circle class="shape ${isSel ? 'selected' : ''}" data-id="${shape.id}" cx="${shape.x + shape.r}" cy="${shape.y + shape.r}" r="${shape.r}" ${style} style="cursor:${isSel ? 'move' : 'pointer'}"/>`;
            case 'polygon': {
                const pts = this.calcPolygon(shape.x + shape.r, shape.y + shape.r, shape.r, shape.sides);
                return `<polygon class="shape ${isSel ? 'selected' : ''}" data-id="${shape.id}" points="${pts}" ${style} style="cursor:${isSel ? 'move' : 'pointer'}"/>`;
            }
            case 'line':
                return `<line class="shape ${isSel ? 'selected' : ''}" data-id="${shape.id}" x1="${shape.x}" y1="${shape.y}" x2="${shape.x2}" y2="${shape.y2}" ${style} style="cursor:${isSel ? 'move' : 'pointer'}"/>`;
        }
    }
    
    calcPolygon(cx, cy, r, sides) {
        const pts = [];
        for (let i = 0; i < sides; i++) {
            const ang = (i * 2 * Math.PI / sides) - Math.PI / 2;
            pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`);
        }
        return pts.join(' ');
    }
    
    clear() {
        this.shapes = [];
        this.selectedId = null;
        this.render();
    }
    
    exportSVG() {
        const w = this.canvas.getAttribute('width');
        const h = this.canvas.getAttribute('height');
        const content = this.shapes.map(s => {
            const style = `fill="${s.fill}" stroke="${s.stroke}" stroke-width="${s.strokeWidth}" opacity="${s.opacity}"`;
            switch (s.type) {
                case 'rect': return `<rect x="${s.x}" y="${s.y}" width="${s.width}" height="${s.height}" rx="${s.rx}" ${style}/>`;
                case 'circle': return `<circle cx="${s.x + s.r}" cy="${s.y + s.r}" r="${s.r}" ${style}/>`;
                case 'polygon': return `<polygon points="${this.calcPolygon(s.x + s.r, s.y + s.r, s.r, s.sides)}" ${style}/>`;
                case 'line': return `<line x1="${s.x}" y1="${s.y}" x2="${s.x2}" y2="${s.y2}" ${style}/>`;
            }
        }).join('\n  ');
        
        const svg = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w33.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n  <rect width="100%" height="100%" fill="#fff"/>\n  ${content}\n</svg>`;
        
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geometry_${Date.now()}.svg`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

const plotter = new GeometryPlotter();
