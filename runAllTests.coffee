hpcsa = require './hpcsa.js'
config = require './config.js'
moment = require 'moment'
chalk = require 'chalk'

newSubName = moment().format('YYYY-MM-DDTHH:mm:ss') + ' autotest'


log = (text) -> 
	console.log text

logs = (text) -> 
	console.log JSON.stringify text

hpcsa.login 	config.csaConn.CSA_URI , 
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
.then logs	
.then () ->
	log "================================================="
	log "initiating offering model lookup"
	log "================================================="

	hpcsa.getOptionModels	"CSA"

.then logs	
.then () ->
	log "================================================="
	log "initiating offering model lookup of offering with zero options"
	log "================================================="

	hpcsa.getOptionModels	"noOptionsTest"

.then logs	
.then ->
	hpcsa.lookupOffering	"CSATesterOffering",
							"SIMPLE_SYSTEM",
							"90d9650a36988e5d0136988f03ab000f"
.then logs		
.then ->
	log "================================================="
	log "initiating order"
	log "================================================="

	hpcsa.order		"Global Shared Catalog",
					"SIMPLE_SYSTEM",
					"CSATesterOffering",
					{},
					newSubName
.then logs
.then ->
	log "done order"
	log "================================================="	

.then ->
	log "================================================="
	log "initiating modify"
	log "================================================="
	hpcsa.modify	"90d9650a36988e5d0136988f03ab000f",
					"SIMPLE_SYSTEM",
					newSubName,
					{CPU: 5}
.then logs
.then ->
	log "done modify"
	log "================================================="
.then ->
	log "initiating control"
	log "================================================="
	hpcsa.control	"90d9650a36988e5d0136988f03ab000f",
					"SIMPLE_SYSTEM",
					newSubName,
					"Server",
					"Reboot Server"
.then logs
.then ->
	log "initiating cancel"
	log "================================================="
	hpcsa.cancel		"90d9650a36988e5d0136988f03ab000f",
						"SIMPLE_SYSTEM",
						newSubName

.then logs
.then ->
	log "done cancel"
	log "================================================="
.then null , (e)->
	log chalk.red "something failed. #{e}"
		