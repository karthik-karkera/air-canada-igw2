const log4js = require("log4js");
const logger = log4js.getLogger("igwController");
const path = require('path');
const jsonwebtoken = require("../../utils/jsonwebtoken");
const constants = require("../../utils/constants");
const igwService = require("../services/igwService");
const issueService = require("../../ase/service/issueService");
const asocIssueService = require("../../asoc/service/issueService");
const imConfigService = require("../services/imConfigService");
const global = require('../../utils/global');
var crypto = require('crypto'); 
const fs = require('fs');
var CronJob = require('cron').CronJob;
const jobService = require('../../ase/service/jobService');
const asocJobService = require('../../asoc/service/jobService');
const { error } = require("console");

var methods = {};

methods.igwLogin = async (req, res) => {
	try{
        const{adminEmail, adminPassword} = req.body;
		var passwordHash = crypto.pbkdf2Sync(adminPassword, constants.HASHING_SALT,  1000, 64, 'sha512').toString('hex');

        if (adminEmail == process.env.LOCAL_ADMIN_USER && passwordHash===process.env.ADMIN_USER_PASSWORD)
		{
            var data = {
                "adminEmail": adminEmail,
                "userRole": "Admin",
            };

            var token = jsonwebtoken.createNoExpiryToken(data);
            return res.status(200).json({"token" : token});
		}
        else
            return res.status(403).json({"message": constants.ERR_WRONG_CREDENTIALS});
	}
	catch(error) {
		logger.error("Login failed: "+JSON.stringify(error));
        return res.status(500).send("Login failed");
	}
};

methods.getProviders = (req, res) => {
    return res.status(200).json(constants.PROVIDERS);
}

methods.createConfig = (req, res) => {
    const providerId = req.params.providerid;
    var imFilePath ;

    if (providerId === constants.DTS_JIRA)
        imFilePath = './config/'+constants.DTS_JIRA+'.json';
    else {
        logger.error(`The specified provider ${providerId} does not exist in the system.`);
        return res.status(404).send("Provider does not exist.");
    }
        
    fs.writeFile(imFilePath, JSON.stringify(req.body, null, 4), 'utf8', function(err) {
        if (err) {
            logger.error(`Writing config file failed with error ${err}`);
            return res.status(500).json(err);
        }
        else {
            return res.status(200).send("Success");
        }
    });        
}

methods.getConfig = async (req, res) => {
    try {
        const imConfig = await imConfigService.getImConfigObject(req.params.providerid);
        if (imConfig && imConfig.length>0) return res.status(200).json(JSON.parse(imConfig));
        else {
            logger.error(`Failed to read the config for the provider ${req.params.providerId}`);
            return res.status(500).json("Check the provider Id");
        }
    }
    catch (err) {
        logger.error(`Reading the config for the provider ${req.params.providerId} failed with error ${err}`);
        return res.status(500).json(err);
    }
}

methods.startSynchronizer = async (req, res) => {
    const providerId = process.env.IM_PROVIDER;
    try {
        await methods.startSync(providerId, req.params.syncinterval);
        return res.status(200).send("Started the job for provider "+ providerId);
    } catch (error) {
        logger.error(`Unable to start the synchronizer. ${error}`);
        return res.status(409).send(`Job for the provider ${providerId} already exists`);    
    }
}

methods.startIMSynchronizer = async (req, res) => {
    const providerId = process.env.IM_PROVIDER;
    const syncinterval = req.params.syncinterval;
    try {
        await methods.startProviderSync(providerId, syncinterval);
        return res.status(200).send("Started the job for provider "+ providerId);
    } catch (error) {
        logger.error(`Unable to start the synchronizer. ${error}`);
        return res.status(409).send(`Job for the provider ${providerId} already exists`);    
    }
}

methods.startSync = async (providerId, syncinterval) => {
    const jobInMap = jobsMap.get(providerId);
    if(typeof jobInMap != 'undefined')
        throw `Job for the provider ${providerId} already exists`;    
    var newDateObj = new Date();
    var pattern = '1 '+newDateObj.getMinutes()+' '+newDateObj.getHours()+' */'+syncinterval+' * *';

    var job = new CronJob(
        pattern,
        function() {
            startCron(providerId, syncinterval);
        },
        null,
        false,
        null,
        null,
        true
    );
    
    job.start();
    jobsMap.set(providerId, job);
    logger.info("Started the job for provider "+ providerId);
}

