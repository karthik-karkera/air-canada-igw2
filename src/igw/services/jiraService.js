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
        if(process.env.APPSCAN_PROVIDER == "ASE"){
            issues[i].ApplicationId = applicationId;
        }
        const imPayload = await createPayload(issues[i], imConfigObject, applicationId, applicationName); 
        try {
            var basicToken = "Basic "+btoa(imConfigObject.imUserName+":"+imConfigObject.imPassword);
            const imConfig = getConfig("POST", basicToken, imConfigObject.imurl+constants.JIRA_CREATE_TICKET, imPayload);
            const result = await util.httpImCall(imConfig); 
            await delay(3000);
            if (result.code === 201){
                const imTicket = imConfigObject.imurl+"/browse/"+result.data.key;
                process.env.APPSCAN_PROVIDER == "ASOC" ? success.push({issueId: issues[i]["Id"], ticket: imTicket}) : success.push({issueId: issues[i]["id"], ticket: imTicket});
            }
            else {
                process.env.APPSCAN_PROVIDER == "ASOC" ? failures.push({issueId: issues[i]["Id"], errorCode: result.code, errorMsg: result.data}) : failures.push({issueId: issues[i]["id"], errorCode: result.code, errorMsg: result.data});
                logger.error(`Failed to create ticket for issue Id ${issues[i]["Id"]} and the error is ${result.data}`);
            }
        } catch (error) {
            logger.error(`Failed to create ticket for issue Id ${issues[i]["Id"]} and the error is ${JSON.stringify(error.response.data)}`);
            failures.push({issueId: issues[i]["Id"], errorMsg: error.message});
        }
    }
    output["success"]=success;
    output["failure"]=failures;
    return output;
};

methods.updateTickets = async (bodyData, imConfigObject, applicationId, projectKey) => {
    var output = {};
    var success = [];
    var failures = [];
    const imPayload = bodyData;
    
    try {
        var basicToken = "Basic " + btoa(imConfigObject.imUserName + ":" + imConfigObject.imPassword);
        let imUrl = (imConfigObject.imurl + constants.JIRA_UPDATE_TICKET).replace("{JIRAID}", projectKey)
        const imTicket = imConfigObject.imurl + "/browse/" + projectKey;
        const imConfig = getConfig("PUT", basicToken, imUrl, imPayload);
        const result = await util.httpImCall(imConfig);
        await delay(3000);                                  
        if (result.code === 204) {
            process.env.APPSCAN_PROVIDER == "ASOC" ? success.push({ ticket: imTicket, bodyData: JSON.stringify(bodyData) }) : success.push({ issueId: issues[i]["id"], ticket: imTicket });
        }
        else {
            process.env.APPSCAN_PROVIDER == "ASOC" ? failures.push({ ticket: imTicket, errorCode: result.code, errorMsg: result.data }) : failures.push({ issueId: issues[i]["id"], errorCode: result.code, errorMsg: result.data });
            logger.error(`Failed to create ticket for Project Key -  ${projectKey} and the error is ${result.data}`);
        }
    } catch (error) {
        logger.error(`Failed to create ticket for Project Key - ${projectKey} and the error is ${JSON.stringify(error.response.data)}`);
        failures.push({ ticket: imTicket, errorMsg: error.message });
    }
    output["success"] = success;
    output["failure"] = failures;
    return output;
};

methods.updateImStatus = async (imConfigObject, bodyData, projectKey) => {
    try{
        let ur = constants.JIRA_UPDATE_TRANSITION.replace("{JIRAID}", projectKey);
        var basicToken = "Basic " + btoa(imConfigObject.imUserName + ":" + imConfigObject.imPassword);
        const imConfig = getConfig("POST", basicToken, imConfigObject.imurl + constants.JIRA_UPDATE_TRANSITION.replace('{JIRAID}', projectKey), bodyData);
        const result = await util.httpImCall(imConfig); 
    }catch(err){
        logger.error(`Failed to update ticket for Project Key - ${projectKey} and the error is ${JSON.stringify(error.response.data)}`);
    }
}

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
                const imTicket = imConfigObject.imurl+"/browse/"+result.data.key;
                process.env.APPSCAN_PROVIDER == "ASOC" ? success.push({scanId: scanId, ticket: imTicket}) : success.push({scanId: scanId, ticket: imTicket});
            }
            else {
                process.env.APPSCAN_PROVIDER == "ASOC" ? failures.push({scanId: scanId, errorCode: result.code, errorMsg: result.data}) : failures.push({scanId: scanId, errorCode: result.code, errorMsg: result.data});
                logger.error(`Failed to create ticket for scan Id ${scanId} and the error is ${result.data}`);
            }
        } catch (error) {
            logger.error(`Failed to create ticket for scan Id ${scanId} and the error is ${JSON.stringify(error.response.data)}`);
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
        

        attrMap["description"] = JSON.stringify(issue, null, 4);
        const attributeMappings = typeof imConfigObject.attributeMappings != 'undefined' ? imConfigObject.attributeMappings : [];
        
        let labelName = applicationName.trim();
        let labelLanguage = issue?.Language != null || issue?.Language != undefined ? issue?.Language.trim() || '' : '';
        let labelSource = issue?.Source != null || issue?.Source != undefined ? issue?.Source.trim() || '' : '';
        let labelSeverity = issue?.Severity != null || issue?.Severity != undefined ? issue?.Severity.trim() || '' : '';
        let labelStatus = issue?.Status != null || issue?.Status != undefined ? issue?.Status.trim() || '' : '';

        labelName = labelName.split(/\s+/).join('_');
        labelLanguage = labelLanguage.split(/\s+/).join('_');
        labelSource = labelSource.split(/\s+/).join('_');
        labelSeverity = labelSeverity.split(/\s+/).join('_');
        labelStatus = labelStatus.split(/\s+/).join('_');

        for(var i=0; i<attributeMappings.length; i++) {
            if(attributeMappings[i].type === 'Array'){
                if(attributeMappings[i].imAttr == 'labels'){
                attrMap[attributeMappings[i].imAttr] = [labelName || '', String(applicationId)];
                }else if(attributeMappings[i].imAttr == 'customfield_11292'){
                    attrMap[attributeMappings[i].imAttr] = `${labelName}`
                }else if(attributeMappings[i].imAttr == 'customfield_13096'){
                    attrMap[attributeMappings[i].imAttr] = `${labelStatus}`;
                }else if(attributeMappings[i].imAttr == 'customfield_13094'){
                    attrMap[attributeMappings[i].imAttr] = `${labelSeverity}`;
                }else if(attributeMappings[i].imAttr == 'customfield_13093'){
                    attrMap[attributeMappings[i].imAttr] = `${labelLanguage}`;
                }else if(attributeMappings[i].imAttr == 'customfield_13095'){
                    attrMap[attributeMappings[i].imAttr] = `${labelSource}`;
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
        attrMap["issuetype"] = {"name" : 'Task'};
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
                }else if(attributeMappings[i].imAttr == 'customfield_11292'){
                    attrMap[attributeMappings[i].imAttr] = `${labelName}`
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

methods.getTicketsByProject = async (projectName, imConfigObject, skipValue) => {
    const url = imConfigObject.imurl + constants.JIRA_LABELS_ISSUE.replace("{PROJECTNAME}",projectName).replace("{SKIPVALUE}", skipValue)
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
