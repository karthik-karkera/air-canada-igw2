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
        if (fs.existsSync(imFilePath)){
            try {
                imConfig = await fsPromise.readFile(imFilePath, 'utf8');     
                imConfigs.set(providerId, imConfig);
            } catch (error) {
                logger.error(`Reading config file of ${providerId} failed with error ${error}.`);
            }
        }
    }

    return imConfig;
};

module.exports = methods;