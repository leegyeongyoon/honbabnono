const success = (res, data, meta, statusCode = 200) => {
  const response = { success: true };
  if (data !== undefined) response.data = data;
  if (meta) response.meta = meta;
  return res.status(statusCode).json(response);
};

const error = (res, message, statusCode = 500, code) => {
  const response = { success: false, error: message };
  if (code) response.code = code;
  return res.status(statusCode).json(response);
};

const paginated = (res, data, total, page, limit) => {
  return success(res, data, {
    total: parseInt(total),
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages: Math.ceil(parseInt(total) / parseInt(limit)),
  });
};

module.exports = { success, error, paginated };
