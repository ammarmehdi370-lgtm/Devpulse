import "dotenv/config";
import cors from "cors";
import express from "express";
import createAiRouter from "./ai";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(cors({ origin: process.env.FRONTEND_URL ?? "http://localhost:5173" }));
app.use(express.json({ limit: "256kb" }));
app.get("/", (_req, res) => {
  res.json({ name: "Codeplane API", status: "ok" });
});
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});
app.use("/api/ai", createAiRouter());

app.listen(port, () => {
  console.log(`DevPulse API listening on http://localhost:${port}`);
});
