hpcsa = require './csautils.js'
config = require('./config.js');
moment = require 'moment'

newSubName = moment().format('YYYY-MM-DDTHH:mm:ss') + ' autotest'

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.loginAndGetToken 	baseUrl , 
						config.csaConn.CONSUMPTION_API_USER, 
						config.csaConn.CONSUMPTION_API_PASSWORD ,
						config.csaConn.CONSUMPTION_API_TENANT ,
						config.csaConn.IDM_TRANSPORT_USER ,
						config.csaConn.IDM_TRANSPORT_PASSWORD ,
						config.csaConn.REJECT_UNAUTHORIZED 
.then (xAuthToken) ->

	hpcsa.order				"Global Shared Catalog"
							"SIMPLE_SYSTEM"
							"CSATesterOffering",
							{},
							newSubName
	.then (d) ->
		log JSON.stringify d 	
	