methods.stopSync = async (req, res) => {
    const providerId = process.env.IM_PROVIDER;
    const job = jobsMap.get(providerId);
    if(typeof (job) != 'undefined'){
        job.stop();
        jobsMap.delete(providerId);
        return res.status(200).send("Stopped the job of provider "+providerId);
    }
    else
        return res.status(404).send(`Job for the provider ${providerId} is not found`);
}

methods.startProviderSync = async (providerId, syncinterval) => {
    let cronPattern;
    const jobInMap = imJobsMap.get(providerId);

    if(typeof jobInMap != 'undefined')
        throw `Job for the provider ${providerId} already exists`;

    let match = syncinterval.match(/^(\d+)([dhms])$/); //Convert Minutes, Hours & Days to Minutes
    if (match) {
        const [, value, unit] = match;
        cronPattern = value * (unit === 'd' ? 24 * 60 : unit === 'h' ? 60 : unit === 'm' ? 1 : 0);
    }else{
        throw `Time Format not proper. Use format ("2m", "1h", "3d")`
    }

    var pattern = `*/${cronPattern} * * * *`;
    const job = new CronJob(
        pattern,
        function() {
            startProviderCron(providerId, syncinterval);
        },
        null,
        false,
        null,
        null,
        true
    );
    
    job.start();
    imJobsMap.set(providerId, job);
    logger.info("Started the JIRA job for provider "+ providerId);
}

methods.startStatusSync = async (providerId, syncinterval) => {
    var newDateObj = new Date();
   
    let match = syncinterval.match(/^(\d+)([dhms])$/); //Convert Minutes, Hours & Days to Minutes
    if (match) {
        const [, value, unit] = match;
        cronPattern = value * (unit === 'd' ? 24 * 60 : unit === 'h' ? 60 : unit === 'm' ? 1 : 0);
    }else{
        throw `Time Format not proper. Use format ("2m", "1h", "3d")`
    }

    var pattern = `*/${cronPattern} * * * *`;

    var statusJob = new CronJob(
        pattern,
        function() {
            startReopenendTicketCron(providerId, syncinterval);
        },
        null,
        false,
        null,
        null,
        true
    );
    
    statusJob.start();
    logger.info("Started the JIRA status job for provider "+ providerId);
}

methods.stopProviderSync = async (req, res) => {
    const providerId = process.env.IM_PROVIDER;
    const job = imJobsMap.get(providerId);
    if(typeof (job) != 'undefined'){
        job.stop();
        imJobsMap.delete(providerId);
        return res.status(200).send("Stopped the job of provider "+providerId);
    }
    else
        return res.status(404).send(`Job for the provider ${providerId} is not found`);
}

const appscanLoginController = async () => {
    var token;
    try {
        if(process.env.APPSCAN_PROVIDER == 'ASE'){
            token = await igwService.aseLogin();
            if (typeof token === 'undefined') logger.error(`Failed to login to the AppScan.`);
        }
        else if(process.env.APPSCAN_PROVIDER == 'ASOC'){
            token = await igwService.asocLogin();
            if (typeof token === 'undefined') logger.error(`Failed to login to the AppScan.`);
        }
    } catch (error) {
        logger.error(`Login to AppScan failed with the error ${error}`);
    }
    return token;
}

getCompletedScans = async(period, token) => {
    var completedScans;
    try {
        const result = await igwService.getCompletedScans(period, token); 
        if (result.code < 200 || result.code > 299) logger.error(`Failed to fetch completed scans. ${result.data}`);
        else {
            completedScans = (result.data) ? result.data: [];
            logger.info(`Found ${completedScans.length} completed scans in the last ${period} days.`);
        }
    } catch (error) {
        logger.error(`Failed to fetch completed scans. ${error}`);
    }
    return completedScans;
}

getLatestProviderTickets = async(providerId, period) => {
    var completedScans;
    try {
        let imConfig = await getIMConfig(providerId);
        const result = await igwService.getLatestImTickets(providerId, period, imConfig); 
        if (result.code < 200 || result.code > 299) logger.error(`Failed to fetch completed scans. ${result.data}`);
        else {
            completedScans = (result.data) ? result.data: [];
            logger.info(`Found ${completedScans.total || 0} updated ${providerId} tickets in last ${period}`);
        }
    } catch (error) {
        logger.error(`Failed to fetch updated tickets from ${providerId}. ${error}`);
    }
    return completedScans;
}

