hpcsa = require './csautils.js'
config = require('./config.js');

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.loginAndGetToken baseUrl , config.csaConn.credentialData ,config.csaConn.IdmCallOptions
.then (xAuthToken) ->
	log "initiating control"

	hpcsa.control			config.csaConn.CONSUMPTION_API_USER, 
							config.csaConn.CONSUMPTION_API_PASSWORD , 
							xAuthToken, 
							baseUrl,
							"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"Test subscription"
							"Server"
							"Reboot Server"
	.then (d) ->
		log JSON.stringify d
	
