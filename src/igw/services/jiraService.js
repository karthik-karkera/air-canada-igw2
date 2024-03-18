const util = require("../../utils/util");
const constants = require("../../utils/constants");
const log4js = require("log4js");
const logger = log4js.getLogger("jiraService");
const FormData = require("form-data");
const cryptoService = require("../../../cryptoService");
var methods = {};

methods.jiraValidateToken = async (token) => {
	const url = constants.JIRA_PING_API;
    const imConfig = getConfig("GET", token, url, undefined);
    return await util.httpImCall(imConfig); 
};

methods.createTickets = async (issues, imConfigObject, applicationId, applicationName) => {
    var output = {};
    var success = [];
    var failures = [];
    for (var i=0; i<issues.length; i++){
        const imPayload = await createPayload(issues[i], imConfigObject, applicationId, applicationName); 
        try {
            var basicToken = "Basic "+btoa(imConfigObject.imUserName+":"+imConfigObject.imPassword);
            const imConfig = getConfig("POST", basicToken, imConfigObject.imurl+constants.JIRA_CREATE_TICKET, imPayload);
            const result = await util.httpImCall(imConfig); 
            await delay(3000);
            if (result.code === 201){
                const imTikcket = imConfigObject.imurl+"/browse/"+result.data.key;
                process.env.APPSCAN_PROVIDER == "ASOC" ? success.push({issueId: issues[i]["Id"], ticket: imTikcket}) : success.push({issueId: issues[i]["id"], ticket: imTikcket});
            }
            else {
                process.env.APPSCAN_PROVIDER == "ASOC" ? failures.push({issueId: issues[i]["Id"], errorCode: result.code, errorMsg: result.data}) : failures.push({issueId: issues[i]["id"], errorCode: result.code, errorMsg: result.data});
                logger.error(`Failed to create ticket for issue Id ${issues[i]["id"]} and the error is ${result.data}`);
            }
        } catch (error) {
            logger.error(`Failed to create ticket for issue Id ${issues[i]["id"]} and the error is ${JSON.stringify(error.response.data)}`);
            failures.push({issueId: issues[i]["id"], errorMsg: error.message});
        }
    }
    output["success"]=success;
    output["failure"]=failures;
    return output;
};

methods.createScanTickets = async (issues, imConfigObject, applicationId, applicationName, scanId, discoveryMethod) => {
    var output = {};
    var success = [];
    var failures = [];
    for (var i=0; i<issues.length; i++){
        let improjectscanKey = imConfigObject.improjectscanKey;
        imConfigObject.improjectkey = improjectscanKey;
        const imPayload = await createScanPayload(issues[i], imConfigObject, applicationId, applicationName, scanId, discoveryMethod); 
        try {
            var basicToken = "Basic "+btoa(imConfigObject.imUserName+":"+imConfigObject.imPassword);
            const imConfig = getConfig("POST", basicToken, imConfigObject.imurl+constants.JIRA_CREATE_TICKET, imPayload);
            const result = await util.httpImCall(imConfig); 
            await delay(3000);
            if (result.code === 201){
                const imTikcket = imConfigObject.imurl+"/browse/"+result.data.key;
                process.env.APPSCAN_PROVIDER == "ASOC" ? success.push({scanId: scanId, ticket: imTikcket}) : success.push({scanId: scanId, ticket: imTikcket});
            }
            else {
                process.env.APPSCAN_PROVIDER == "ASOC" ? failures.push({scanId: scanId, errorCode: result.code, errorMsg: result.data}) : failures.push({scanId: scanId, errorCode: result.code, errorMsg: result.data});
                logger.error(`Failed to create ticket for issue Id ${scanId} and the error is ${result.data}`);
            }
        } catch (error) {
            logger.error(`Failed to create ticket for issue Id ${scanId} and the error is ${JSON.stringify(error.response.data)}`);
            failures.push({scanId: scanId, errorMsg: error.message});
        }
    }
    output["success"]=success;
    output["failure"]=failures;
    return output;
};

