const aseJobService = require("../../ase/service/jobService");
const asocJobService = require("../../asoc/service/jobService");
const jiraService = require("./jiraService");
const aseAuthService = require('../../ase/service/authService');
const asocAuthService = require('../../asoc/service/authService');
var methods = {};
const constants = require("../../utils/constants");
const log4js = require("log4js");
const logger = log4js.getLogger("igwService");


methods.aseLogin = async () => {
    var inputData = {};
    inputData["keyId"] = process.env.keyId;
    inputData["keySecret"] = process.env.keySecret;
    const result = await aseAuthService.keyLogin(inputData);
    return result.data.sessionId;
}

methods.asocLogin = async () => {
    var inputData = {};
    inputData["keyId"] = process.env.keyId;
    inputData["keySecret"] = process.env.keySecret;
    const result = await asocAuthService.keyLogin(inputData);
    return result.data.Token;
}

methods.getCompletedScans = async (syncInterval, aseToken) => {
    var date = new Date();
    date.setDate(date.getDate() - syncInterval);
    const fDate = date.toISOString().slice(0, 10);
    const startDate = fDate;

    date = new Date();
    const tDate = date.toISOString().slice(0, 10);
    const endDate = date.toISOString();

    if(process.env.APPSCAN_PROVIDER == "ASE"){
        const queryString = "LastRanBetweenFromAndTodate="+fDate+"|"+tDate+",JobType=2";
        logger.info(`Fetching scans completed between ${fDate} and ${tDate}`);
        return await aseJobService.searchJobs(queryString, aseToken);
    }else if(process.env.APPSCAN_PROVIDER == "ASOC"){
        const queryString = constants.ASOC_JOB_SEARCH;
        logger.info(`Fetching scans completed between ${fDate} and ${tDate}`);
        let result = await asocJobService.searchJobs(queryString, aseToken);
        result.data = result.data.Items.filter(a => a.LatestExecution.Status == 'Ready').filter(a => a.LatestExecution.ScanEndTime <= endDate && a.LatestExecution.ScanEndTime >= startDate);
        return result;
    }
}

methods.filterIssues = async (issues, imConfig) => {
    const issueStates = imConfig.issuestates;
    const issueSeverities = imConfig.issueseverities;
 
    var issueStatesArray = [];
    var issueSeveritiesArray = [];

    if(typeof issueStates != 'undefined') issueStatesArray = issueStates.split(",");
    if(typeof issueSeverities != 'undefined') issueSeveritiesArray = issueSeverities.split(",");

    var filteredIssues = [];
    if (issueStatesArray.length > 0) filteredIssues = issues.filter(issue => issueStatesArray.includes(issue["Status"]));
    if (issueSeveritiesArray.length > 0) filteredIssues = filteredIssues.filter(issue => issueSeveritiesArray.includes(issue["Severity"]));
    if(process.env.APPSCAN_PROVIDER == 'ASE'){
        filteredIssues = filteredIssues.filter(issue => (typeof(issue["External ID"]) === 'undefined' || issue["External ID"].length == 0));
    }else if(process.env.APPSCAN_PROVIDER == 'ASOC'){
        filteredIssues = filteredIssues.filter(issue => (issue["ExternalId"] === null || issue["ExternalID"] == 'undefined'));
    }
    
    const maxIssues = (typeof imConfig.maxissues != 'undefined') ? imConfig.maxissues : 10000;
    filteredIssues = (typeof filteredIssues === 'undefined') ? [] : filteredIssues.slice(0,maxIssues);
    return filteredIssues;
}

methods.createImTickets = async (filteredIssues, imConfig, providerId) => {
    var result;
    if(providerId === constants.DTS_JIRA)
        result = await jiraService.createTickets(filteredIssues, imConfig);

    return result;
}

methods.attachIssueDataFile = async (ticket, downloadPath, imConfig, providerId) => {
    var result;
    if (providerId === constants.DTS_JIRA) {
        result = await jiraService.attachIssueDataFile(ticket.split("/browse/")[1], downloadPath, imConfig);
    }

    return result;
}

module.exports = methods;
