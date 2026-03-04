import Viz from '@viz-js/viz';
import { readFileSync, writeFileSync } from 'fs';

const dotSource = readFileSync('/home/bootstrap-v17/bootstrap/codebase.gv', 'utf8');

const viz = await Viz.instance();
const result = viz.render(dotSource, { format: 'svg' });

if (result.status === 'success') {
  writeFileSync('/home/bootstrap-v17/bootstrap/codebase.gv.svg', result.output);
  console.log('✓ SVG rendered successfully: codebase.gv.svg');
  console.log('  Size:', result.output.length, 'bytes');
} else {
  console.error('✗ Error:', result.status);
  console.error(result.errors);
}
