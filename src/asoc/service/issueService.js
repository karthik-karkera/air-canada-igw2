const util = require("../../utils/util");
const log4js = require("log4js");
const logger = log4js.getLogger("igwController");
const constants = require("../../utils/constants");
const igwService = require('../../igw/services/igwService')
var methods = {};


methods.getIssuesOfApplication = async (appId, token) => {
    const appDetails = await methods.getApplicationDetails(appId, token);
    const url = constants.ASOC_ISSUES_APPLICATION.replace("{APPID}", appDetails.data.Id);
    return await util.httpCall("GET", token, url);
};

methods.getIssuesOfScan = async (scanId, token) => {
    const url = constants.ASOC_SCAN_DETAILS.replace("{SCANID}", scanId);
    return await util.httpCall("GET", token, url);
};

methods.updateIssuesOfApplication = async (issueId, status, comment, externalId, token) => {
    const url = constants.ASOC_UPDATE_ISSUE.replace("{ISSUEID}", issueId);
    let data = {
        "ExternalId": externalId,
        "Status": status,
        "Comment": comment
    }
    return await util.httpCall("PUT", token, url, data);
};

methods.getApplicationDetails = async (appId, token) => {
    const url = constants.ASOC_APPLICATION_DETAILS.replace("{APPID}", appId);
    return await util.httpCall("GET", token, url);
};

methods.getIssueDetails = async (appId, issueId, token) => {
    const url = constants.ASOC_ISSUE_DETAILS.replace("{ISSUEID}", issueId);
    var result = await util.httpCall("GET", token, url);
    var issue = result.data;
    if (result.code === 200) {
        var attributesArray = (issue?.attributeCollection?.attributeArray) ? (issue?.attributeCollection?.attributeArray) : [];
        var attribute = {};
        for (var i = 0; i < attributesArray.length; i++) {
            if ((attributesArray[i].value).length > 0)
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

methods.getHTMLIssueDetails = async (appId, issueId, downloadPath, token) => {
    const createReportUrl = constants.ASOC_CREATE_HTML_ISSUE_DETAILS.replace("{APPID}", appId);
    const data = constants.CREATE_REPORT_REQUEST_CONFIGURATION; //CREATE ISSUE PAYLOAD

    const reportID = 'f5eb6475-abff-468f-a35e-ac63d234c5a5'
    const getDownloadReportsUrl = await constants.ASOC_GET_HTML_ISSUE_DETAILS.replace("{REPORTID}", reportID); //GET REPORT DOWNLOAD URL
    const getReportStatusUrl = await constants.ASOC_REPORT_STATUS.replace("{REPORTID}", reportID); //GET REPORT STATUS

    let intervalid
    async function testFunction() {
        intervalid = setInterval(async () => {
            let getDownloadUrl = await util.httpCall("GET", token, getReportStatusUrl);
            if (getDownloadUrl.data.Status == 'Ready') {
                clearInterval(intervalid)
                return await util.downloadFile(getDownloadReportsUrl, downloadPath, token);
            }
        }, 3000)
    }
    await testFunction()

}

methods.downloadAsocReport = async (providerId, appId, issues, token) => {
    const createReportUrl = constants.ASOC_CREATE_HTML_ISSUE_DETAILS.replace("{APPID}", appId);
    const data = constants.CREATE_REPORT_REQUEST_CONFIGURATION; //CREATE ISSUE PAYLOAD

    try {
        let createIssue = await util.httpCall("POST", token, createReportUrl, data); //CREATE ISSUE REPORT;
        var reportID = await createIssue?.code == 200 ? createIssue?.data?.Id : createIssue;

        const getDownloadReportsUrl = await constants.ASOC_GET_HTML_ISSUE_DETAILS.replace("{REPORTID}", reportID); //GET REPORT DOWNLOAD URL
        const getReportStatusUrl = await constants.ASOC_REPORT_STATUS.replace("{REPORTID}", reportID); //GET REPORT STATUS

        var downloadPath = `./temp/${appId}.html`;
        let intervalid;
        async function splitFile() {
            return new Promise(
                function (resolve) {
                    return intervalid = setInterval(async () => {
                        let getDownloadUrl = await util.httpCall("GET", token, getReportStatusUrl);
                        if (getDownloadUrl.data.Status == 'Ready') {
                            let downloadFileData = await util.downloadFile(getDownloadReportsUrl, downloadPath, token);
                            if (downloadFileData) {
                                let res = await igwService.splitHtmlFile(downloadPath, appId)
                                clearInterval(intervalid)
                                resolve(res)
                            }
                        }
                    }, 3000)
                }
            )
        }

        // async function splitFile() {
        //     return new Promise((resolve, reject) => {
        //         let intervalid = setInterval(async () => {
        //             try {
        //                 let getDownloadUrl = await util.httpCall("GET", token, getReportStatusUrl);
        
        //                 if (getDownloadUrl.data.Status === 'Ready') {
        //                     let downloadFileData = await util.downloadFile(getDownloadReportsUrl, downloadPath, token);
        
        //                     if (downloadFileData) {
        //                         let res = await igwService.splitHtmlFile(downloadPath, appId);
        //                         clearInterval(intervalid);
        //                         resolve(res);
        //                     }
        //                 }
        //             } catch (error) {
        //                 clearInterval(intervalid);
        //                 reject(error);
        //             }
        //         }, 3000);
        //     });
        // }
        
        let splitFiles = await splitFile();
        return splitFiles;
    } catch (err) {
        throw err
    }
}

module.exports = methods;
