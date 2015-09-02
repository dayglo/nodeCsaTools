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

	hpcsa.lookupOffering	"CSATesterOffering",
							"SIMPLE_SYSTEM",
							"Global Shared Catalog"
.then (d) ->
	log JSON.stringify d 	
.then ->
	hpcsa.lookupOffering "CSATesterOffering",
						 "SIMPLE_SYSTEM",
						 "90d9650a36988e5d0136988f03ab000f"
.then (d) ->
	log JSON.stringify d 			


