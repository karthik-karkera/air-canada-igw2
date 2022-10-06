const {validationResult } = require('express-validator');

var methods = {};

methods.validateRequestSchema = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(403).json({ errors: errors.array() });
  }
  
  next();
}

module.exports = methods;