import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Histogram Viewer', () => {
    it('has viewer HTML file', () => {
        expect(fs.existsSync('tools/analyze/histogram_viewer.html')).toBe(true);
    });
    
    it('has README documentation', () => {
        expect(fs.existsSync('tools/analyze/README.md')).toBe(true);
    });
    
    it('has sample data file', () => {
        expect(fs.existsSync('tools/analyze/sample_histogram.json')).toBe(true);
    });
    
    it('HTML handles drag and drop', () => {
        const html = fs.readFileSync('tools/analyze/histogram_viewer.html', 'utf-8');
        expect(html).toContain('dragover');
        expect(html).toContain('drop');
    });
    
    it('displays before/after comparison', () => {
        const html = fs.readFileSync('tools/analyze/histogram_viewer.html', 'utf-8');
        expect(html).toContain('before');
        expect(html).toContain('after');
    });
    
    it('supports RGB histogram display', () => {
        const html = fs.readFileSync('tools/analyze/histogram_viewer.html', 'utf-8');
        expect(html).toContain('red');
        expect(html).toContain('green');
        expect(html).toContain('blue');
    });
    
    it('sample data has correct structure', () => {
        const data = JSON.parse(fs.readFileSync('tools/analyze/sample_histogram.json', 'utf-8'));
        expect(data).toHaveProperty('file');
        expect(data).toHaveProperty('before');
        expect(data).toHaveProperty('after');
        expect(data.before).toHaveProperty('histograms');
        expect(data.before.histograms).toHaveProperty('red');
        expect(data.before.histograms).toHaveProperty('green');
        expect(data.before.histograms).toHaveProperty('blue');
        expect(data.before).toHaveProperty('mean');
        expect(data.before).toHaveProperty('stdDev');
    });
});