startCron = async (providerId, syncinterval) => {
    const token = await appscanLoginController();
    if (typeof token === 'undefined') return;

    const completedScans = await getCompletedScans(syncinterval, token);
    if (typeof completedScans === 'undefined') return;
    const output = [];
    try {
        for(var i=0; i<completedScans.length; i++) {
            const scan = completedScans[i];

            if(process.env.APPSCAN_PROVIDER == 'ASOC'){
                if (scan.AppId){
                    const token = await appscanLoginController();
                    let appName = scan.AppName || ''
                    if (typeof token === 'undefined') logger.error('Not a valid token')
                    else{
                        const issuesData = await pushIssuesOfScan(scan.Id, scan.AppId, scan.Technology, appName, token, providerId);
                        if (typeof issuesData != 'undefined') output.push(issuesData);
                    }
                } 
                else logger.info(`Scan ${scan.id} is not associated with the application. Issues of this application cannot be pushed to Issue Management System`);        
            }else if(process.env.APPSCAN_PROVIDER == 'ASE'){
                if (scan.applicationId){
                    const issuesData = await pushIssuesOfScan(scan.id, scan.applicationId, '', scan.name, token, providerId);
                    if (typeof issuesData != 'undefined') output.push(issuesData);
                } 
                else logger.info(`Scan ${scan.id} is not associated with the application. Issues of this application cannot be pushed to Issue Management System`);        
            }
        }
        jobResults.set(providerId, output);
        logger.info(JSON.stringify(output, null, 4));        
    }
    catch(err) {
        logger.error(`Pushing issues to Issue Management System failed ${err}`);
    }
    return;
}

startProviderCron = async (providerId, syncinterval) => {
    try{
    const token = await appscanLoginController();
    const completedScans = await getLatestProviderTickets(providerId, syncinterval);

    if(completedScans?.total > 0){
        const updatedResults = await Promise.all(
            completedScans.issues.map(async (res) => {
                if(res.fields.summary.includes('found by AppScan')){
                let description = JSON.parse(res.fields.description);
                let issueId = process.env.APPSCAN_PROVIDER == 'ASE' ? description.id : description.Id; 
                let applicationId = description.ApplicationId;
                try{
                    let status = 'Fixed';
                    let externalId = '';
                    let comment = 'Fixed on JIRA';
                    await updateIssuesOfApplication(issueId, applicationId, status, comment, externalId, token);
                    logger.info(`Issues Fixed for Issue Id - ${issueId} Application Id - ${applicationId}`)
                }catch (error) {
                    logger.error(error)
                }
                }
            })
        );
    }
    }catch(err){
        logger.error(`Fetching Updated Tickets from ${providerId} Failed ${err}`)
    }
}

startReopenendTicketCron = async (providerId, syncinterval) => {
    const token = await appscanLoginController();

    if (typeof token === 'undefined') return;
    if(reopenedIssues.size != 0){
        let imConfig = await getIMConfig(providerId);
        for(let [key, value] of reopenedIssues){
            try{
                let keyId = value.split('/')[4]
                let bodyData = {
                    "transition": {
                        "id": "11"
                    }
                }
                await updateStatusInProvider(providerId, imConfig, bodyData, keyId);
                reopenedIssues.delete(key);
            }catch(err){
                logger.error(err)
            }
        }
    }
}

methods.getResults = async (req, res) => {
    const providerId = process.env.IM_PROVIDER;
    const result = jobResults.get(providerId);

    if(typeof (result) != 'undefined')
        return res.status(200).json(result);
    else
        return res.status(404).send(`Results for the provider ${providerId} is not found`);
}

getIssuesOfApplication = async (applicationId, token) => {
    var issues = [];
    try {
        const result = process.env.APPSCAN_PROVIDER == 'ASE' ? await issueService.getIssuesOfApplication(applicationId, token) : await fetchAllData(asocIssueService.getIssuesOfApplication, token, 200, [applicationId]);
        if(result.code === 200) issues = result.data;        
        else logger.error(`Failed to get issues of application ${applicationId}`);
    } catch (error) {
        logger.error(`Fetching issues of application ${applicationId} failed with error ${error}`);
    }
    return issues;
}

getCommentsOfIssue = async (issueId, token) => {
    var issues = [];
    try {
        const result = process.env.APPSCAN_PROVIDER == 'ASE' ? '' : await fetchAllData(asocIssueService.getCommentsOfIssue, token, 200, [issueId]);
        if(result.code === 200) issues = result.data;        
        else logger.error(`Failed to get comments of issue ${issueId}`);
    } catch (error) {
        logger.error(`Fetching comments of issue ${issueId} failed with error ${error}`);
    }
    return issues;
}

