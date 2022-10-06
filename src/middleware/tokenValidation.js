const jsonwebtoken = require("../utils/jsonwebtoken");
const constants = require("../utils/constants");
const log4js = require("log4js");
const logger = log4js.getLogger("tokenValidation");

var methods = {};

methods.validateToken = (req, res, next) => {

    const token = jsonwebtoken.getTokenData(req);

    if (token == null || token.length === 0) {
        logger.error(constants.TOKEN_ABSENT);
        return res.status(401).json({ message: constants.TOKEN_ABSENT });
    }
    req.token = token;
    next();
}

module.exports = methods;