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
  if(process.env.IM_SYNC_INTERVAL != '0m' || process.env.IM_SYNC_INTERVAL != '0'){
    igwController.startProviderSync(process.env.IM_PROVIDER, process.env.IM_SYNC_INTERVAL)
  }
  if(process.env.IM_JIRA_SYNC_INTERVAL != '0m' || process.env.IM_JIRA_SYNC_INTERVAL != '0'){
    igwController.startStatusSync(process.env.IM_PROVIDER, process.env.IM_JIRA_SYNC_INTERVAL);
  }

function startServer()
{
    const SECURE_PORT = process.env.SECURE_PORT || 8443;
    const secureserver = https.createServer(secure_options,app);
    secureserver.listen(SECURE_PORT);
    secureserver.timeout= 18000000;
    logger.info(constants.START_SERVER_MSG);
}  