getIssuesOfScan = async (scanId, applicationId, token) => {
    var issues = [];
    try {
        const result = process.env.APPSCAN_PROVIDER == 'ASOC' ? await fetchAllData(asocIssueService.getIssuesOfScan, token, 200, [scanId]) : '';
        if(result.code === 200) issues = result.data;        
        else logger.error(`Failed to get issues of application ${applicationId}`);
    } catch (error) {
        logger.error(`Fetching issues of application ${applicationId} failed with error ${error}`);
    }
    return issues;
}

updateIssuesOfApplication = async (issueId, applicationId, status, comment, externalid, token) => {
    try{
        const token = await appscanLoginController();
        let etag = ''
        if(process.env.APPSCAN_PROVIDER == 'ASE') {
            const issueData = await getIssueDetails(applicationId, issueId, token);
            etag = issueData.etag;
        }
        const result = process.env.APPSCAN_PROVIDER == 'ASOC' ? await asocIssueService.updateIssuesOfApplication(applicationId, issueId, status, comment, externalid, token) : await issueService.updateIssuesOfApplication(applicationId, issueId, status, comment, externalid, etag, token)
    }catch(error){
        throw `Failed to update the status for IssueId - ${issueId} Application Id - ${applicationId} - ${error?.response?.data?.Message || error}`
    }
}

updateStatusInProvider = async (providerId, imConfig, bodyData, projectKey) => {
    try{
        const result = await igwService.updateImStatus(providerId, imConfig, bodyData, projectKey)
        logger.info(`Status Updated in ${projectKey}`)
    }catch(error){
        throw `Failed to update the status for IssueId - ${issueId} Application Id - ${applicationId} - ${error?.response?.data?.Message || error}`
    }
}

methods.pushJobForScan = async (req, res) => {
    const token = await appscanLoginController();
    if (typeof token === 'undefined') return res.status(400).send(`Failed to login to the Appscan.`);
    const scanId = req.params.jobid;
    try{
        var result = process.env.APPSCAN_PROVIDER == 'ASE' ? await jobService.getScanJobDetails(scanId, token) : await fetchAllData(asocJobService.getScanJobDetails, token, 200, [scanId]);
    }catch(error){
        logger.error('Wrong scan Id or you do not have access permission to the containing application.');
        return res.status(401).send('Wrong scan Id or you do not have access permission to the containing application.')
    }
    if (result.code === 200) {
        const data = result.data;
        const applicationId = process.env.APPSCAN_PROVIDER == 'ASE' ? data.applicationId : data?.Items[0]?.ApplicationId;
        if (typeof applicationId != 'undefined'){
            var issues = await getIssuesOfApplication(applicationId, token);
            let applicationName = issues.applicationName != undefined ? issues.applicationName : '';
            const output = await pushIssuesOfScan(scanId, applicationId, '', applicationName, token, process.env.IM_PROVIDER);
            logger.info(JSON.stringify(output, null, 4));
            return res.status(200).json(output);
        }
        else
            return res.status(500).send(`The scan is not part of any application. Issues cannot be pushed to IM System.`);
    }
    else {
        logger.error(`Pushing issues of scan has failed. ${JSON.stringify(result.data)}`);
        return res.status(500).send(`Pushing issues of scan has failed. ${JSON.stringify(result.data)}`);
    }
}

methods.pushJobForApplication = async (req, res) => {
    const token = await appscanLoginController();
    if (typeof token === 'undefined') return res.status(400).send(`Failed to login to the Appscan.`);
    const applicationId = req.params.appid;
    const output = await pushIssuesOfApplication(applicationId, token, process.env.IM_PROVIDER);
    logger.info(JSON.stringify(output, null, 4));
    return res.status(200).json(output);
}

pushIssuesOfScan = async (scanId, applicationId, technology, appName, token, providerId) => {
    var appIssues = process.env.APPSCAN_PROVIDER == 'ASE' ? await getIssuesOfApplication(applicationId, token) : await getIssuesOfScan(scanId, applicationId, token);
    if(process.env.APPSCAN_PROVIDER == "ASOC"){
        appIssues = appIssues.Items 
    }
    let reOpenedIssue = appIssues.filter(issue => issue['Status'] == 'Reopened');
    reOpenedIssue.map(async res => {
        if (process.env.APPSCAN_PROVIDER == 'ASOC') {
            if (res.ExternalId != '') {
                reopenedIssues.set(res.Id, res.ExternalId);
            } else {
                let response = await getCommentsOfIssue(res.Id, token);
                if (response.Items && response.Items.length > 0) {
                    response?.Items.map(a => {
                        if (a.Comment.includes('appscan.atlassian')) {
                            reopenedIssues.set(res.Id, a.Comment);
                        }
                    })
                }
            }
        }else{
            if (res['External ID'] != '' && res['External ID'] != undefined) {
                reopenedIssues.set(res.id, res['External ID']);
            }
        }
    })

    const scanIssues = process.env.APPSCAN_PROVIDER == 'ASE' ? appIssues.filter(issue => issue["Scan Name"].replaceAll("&#40;", "(").replaceAll("&#41;", ")").includes("("+scanId+")")) : appIssues.filter(issue => issue["ScanName"] != undefined);
    logger.info(`${appIssues.length} issues found in the scan ${scanId} and the scan is associated to the application ${applicationId}`);
    const pushedIssuesResult = await pushIssuesToIm(providerId, scanId, applicationId, appName, scanIssues, technology, token);
    pushedIssuesResult["scanId"]=scanId;
    pushedIssuesResult["syncTime"]=new Date();
    return pushedIssuesResult;
}

