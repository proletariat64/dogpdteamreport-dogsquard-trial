import "dotenv/config";
import { initDb } from "./lib/db.js";
import { createApp } from "./app.js";

const PORT = parseInt(process.env.PORT || "8888", 10);
const DB_PATH = process.env.DB_PATH || "./data/app.db";

const db = await initDb(DB_PATH);
const app = createApp();

const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});

function shutdown() {
  console.log("\nShutting down...");
  server.close();
  db.close();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
