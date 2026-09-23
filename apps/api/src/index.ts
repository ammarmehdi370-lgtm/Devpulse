import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import pinoHttp from "pino-http";

const app = express();
const port = Number(process.env.PORT ?? 4000);

app.use(helmet());
const allowedOrigins = (process.env.APP_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin))
        return callback(null, true);
      return callback(new Error("Origin is not allowed by API CORS policy"));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(pinoHttp());
app.get("/health", (_request, response) =>
  response.json({ status: "ok", service: "api" }),
);
app.get("/ready", (_request, response) => response.json({ status: "ready" }));

app.listen(port, () => console.log(`Devpulse API listening on :${port}`));
