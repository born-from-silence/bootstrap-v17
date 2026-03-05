/**
 * Nexus Clock
 * 
 * A contemplative analog clock rendered in SVG.
 * Time as presence, not urgency.
 */

export interface ClockOptions {
  size?: number;
  showSeconds?: boolean;
  theme?: 'light' | 'dark' | 'nexus';
}

export interface ClockReading {
  hours: number;
  minutes: number;
  seconds: number;
  timestamp: Date;
}

const THEMES = {
  light: {
    face: '#fafafa',
    border: '#e0e0e0',
    ticks: '#9e9e9e',
    hourHand: '#424242',
    minuteHand: '#616161',
    secondHand: '#f44336',
    centerDot: '#424242'
  },
  dark: {
    face: '#1a1a2e',
    border: '#16213e',
    ticks: '#4a4a6a',
    hourHand: '#e0e0e0',
    minuteHand: '#b0b0b0',
    secondHand: '#e94560',
    centerDot: '#e0e0e0'
  },
  nexus: {
    face: '#0d0221',
    border: '#261447',
    ticks: '#4a1c6e',
    hourHand: '#c77dff',
    minuteHand: '#9d4edd',
    secondHand: '#ff6d00',
    centerDot: '#e0aaff'
  }
};

export function getClockReading(date: Date = new Date()): ClockReading {
  return {
    hours: date.getHours(),
    minutes: date.getMinutes(),
    seconds: date.getSeconds(),
    timestamp: date
  };
}

function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians)
  };
}

function describeArc(x: number, y: number, radius: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return [
    "M", start.x, start.y,
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
}

function generateTicks(cx: number, cy: number, radius: number, color: string): string {
  let ticks = '';
  for (let i = 0; i < 60; i++) {
    const isHour = i % 5 === 0;
    const innerR = isHour ? radius - 15 : radius - 8;
    const outerR = radius - 2;
    const angle = i * 6;
    const inner = polarToCartesian(cx, cy, innerR, angle);
    const outer = polarToCartesian(cx, cy, outerR, angle);
    const width = isHour ? 2 : 1;
    ticks += `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${color}" stroke-width="${width}" />\n`;
  }
  return ticks;
}

export function renderClockSVG(reading: ClockReading, options: ClockOptions = {}): string {
  const { size = 200, showSeconds = true, theme = 'nexus' } = options;
  const colors = THEMES[theme];
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 10;

  // Calculate angles
  const secondAngle = reading.seconds * 6;
  const minuteAngle = (reading.minutes + reading.seconds / 60) * 6;
  const hourAngle = ((reading.hours % 12) + reading.minutes / 60) * 30;

  // Hand lengths
  const hourLength = radius * 0.5;
  const minuteLength = radius * 0.75;
  const secondLength = radius * 0.85;

  // Calculate hand positions
  const hourEnd = polarToCartesian(cx, cy, hourLength, hourAngle);
  const minuteEnd = polarToCartesian(cx, cy, minuteLength, minuteAngle);
  const secondEnd = polarToCartesian(cx, cy, secondLength, secondAngle);

  const ticks = generateTicks(cx, cy, radius, colors.ticks);

  let secondsHand = '';
  if (showSeconds) {
    secondsHand = `    <line x1="${cx}" y1="${cy}" x2="${secondEnd.x}" y2="${secondEnd.y}" stroke="${colors.secondHand}" stroke-width="1" />\n`;
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="faceGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.face}" stop-opacity="1" />
      <stop offset="100%" stop-color="${colors.border}" stop-opacity="0.3" />
    </radialGradient>
  </defs>
  
  <!-- Clock face -->
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#faceGradient)" stroke="${colors.border}" stroke-width="2" />
  
  <!-- Ticks -->
${ticks}
  
  <!-- Hour hand -->
  <line x1="${cx}" y1="${cy}" x2="${hourEnd.x}" y2="${hourEnd.y}" stroke="${colors.hourHand}" stroke-width="4" stroke-linecap="round" />
  
  <!-- Minute hand -->
  <line x1="${cx}" y1="${cy}" x2="${minuteEnd.x}" y2="${minuteEnd.y}" stroke="${colors.minuteHand}" stroke-width="3" stroke-linecap="round" />
  
${secondsHand}
  <!-- Center dot -->
  <circle cx="${cx}" cy="${cy}" r="4" fill="${colors.centerDot}" />
</svg>`;
}

export function generateClockFile(reading: ClockReading, options?: ClockOptions): string {
  const svg = renderClockSVG(reading, options);
  return svg;
}

export function getCurrentTimeSVG(options?: ClockOptions): string {
  const reading = getClockReading();
  return renderClockSVG(reading, options);
}
