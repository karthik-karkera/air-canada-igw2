const util = require("../../utils/util");
const constants = require("../../utils/constants");

var methods = {};

methods.getScanJobDetails = async (jobId, token) => {
    const url = constants.ASOC_SCAN_ISSUE_DETAILS.replace("{SCANID}", jobId);
    return await util.httpCall("GET", token, url);
};

methods.searchJobs = async (queryString, token) => {
    const url = queryString;
    let result = await util.httpCall("GET", token, url); 
    return result;
};

module.exports = methods;
