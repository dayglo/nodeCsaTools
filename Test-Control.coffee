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
							"Auto Test Subscription"
							"Server"
							"Reboot Server"
	.then (d) ->
		log JSON.stringify d
	.then () ->
		hpcsa.control		config.csaConn.CONSUMPTION_API_USER, 
							config.csaConn.CONSUMPTION_API_PASSWORD , 
							xAuthToken, 
							baseUrl,
							"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"2c9030e44f888b73014f88da442804b8" 
							"Server"
							"Reboot Server"
	.then (d) ->
		log JSON.stringify d
	
#TODO: Need to somehow make sure we're differentiating between subs with the same names, or throw error.