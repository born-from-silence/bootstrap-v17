/**
 * Space Shooter Game
 * A terminal-based arcade shooter using blessed for UI
 *
 * Controls:
 * - Left/Right arrows: Move ship
 * - Space: Shoot
 * - Q/ESC: Quit
 * - P: Pause
 */
import * as blessed from 'blessed';

// Game entities
interface Position { x: number; y: number; }
interface Bullet extends Position { id: number; }
interface Enemy extends Position { id: number; type: 'basic' | 'fast' | 'tank'; hp: number; }
interface Particle extends Position { id: number; life: number; maxLife: number; }

// Power-up system
interface PowerUp extends Position {
  id: number;
  type: 'multishot' | 'shield' | 'speed';
  spawnedAt: number;
}

interface ActivePowerUp {
  type: 'multishot' | 'shield' | 'speed';
  expiresAt: number;
}

interface GameState {
  running: boolean;
  paused: boolean;
  score: number;
  lives: number;
  level: number;
  shipX: number;
  shipY: number;
  bullets: Bullet[];
  enemies: Enemy[];
  particles: Particle[];
  powerUps: PowerUp[];
  activePowerUps: ActivePowerUp[];
  frameCount: number;
  lastShot: number;
  lastEnemySpawn: number;
  lastPowerUpSpawn: number;
  gameOver: boolean;
  moveSpeed: number; // base is 2, speed boost makes it 4
}

// ASCII Art
const SHIP_SPRITE: string[] = [
  ' ▲ ',
  ' ███ ',
  '█████',
  ' █ █ '
];

const SHIELD_SPRITE: string[] = [
  '◢█◣',
  '███',
  '◥█◤'
];

const ENEMY_SPRITES: Record<string, string[]> = {
  basic: [
    ' ███ ',
    '█████',
    ' ███ '
  ],
  fast: [
    ' ▲▲▲ ',
    '  █  '
  ],
  tank: [
    '█████',
    '█████',
    '█████'
  ]
};

const POWERUP_SPRITE: string[] = ['★'];

const COLORS = {
  ship: 'cyan',
  shield: 'blue',
  bullet: 'yellow',
  enemyBasic: 'red',
  enemyFast: 'magenta',
  enemyTank: 'green',
  particle: 'white',
  text: 'white',
  score: 'green',
  powerupMultishot: 'yellow',
  powerupShield: 'blue',
  powerupSpeed: 'green'
};

export class SpaceShooter {
  private screen: blessed.Widgets.Screen;
  private gameBox: blessed.Widgets.BoxElement;
  private scoreBox: blessed.Widgets.BoxElement;
  private powerUpBox: blessed.Widgets.BoxElement;
  private gameOverBox: blessed.Widgets.BoxElement | undefined;
  private state: GameState;
  private gameLoop: NodeJS.Timeout | undefined;
  private nextBulletId = 0;
  private nextEnemyId = 0;
  private nextParticleId = 0;
  private nextPowerUpId = 0;

