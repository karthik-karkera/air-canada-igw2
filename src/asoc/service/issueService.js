const util = require("../../utils/util");
const constants = require("../../utils/constants");

var methods = {};


methods.getIssuesOfApplication = async (appId, token) => {
    const appDetails = await methods.getApplicationDetails(appId, token);
    const url = constants.ASOC_ISSUES_APPLICATION.replace("{APPID}", appDetails.data.Id);
    return await util.httpCall("GET", token, url);
};

methods.getApplicationDetails = async (appId, token) => {
    const url = constants.ASOC_APPLICATION_DETAILS.replace("{APPID}", appId);
    return await util.httpCall("GET", token, url);
};


methods.getIssueDetails = async (appId, issueId, token) => {
    const url = constants.ASOC_ISSUE_DETAILS.replace("{ISSUEID}", issueId);
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
    const url = constants.ASOC_UPDATE_ISSUE.replace("{ISSUEID}", issueId);
    return await util.httpCall("PUT", token, url, JSON.stringify(data), eTag);
}

methods.getHTMLIssueDetails = async(appId, issueId, downloadPath, token) => {
    const createReportUrl = constants.ASOC_CREATE_HTML_ISSUE_DETAILS.replace("{APPID}", appId);
    const data = constants.CREATE_REPORT_REQUEST_CONFIGURATION; //CREATE ISSUE PAYLOAD
    const OdataFilter = `Id eq '${issueId}'`;
    data.OdataFilter = OdataFilter;
    console.log(data, 'od')

    let createIssue = await util.httpCall("POST", token, createReportUrl, data); //CREATE ISSUE REPORT
    const reportID = await createIssue.data.Id;
    console.log(reportID, issueId, 'url')
    const getDownloadReportsUrl = await constants.ASOC_GET_HTML_ISSUE_DETAILS.replace("{REPORTID}", reportID); //GET REPORT DOWNLOAD URL
    const getReportStatusUrl = await constants.ASOC_REPORT_STATUS.replace("{REPORTID}", reportID); //GET REPORT STATUS
    
    
    async function checkReport(getReportStatusUrl){
        let getDownloadUrl = await util.httpCall("GET", token, getReportStatusUrl);
        // if(getDownloadUrl.data.Status == 'Ready'){
            return await util.downloadFile(getDownloadReportsUrl, downloadPath, token);
        // }else{
            // setTimeout(() => checkReport(getReportStatusUrl), 4000)
            // console.log(issueId, issueId)
            // await timeout(3000);
            // return checkReport(getReportStatusUrl)
        // }
    }

    let a = await checkReport(getReportStatusUrl);
    function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = methods;
