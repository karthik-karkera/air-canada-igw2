var constants = {
	ASE_API_GATEWAY: "appScan-issue-gateway-2",
	LOG_LEVEL: "debug",
	LOG_APPENDER1: "out",
	LOG_APPENDER2: "app",
	CONTEXT_URL: "/ase/api",
	SWAGGER_CONTEXT_URL: "/ase/api/swagger",
	SWAGGER_PAGE_URL: "Swagger page URL is - ",
	START_SERVER_MSG: "Server started.....",
	AUTH_TOKEN: "auth-token",
	TOKEN_ABSENT: "Token does not exist or invalid token",
	TOKEN_EXPIRY_TIME: 43200, //JWT expiry time is 12 hours (3600 x 12)
	JWT_SECRET_KEY: "2022_token_for_ase_for_IGW_Integration",
	CONTEXT_API: "/api",
	SWAGGER_VERSION: "1.0.0",

	//ASE APIs
	ASE_API_KEYLOGIN: "/api/keylogin/apikeylogin",
	ASE_SCAN_DETAILS: "/api/jobs/{JOBID}",
	ASE_ISSUES_APPLICATION: "/api/issues?query=Application%20Name%3D{APPNAME}&compactResponse=false",
	ASE_APPLICATION_DETAILS: "/api/applications/{APPID}",
	ASE_ISSUE_DETAILS: "/api/issues/{ISSUEID}/application/{APPID}/",
	ASE_UPDATE_ISSUE: "/api/issues/{ISSUEID}/",
	ASE_GET_HTML_ISSUE_DETAILS: "/api/issues/details_v2?appId={APPID}&ids=[\"{ISSUEID}\"]",
	ASE_JOB_SEARCH: "/api/jobs/search",

	//JIRA APIs
	JIRA_PING_API: "/rest/api/latest/mypermissions",
	JIRA_ATTACH_FILE: "/rest/api/latest/issue/{JIRAID}/attachments",
	JIRA_CREATE_TICKET: "/rest/api/latest/issue",

	INVALID_ADMIN_EMAIL: "Invalid admin email",
	INVALID_ADMIN_PASSWORD: "Invalid admin password",
	INVALID_PROVIDER_ID: "Invalid Provider Id",
	INVALID_SYNC_INTERVAL: "Invalid Sync Interval",
	INVALID_APP_ID: "Invalid application Id",
	INVALID_JOB_ID: "Invalid job Id",
	INVALID_MAX_ISSUES_VALUE: "Invalid max issues value",
	INVALID_ISSUE_STATES: "Invalid issue states",
	INVALID_ISSUE_SEVERITIES: "Invalid issue severities",
	INVALID_IM_URL: "Invalid IM URL",
	INVALID_IM_USERNAME: "Invalid IM Username",
	INVALID_IM_PASSWORD: "Invalid IM password",
	INVALID_PROJECT_KEY: "Invalid Project Key",
	INVALID_IM_ISSUE_TYPE: "Invalid IM issue type",
	INVALID_IM_SUMMARY: "Invalid ticket summary",
	

	ERR_WRONG_CREDENTIALS: "Wrong Credentials",
	HASHING_SALT: '1ffcd164fb8efa56604a4425d14c4455',	
	DTS_JIRA: "JIRA",
	PROVIDERS: ["JIRA"],
};

module.exports = Object.freeze( constants );