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

methods.createTickets = async (issues, imConfigObject) => {
    var output = {};
    var success = [];
    var failures = [];
    for (var i=0; i<issues.length; i++){
        const imPayload = await createPayload(issues[i], imConfigObject); //LAST
        try {
            // var basicToken = "Basic "+btoa(imConfigObject.imUserName+":"+cryptoService.decrypt(imConfigObject.imPassword));
            var basicToken = "Basic "+btoa(imConfigObject.imUserName+":"+imConfigObject.imPassword);
            const imConfig = getConfig("POST", basicToken, imConfigObject.imurl+constants.JIRA_CREATE_TICKET, imPayload);
            const result = await util.httpImCall(imConfig); 
            if (result.code === 201){
                const imTikcket = imConfigObject.imurl+"/browse/"+result.data.key;
                process.env.APPSCAN_PROVIDER == "ASOC" ? success.push({issueId: issues[i]["Id"], ticket: imTikcket}) : success.push({issueId: issues[i]["id"], ticket: imTikcket});
            }
            else {
                process.env.APPSCAN_PROVIDER == "ASOC" ? failures.push({issueId: issues[i]["Id"], errorCode: result.code, errorMsg: result.data}) : failures.push({issueId: issues[i]["id"], errorCode: result.code, errorMsg: result.data});
                logger.error(`Failed to create ticket for issue Id ${issues[i]["id"]} and the error is ${result.data}`);
            }
        } catch (error) {
            logger.error(`))) Failed to create ticket for issue Id ${issues[i]["id"]} and the error is ${JSON.stringify(error.response.data)}`);
            failures.push({issueId: issues[i]["id"], errorMsg: error.message});
        }
    }
    output["success"]=success;
    output["failure"]=failures;
    return output;
};

createPayload = async (issue, imConfigObject) => {
    var payload = {};
    var attrMap = {};
    // let priority = imConfigObject.severitymap[issue["Severity"]] == 'Low' ? '4' : imConfigObject.severitymap[issue["Severity"]] == 'Medium' ? '3' : imConfigObject.severitymap[issue["Severity"]] == 'High' ? '2' : '1';
    // console.log(priority, imConfigObject.severitymap[issue["Severity"]] )
    attrMap["project"] = {"key" : imConfigObject.improjectkey};
    attrMap["issuetype"] = {"name" : imConfigObject.imissuetype};
    if(process.env.APPSCAN_PROVIDER == "ASOC"){
        attrMap["summary"] = "Security issue: "+ issue["IssueType"] + " found by AppScan";
    }else{
        attrMap["summary"] = "Security issue: "+ issue["Issue Type"].replaceAll("&#40;", "(").replaceAll("&#41;", ")") + " found by AppScan";
    }
    attrMap["description"] = JSON.stringify(issue, null, 4);
    // attrMap["customfield_10006"] = "TEST2-1001";
    const attributeMappings = typeof imConfigObject.attributeMappings != 'undefined' ? imConfigObject.attributeMappings : [];
 
    for(var i=0; i<attributeMappings.length; i++) {
        if(attributeMappings[i].type === 'Array'){
            // let labelArray = issue[attributeMappings[i].appScanAttr].includes(',') ? issue[attributeMappings[i].appScanAttr].split(',') : issue[attributeMappings[i].appScanAttr];
            attrMap[attributeMappings[i].imAttr] = [issue[attributeMappings[i].appScanAttr] || ''];
        }
        else{
            attrMap[attributeMappings[i].imAttr] = issue[attributeMappings[i].appScanAttr];    
        }
    }
    payload["fields"] = attrMap;
    return payload;
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

module.exports = methods;