pushIssuesOfApplication = async (applicationId, token, providerId) => {
    var issues = await getIssuesOfApplication(applicationId, token); 
    let applicationName = issues.applicationName != undefined ? issues.applicationName : '';
    if(process.env.APPSCAN_PROVIDER == "ASOC"){
        issues = issues?.Items && issues?.Items.length > 0 ? issues.Items : []
    }
    logger.info(`${issues.length} issues found in the application ${applicationId}`);
    const pushedIssuesResult = await pushIssuesToIm(providerId, '', applicationId, applicationName, issues, '', token);
    pushedIssuesResult["applicationId"]=applicationId;
    pushedIssuesResult["syncTime"]=new Date();
    return pushedIssuesResult;
}

createImTickets = async (filteredIssues, imConfig, providerId, applicationId, applicationName) => {
    var result = [];
    try {
        result = await igwService.createImTickets(filteredIssues, imConfig, providerId, applicationId, applicationName);   
        if(typeof result === 'undefined' || typeof result.success === 'undefined') result = [];
    } catch (error) {
        logger.error(`Creating tickets in the ${providerId} failed with error ${error}`);
    }
    return result;
}

createImScanTickets = async (filteredIssues, imConfig, providerId, applicationId, applicationName, scanId, discoveryMethod) => {
    var result = [];
    try {
        result = await igwService.createImScanTickets(filteredIssues, imConfig, providerId, applicationId, applicationName, scanId, discoveryMethod);   
        if(typeof result === 'undefined' || typeof result.success === 'undefined') result = [];
    } catch (error) {
        logger.error(`Creating tickets in the ${providerId} failed with error ${error}`);
    }
    return result;
}

