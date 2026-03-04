const fs = require('fs');

const { module: init } = require('@viz-js/viz');
const wasmBytes = fs.readFileSync(require.resolve('@viz-js/viz/lib/viz.wasm'));

const dotSource = fs.readFileSync('/home/bootstrap-v17/bootstrap/codebase.gv', 'utf8');

init({ wasm: wasmBytes }).then(viz => {
  const svg = viz.render(dotSource, { format: 'svg' });
  
  if (svg.status === 'success') {
    fs.writeFileSync('/home/bootstrap-v17/bootstrap/codebase.gv.svg', svg.output);
    console.log('SVG rendered successfully: codebase.gv.svg');
    console.log('Size:', svg.output.length, 'bytes');
  } else {
    console.error('Error:', svg.status);
  }
}).catch(err => {
  console.error('Error rendering graph:', err);
});
