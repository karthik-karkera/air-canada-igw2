# Create Scan API

## Payload (request body)

### login
#### It is a login file recorded using AppScan Standard or AppScan Proxy Server or AppScan Activity Recorder or AppScan Dynamic Analysis Client. The supported file formats are .dast.config (AppScan Proxy Server or Activity Recorder) and .login (AppScan Standard or AppScan Dynamic Analysis Client) https://help.hcltechsw.com/appscan/Enterprise/10.0.7/topics/t_trafficdata_appscan_activity_recorder_2.html https://help.hcltechsw.com/appscan/Enterprise/10.0.7/topics/c_test_automation_ASE_using_appscanproxy_server.html

### traffic
#### A traffic file is recorded using AppScan Proxy Server or AppScan Activity Recorder. \n The supported file formats are .dast.config (AppScan Proxy Server or Activity Recorder) https://help.hcltechsw.com/appscan/Enterprise/10.0.7/topics/t_trafficdata_appscan_activity_recorder_2.html https://help.hcltechsw.com/appscan/Enterprise/10.0.7/topics/c_test_automation_ASE_using_appscanproxy_server.html

### data
Payload Example:  

{  
&nbsp;&nbsp;&nbsp;&nbsp;"templateId": 7,  
&nbsp;&nbsp;&nbsp;&nbsp;"testPolicyId": 2,    
&nbsp;&nbsp;&nbsp;&nbsp;"folderId": 1037,  
&nbsp;&nbsp;&nbsp;&nbsp;"name": "Scan01",    
&nbsp;&nbsp;&nbsp;&nbsp;"description": "Scanning the application 1",  
&nbsp;&nbsp;&nbsp;&nbsp;"contact": "User1",  
&nbsp;&nbsp;&nbsp;&nbsp;"StartingUrl": "https://demo.testfire.net",  
&nbsp;&nbsp;&nbsp;&nbsp;"LoginMethod":"Automatic",  
&nbsp;&nbsp;&nbsp;&nbsp;"LoginUsername": "jsmith",  
&nbsp;&nbsp;&nbsp;&nbsp;"LoginPassword": "demo123",  
&nbsp;&nbsp;&nbsp;&nbsp;"TestOptimization": 3,  
&nbsp;&nbsp;&nbsp;&nbsp;"scanTypeId": 3,  
&nbsp;&nbsp;&nbsp;&nbsp;"serverId":2,  
&nbsp;&nbsp;&nbsp;&nbsp;"additionalDomains": "abc.com,xyz.com",  
&nbsp;&nbsp;&nbsp;&nbsp;"createApplication":true,  
&nbsp;&nbsp;&nbsp;&nbsp;"run":true,  
&nbsp;&nbsp;&nbsp;&nbsp;"alertSubscription":{  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"subscriberIds": "1,2",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"eventType": "1,2,3"  
&nbsp;&nbsp;&nbsp;&nbsp;},  
&nbsp;&nbsp;&nbsp;&nbsp;"scanSchedule":{  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"enableSchedule": true,  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"scheduleStartDate": "2022/06/14 6:30 PM",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"scheduleEndDate": "2022/06/15 6:30 PM",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"scheduleFrequency": {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"minutes": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"hourly": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"daily": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"weekly": "2;3,5;1:45PM",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"monthly": ""  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;},  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"enableExclusion": false,  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"exclusionStartDate": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"exclusionEndDate": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"exclusionFrequency": {  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"daily": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"weekly": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"monthly": ""  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;},  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"exclusionStartTime": "",  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;"exclusionEndTime": ""  
&nbsp;&nbsp;&nbsp;&nbsp;}  
}  