pushIssuesToIm = async (providerId, scanId, applicationId, applicationName, issues, technology, token) => {
    const folderName1 = 'temp';
    const folderName2 = 'tempReports';

    if (!fs.existsSync(folderName1)) {
        // If it doesn't exist, create the folder
        fs.mkdirSync(folderName1);
    }
    if (!fs.existsSync(folderName2)) {
        // If it doesn't exist, create the folder
        fs.mkdirSync(folderName2);
    }
    var imConfig = await getIMConfig(providerId);
    if(typeof imConfig === 'undefined') return;
    const filteredIssues = await igwService.filterIssues(issues, imConfig);
    
    if(process.env.APPSCAN_PROVIDER == "ASOC" && filteredIssues.length > 0 && process.env.GENERATE_HTML_FILE_JIRA == "true"){
        try{
            await asocIssueService.downloadAsocReport(providerId, applicationId, scanId, issues, token)
        }catch(err){
            logger.error(`Downloading ASOC Reports for ${applicationId} failed with error - ${err}`)
        }
    }
    
    logger.info(`Issues count after filtering is ${filteredIssues.length}`);
    const imTicketsResult = await createImTickets(filteredIssues, imConfig, providerId, applicationId, applicationName);
    const successArray = (typeof imTicketsResult.success === 'undefined') ? [] : imTicketsResult.success;
    let count = 0
    if(process.env.GENERATE_SCAN_HTML_FILE_JIRA == 'true' && scanId != '' && filteredIssues.length > 0 && process.env.APPSCAN_PROVIDER == 'ASOC'){
        let downloadPath = `./temp/${applicationId}.html`;
        let discoveryMethod = filteredIssues[0].DiscoveryMethod;
        let scanDetails = process.env.APPSCAN_PROVIDER == 'ASE' ? await jobService.getScanJobDetails(scanId, token) : await asocIssueService.getScanDetails(scanId, technology, token);
        if (scanDetails.code === 200 && scanDetails.data !=='undefined') 
            scanDetails = scanDetails.data;
        else
            logger.error(`Fetching details of scan ${scanId} from application ${applicationId} failed with error ${scanDetails.data}`);    
    
        const imScanTicketsResult = await createImScanTickets([scanDetails], imConfig, providerId, applicationId, applicationName, scanId, discoveryMethod);
        const successScanArray = (typeof imScanTicketsResult.success === 'undefined') ? [] : imScanTicketsResult.success;
        let scanObj = successScanArray[0];
        let imScanTicket = scanObj.ticket;
        try {
            if (require("fs").existsSync(downloadPath)) {
                await igwService.attachIssueDataFile(imScanTicket, downloadPath, imConfig, providerId);
            }
        } catch (error) {
            logger.error(`Attaching data file for the issueId ${scanId} to ticket ${imScanTicket} failed with an error ${error}`);
            issueObj["attachIssueDataFileError"] = error;
        }
        imScanTicketsResult["scanId"]=scanId;
        imScanTicketsResult["syncTime"]=new Date();
        logger.info(JSON.stringify(imScanTicketsResult, null, 4));
    }
    let refreshedToken = await appscanLoginController();
    for(let j=0; j<successArray.length; j++){
        count++;
        if(count > 200){
            refreshedToken = await appscanLoginController();
            count=0;
        }
        const issueObj = successArray[j];
        const issueId = issueObj.issueId;
        const imTicket = issueObj.ticket;
        try {
            await updateExternalId(applicationId, issueId, imTicket, refreshedToken);  
        } catch (error) {
            logger.error("Could not update the external Id of the issue for a ticket "+ error);
            issueObj["updateExternalIdError"] = error;
        }
        if(process.env.APPSCAN_PROVIDER == "ASOC"){
            var downloadPath = `./tempReports/${applicationId}_${issueId}.html`;
        }else if(process.env.APPSCAN_PROVIDER == "ASE"){
            var downloadPath = `./temp/${applicationId}_${issueId}.zip`;
        }
        if(process.env.GENERATE_HTML_FILE_JIRA == "true"){
            try {
                process.env.APPSCAN_PROVIDER == 'ASE' ? await issueService.getHTMLIssueDetails(applicationId, issueId, downloadPath, token) : '';
            } catch (error) {
                logger.error(`Downloading HTML file having issue details failed for the issueId ${issueId} with an error ${error}`);
                issueObj["attachIssueDataFileError"] = error;
            }
        }
        try {
            if (require("fs").existsSync(downloadPath)) {
                await igwService.attachIssueDataFile(imTicket, downloadPath, imConfig, providerId);
            }
            
        } catch (error) {
            logger.error(`Attaching data file for the issueId ${issueId} to ticket ${imTicket} failed with an error ${error}`);
            issueObj["attachIssueDataFileError"] = error;
        }

        try {
            if (require("fs").existsSync(downloadPath)) require("fs").rmSync(downloadPath);
        } catch (error) {
            logger.error(`Deleting the html data file for the issueId ${issueId} attached to ticket ${imTicket} failed with an error ${error}`);
        }
    }
    await fs.readdir('./tempReports', (err, files) => {
        if (err) {
          console.error('Error reading folder:', err);
          return;
        }
        // Iterate through the files and delete each one
        files.forEach(file => {
          const filePath = path.join("tempReports", file);
      
          // Use fs.unlink to delete the file
          fs.unlink(filePath, err => {
            if (err) {
            //   console.error(`Error deleting file ${filePath}:`, err);
            } else {
            //   console.log(`Deleted file: ${filePath}`);
            }
          });
        });
      });
    return imTicketsResult;
}

getIssueDetails = async (applicationId, issueId, token) => {
    var issueData;
    try {
        const issueResults = process.env.APPSCAN_PROVIDER == 'ASE' ? await issueService.getIssueDetails(applicationId, issueId, token) : await asocIssueService.getIssueDetails(applicationId, issueId, token);  
        if (issueResults.code === 200 && issueResults.data !=='undefined') 
            issueData = issueResults.data;
        else
            logger.error(`Fetching details of issue ${issueId} from application ${applicationId} failed with error ${issueResults.data}`);    
    } catch (error) {
        logger.error(`Fetching details of issue ${issueId} from application ${applicationId} failed with error ${error}`);
    }
    return issueData;
}

