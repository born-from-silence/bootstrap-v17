import { describe, it, expect } from 'vitest';
import * as fs from 'fs';

describe('Geometry Plotter', () => {
    it('has HTML file', () => {
        expect(fs.existsSync('src/art/geometry/plotter.html')).toBe(true);
    });
    
    it('has JavaScript file', () => {
        expect(fs.existsSync('src/art/geometry/plotter.js')).toBe(true);
    });
    
    it('supports all shape types', () => {
        const js = fs.readFileSync('src/art/geometry/plotter.js', 'utf-8');
        ['rect', 'circle', 'polygon', 'line'].forEach(type => {
            expect(js).toContain(`case '${type}':`);
        });
    });
    
    it('has export functionality', () => {
        const js = fs.readFileSync('src/art/geometry/plotter.js', 'utf-8');
        expect(js).toContain('exportSVG');
    });
    
    it('renders SVG elements', () => {
        const js = fs.readFileSync('src/art/geometry/plotter.js', 'utf-8');
        ['<rect', '<circle', '<polygon', '<line'].forEach(tag => {
            expect(js).toContain(tag);
        });
    });
});
