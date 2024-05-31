const log4js = require("log4js");
const logger = log4js.getLogger("issueService");
const util = require("../../utils/util");
const constants = require("../../utils/constants");

var methods = {};


methods.getIssuesOfApplication = async (appId, token) => {
    const appDetails = await methods.getApplicationDetails(appId, token);
    const url = constants.ASE_ISSUES_APPLICATION.replace("{APPNAME}", appDetails.data.name);
    return await util.httpCall("GET", token, url);
};

methods.getApplicationDetails = async (appId, token) => {
    const url = constants.ASE_APPLICATION_DETAILS.replace("{APPID}", appId);
    return await util.httpCall("GET", token, url);
};


methods.getIssueDetails = async (appId, issueId, token) => {
    const url = constants.ASE_ISSUE_DETAILS.replace("{APPID}", appId).replace("{ISSUEID}", issueId);
    var result = await util.httpCall("GET", token, url);
    var issue = result.data;
    if(result.code === 200){
        var attributesArray = (issue?.attributeCollection?.attributeArray) ? (issue?.attributeCollection?.attributeArray) : [];
        var attribute = {};
        for(var i=0; i<attributesArray.length; i++){
            if((attributesArray[i].value).length > 0)
                attribute[attributesArray[i].name] = (attributesArray[i].value)[0];
        }   
        delete issue["attributeCollection"];
        result.data = Object.assign(issue, attribute);
    }
    return result;
}

methods.updateIssue = async (issueId, data, token, eTag) => {
    const url = constants.ASE_UPDATE_ISSUE.replace("{ISSUEID}", issueId);
    return await util.httpCall("PUT", token, url, JSON.stringify(data), eTag);
}

methods.getHTMLIssueDetails = async(appId, issueId, downloadPath, token) => {
    const url = constants.ASE_GET_HTML_ISSUE_DETAILS.replace("{ISSUEID}", issueId).replace("{APPID}", appId);
    return await util.downloadFile(url, downloadPath, token);
}

methods.updateIssuesOfApplication = async (appId, issueId, status, comment, externalId, etag, token) => {
    try{
        const url = constants.ASE_UPDATE_ISSUE.replace("{ISSUEID}", issueId);
        let data = {
            "lastUpdated" : Date.now(),
            "appReleaseId": appId,
            "attributeCollection" : { "attributeArray" : [ { "name": 'Status', "value": [status] }, { "name": 'Comments', "value": ["Fixed on Jira"] } ]}
        }
        return await util.httpCall("PUT", token, url, JSON.stringify(data), etag);
    }catch(err){
        logger.error(err.response.data)
    }
};

module.exports = methods;
