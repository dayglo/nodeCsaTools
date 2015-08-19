// CSA library config file.

config = {
	"csaConn":{
		"CONSUMPTION_API_USER":"consumer",
		"CONSUMPTION_API_PASSWORD":"cloud",
		"CONSUMPTION_API_TENANT":"CSA_CONSUMER",
		"CSA_TRANSPORT_USER":"csaTransportUser",
		"CSA_TRANSPORT_PASSWORD":"csaTransportUser",
		"IDM_TRANSPORT_USER":"idmTransportUser",
		"IDM_TRANSPORT_PASSWORD":"idmTransportUser",
		"REJECT_UNAUTHORIZED" : false,
		"CSA_API_HOST": "vm01",
		"CSA_API_PORT": "8444",
	},
	"creds": {}
}

config.creds.inboundUser = "ooInboundUser";
config.creds.inboundPass = "ooInboundUser";
config.creds.legacyApiUser = "admin"


//==============================================================================
//do not edit after this section
//==============================================================================


config.csaConn.CONSUMPTION_API_URL = "https://" + config.csaConn.CSA_API_HOST + ":" + config.csaConn.CSA_API_PORT + "/csa/api";
config.csaConn.CONSUMPTION_API_IDM = "https://" + config.csaConn.CSA_API_HOST + ":" + config.csaConn.CSA_API_PORT + "/idm-service/v2.0/tokens";
config.csaConn.CSA_URI             = "https://" + config.csaConn.CSA_API_HOST + ":" + config.csaConn.CSA_API_PORT

config.csaConn.credentialData = {
	passwordCredentials:{
		username: config.csaConn.CONSUMPTION_API_USER,
		password: config.csaConn.CONSUMPTION_API_PASSWORD },
	tenantName: config.csaConn.CONSUMPTION_API_TENANT
}

config.csaConn.httpOptions = {
	rejectUnauthorized : config.csaConn.REJECT_UNAUTHORIZED,
	username: config.csaConn.CONSUMPTION_API_USER,
	password: config.csaConn.CONSUMPTION_API_PASSWORD
}

config.csaConn.IdmCallOptions = {
	rejectUnauthorized : config.csaConn.REJECT_UNAUTHORIZED,
	username : config.csaConn.IDM_TRANSPORT_USER,
	password : config.csaConn.IDM_TRANSPORT_PASSWORD
}

// for legacy support
config.creds.u = config.csaConn.CONSUMPTION_API_USER;
config.creds.pw = config.csaConn.CONSUMPTION_API_PASSWORD;
config.creds.org = config.csaConn.CONSUMPTION_API_TENANT;
config.creds.idmU = config.csaConn.IDM_TRANSPORT_USER;
config.creds.idmPw = config.csaConn.IDM_TRANSPORT_PASSWORD;
config.creds.host = config.csaConn.CSA_API_HOST;
config.creds.adminPort = config.csaConn.CSA_API_PORT;
config.creds.baseUrl = [config.csaConn.CSA_URI , '/'].join('');

module.exports = config