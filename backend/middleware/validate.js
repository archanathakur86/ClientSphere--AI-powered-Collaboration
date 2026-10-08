export const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query,
    });
    if (result.body) req.body = result.body;
    if (result.params) req.params = result.params;
    if (result.query) req.query = result.query;
    next();
  } catch (error) {
    next(error);
  }
};
