/**
 * Export current analytics to LTM
 */
import { generateAndExportAnalytics } from './ltm_integration.js';

const sessionId = process.argv[2] || `nexus_${Date.now()}`;

generateAndExportAnalytics(sessionId)
  .then(() => {
    console.log('✓ Analytics exported to LTM');
    process.exit(0);
  })
  .catch(err => {
    console.error('✗ Export failed:', err);
    process.exit(1);
  });
