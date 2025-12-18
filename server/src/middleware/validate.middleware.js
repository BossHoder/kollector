const { validationResult } = require('express-validator');

/**
 * Validation middleware
 * Checks validation results and returns standardized error response
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const error = new Error('Validation failed');
    error.statusCode = 400;
    error.code = 'VALIDATION_ERROR';
    error.details = {
      fields: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }))
    };
    return next(error);
  }
  
  next();
}

module.exports = validate;
