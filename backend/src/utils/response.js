export const success = (res, data, statusCode = 200) =>
  res.status(statusCode).json({ success: true, data });

export const created = (res, data) => success(res, data, 201);

export const paginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination });

export const error = (res, message, statusCode = 500, details = null) =>
  res.status(statusCode).json({
    success: false,
    error: { message, ...(details && { details }) },
  });

export const notFound = (res, message = 'Resource not found') =>
  error(res, message, 404);

export const badRequest = (res, message, details = null) =>
  error(res, message, 400, details);

export const conflict = (res, message) => error(res, message, 409);
