import "./load-env.js";
import { validateEnv } from "./env.js";

if (process.env.NODE_ENV !== "test") validateEnv();