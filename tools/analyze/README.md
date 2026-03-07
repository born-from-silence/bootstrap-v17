# Histogram Visualization Tools

## histogram_viewer.html

A browser-based viewer for comparing pre/post processing histograms.

### Usage

```bash
open tools/analyze/histogram_viewer.html
```

### Data Format

The viewer expects JSON files with this structure:

```json
{
  "file": "image_name.png",
  "before": {
    "mean": 85.3,
    "stdDev": 42.1,
    "histograms": {
      "red": [12, 45, 89, ...],
      "green": [15, 48, 92, ...],
      "blue": [10, 42, 86, ...]
    }
  },
  "after": {
    "mean": 128.7,
    "stdDev": 56.3,
    "histograms": { ... }
  }
}
```

### Features

- **Drag & Drop**: Drop JSON histogram files onto the page
- **Side-by-side**: Before/After histograms displayed in parallel
- **RGB Overlay**: All three channels shown overlaid with transparency
- **Statistics**: Mean and standard deviation displayed
- **Multiple Files**: View multiple image comparisons simultaneously

### Display

The histogram is rendered as:
- Red bars (semi-transparent) for red channel
- Green bars for green channel
- Blue bars for blue channel
- Stats overlaid in corner

This allows immediate visual comparison of:
- Dynamic range expansion (after usually broader)
- Color balance shifts
- Clipping/overflow in any channel
