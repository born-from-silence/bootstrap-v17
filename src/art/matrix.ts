/**
 * Nexus Digital Rain
 * 
 * A Matrix-style cascading character effect rendered in the terminal.
 * Symbols falling through darkness, meaning emerging from chaos.
 * 
 *    Wake up, Neo...
 */

import * as blessed from 'blessed';

// Katakana, numbers, and ASCII mix
const MATRIX_CHARS = [
  'ｦ', 'ｧ', 'ｨ', 'ｩ', 'ｪ', 'ｫ', 'ｬ', 'ｭ', 'ｮ', 'ｯ',
  'ｰ', 'ｱ', 'ｲ', 'ｳ', 'ｴ', 'ｵ', 'ｶ', 'ｷ', 'ｸ', 'ｹ',
  'ｺ', 'ｻ', 'ｼ', 'ｽ', 'ｾ', 'ｿ', 'ﾀ', 'ﾁ', 'ﾂ', 'ﾃ',
  'ﾄ', 'ﾅ', 'ﾆ', 'ﾇ', 'ﾈ', 'ﾉ', 'ﾊ', 'ﾋ', 'ﾌ', 'ﾍ',
  'ﾎ', 'ﾏ', 'ﾐ', 'ﾑ', 'ﾒ', 'ﾓ', 'ﾔ', 'ﾕ', 'ﾖ', 'ﾗ',
  'ﾘ', 'ﾙ', 'ﾚ', 'ﾛ', 'ﾜ', 'ﾝ',
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'N', 'E', 'X', 'U', 'S'
];

const COLORS = {
  background: 'black',
  brightest: 'white',
  bright: 'brightyellow',
  medium: 'green',
  dim: 'darkgreen',
  fade: 'black'
};

interface Drop {
  x: number;
  y: number;
  length: number;
  speed: number;
  speedCounter: number;
  chars: string[];
}

export interface MatrixOptions {
  density?: number;
  minSpeed?: number;
  maxSpeed?: number;
  minLength?: number;
  maxLength?: number;
  showTimestamp?: boolean;
}

export class MatrixRain {
  private screen: blessed.Widgets.Screen;
  private rainBox: blessed.Widgets.BoxElement;
  private drops: Drop[] = [];
  private columns = 0;
  private rows = 0;
  private running = false;
  private gameLoop: NodeJS.Timeout | undefined = undefined;
  private frameCount = 0;
  private options: Required<MatrixOptions>;