updateIssueAttribute = async (appId, issueId, data, token, etag) => {
    var updateSuccessful = false;
    try {
        const updateResult = process.env.APPSCAN_PROVIDER == 'ASE' ? await issueService.updateIssue(issueId, data, token, etag) : await asocIssueService.updateIssue(appId, issueId, data, token, etag); 
        if(updateResult.code == 200 || updateResult.code == 204){
            updateSuccessful = true;    
        }
        else {
            updateSuccessful = false;
            logger.error(`Updating attribute of issue ${issue} failed with error ${updateResult.data}`);
        }
    } catch (error) {
        logger.error(`Updating attribute of issue ${issue} failed with error ${error}`);
    }
    return updateSuccessful;
}

updateExternalId = async (applicationId, issueId, ticket, token) => {
    await delay(3000);
    const issueData = await getIssueDetails(applicationId, issueId, token);
    if (typeof issueData === 'undefined') throw `Failed to fetch the details of issue ${issueId} from application ${applicationId}`;
    var data = {};
    if(process.env.APPSCAN_PROVIDER == 'ASE'){
    data["lastUpdated"] = issueData.lastUpdated;
    data["appReleaseId"] = applicationId;
    var attributeArray = [];
    var attribute = {};
    var attribute1 = {};
    attribute["name"] = "External Id";
    attribute["value"] = [ticket];
    attributeArray.push(attribute);
    var attributeCollection = {};
    attributeCollection["attributeArray"] = attributeArray;
    data["attributeCollection"] = attributeCollection;
    }
    else if(process.env.APPSCAN_PROVIDER == "ASOC"){
        data["Status"] = issueData.Status == 'New' ? 'Open' : issueData.Status;
        data["ExternalId"] = ticket;
        data['Comment'] = ticket
    }else{
        attribute1["name"] = "Comments";
        attribute1["value"] = [ticket];
        attributeArray.push(attribute1);
    }
    await delay(3000);
    const isSuccess = await updateIssueAttribute(applicationId, issueId, data, token, issueData.etag);
    if(!isSuccess)
        throw `Failed to update the external Id for issue ${issueId} from application ${applicationId}`;
}