----------------------------------------------------------------------  
- templateId (Required): Id of the template.  
- testPolicyId (Required): Id of the test policy.  
- folderId (Required): Id of the folder where the scan job needs to be saved.  
- name (Required): Name for a scan job.  
- description (Optional): A small description of a scan job.  
- contact (Optional): A contact name for a scan job.  
- StartingUrl (Optional): Starting URL of the target application.  
- LoginMethod (Optional): Manual/Automatic/None  
&nbsp;&nbsp;&nbsp;&nbsp;Manual - Use the uploaded login file recording to login to a target application.  
&nbsp;&nbsp;&nbsp;&nbsp;Automatic - Use the supplied username and password to login to a target application.   
&nbsp;&nbsp;&nbsp;&nbsp;None - There is no need to login to a target application to complete the scan.  
- LoginUsername (Optional): User name or User Id to login to a target application. This is used only if the login method is set to 'Automatic'.  
- LoginPassword (Optional): Password for a target application. This is used only if the login method is set to 'Automatic'.  
- TestOptimization (Optional):  
&nbsp;&nbsp;&nbsp;&nbsp;0 - No optimization  
&nbsp;&nbsp;&nbsp;&nbsp;1 - Fast  
&nbsp;&nbsp;&nbsp;&nbsp;2 - Faster  
&nbsp;&nbsp;&nbsp;&nbsp;3 - Fastest  
- scanTypeId (Optional):  
&nbsp;&nbsp;&nbsp;&nbsp;1 - Full Scan (Explore and Test)  
&nbsp;&nbsp;&nbsp;&nbsp;2 - Explore Only  
&nbsp;&nbsp;&nbsp;&nbsp;3 - Test Only  
- serverId (Optional): Id of the Agent/Scanner.  
- additionalDomains (Optional): The domain of the starting URL is included by default. If additional domains need to be considered for a scan, provide them separated by a comma.  
- applicationId: Id of the application for a scan to be associated with.    
- createApplication (Optional): true/false. If the application Id is not provided and if this value is set to true a new application is created and the scan created would be associated with it.   
- run (Optional): true/false. The value true starts the scan job after the creation.  
- alertSubscription (Optional): Sends notification email to subscribers for configured events.  
&nbsp;&nbsp;&nbsp;&nbsp;subscriberIds - Ids of users to receive email alerts. User Ids are separated by a comma.   
&nbsp;&nbsp;&nbsp;&nbsp;eventType -  EventIds for which you want to configure Alerts.  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;1 - Started  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;2 - Suspended  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;3 - Ended  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;4 - Cancelled  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;5 - Resumed  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;6 - Completed  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;7 - Failed to complete   
- scanSchedule (Optional):  
&nbsp;&nbsp;&nbsp;&nbsp;enableSchedule- true to enable the schedule, false to disable  
&nbsp;&nbsp;&nbsp;&nbsp;scheduleStartDate- Schedule Start Date in format yyyy/MM/dd hh:mm a | Example: 2018/02/21 4:30 PM  
&nbsp;&nbsp;&nbsp;&nbsp;scheduleEndDate- Schedule End Date in format yyyy/MM/dd hh:mm a | Example: 2018/03/21 4:30 PM | Optional  
&nbsp;&nbsp;&nbsp;&nbsp;scheduleFrequenc-y: To specify the frequency of the schedule. The first option with value will be selected as the frequency.  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;minutes- Ex: To run a scan every 45 mins, "minutes": "45"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;hourly- Ex:  To run a scan every 2 hours 35 mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;daily- Ex:  To run a scan every 2 hours 35 mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;weekly- Ex: To run a scan every 2 hours 35 mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;monthly- Ex: To run scan every 2 hours 35mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;exclusionStartTime- Exclusion start time to avoid scan running during this time | Format: h:mm a | Example 5:00 AM  
&nbsp;&nbsp;&nbsp;&nbsp;enableExclusion- true to enable exclusion, false to disable  
&nbsp;&nbsp;&nbsp;&nbsp;exclusionStartDate- Exclusion Start Date in format yyyy/MM/dd hh:mm a | Example: 2018/02/21 4:30 PM  
&nbsp;&nbsp;&nbsp;&nbsp;exclusionEndDate- Exclusion End Date in format yyyy/MM/dd hh:mm a | Example: 2018/03/21 4:30 PM | Optional  
&nbsp;&nbsp;&nbsp;&nbsp;exclusionFrequency- To specify the frequency of the exclusion. The first option with value will be selected as the frequency.  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;daily- Ex:  To run a scan every 2 hours 35 mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;weekly- Ex: To run a scan every 2 hours 35 mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;monthly- Ex: To run a scan every 2 hours 35 mins, "hourly": "2;35"  
&nbsp;&nbsp;&nbsp;&nbsp;exclusionStartTime- Exclusion start time to avoid scan running during this time | Format: h:mm a | Example 5:00 AM  
&nbsp;&nbsp;&nbsp;&nbsp;exclusionEndTime- Exclusion end time to end the scan block time | Format: h:mm a | Example 6:00 AM  
