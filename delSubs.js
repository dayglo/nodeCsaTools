creds = require('./creds');
csautils = require('./csautils');

var argv = require('minimist')(process.argv.slice(2));
subNameFilter  = argv._[0];

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



function delSubs(username, password, baseUrl, subNameFilter) {

	return csautils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
	.then(function(xAuthToken){

		console.log("\n\n" + xAuthToken + "\n\n")

		var subscriptionGetter    = csautils.createSubscriptionGetter(username, password, baseUrl, xAuthToken);
		var subscriptionCanceller = csautils.createSubscriptionCanceller(username, password, baseUrl , xAuthToken);
		var subscriptionDeleter = csautils.createSubscriptionDeleter(username, password, baseUrl , xAuthToken);
		var requestDeleter = csautils.createRequestDeleter(username, password, baseUrl , xAuthToken);


		return subscriptionGetter(subNameFilter)
		.then(subscriptionCanceller)
		.then(subscriptionDeleter)
		.then(requestDeleter);

	})
}

delSubs(creds.u, creds.pw, baseUrl , subNameFilter)
.then(function(data) {
	console.log(data);
})