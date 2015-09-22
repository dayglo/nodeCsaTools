hpcsa = require './hpcsa.js'
config = require './config.js'
prettyjson = require 'prettyjson'

log = (text) ->

	console.log prettyjson.render JSON.parse text 


hpcsa.login	config.csaConn.CSA_URI,
			config.csaConn.CONSUMPTION_API_USER, 
			config.csaConn.CONSUMPTION_API_PASSWORD ,
			config.csaConn.CONSUMPTION_API_TENANT ,
			config.csaConn.IDM_TRANSPORT_USER ,
			config.csaConn.IDM_TRANSPORT_PASSWORD ,
			config.csaConn.REJECT_UNAUTHORIZED 
.then () ->
	hpcsa.getOptionModels	"CSA"
.then (d) ->
	debugger;
	log JSON.stringify d 	
