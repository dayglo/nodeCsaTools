require('es6-promise').polyfill();
rest = require('restler-q').spread;
creds = require('./creds');
csaUtils = require('./csaUtils');
uploadFile = require('./uploadFile');
Q = require('q');
chalk = require('chalk');
var glob = require("glob");
var fs = require('fs');

var ncp = require('ncp').ncp;
var moment = require('moment');

console = require('better-console');

//q = require ('q');
//var authString = enc(u + ":" + pw);
var baseUrl = "https://vm01:8444/";
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



function bulksub(offeringId , catalogId , categoryName) {

	offeringUrl = baseUrl + 'csa/api/mpp/mpp-offering/' + offeringId + '?catalogId=' + catalogId + '&category=' + categoryName;

	csaUtils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
	.then(function(xAuthToken){

		console.log( 'xauthtoken: \n\n' + xAuthToken + '\n');

		var myHttpOptions = httpOptions;
		myHttpOptions.headers = { 'Accept': 'application/json' };
		myHttpOptions.headers['X-Auth-Token'] = xAuthToken;

		return rest.get(offeringUrl , myHttpOptions)
		.spread(function(offeringData){

			var allParallelTasks = new Array();
			var chunks = 2
			var tasksPerChunk = 5;

			for (var i = 0 ; i < chunks ; i++) {
				var tasks = new Array();
				for (var j = 0 ; j < tasksPerChunk ; j++) {

					tasks.push(csaUtils.requestSubscription(creds.u, creds.pw, baseUrl ,offeringId , catalogId, categoryName, offeringData ,  "bulk test " + i + '.' + j , xAuthToken ));
					//tasks.push(csaUtils.sendForm(creds.u,creds.pw,subscriptionRequestUrl,xAuthToken ));
				}
				allParallelTasks.push( csaUtils.createParallelTask(tasks , "a chunk of " + tasksPerChunk + " parallel tasks") )
			}

			 //kick off the promise tree! 
			return allParallelTasks.reduce(Q.when, Q('a')).done();

		},function(err){
			console.log("error in main " + err)
		}).then(function(data){
			console.log("done.")
		})

	},function(err){
			debugger;
	})
}


bulksub( '2c9030074c745ae6014c74c0ba370b76' , '2c9030e44b77dd62014b7de363b82048' , 'SOFTWARE' );





