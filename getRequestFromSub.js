creds = require('./creds');
csautils = require('./csautils');
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

csautils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
.then(function(xAuthToken){
	console.log( 'xauthtoken: \n\n' + xAuthToken + '\n');

	return csautils.getSubIdFromRequest(creds.u, creds.pw , baseUrl ,xAuthToken)({subName: subName , reqId: requestId})
}).then(function(reqData){
	
	console.log(chalk.green(' Found! ') + reqData.subId);
} , function(err){
	console.log(chalk.red(' ERROR: ' + err))
})
