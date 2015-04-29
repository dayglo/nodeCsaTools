creds = require('./creds');
csaUtils = require('./csaUtils');
Q = require('q');
chalk = require('chalk');
_ = require('lodash');


var argv = require('minimist')(process.argv.slice(2));
subName  = argv._[0];
requestId  = argv._[1];

var baseUrl = creds.baseUrl; // this format "https://vm01:8444/"

var credentialData = {
	"passwordCredentials" :
	{
		"username" : creds.u,
		"password" : creds.pw
	},
	"tenantName" : creds.org
};

IdmCallOptions = {
	rejectUnauthorized : false,
	username: creds.idmU,
	password: creds.idmPw
}

console.log(Date())

csaUtils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
.then(function(xAuthToken){
	console.log( 'xauthtoken: \n\n' + xAuthToken + '\n');

	return csaUtils.getSubIdFromRequest(creds.u, creds.pw , xAuthToken, baseUrl )(subName, requestId)
}).then(function(foundSubId){
	
	console.log(chalk.green(' Found! ') + foundSubId);
} , function(err){
	console.log(chalk.red(' ERROR: ' + err))
})