getIMConfig = async (providerId) => {
    var imConfig;
    try {
        imConfig = await imConfigService.getImConfigObject(providerId);
        if(typeof imConfig === 'undefined') 
            logger.error(`Configuration does not exist for provider ${providerId}`);
        else 
            return await JSON.parse(imConfig);
    }
    catch(error) {
        logger.error(`Reading the configuration failed for the provider ${providerId} with errors ${error}`);
    }
    return imConfig;
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

methods.labelsSync = async (req, res) => {
    let token = await appscanLoginController();
    let limit = req.query.limit || 5;
    let arrayList = { success: [], failure: [] };

    let projectName = req.query.project;
    let providerId = req.query.providerId;
    try {
        let imConfig = await getIMConfig(providerId);
        const result = await fetchAllSyncData(igwService.getLatestImTicketsByProject, providerId, projectName, imConfig);

        if (result.code == 200) {
            let data = result.data.issues;

            for (let i = 0; i < 650; i++) {
                try {
                    let labelList = [];
                    let attrMap = {};
                    let payload = {}
                    let projectKey = data[i].key;

                    const parsedDescription = JSON.parse(data[i]?.fields?.description);
                    let applicationId = parsedDescription?.ApplicationId;
                    let issueId = parsedDescription?.Id;
                    
                    if (data[i]?.fields?.customfield_11292 == null) {
                        labelList.push("customfield_11292");
                    }
                    if (data[i]?.fields?.customfield_13096 == null) {
                        labelList.push("customfield_13096");
                    }
                    if (data[i]?.fields?.customfield_13094 == null) {
                        labelList.push("customfield_13094");
                    }
                    if (data[i]?.fields?.customfield_13093 == null) {
                        labelList.push("customfield_13093");
                    }
                    if (data[i]?.fields?.customfield_13095 == null) {
                        labelList.push("customfield_13095");
                    }
                    if (data[i]?.fields?.labels.length == 0){
                        labelList.push("labels");
                    }
                    if (labelList.length > 0) {
                        try {
                            let getApplicationName = await getIssuesOfApplication(applicationId, token);
                            let applicationName = getApplicationName.applicationName != undefined ? getApplicationName.applicationName : '';
                            let issueData = await asocIssueService.getIssueDetails(applicationId, issueId, token);
                            let attributeMappings = typeof imConfig.attributeMappings != 'undefined' ? imConfig.attributeMappings : [];

                            if (issueData.code == 200 && issueData.data) {
                                issueData = issueData.data;
                                labelName = applicationName
                                let labelLanguage = issueData?.Language != null || issueData?.Language != undefined ? issueData?.Language.trim() || '' : '';
                                let labelSource = issueData?.Source != null || issueData?.Source != undefined ? issueData?.Source.trim() || '' : '';
                                let labelSeverity = issueData?.Severity != null || issueData?.Severity != undefined ? issueData?.Severity.trim() || '' : '';
                                let labelStatus = issueData?.Status != null || issueData?.Status != undefined ? issueData?.Status.trim() || '' : '';

                                labelName = labelName.split(/\s+/).join('_');
                                labelLanguage = labelLanguage.split(/\s+/).join('_');
                                labelSource = labelSource.split(/\s+/).join('_');
                                labelSeverity = labelSeverity.split(/\s+/).join('_');
                                labelStatus = labelStatus.split(/\s+/).join('_');

                                for (let j = 0; j < attributeMappings.length; j++) {
                                    if (attributeMappings[j].type === 'Array' && labelList.includes(attributeMappings[j].imAttr)) {
                                        if (attributeMappings[j].imAttr == 'labels') {
                                            attrMap[attributeMappings[j].imAttr] = [labelName || '', applicationId];
                                        } else if (attributeMappings[j].imAttr == 'customfield_11292') {
                                            attrMap[attributeMappings[j].imAttr] = `${labelName}`
                                        } else if (attributeMappings[j].imAttr == 'customfield_13096') {
                                            attrMap[attributeMappings[j].imAttr] = `${labelStatus}`;
                                        } else if (attributeMappings[j].imAttr == 'customfield_13094') {
                                            attrMap[attributeMappings[j].imAttr] = `${labelSeverity}`;
                                        } else if (attributeMappings[j].imAttr == 'customfield_13093') {
                                            attrMap[attributeMappings[j].imAttr] = `${labelLanguage}`;
                                        } else if (attributeMappings[j].imAttr == 'customfield_13095') {
                                            attrMap[attributeMappings[j].imAttr] = `${labelSource}`;
                                        }
                                    }
                                    // else {
                                    //     attrMap[attributeMappings[j].imAttr] = [labelName || '', applicationId];
                                    // }
                                }
                                payload["fields"] = attrMap;
                                let result = await igwService.updateImTickets(payload, imConfig, providerId, applicationId, projectKey);
                                arrayList.failure = [...arrayList.failure, ...result.failure]
                                arrayList.success = [...arrayList.success, ...result.success]
                            }
                        } catch (error) {
                            arrayList.failure = [...arrayList.failure, { projectKey, errorCode: error.response.status, errorMsg: error.response.statusText }]
                            logger.error(`Failed to update labels for ${projectKey} failed with error ${error}`)
                        }
                    }
                }
                catch (err) {
                    logger.error(`Failed to update labels with error ${err}`)
                }
            }

        }
        logger.info(arrayList)
        res.send(arrayList)
    } catch (err) {
        logger.error(err);
        res.status(404).json({ err: `Failed to update labels with error ${err}`})
    }
}

const fetchAllData = async (serviceName, appscanToken, status, value) => {
    let skipValue = 0;
    let result = {};
    try {
        while(true){
            try{
                let resData = value && value.length > 0 ? await serviceName(appscanToken, skipValue, ...value) : await serviceName(appscanToken, skipValue);
                if(resData.data.Count <= skipValue){
                    break;
                }
                if (resData && Object.keys(result).length == 0 && resData.code == status && resData.data.Items.length >= 0){
                    result = resData;
                }else if(resData && resData.code == status && resData.data.Items.length > 0){
                    result.data.Items = [...resData?.data?.Items, ...result.data.Items]
                }
                if(skipValue > 15000) break;
            }
            catch(err){
                logger.error(err?.response?.data.Message || err.message)
            }
            skipValue += 500;
        }
        return result;
    } catch (error) {
        console.error('Error fetching applications:', error);
        throw error;
    }
};

const fetchAllSyncData = async (serviceName, providerId, projectName, imConfig) => {
    let skipValue = 0;
    let result = {};
    try {
        while (true) {
            try {
                let resData = await serviceName(providerId, projectName, imConfig, skipValue);
                if (resData.data.total <= skipValue) {
                    break;
                }

                if (resData && Object.keys(result).length == 0 && resData.data.issues.length >= 0) {
                    result = resData;
                } else if (resData && resData.data.issues.length > 0) {
                    result.data.issues = [...resData?.data?.issues, ...result.data.issues]
                }
                if (skipValue > 15000) break;
            }
            catch (err) {
                logger.error(err?.response?.data.Message || err.message)
            }
            skipValue += 100;
        }
        return result;
    } catch (error) {
        console.error('Error fetching applications:', error);
        throw error;
    }
};

module.exports = methods;
