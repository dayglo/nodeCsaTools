hpcsa = require './hpcsa.js'
config = require('./config.js');

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.login	baseUrl , 
			config.csaConn.CONSUMPTION_API_USER, 
			config.csaConn.CONSUMPTION_API_PASSWORD ,
			config.csaConn.CONSUMPTION_API_TENANT ,
			config.csaConn.IDM_TRANSPORT_USER ,
			config.csaConn.IDM_TRANSPORT_PASSWORD ,
			config.csaConn.REJECT_UNAUTHORIZED 
.then () ->

	hpcsa.cancel			"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"2015-09-02T17:05:29 autotest"

	.then (d) ->
		log JSON.stringify d 	
	# .then () ->

	# 	hpcsa.cancel			config.csaConn.CONSUMPTION_API_USER, 
	# 							config.csaConn.CONSUMPTION_API_PASSWORD , 
	# 							xAuthToken, 
	# 							baseUrl,
	# 							"90d9650a36988e5d0136988f03ab000f"
	# 							"SIMPLE_SYSTEM"
	# 							"2c9030e44f895ec3014f8ec4b2262389" #get a valid id for this and test

	# 	.then (d) ->
	# 		log JSON.stringify d 	
		
