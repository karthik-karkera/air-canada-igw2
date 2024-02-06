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
    logger.info("Started the job for provider "+ providerId);
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
                        const issuesData = await pushIssuesOfScan(scan.Id, scan.AppId, appName, token, providerId);
                        if (typeof issuesData != 'undefined') output.push(issuesData);
                    }
                } 
                else logger.info(`Scan ${scan.id} is not associated with the application. Issues of this application cannot be pushed to Issue Management System`);        
            }else if(process.env.APPSCAN_PROVIDER == 'ASE'){
                if (scan.applicationId){
                    const issuesData = await pushIssuesOfScan(scan.id, scan.applicationId, token, providerId);
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
    const token = await appscanLoginController();
    const completedScans = await getLatestProviderTickets(providerId, syncinterval);

    if(completedScans?.total > 0){
        const updatedResults = await Promise.all(
            completedScans.issues.map(async (res) => {
                let description = JSON.parse(res.fields.description);
                let issueId = description.Id; 
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
            })
        );
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
        const result = process.env.APPSCAN_PROVIDER == 'ASE' ? await issueService.getIssuesOfApplication(applicationId, token) : await asocIssueService.getIssuesOfApplication(applicationId, token);
        if(result.code === 200) issues = result.data;        
        else logger.error(`Failed to get issues of application ${applicationId}`);
    } catch (error) {
        logger.error(`Fetching issues of application ${applicationId} failed with error ${error}`);
    }
    return issues;
}

getIssuesOfScan = async (scanId, applicationId, token) => {
    var issues = [];
    try {
        const result = process.env.APPSCAN_PROVIDER == 'ASOC' ? await asocIssueService.getIssuesOfScan(scanId, token) : '';
        if(result.code === 200) issues = result.data;        
        else logger.error(`Failed to get issues of application ${applicationId}`);
    } catch (error) {
        logger.error(`Fetching issues of application ${applicationId} failed with error ${error}`);
    }
    return issues;
}

updateIssuesOfApplication = async (issueId, applicationId, status, comment, externalid, token) => {
    try{
        // FOR ASOC
        const token = await appscanLoginController();
        const result = await asocIssueService.updateIssuesOfApplication(issueId, status, comment, externalid, token)
    }catch(error){
        throw `Failed to update the status for IssueId - ${issueId} Application Id - ${applicationId} - ${error?.response?.data?.Message || error}`
    }
}

methods.pushJobForScan = async (req, res) => {
    const token = await appscanLoginController();
    if (typeof token === 'undefined') return res.status(400).send(`Failed to login to the Appscan.`);
    const scanId = req.params.jobid;
    try{
        var result = process.env.APPSCAN_PROVIDER == 'ASE' ? await jobService.getScanJobDetails(scanId, token) : await asocJobService.getScanJobDetails(scanId, token);
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
            const output = await pushIssuesOfScan(scanId, applicationId, applicationName, token, process.env.IM_PROVIDER);
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

pushIssuesOfScan = async (scanId, applicationId, appName, token, providerId) => {
    var appIssues = process.env.APPSCAN_PROVIDER == 'ASE' ? await getIssuesOfApplication(applicationId, token) : await getIssuesOfScan(scanId, applicationId, token);
    if(process.env.APPSCAN_PROVIDER == "ASOC"){
        appIssues = appIssues.Items 
    }
    const scanIssues = process.env.APPSCAN_PROVIDER == 'ASE' ? appIssues.filter(issue => issue["Scan Name"].replaceAll("&#40;", "(").replaceAll("&#41;", ")").includes("("+scanId+")")) : appIssues.filter(issue => issue["ScanName"] != undefined);
    logger.info(`${appIssues.length} issues found in the scan ${scanId} and the scan is associated to the application ${applicationId}`);
    const pushedIssuesResult = await pushIssuesToIm(providerId, applicationId, appName, scanIssues, token);
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
    const pushedIssuesResult = await pushIssuesToIm(providerId, applicationId, applicationName, issues, token);
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

pushIssuesToIm = async (providerId, applicationId, applicationName, issues, token) => {
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
            await asocIssueService.downloadAsocReport(providerId, applicationId, issues, token)
        }catch(err){
            logger.error(`Downloading ASOC Reports for ${applicationId} failed with error - ${err}`)
        }
    }
    
    logger.info(`Issues count after filtering is ${filteredIssues.length}`);
    const imTicketsResult = await createImTickets(filteredIssues, imConfig, providerId, applicationId, applicationName);
    const successArray = (typeof imTicketsResult.success === 'undefined') ? [] : imTicketsResult.success;
    let count = 0
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

updateIssueAttribute = async (issueId, data, token, etag) => {
    var updateSuccessful = false;
    try {
        const updateResult = process.env.APPSCAN_PROVIDER == 'ASE' ? await issueService.updateIssue(issueId, data, token, etag) : await asocIssueService.updateIssue(issueId, data, token, etag); 
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
    }
    await delay(3000);
    const isSuccess = await updateIssueAttribute(issueId, data, token, issueData.etag);
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

module.exports = methods;
