hpcsa = require './csautils.js'
config = require('./config.js');

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.loginAndGetToken baseUrl , config.csaConn.credentialData ,config.csaConn.IdmCallOptions
.then (xAuthToken) ->

	hpcsa.modify			config.csaConn.CONSUMPTION_API_USER, 
							config.csaConn.CONSUMPTION_API_PASSWORD , 
							xAuthToken, 
							baseUrl,
							"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"Test subscription"
							{},
	.then (d) ->
		log JSON.stringify d 	
	


#username, password, xAuthToken , baseUrl , catalogId, categoryName ,  subName ,newInputData