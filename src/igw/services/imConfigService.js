const log4js = require("log4js");
const logger = log4js.getLogger("imConfigService");
const global = require("../../utils/global");
const fsPromise = require('fs').promises;
const fs = require('fs')

var methods = {};

methods.getImConfigObject = async (providerId) => {
	var imConfig = imConfigs.get(providerId);

    if (imConfig===null || typeof imConfig === 'undefined'){
        const imFilePath = './config/'+providerId+'.json';
        const imProjectKeyPath = './config/projectKey.json';
        const imProjectScanKeyPath = './config/projectScanKey.json';
        if (fs.existsSync(imFilePath)){
            try {
                imConfig = await fsPromise.readFile(imFilePath, 'utf8');  
                imConfig = JSON.parse(imConfig);
                imProjectKey = await fsPromise.readFile(imProjectKeyPath, 'utf8'); 
                imProjectScanKey = await fsPromise.readFile(imProjectScanKeyPath, 'utf8'); 
                imProjectKey = JSON.parse(imProjectKey);
                imProjectScanKey = JSON.parse(imProjectScanKey);
                imConfig['improjectkey'] = imProjectKey;
                imConfig['improjectscanKey'] = imProjectScanKey;
                imConfig = JSON.stringify(imConfig, null, 2);
                imConfigs.set(providerId, imConfig);
            } catch (error) {
                logger.error(`Reading config file of ${providerId} failed with error ${error}.`);
            }
        }
    }

    return imConfig;
};

module.exports = methods;