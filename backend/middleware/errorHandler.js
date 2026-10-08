import { ZodError } from "zod";
import multer from "multer";

export const notFound = (req, res, next) => {
  res.status(404);
  next(new Error(`Route not found - ${req.originalUrl}`));
};

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode && res.statusCode !== 200 ? res.statusCode : 500;
  let message = err.message || "Internal Server Error";
  let errors = undefined;

  if (err instanceof ZodError || err.name === "ZodError" || err.issues) {
    statusCode = 400;
    const issueList = err.issues || err.errors || [];
    errors = issueList.map((e) => ({
      field: Array.isArray(e.path) ? e.path.filter((p) => p !== "body" && p !== "params" && p !== "query").join(".") : String(e.path || ""),
      message: e.message,
    }));
    message = issueList.map((e) => e.message).join(", ");
  } else if (err.name === "CastError" && err.kind === "ObjectId") {
    statusCode = 404;
    message = "Resource not found";
  } else if (err.code === 11000) {
    statusCode = 400;
    const fields = Object.keys(err.keyValue || {}).join(", ");
    message = `Duplicate value for field: ${fields || "unique constraint"}`;
  } else if (err.name === "ValidationError") {
    statusCode = 400;
    message = Object.values(err.errors || {})
      .map((e) => e.message)
      .join(", ");
  } else if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Not authorized, token invalid or expired";
  } else if (err instanceof multer.MulterError) {
    statusCode = 400;
    if (err.code === "LIMIT_FILE_SIZE") {
      message = "File size limit exceeded";
    } else {
      message = `Upload error: ${err.message}`;
    }
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};