createPayload = async (issue, imConfigObject, applicationId, applicationName) => {
    if(typeof imConfigObject.improjectkey == 'string'){
    var payload = {};
    var attrMap = {};
    attrMap["project"] = {"key" : imConfigObject.improjectkey};
    attrMap["issuetype"] = {"name" : imConfigObject.imissuetype};
    if(process.env.APPSCAN_PROVIDER == "ASOC"){
        attrMap["summary"] = applicationName + " - " + issue["IssueType"] + " found by AppScan";
    }else{
        attrMap["summary"] = "Security issue: "+ issue["Issue Type"].replaceAll("&#40;", "(").replaceAll("&#41;", ")") + " found by AppScan";
    }
    attrMap["description"] = JSON.stringify(issue, null, 4);
    const attributeMappings = typeof imConfigObject.attributeMappings != 'undefined' ? imConfigObject.attributeMappings : [];
 
    for(var i=0; i<attributeMappings.length; i++) {
        if(attributeMappings[i].type === 'Array'){
            attrMap[attributeMappings[i].imAttr] = [issue[attributeMappings[i].appScanAttr] || ''];
        }
        else{
            attrMap[attributeMappings[i].imAttr] = issue[attributeMappings[i].appScanAttr];    
        }
    }
    payload["fields"] = attrMap;
    return payload;
    }else{
        var payload = {};
        var attrMap = {};
        attrMap["project"] = {"key" : imConfigObject.improjectkey[applicationId] == undefined ? imConfigObject.improjectkey['default'] : imConfigObject.improjectkey[applicationId]};
        attrMap["issuetype"] = {"name" : imConfigObject.imissuetype};
        if(process.env.APPSCAN_PROVIDER == "ASOC"){
            attrMap["summary"] = applicationName + " - " + issue["IssueType"] + " found by AppScan";
        }else{
            attrMap["summary"] = "Security issue: "+ issue["Issue Type"].replaceAll("&#40;", "(").replaceAll("&#41;", ")") + " found by AppScan";
        }
        let labelLanguage = issue.Language || '';
        let labelSource = issue.Source || '';
        let labelSeverity = issue.Severity || '';
        let labelStatus = issue.Status || '';

        attrMap["description"] = JSON.stringify(issue, null, 4);
        const attributeMappings = typeof imConfigObject.attributeMappings != 'undefined' ? imConfigObject.attributeMappings : [];
        let labelName = applicationName.trim();
        labelName = labelName.split(/\s+/).join('_');

        for(var i=0; i<attributeMappings.length; i++) {
            if(attributeMappings[i].type === 'Array'){
                if(attributeMappings[i].imAttr == 'labels'){
                attrMap[attributeMappings[i].imAttr] = [labelName || '', applicationId];
                }else if(attributeMappings[i].imAttr == 'customfield_10039'){
                    attrMap[attributeMappings[i].imAttr] = [applicationName];
                }else if(attributeMappings[i].imAttr == 'customfield_10040'){
                    attrMap[attributeMappings[i].imAttr] = [labelStatus];
                }else if(attributeMappings[i].imAttr == 'customfield_10041'){
                    attrMap[attributeMappings[i].imAttr] = [labelSeverity];
                }else if(attributeMappings[i].imAttr == 'customfield_10042'){
                    attrMap[attributeMappings[i].imAttr] = [labelLanguage];
                }else if(attributeMappings[i].imAttr == 'customfield_10043'){
                    attrMap[attributeMappings[i].imAttr] = [labelSource];
                }
            }
            else{
                attrMap[attributeMappings[i].imAttr] = [labelName || '', applicationId];    
            }
        }
        payload["fields"] = attrMap;
        return payload;
    }
}

