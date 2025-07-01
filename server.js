import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";

import nasaRoutes from "./routes/nasaRoutes.js";
import { errorHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/nasa", nasaRoutes);

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    message: "NASA API Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to NASA API Backend",
    version: "1.0.0",
    endpoints: {
      health: "/health",
      nasa: "/api/nasa",
      apod: "/api/nasa/apod",
      mars_rovers: "/api/nasa/mars-rovers",
      neo: "/api/nasa/neo",
    },
  });
});

app.use(errorHandler);

app.use("/*fuck", (req, res) => {
  res.status(404).json({
    error: "Endpoint not found",
    path: req.originalUrl,
    method: req.method,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 NASA API Backend running on port ${PORT}`);
  console.log(`🌟 Environment: ${process.env.NODE_ENV}`);
  console.log(
    `📡 NASA API Key: ${process.env.NASA_API_KEY.substring(0, 8)}...`
  );
});

export default app;