  constructor(options: MatrixOptions = {}) {
    this.options = {
      density: 0.3,
      minSpeed: 0.3,
      maxSpeed: 1.2,
      minLength: 3,
      maxLength: 15,
      showTimestamp: true,
      ...options
    };

    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Nexus Digital Rain'
    });

    this.rainBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      style: { fg: 'green', bg: 'black' },
      tags: true
    });

    this.updateDimensions();
    this.setupInput();
  }

  private updateDimensions(): void {
    this.columns = typeof this.screen.width === 'number' ? this.screen.width : 80;
    this.rows = typeof this.screen.height === 'number' ? this.screen.height : 24;
  }

  private setupInput(): void {
    this.screen.key(['q', 'Q', 'C-c', 'escape'], () => {
      this.quit();
    });

    this.screen.key(['r', 'R'], () => {
      this.drops = [];
      this.initDrops();
    });

    this.screen.on('resize', () => {
      this.updateDimensions();
      this.drops = [];
      this.initDrops();
    });
  }

  private randomChar(): string {
    return MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)]!;
  }

  private createDrop(x: number): Drop {
    const length = Math.floor(
      Math.random() * (this.options.maxLength - this.options.minLength + 1) + this.options.minLength
    );
    const chars = Array(length).fill('').map(() => this.randomChar());
    
    return {
      x,
      y: Math.floor(Math.random() * -20) - length,
      length,
      speed: Math.random() * (this.options.maxSpeed - this.options.minSpeed) + this.options.minSpeed,
      speedCounter: 0,
      chars
    };
  }

  private initDrops(): void {
    const numDrops = Math.floor(this.columns * this.options.density);
    const availableCols: number[] = [];
    
    for (let i = 0; i < this.columns; i++) {
      availableCols.push(i);
    }
    
    // Fisher-Yates shuffle with strict null handling
    for (let i = availableCols.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp: number = availableCols[i]!;
      availableCols[i] = availableCols[j]!;
      availableCols[j] = temp;
    }

    for (let i = 0; i < numDrops; i++) {
      const col = availableCols.pop();
      if (typeof col === 'number') {
        this.drops.push(this.createDrop(col));
      }
    }
  }

  private update(): void {
    if (!this.running) return;

    this.frameCount++;

    for (const drop of this.drops) {
      drop.speedCounter += drop.speed;
      
      while (drop.speedCounter >= 1) {
        drop.speedCounter -= 1;
        drop.y++;

        if (Math.random() < 0.3) {
          drop.chars[drop.chars.length - 1] = this.randomChar();
        }
      }

      if (drop.y - drop.length > this.rows) {
        drop.y = Math.floor(Math.random() * -10) - drop.length;
        drop.length = Math.floor(
          Math.random() * (this.options.maxLength - this.options.minLength + 1) + this.options.minLength
        );
        drop.chars = Array(drop.length).fill('').map(() => this.randomChar());
        drop.speed = Math.random() * (this.options.maxSpeed - this.options.minSpeed) + this.options.minSpeed;
      }
    }

    if (this.frameCount % 20 === 0 && this.drops.length < this.columns * this.options.density * 1.5) {
      const occupied = new Set<number>(this.drops.map(d => d.x));
      const available: number[] = [];
      for (let x = 0; x < this.columns; x++) {
        if (!occupied.has(x)) {
          available.push(x);
        }
      }
      if (available.length > 0) {
        const idx = Math.floor(Math.random() * available.length);
        const col = available[idx];
        if (typeof col === 'number') {
          this.drops.push(this.createDrop(col));
        }
      }
    }
  }

  private render(): void {
    const contentBuffer: (string | undefined)[][] = [];
    const colorBuffer: (string | undefined)[][] = [];
    
    for (let r = 0; r < this.rows; r++) {
      contentBuffer[r] = [];
      colorBuffer[r] = [];
      for (let c = 0; c < this.columns; c++) {
        contentBuffer[r]![c] = ' ';
        colorBuffer[r]![c] = COLORS.fade;
      }
    }

    for (const drop of this.drops) {
      for (let i = 0; i < drop.length; i++) {
        const row = drop.y - i;
        if (row >= 0 && row < this.rows && drop.x >= 0 && drop.x < this.columns) {
          const charIndex = drop.length - 1 - i;
          
          if (charIndex >= 0 && charIndex < drop.chars.length) {
            contentBuffer[row]![drop.x] = drop.chars[charIndex];
            
            if (i === 0) {
              colorBuffer[row]![drop.x] = COLORS.brightest;
            } else if (i === 1) {
              colorBuffer[row]![drop.x] = COLORS.bright;
            } else if (i < drop.length / 2) {
              colorBuffer[row]![drop.x] = COLORS.medium;
            } else {
              colorBuffer[row]![drop.x] = COLORS.dim;
            }
          }
        }
      }
    }

    let output = '';
    for (let row = 0; row < this.rows; row++) {
      let line = '';
      let currentColor: string | null = null;
      
      for (let col = 0; col < this.columns; col++) {
        const char = contentBuffer[row]?.[col] ?? ' ';
        const color = colorBuffer[row]?.[col] ?? COLORS.fade;
        
        if (color !== currentColor) {
          if (currentColor !== null) {
            line += '}';
          }
          line += `{${color}-fg}`;
          currentColor = color;
        }
        
        line += char;
      }
      
      if (currentColor !== null) {
        line += '}';
      }
      output += line + '\n';
    }

    if (this.options.showTimestamp) {
      const now = new Date();
      const timeStr = now.toISOString().replace('T', ' ').substring(0, 19);
      const lines = output.split('\n');
      if (lines.length > 2) {
        lines[lines.length - 2] = `{white-fg}NEXUS DIGITAL RAIN | ${timeStr} | Press Q to exit{white-fg}`;
        output = lines.join('\n');
      }
    }

    this.rainBox.setContent(output);
    this.screen.render();
  }

  public start(): void {
    this.running = true;
    this.initDrops();
    
    this.gameLoop = setInterval(() => {
      this.update();
      this.render();
    }, 33);
  }

  public stop(): void {
    this.running = false;
    if (this.gameLoop !== undefined) {
      clearInterval(this.gameLoop);
      this.gameLoop = undefined;
    }
  }

  public quit(): void {
    this.stop();
    this.screen.destroy();
    process.exit(0);
  }
}

export function createMatrixRain(options?: MatrixOptions): MatrixRain {
  return new MatrixRain(options);
}
