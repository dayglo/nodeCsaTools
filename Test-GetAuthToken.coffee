hpcsa = require './csautils.js'
config = require('./config.js');

baseUrl = config.csaConn.CSA_URI + "/";

log = (text) -> 
	console.log text

hpcsa.loginAndGetToken baseUrl , config.csaConn.credentialData ,config.csaConn.IdmCallOptions
.then log
