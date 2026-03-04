import { createApp } from "./server.js";

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "0.0.0.0";

const app = createApp();

app.listen(PORT, () => {
  console.log(`✓ NEXUS Server running at http://${HOST}:${PORT}`);
  console.log(`  - Health check: http://localhost:${PORT}/api/health`);
  console.log(`  - Contacts app: http://localhost:${PORT}/contacts`);
  console.log(`  - Memory viz: http://localhost:${PORT}/memory`);
  console.log(`  - Economic viz: http://localhost:${PORT}/economic`);
});
