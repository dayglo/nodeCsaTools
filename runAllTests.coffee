hpcsa = require './csautils.js'
config = require './config.js'
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

.then () ->
	log "================================================="
	log "initiating offering lookup"
	log "================================================="

	hpcsa.lookupOffering	"CSATesterOffering",
							"SIMPLE_SYSTEM"
							"Global Shared Catalog"
	.then (d) ->
		log JSON.stringify d 	
	.then ->
		hpcsa.lookupOffering	"CSATesterOffering",
								"SIMPLE_SYSTEM",
								"90d9650a36988e5d0136988f03ab000f"
	.then (d) ->
		log JSON.stringify d 			

	.then () ->
		log "================================================="
		log "initiating order"
		log "================================================="

		hpcsa.order		"Global Shared Catalog",
						"SIMPLE_SYSTEM",
						"CSATesterOffering",
						{},
						newSubName
	.then (d) ->
		log JSON.stringify d 
		log "done order"
		log "================================================="	

	.then () ->
		log "================================================="
		log "initiating modify"
		log "================================================="
		hpcsa.modify	"90d9650a36988e5d0136988f03ab000f",
						"SIMPLE_SYSTEM",
						newSubName,
						{CPU: 5}
	.then (d) ->

		log JSON.stringify d
		log "done modify"
		log "================================================="
	.then () ->
		log "initiating control"
		log "================================================="
		hpcsa.control	"90d9650a36988e5d0136988f03ab000f",
						"SIMPLE_SYSTEM",
						newSubName,
						"Server",
						"Reboot Server"
	.then (d) ->
		log "initiating cancel"
		log "================================================="
		log JSON.stringify d
		hpcsa.cancel		"90d9650a36988e5d0136988f03ab000f",
							"SIMPLE_SYSTEM",
							newSubName

	.then (d) ->
		log JSON.stringify d
		log "done cancel"
		log "================================================="
			