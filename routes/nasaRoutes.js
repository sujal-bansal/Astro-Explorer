import express from "express";
import {
  getAPOD,
  getMarsRoverPhotos,
  getNearEarthObjects,
  getEarthImagery,
  getEpicImages,
} from "../controllers/nasaController.js";

const router = express.Router();

// Astronomy Picture of the Day
router.get("/apod", getAPOD);
router.get("/apod/:date", getAPOD);

// Mars Rover Photos
router.get("/mars-rovers", getMarsRoverPhotos);
router.get("/mars-rovers/:rover", getMarsRoverPhotos);
router.get("/mars-rovers/:rover/:sol", getMarsRoverPhotos);

// Near Earth Objects
router.get("/neo", getNearEarthObjects);
router.get("/neo/:start_date/:end_date", getNearEarthObjects);

// Earth Imagery
router.get("/earth", getEarthImagery);

// EPIC - Earth Polychromatic Imaging Camera
router.get("/epic", getEpicImages);

// NASA API info endpoint
router.get("/", (req, res) => {
  res.json({
    message: "NASA API Endpoints",
    available_endpoints: {
      apod: {
        path: "/api/nasa/apod",
        description: "Astronomy Picture of the Day",
        parameters: {
          date: "YYYY-MM-DD format (optional)",
        },
      },
      mars_rovers: {
        path: "/api/nasa/mars-rovers",
        description: "Mars Rover Photos",
        parameters: {
          rover: "curiosity, opportunity, spirit (optional)",
          sol: "Martian sol (day) number (optional)",
        },
      },
      neo: {
        path: "/api/nasa/neo",
        description: "Near Earth Objects",
        parameters: {
          start_date: "YYYY-MM-DD format (optional)",
          end_date: "YYYY-MM-DD format (optional)",
        },
      },
      earth: {
        path: "/api/nasa/earth",
        description: "Earth Imagery",
        parameters: {
          lat: "Latitude (required)",
          lon: "Longitude (required)",
          date: "YYYY-MM-DD format (optional)",
        },
      },
      epic: {
        path: "/api/nasa/epic",
        description: "EPIC Earth Images",
        parameters: {
          date: "YYYY-MM-DD format (optional)",
        },
      },
    },
  });
});

export default router;
