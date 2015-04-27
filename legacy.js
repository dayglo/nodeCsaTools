creds = require('./creds');
csaUtils = require('./csaUtils');
Q = require('q');
chalk = require('chalk');
_ = require('lodash');


var argv = require('minimist')(process.argv.slice(2));
catalogId  = argv._[0];
serviceRequestId  = argv._[1];


userIdOptions = {
	rejectUnauthorized : false,
	username: creds.inboundUser,
	password: creds.inboundPass,
}

function tryLegacy() {

	var xpathForSubscriptionId = "/ServiceRequest/requestedAction/property[name='SUBSCRIPTION_ID']/values/value";

	csaUtils.getUserIdentifier(creds.baseUrl ,  creds.legacyApiUser ,	userIdOptions)()
	.then(function(userIdentifier){
		console.log(userIdentifier)

		var requestObjectUrl = [	
				creds.baseUrl ,
				"/csa/rest/catalog/" , 
				catalogId , 
				"/request/" , 
				serviceRequestId , 
				"?userIdentifier=" , 
				userIdentifier ]
				.join('');

		return csaUtils.queryAndExtract(requestObjectUrl ,  xpathForSubscriptionId , userIdOptions)()

	}).then(function(d){
		console.log(d)
	}
	,function(err){
		console.log(['  Failed. \n  ' , err].join(' '));
		debugger;
	})

}

tryLegacy();

