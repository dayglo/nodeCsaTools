hpcsa = require './csautils.js'
config = require('./config.js');

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.loginAndGetToken baseUrl , config.csaConn.credentialData ,config.csaConn.IdmCallOptions
.then (xAuthToken) ->

	hpcsa.lookupOffering	config.csaConn.CONSUMPTION_API_USER, 
							config.csaConn.CONSUMPTION_API_PASSWORD , 
							baseUrl,
							xAuthToken, 
							"CSATesterOffering",
							"SIMPLE_SYSTEM"
							"Global Shared Catalog"
	.then (d) ->
		log JSON.stringify d 	
	.then ->
		hpcsa.lookupOffering	config.csaConn.CONSUMPTION_API_USER, 
							config.csaConn.CONSUMPTION_API_PASSWORD , 
							baseUrl,
							xAuthToken, 
							"CSATesterOffering",
							"SIMPLE_SYSTEM"
							"90d9650a36988e5d0136988f03ab000f"
	.then (d) ->
		log JSON.stringify d 			


