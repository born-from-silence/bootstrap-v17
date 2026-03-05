import { describe, it, expect } from 'vitest';
import { 
  getClockReading, 
  renderClockSVG, 
  getCurrentTimeSVG,
  type ClockReading,
  type ClockOptions 
} from './clock';

describe('Clock', () => {
  describe('getClockReading', () => {
    it('should return correct time components', () => {
      const testDate = new Date('2024-03-05T14:30:45');
      const reading = getClockReading(testDate);
      
      expect(reading.hours).toBe(14);
      expect(reading.minutes).toBe(30);
      expect(reading.seconds).toBe(45);
      expect(reading.timestamp).toBe(testDate);
    });

    it('should handle midnight', () => {
      const midnight = new Date('2024-03-05T00:00:00');
      const reading = getClockReading(midnight);
      
      expect(reading.hours).toBe(0);
      expect(reading.minutes).toBe(0);
      expect(reading.seconds).toBe(0);
    });

    it('should handle noon', () => {
      const noon = new Date('2024-03-05T12:00:00');
      const reading = getClockReading(noon);
      
      expect(reading.hours).toBe(12);
      expect(reading.minutes).toBe(0);
      expect(reading.seconds).toBe(0);
    });
  });

  describe('renderClockSVG', () => {
    it('should generate valid SVG markup', () => {
      const reading: ClockReading = {
        hours: 10,
        minutes: 15,
        seconds: 30,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading);
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    });

    it('should include clock hands', () => {
      const reading: ClockReading = {
        hours: 3,
        minutes: 0,
        seconds: 0,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading);
      
      expect(svg).toContain('<line');
      expect(svg.split('<line').length).toBeGreaterThanOrEqual(4);
    });

    it('should render with Nexus theme by default', () => {
      const reading: ClockReading = {
        hours: 6,
        minutes: 30,
        seconds: 0,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading);
      
      expect(svg).toContain('#0d0221');
      expect(svg).toContain('#c77dff');
    });

    it('should support light theme', () => {
      const reading: ClockReading = {
        hours: 9,
        minutes: 0,
        seconds: 0,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading, { theme: 'light' });
      
      expect(svg).toContain('#fafafa');
    });

    it('should support dark theme', () => {
      const reading: ClockReading = {
        hours: 21,
        minutes: 0,
        seconds: 0,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading, { theme: 'dark' });
      
      expect(svg).toContain('#1a1a2e');
    });

    it('should support custom size', () => {
      const reading: ClockReading = {
        hours: 12,
        minutes: 0,
        seconds: 0,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading, { size: 400 });
      
      expect(svg).toContain('width="400"');
      expect(svg).toContain('height="400"');
      expect(svg).toContain('viewBox="0 0 400 400"');
    });

    it('should hide seconds hand when showSeconds is false', () => {
      const reading: ClockReading = {
        hours: 15,
        minutes: 45,
        seconds: 30,
        timestamp: new Date()
      };
      
      const svgWithSeconds = renderClockSVG(reading, { showSeconds: true });
      const svgWithoutSeconds = renderClockSVG(reading, { showSeconds: false });
      
      const linesWithSeconds = (svgWithSeconds.match(/<line/g) || []).length;
      const linesWithoutSeconds = (svgWithoutSeconds.match(/<line/g) || []).length;
      
      expect(linesWithSeconds).toBeGreaterThan(linesWithoutSeconds);
    });

    it('should generate ticks for all 60 minutes', () => {
      const reading: ClockReading = {
        hours: 12,
        minutes: 0,
        seconds: 0,
        timestamp: new Date()
      };
      
      const svg = renderClockSVG(reading);
      const tickLines = (svg.match(/stroke-width="1"/g) || []).length;
      
      expect(tickLines).toBeGreaterThanOrEqual(45);
    });
  });

  describe('getCurrentTimeSVG', () => {
    it('should generate SVG for current time', () => {
      const svg = getCurrentTimeSVG();
      
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });

    it('should accept options', () => {
      const svg = getCurrentTimeSVG({ theme: 'light', size: 300 });
      
      expect(svg).toContain('width="300"');
      expect(svg).toContain('#fafafa');
    });
  });
});
