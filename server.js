const https = require('https');
const app = require('./app');
const fs = require('fs');
require('dotenv').config()
const log4js = require('log4js');
const logger = log4js.getLogger("server");
const constants = require('./src/utils/constants');
const igwController = require('./src/igw/controllers/igwController');

const secure_options = {
    pfx: fs.readFileSync(process.env.SSL_PFX_CERT_FILE),
    passphrase: process.env.SSL_PFX_CERT_PASSPHRASE
  };

startServer();

if (typeof process.env.IM_PROVIDER != 'undefined' && typeof process.env.SYNC_INTERVAL != 'undefined')
  igwController.startSync(process.env.IM_PROVIDER, process.env.SYNC_INTERVAL);

function startServer()
{
    const SECURE_PORT = process.env.SECURE_PORT || 8443;
    const secureserver = https.createServer(secure_options,app);
    secureserver.listen(SECURE_PORT);
    logger.info(constants.START_SERVER_MSG);
}  

