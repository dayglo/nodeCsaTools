creds = require('./creds');
csautils = require('./csautils');
uploadFile = require('./uploadFile');
Q = require('q');
chalk = require('chalk');

var argv = require('minimist')(process.argv.slice(2));
subId  = argv._[0];
catalogId  = argv._[1];
categoryName  = argv._[2];




var baseUrl = creds.baseUrl; // this format "https://vm01:8444/"

var credentialData = {
	"passwordCredentials" :
	{
		"username" : creds.u,
		"password" : creds.pw
	},
	"tenantName" : creds.org
};
httpOptions = {
	rejectUnauthorized : false,
	username: creds.u,
	password: creds.pw
}
IdmCallOptions = {
	rejectUnauthorized : false,
	username: creds.idmU,
	password: creds.idmPw
}


function modifySub(subId , catalogId , categoryName , newInputData) {

	subscriptionUrl = baseUrl + 'csa/api/mpp/mpp-subscription/' + subId + '/modify';

	csautils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
	.then(function(xAuthToken){

		console.log( 'xauthtoken: \n\n' + xAuthToken + '\n');

		var myHttpOptions = httpOptions;
		myHttpOptions.headers = { 'Accept': 'application/json' };
		myHttpOptions.headers['X-Auth-Token'] = xAuthToken;

		return rest.get(subscriptionUrl , myHttpOptions)
		.spread(function(subData){

			return csautils.submitRequestAndWaitForCompletion(creds.u, creds.pw, "MODIFY_SUBSCRIPTION" , baseUrl ,subId , catalogId, categoryName, subData , newInputData , subData.name , xAuthToken )();

		},function(err){
			console.log("error in main " + err)
		}).then(function(data){
			console.log("Finished.")
		})

	},function(err){
			debugger;
	})
}

var newInputData = {
	"VCPU": 10,
	"MEMORY" : 10
}

modifySub(subId  , catalogId , categoryName , newInputData)