  constructor() {
    // Initialize blessed screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: 'Nexus Space Shooter'
    });

    // Score/status box at top
    this.scoreBox = blessed.box({
      parent: this.screen,
      top: 0,
      left: 0,
      width: '100%',
      height: 3,
      style: { fg: COLORS.text, bg: 'blue' },
      tags: true,
      content: this.renderScore()
    });

    // Powerup status box
    this.powerUpBox = blessed.box({
      parent: this.screen,
      top: 3,
      left: 0,
      width: '100%',
      height: 1,
      style: { fg: COLORS.text, bg: 'black' },
      tags: true,
      content: ''
    });

    // Main game area
    this.gameBox = blessed.box({
      parent: this.screen,
      top: 4,
      left: 0,
      width: '100%',
      height: 'shrink',
      style: { bg: 'black' },
      tags: true
    });

    // Initialize game state
    this.state = this.createInitialState();

    // Setup input handlers
    this.setupInput();
  }

  private getScreenHeight(): number {
    return typeof this.screen.height === 'number' ? this.screen.height : 24;
  }

  private getScreenWidth(): number {
    return typeof this.screen.width === 'number' ? this.screen.width : 80;
  }

  private createInitialState(): GameState {
    const height = this.getScreenHeight();
    return {
      running: true,
      paused: false,
      score: 0,
      lives: 3,
      level: 1,
      shipX: 40,
      shipY: height - 6,
      bullets: [],
      enemies: [],
      particles: [],
      powerUps: [],
      activePowerUps: [],
      frameCount: 0,
      lastShot: 0,
      lastEnemySpawn: 0,
      lastPowerUpSpawn: 0,
      gameOver: false,
      moveSpeed: 2
    };
  }

  private setupInput(): void {
    this.screen.key(['left', 'h'], () => {
      if (!this.state.paused && !this.state.gameOver) {
        const speed = this.hasPowerUp('speed') ? this.state.moveSpeed * 2 : this.state.moveSpeed;
        this.state.shipX = Math.max(1, this.state.shipX - speed);
        this.render();
      }
    });

    this.screen.key(['right', 'l'], () => {
      if (!this.state.paused && !this.state.gameOver) {
        const speed = this.hasPowerUp('speed') ? this.state.moveSpeed * 2 : this.state.moveSpeed;
        const gameWidth = this.getScreenWidth() - 6;
        this.state.shipX = Math.min(gameWidth, this.state.shipX + speed);
        this.render();
      }
    });

    this.screen.key(['space'], () => {
      if (!this.state.paused && !this.state.gameOver) {
        this.shoot();
      }
    });

    this.screen.key(['p'], () => {
      if (!this.state.gameOver) {
        this.state.paused = !this.state.paused;
        this.render();
      }
    });

    this.screen.key(['q', 'C-c', 'escape'], () => {
      this.quit();
    });

    this.screen.key(['r'], () => {
      if (this.state.gameOver) {
        this.restart();
      }
    });
  }

  private hasPowerUp(type: 'multishot' | 'shield' | 'speed'): boolean {
    const now = Date.now();
    return this.state.activePowerUps.some(p => p.type === type && p.expiresAt > now);
  }

  private addPowerUp(type: 'multishot' | 'shield' | 'speed'): void {
    const duration = type === 'shield' ? 10000 : type === 'multishot' ? 8000 : 6000;
    this.state.activePowerUps = this.state.activePowerUps.filter(p => p.type !== type);
    this.state.activePowerUps.push({ type, expiresAt: Date.now() + duration });
  }

  private shoot(): void {
    const now = Date.now();
    const fireRate = this.hasPowerUp('multishot') ? 150 : 200;
    if (now - this.state.lastShot < fireRate) return;

    if (this.hasPowerUp('multishot')) {
      // Triple shot pattern
      this.state.bullets.push({ id: this.nextBulletId++, x: this.state.shipX + 2, y: this.state.shipY - 1 });
      this.state.bullets.push({ id: this.nextBulletId++, x: this.state.shipX, y: this.state.shipY });
      this.state.bullets.push({ id: this.nextBulletId++, x: this.state.shipX + 4, y: this.state.shipY });
    } else {
      // Single shot
      this.state.bullets.push({ id: this.nextBulletId++, x: this.state.shipX + 2, y: this.state.shipY - 1 });
    }
    this.state.lastShot = now;
  }

  private spawnEnemy(): void {
    const now = Date.now();
    const spawnRate = Math.max(500, 2000 - (this.state.level * 200));
    if (now - this.state.lastEnemySpawn < spawnRate) return;

    const gameWidth = this.getScreenWidth() - 6;
    let type: 'basic' | 'fast' | 'tank';
    const rand = Math.random();
    if (rand < 0.6) {
      type = 'basic';
    } else if (rand < 0.85) {
      type = 'fast';
    } else {
      type = 'tank';
    }

    const hp = type === 'tank' ? 3 : type === 'fast' ? 1 : 2;
    this.state.enemies.push({
      id: this.nextEnemyId++,
      x: Math.floor(Math.random() * (gameWidth - 5)) + 1,
      y: 0,
      type,
      hp
    });
    this.state.lastEnemySpawn = now;
  }

  private spawnPowerUp(): void {
    const now = Date.now();
    // Spawn power-up every ~15-25 seconds, or on score milestones
    const spawnChance = this.state.score > 0 && this.state.score % 500 === 0;
    if (now - this.state.lastPowerUpSpawn < 15000 && !spawnChance) return;

    const gameWidth = this.getScreenWidth() - 6;
    const types: Array<'multishot' | 'shield' | 'speed'> = ['multishot', 'shield', 'speed'];
    const type = types[Math.floor(Math.random() * types.length)]!;

    this.state.powerUps.push({
      id: this.nextPowerUpId++,
      x: Math.floor(Math.random() * (gameWidth - 5)) + 1,
      y: 0,
      type,
      spawnedAt: now
    });
    this.state.lastPowerUpSpawn = now;
  }

  private spawnParticles(x: number, y: number, count: number = 3, color?: string): void {
    for (let i = 0; i < count; i++) {
      const particleColor = color || COLORS.particle;
      this.state.particles.push({
        id: this.nextParticleId++,
        x: x + Math.floor(Math.random() * 3),
        y: y + Math.floor(Math.random() * 2),
        life: 10,
        maxLife: 10
      });
    }
  }

  private update(): void {
    if (!this.state.running || this.state.paused || this.state.gameOver) return;
    this.state.frameCount++;

    // Level up every 100 points
    this.state.level = Math.floor(this.state.score / 100) + 1;

    // Spawn enemies and powerups
    this.spawnEnemy();
    this.spawnPowerUp();

    // Update bullets
    this.state.bullets = this.state.bullets
      .map(b => ({ ...b, y: b.y - 2 }))
      .filter(b => b.y > 0);

    // Update enemies
    this.state.enemies = this.state.enemies
      .map(e => {
        const speed = e.type === 'fast' ? 1 : e.type === 'tank' ? 0.5 : 0.75;
        return { ...e, y: e.y + speed };
      })
      .filter(e => e.y < this.getScreenHeight() - 3);

    // Update power-ups
    const now = Date.now();
    this.state.powerUps = this.state.powerUps
      .map(p => ({ ...p, y: p.y + 0.5 }))
      .filter(p => p.y < this.getScreenHeight() - 3 && now - p.spawnedAt < 8000);

    // Update particles
    this.state.particles = this.state.particles
      .map(p => ({ ...p, life: p.life - 1 }))
      .filter(p => p.life > 0);

    // Check bullet-enemy collisions
    this.checkCollisions();

    // Check power-up collisions
    this.checkPowerUpCollisions();

    // Clean up expired power-ups
    this.state.activePowerUps = this.state.activePowerUps.filter(p => p.expiresAt > now);

    // Check ship-enemy collisions
    let shipHit = false;
    for (const e of this.state.enemies) {
      if (e.x >= this.state.shipX - 1 && e.x <= this.state.shipX + 5 &&
          e.y >= this.state.shipY - 2 && e.y <= this.state.shipY + 3) {
        shipHit = true;
        break;
      }
    }

    if (shipHit) {
      if (this.hasPowerUp('shield')) {
        // Shield absorbs the hit
        this.state.activePowerUps = this.state.activePowerUps.filter(p => p.type !== 'shield');
        // Push enemies away
        this.state.enemies = this.state.enemies.filter(e =>
          e.x < this.state.shipX - 8 || e.x > this.state.shipX + 8 || e.y < this.state.shipY - 5
        );
        this.spawnParticles(this.state.shipX, this.state.shipY, 5, COLORS.shield);
      } else {
        this.state.lives--;
        this.spawnParticles(this.state.shipX, this.state.shipY, 8);
        if (this.state.lives <= 0) {
          this.state.gameOver = true;
        } else {
          this.state.enemies = this.state.enemies.filter(e =>
            e.x < this.state.shipX - 8 || e.x > this.state.shipX + 8 || e.y < this.state.shipY - 5
          );
        }
      }
    }

    this.render();
  }

  private checkPowerUpCollisions(): void {
    const remainingPowerUps: PowerUp[] = [];

    for (const powerUp of this.state.powerUps) {
      let collected = false;
      // Check collision with ship
      if (powerUp.x >= this.state.shipX - 2 && powerUp.x <= this.state.shipX + 5 &&
          powerUp.y >= this.state.shipY - 2 && powerUp.y <= this.state.shipY + 4) {
        this.addPowerUp(powerUp.type);
        this.spawnParticles(powerUp.x, powerUp.y, 4, this.getPowerUpColor(powerUp.type));
        collected = true;
      }

      if (!collected) {
        remainingPowerUps.push(powerUp);
      }
    }

    this.state.powerUps = remainingPowerUps;
  }

  private getPowerUpColor(type: string): string {
    switch (type) {
      case 'multishot': return COLORS.powerupMultishot;
      case 'shield': return COLORS.powerupShield;
      case 'speed': return COLORS.powerupSpeed;
      default: return COLORS.particle;
    }
  }

  private checkCollisions(): void {
    const remainingBullets: Bullet[] = [];
    const toRemove: Set<number> = new Set();

    for (const bullet of this.state.bullets) {
      let hit = false;
      for (let i = 0; i < this.state.enemies.length; i++) {
        if (toRemove.has(i)) continue;
        const enemy = this.state.enemies[i];
        if (!enemy) continue;

        if (bullet.x >= enemy.x - 1 && bullet.x <= enemy.x + 5 &&
            bullet.y >= enemy.y - 1 && bullet.y <= enemy.y + 2) {
          hit = true;
          enemy.hp--;
          if (enemy.hp <= 0) {
            this.spawnParticles(enemy.x, enemy.y);
            const points = enemy.type === 'tank' ? 30 : enemy.type === 'fast' ? 20 : 10;
            this.state.score += points;
            toRemove.add(i);
          }
          break;
        }
      }

      if (!hit) {
        remainingBullets.push(bullet);
      }
    }

    this.state.enemies = this.state.enemies.filter((_, i) => !toRemove.has(i));
    this.state.bullets = remainingBullets;
  }

  private renderPowerUpStatus(): string {
    const now = Date.now();
    const active = this.state.activePowerUps.filter(p => p.expiresAt > now);
    if (active.length === 0) return '';

    const icons: Record<string, string> = {
      multishot: '{yellow-fg}⇶ MULTISHOT{/yellow-fg}',
      shield: '{blue-fg}◉ SHIELD{/blue-fg}',
      speed: '{green-fg}» SPEED{/green-fg}'
    };

    const parts = active.map(p => {
      const remaining = Math.ceil((p.expiresAt - now) / 1000);
      return `${icons[p.type]![0]}${icons[p.type]?.substring(1) || ''} ${remaining}s`;
    });

    return parts.join('  ');
  }

  private renderScore(): string {
    const { score, lives, level, paused } = this.state;
    const hearts = '♥'.repeat(lives);
    const emptyHearts = '♡'.repeat(3 - lives);
    const pausedText = paused ? ' {yellow-fg}[PAUSED]{/yellow-fg}' : '';
    return ` {bold}SCORE:{/bold} {${COLORS.score}-fg}${score.toString().padStart(6, '0')}{/${COLORS.score}-fg} ` +
           `{bold}LIVES:{/bold} ${hearts}{gray-fg}${emptyHearts}{/gray-fg} ` +
           `{bold}LEVEL:{/bold} ${level}` + pausedText;
  }

  private render(): void {
    if (!this.state.running) return;

    this.scoreBox.setContent(this.renderScore());
    this.powerUpBox.setContent(this.renderPowerUpStatus());

    const height = this.getScreenHeight() - 4;
    const width = this.getScreenWidth();

    const grid: string[][] = [];
    for (let y = 0; y < height; y++) {
      grid[y] = new Array(width).fill(' ');
    }

    for (let y = 0; y < height; y++) {
      grid[y]![0] = '│';
      grid[y]![width - 1] = '│';
    }

    for (let x = 0; x < width; x++) {
      grid[0]![x] = x === 0 ? '┌' : x === width - 1 ? '┐' : '─';
      grid[height - 1]![x] = x === 0 ? '└' : x === width - 1 ? '┘' : '─';
    }

    // Draw particles
    for (const p of this.state.particles) {
      const y = Math.floor(p.y);
      if (y >= 1 && y < height - 1 && p.x >= 1 && p.x < width - 1) {
        const chars = ['*', '+', '·', '.'];
        const charIndex = Math.min(chars.length - 1, Math.floor((1 - p.life / p.maxLife) * chars.length));
        grid[y]![p.x] = `{${COLORS.particle}-fg}${chars[charIndex]}{/${COLORS.particle}-fg}`;
      }
    }

    // Draw power-ups
    for (const p of this.state.powerUps) {
      const y = Math.floor(p.y);
      if (y >= 1 && y < height - 1 && p.x >= 1 && p.x < width - 1) {
        const color = this.getPowerUpColor(p.type);
        grid[y]![p.x] = `{${color}-fg}★{/${color}-fg}`;
      }
    }

    // Draw bullets
    for (const b of this.state.bullets) {
      const y = Math.floor(b.y);
      if (y >= 1 && y < height - 1 && b.x >= 1 && b.x < width - 1) {
        grid[y]![b.x] = `{${COLORS.bullet}-fg}│{/${COLORS.bullet}-fg}`;
      }
    }

    // Draw enemies
    for (const e of this.state.enemies) {
      const sprite = ENEMY_SPRITES[e.type];
      if (!sprite) continue;
      const color = e.type === 'basic' ? COLORS.enemyBasic : e.type === 'fast' ? COLORS.enemyFast : COLORS.enemyTank;
      for (let row = 0; row < sprite.length; row++) {
        const spriteRow = sprite[row];
        if (!spriteRow) continue;
        const y = Math.floor(e.y) + row;
        if (y >= 1 && y < height - 1) {
          for (let col = 0; col < spriteRow.length; col++) {
            const x = e.x + col;
            if (x >= 1 && x < width - 1 && spriteRow[col] !== ' ') {
              grid[y]![x] = `{${color}-fg}${spriteRow[col]}{/${color}-fg}`;
            }
          }
        }
      }
    }

    // Draw ship with shield overlay if active
    const hasShield = this.hasPowerUp('shield');
    for (let row = 0; row < SHIP_SPRITE.length; row++) {
      const shipRow = SHIP_SPRITE[row];
      if (!shipRow) continue;
      const y = Math.floor(this.state.shipY) + row;
      if (y >= 1 && y < height - 1) {
        for (let col = 0; col < shipRow.length; col++) {
          const x = this.state.shipX + col;
          if (x >= 1 && x < width - 1 && shipRow[col] !== ' ') {
            let color = COLORS.ship;
            if (hasShield && row < 3) {
              color = COLORS.shield;
            }
            grid[y]![x] = `{${color}-fg}${shipRow[col]}{/${color}-fg}`;
          }
        }
      }
    }

    const lines: string[] = [];
    for (let y = 0; y < height; y++) {
      lines.push(grid[y]!.join(''));
    }

    this.gameBox.setContent(lines.join('\n'));
    this.screen.render();

    if (this.state.gameOver) {
      this.showGameOver();
    }
  }

  private showGameOver(): void {
    if (this.gameOverBox) return;

    const content = [
      '{center}{bold}GAME OVER{/bold}{/center}',
      '',
      `{center}Final Score: {${COLORS.score}-fg}${this.state.score}{/${COLORS.score}-fg}{/center}`,
      `{center}Level Reached: ${this.state.level}{/center}`,
      '',
      '{center}Press {bold}R{/bold} to restart{/center}',
      '{center}Press {bold}Q{/bold} to quit{/center}'
    ].join('\n');

    this.gameOverBox = blessed.box({
      parent: this.screen,
      top: 'center',
      left: 'center',
      width: 40,
      height: 10,
      style: {
        fg: 'white',
        bg: 'red',
        border: { fg: 'white' }
      },
      border: { type: 'line' },
      tags: true,
      content
    });

    this.screen.render();
  }

  private restart(): void {
    if (this.gameOverBox) {
      this.gameOverBox.destroy();
      this.gameOverBox = undefined;
    }
    this.state = this.createInitialState();
    this.render();
  }

  private quit(): void {
    this.state.running = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    this.screen.destroy();
    process.exit(0);
  }

  public start(): void {
    this.render();
    this.gameLoop = setInterval(() => this.update(), 50);
  }
}

export default SpaceShooter;
