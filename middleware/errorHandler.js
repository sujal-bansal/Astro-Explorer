export const errorHandler = (error, req, res, next) => {
  console.error("Error Occured:", error);

  let status = 500;
  let message = "Internal Server Error";
  let details = null;

  if (error.status) {
    status = error.status;
    message = error.message;
    details = error.details;
  } else if (error.response) {
    status = error.response.status;
    message = error.response.data?.message || error.message;
    details = error.response.data;
  } else if (error.code) {
    switch (error.code) {
      case "ENOTFOUND":
      case "ECONNREFUSED":
        status = 503;
        message = "Service temporarily unavailable";
        break;
      case "ETIMEDOUT":
        status = 408;
        message = "Request timeout";
        break;
      default:
        message = error.message;
    }
  } else if (error.name === "ValiidationError") {
    status = 400;
    message = "Valideation Error";
    details = error.details;
  }
  if (process.env.NODE_ENV === "development") {
    console.error("Error Stack:", error.stack);
  }

  res.status(status).json({
    success: false,
    error: {
      message,
      status,
      ...details(details && { details }),
      ...details(
        process.env.NODE_ENV === "development" && { stack: error.stack }
      ),
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: "Endponit not found",
      status: 404,
    },
    timestamp: new Date().toISOString(),
    path: req.originalUrl,
    method: req.method,
  });
};
