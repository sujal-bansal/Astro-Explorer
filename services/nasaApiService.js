import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

class NasaApiService {
  constructor() {
    this.baseURL = process.env.NASA_BASE_URL;
    this.apiKey = process.env.NASA_API_KEY;

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000, // 10 seconds
      params: {
        api_key: this.apiKey,
      },
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        console.log(
          `🚀 NASA API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        console.error("❌ Request Error:", error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => {
        console.log(
          `✅ NASA API Response: ${response.status} ${response.config.url}`
        );
        return response;
      },
      (error) => {
        console.error(
          "❌ Response Error:",
          error.response?.status,
          error.message
        );
        return Promise.reject(this.handleApiError(error));
      }
    );
  }

  // Handle API errors consistently
  handleApiError(error) {
    if (error.response) {
      // API responded with error status
      const { status, data } = error.response;
      return {
        status,
        message: data.message || data.error_message || "NASA API Error",
        details: data,
      };
    } else if (error.request) {
      // Network error
      return {
        status: 503,
        message: "Unable to reach NASA API",
        details: error.message,
      };
    } else {
      // Other error
      return {
        status: 500,
        message: "Internal server error",
        details: error.message,
      };
    }
  }

  // Get Astronomy Picture of the Day
  async getAPOD(params = {}) {
    try {
      const response = await this.client.get("/planetary/apod", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get Mars Rover Photos
  async getMarsRoverPhotos(params = {}) {
    try {
      const { rover = "curiosity", sol = 1000, ...otherParams } = params;
      const response = await this.client.get(
        `/mars-photos/api/v1/rovers/${rover}/photos`,
        {
          params: { sol, ...otherParams },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get Near Earth Objects
  async getNearEarthObjects(params = {}) {
    try {
      const response = await this.client.get("/neo/rest/v1/feed", { params });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Get Earth Imagery
  async getEarthImagery(params = {}) {
    try {
      const response = await this.client.get("/planetary/earth/imagery", {
        params,
      });
      return {
        url: response.request.responseURL,
        coordinates: {
          lat: params.lat,
          lon: params.lon,
        },
        date: params.date,
        message:
          "Image URL provided. Use this URL to view the satellite image.",
      };
    } catch (error) {
      throw error;
    }
  }

  // Get EPIC Earth Images
  async getEpicImages(params = {}) {
    try {
      const { date } = params;
      const response = await this.client.get("/EPIC/api/natural/date/" + date);

      // Transform the data to include full image URLs
      const images = response.data.map((image) => ({
        ...image,
        image_url: `https://api.nasa.gov/EPIC/archive/natural/${date}/png/${image.image}.png?api_key=${this.apiKey}`,
      }));

      return {
        date,
        images,
        total_images: images.length,
      };
    } catch (error) {
      throw error;
    }
  }

  // Get NASA API status
  async getApiStatus() {
    try {
      // Test with a simple APOD request
      await this.client.get("/planetary/apod");
      return {
        status: "operational",
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "error",
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const nasaApiService = new NasaApiService();
