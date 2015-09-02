hpcsa = require './hpcsa.js'
config = require('./config.js');
moment = require 'moment'

newSubName = moment().format('YYYY-MM-DDTHH:mm:ss') + ' autotest'

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
.then (xAuthToken) ->
	log "initiating control"

	hpcsa.control			"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"Auto Test Subscription"
							"Server"
							"Reboot Server"
	.then (d) ->
		log JSON.stringify d
	.then () ->
		hpcsa.control		"90d9650a36988e5d0136988f03ab000f"
							"SIMPLE_SYSTEM"
							"2c9030e44f888b73014f88da442804b8" 
							"Server"
							"Reboot Server"
	.then (d) ->
		log JSON.stringify d
	
#TODO: Need to somehow make sure we're differentiating between subs with the same names, or throw error.