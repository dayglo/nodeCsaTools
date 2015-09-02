hpcsa = require './hpcsa.js'
config = require('./config.js');

log = (text) -> 
	console.log text


hpcsa.login	config.csaConn.CSA_URI  
			config.csaConn.CONSUMPTION_API_USER, 
			config.csaConn.CONSUMPTION_API_PASSWORD ,
			config.csaConn.CONSUMPTION_API_TENANT ,
			config.csaConn.IDM_TRANSPORT_USER ,
			config.csaConn.IDM_TRANSPORT_PASSWORD ,
			config.csaConn.REJECT_UNAUTHORIZED 
.then () ->

	hpcsa.modify			"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"Test subscription"
							{}
.then (d) ->
	log JSON.stringify d 	
.then () ->

	hpcsa.modify			"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"2c9030e44f3fd64b014f4173135727e5" #get a valid id for this and test
							{},
	.then (d) ->
		log JSON.stringify d 	
		