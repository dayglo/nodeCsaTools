hpcsa = require './hpcsa.js'
config = require('./config.js');

log = (text) -> 
	console.log text

hpcsa.login	config.csaConn.CSA_URI,
			config.csaConn.CONSUMPTION_API_USER, 
			config.csaConn.CONSUMPTION_API_PASSWORD ,
			config.csaConn.CONSUMPTION_API_TENANT ,
			config.csaConn.IDM_TRANSPORT_USER ,
			config.csaConn.IDM_TRANSPORT_PASSWORD ,
			config.csaConn.REJECT_UNAUTHORIZED 
	.then log