createScanPayload = async (issue, imConfigObject, applicationId, applicationName, scanId, discoveryMethod) => {
    if(typeof imConfigObject.improjectkey == 'string'){
    var payload = {};
    var attrMap = {};
    attrMap["project"] = {"key" : imConfigObject.improjectkey};
    attrMap["issuetype"] = {"name" : imConfigObject.imissuetype};
    if(process.env.APPSCAN_PROVIDER == "ASOC"){
        attrMap["summary"] = applicationName + " - " + issue["IssueType"] + " found by AppScan";
    }else{
        attrMap["summary"] = "Security issue: "+ issue["Issue Type"].replaceAll("&#40;", "(").replaceAll("&#41;", ")") + " found by AppScan";
    }
    attrMap["description"] = JSON.stringify(issue, null, 4);
    const attributeMappings = typeof imConfigObject.attributeMappings != 'undefined' ? imConfigObject.attributeMappings : [];
 
    for(var i=0; i<attributeMappings.length; i++) {
        if(attributeMappings[i].type === 'Array'){
            attrMap[attributeMappings[i].imAttr] = [issue[attributeMappings[i].appScanAttr] || ''];
        }
        else{
            attrMap[attributeMappings[i].imAttr] = issue[attributeMappings[i].appScanAttr];    
        }
    }
    payload["fields"] = attrMap;
    return payload;
    }else{
        var payload = {};
        var attrMap = {};
        attrMap["project"] = {"key" : imConfigObject.improjectkey[applicationId] == undefined ? imConfigObject.improjectkey['default'] : imConfigObject.improjectkey[applicationId]};
        attrMap["issuetype"] = {"name" : imConfigObject.imissuetype};
        if(process.env.APPSCAN_PROVIDER == "ASOC"){
            attrMap["summary"] = discoveryMethod + ' - ' + applicationName + " - " + scanId + " scanned by ASOC";
        }else{
            attrMap["summary"] = "Security issue: " + scanId + ' '+ discoveryMethod + " found by AppScan";
        }
        attrMap["description"] = JSON.stringify(issue, null, 4);
        const attributeMappings = typeof imConfigObject.attributeMappings != 'undefined' ? imConfigObject.attributeMappings : [];
        let labelName = applicationName.trim();
        labelName = labelName.split(/\s+/).join('_')
        for(var i=0; i<attributeMappings.length; i++) {
            if(attributeMappings[i].type === 'Array'){
                if(attributeMappings[i].imAttr == 'labels'){
                attrMap[attributeMappings[i].imAttr] = [labelName || '', applicationId];
                }else if(attributeMappings[i].imAttr == 'customfield_10039'){
                    attrMap[attributeMappings[i].imAttr] = [labelName];
                }
            }
            else{
                attrMap[attributeMappings[i].imAttr] = [labelName || '', applicationId];    
            }
        }
        payload["fields"] = attrMap;
        return payload;
    }
}
methods.attachIssueDataFile = async (ticket, filePath, imConfigObject) => {
    const url = imConfigObject.imurl+constants.JIRA_ATTACH_FILE.replace("{JIRAID}",ticket);
    const formData = new FormData();
    formData.append('file', require("fs").createReadStream(filePath)); 
    let userData = imConfigObject.imUserName +":"+imConfigObject.imPassword;
    var basicToken = `Basic ${Buffer.from(userData).toString('base64')}`;
    const imConfig = getConfig("POST", basicToken, url, formData);
    return await util.httpImCall(imConfig); 
}  

methods.getMarkedTickets = async (syncInterval, imConfigObject) => {
    const url = imConfigObject.imurl + constants.JIRA_LATEST_ISSUE.replace("{SYNCINTERVAL}",syncInterval)
    const formData = new FormData();
    let userData = imConfigObject.imUserName +":"+imConfigObject.imPassword;
    var basicToken = `Basic ${Buffer.from(userData).toString('base64')}`;
    const imConfig = getConfig("GET", basicToken, url, "");
    return await util.httpImCall(imConfig); 
}

getConfig = function(method, token, url, data) {
    return {
        method: method,
        url: url,
        data: data,
        rejectUnauthorized: false,        
        headers: {
            'Authorization': token, 
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Atlassian-Token': 'nocheck'
        }
    };
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

module.exports = methods;
