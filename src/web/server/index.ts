import { createApp } from "./server.js";

const PORT = process.env.PORT || 3000;

const app = createApp();

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📍 Health: http://localhost:${PORT}/api/health`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/register`);
  console.log(`🔐 Auth: http://localhost:${PORT}/api/auth/login`);
  console.log(`👤 Profile: http://localhost:${PORT}/api/protected/profile`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/api/protected/dashboard`);
});
