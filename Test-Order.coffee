hpcsa = require './csautils.js'
config = require('./config.js');
moment = require 'moment'

newSubName = moment().format('YYYY-MM-DDTHH:mm:ss') + ' autotest'

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.loginAndGetToken baseUrl , config.csaConn.credentialData ,config.csaConn.IdmCallOptions
.then (xAuthToken) ->

	hpcsa.order				config.csaConn.CONSUMPTION_API_USER, 
							config.csaConn.CONSUMPTION_API_PASSWORD , 
							xAuthToken, 
							baseUrl,
							"Global Shared Catalog"
							"SIMPLE_SYSTEM"
							"CSATesterOffering",
							{},
							newSubName
	.then (d) ->
		log JSON.stringify d 	
	
