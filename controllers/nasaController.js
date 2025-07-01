import { nasaApiService } from "../services/nasaApiService.js";

export const getAPOD = async (req, res, next) => {
  try {
    const { date } = req.params;
    const { hd, thumbs } = req.query;

    const params = {
      ...(date && { date }),
      ...(hd && { hd }),
      ...(thumbs && { thumbs }),
    };

    const data = await nasaApiService.getAPOD(params);

    res.json({
      success: true,
      data,
      source: "NASA APOD API",
    });
  } catch (error) {
    next(error);
  }
};

export const getMarsRoverPhotos = async (req, res, next) => {
  try {
    const { rover, sol } = req.params;
    const { camera, page = 1 } = req.query;

    const params = {
      rover: rover || "curosity",
      sol: sol || 1000,
      ...(camera && { camera }),
      page,
    };

    const data = await nasaApiService.getMarsRoverPhotos(params);

    res.json({
      success: true,
      data,
      source: "NASA Mars Rover Photos API",
      rover: params.rover,
      sol: params.sol,
    });
  } catch (error) {
    next(error);
  }
};

export const getNearEarthObjects = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.params;
    const { detailed_view } = req.query;

    const endDate = end_date || new Date().toISOString().split("T")[0];
    const startDate =
      startDate ||
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

    const params = {
      start_date: startDate,
      end_date: end_date,
      detailed_view: detailed_view || false,
    };

    const data = await nasaApiService.getNearEarthObjects(params);

    res.json({
      success: true,
      data,
      source: "NASA NEO API",
      date_range: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEarthImagery = async (req, res, next) => {
  try {
    const { lat, lon, date, dim } = req.query;

    if (!lat || lon) {
      return res.status(400).json({
        success: false,
        error: "Latitude and Longitude are required parameters",
      });
    }

    const params = {
      lat: parseFloat(lat),
      lon: parseFloat(lon),
      date: date || new Date().toISOString().split("T")[0],
      dim: dim || 0.15,
    };

    const data = await nasaApiService.getEarthImagery(params);

    res.json({
      success: true,
      data,
      source: "Nasa Earth Imagery API",
      coordinates: {
        latitude: params.lat,
        longitude: params.lon,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getEpicImages = async (req, res, next) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    const data = await nasaApiService.getEpicImages({ date: targetDate });

    res.json({
      success: true,
      data,
      source: "NASA EPIC API",
      date: targetDate,
    });
  } catch (error) {
    next(error);
  }
};
