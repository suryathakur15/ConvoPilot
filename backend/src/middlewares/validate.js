export const validate = (schema, target = 'body') =>
  (req, res, next) => {
    const { error, value } = schema.validate(req[target], { abortEarly: false, stripUnknown: true });
    if (error) {
      error.isJoi = true;
      return next(error);
    }
    req[target] = value;
    next();
  };
