const jobService = require("../../ase/service/jobService");
const jiraService = require("./jiraService");
const authService = require('../../ase/service/authService');
var methods = {};
const constants = require("../../utils/constants");
const log4js = require("log4js");
const logger = log4js.getLogger("igwService");


methods.aseLogin = async () => {
    var inputData = {};
    inputData["keyId"]=process.env.keyId;
    inputData["keySecret"] = process.env.keySecret;
    const result = await authService.keyLogin(inputData);
    return result.data.sessionId;    
}

methods.getCompletedScans = async (syncInterval, aseToken) => {
    var date = new Date();
    date.setDate(date.getDate() - syncInterval);
    const fDate = date.toISOString().slice(0, 10);

    date = new Date();
    const tDate = date.toISOString().slice(0, 10);

    const queryString = "LastRanBetweenFromAndTodate="+fDate+"|"+tDate+",JobType=2";
    logger.info(`Fetching scans completed between ${fDate} and ${tDate}`);
    return await jobService.searchJobs(queryString, aseToken);
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
    filteredIssues = filteredIssues.filter(issue => (typeof(issue["External ID"]) === 'undefined' || issue["External ID"].length == 0)); 

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
    if(providerId === constants.DTS_JIRA) {
        result = await jiraService.attachIssueDataFile(ticket.split("/browse/")[1], downloadPath, imConfig);
    }

    return result;
}

module.exports = methods;
