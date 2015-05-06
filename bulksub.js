

// You need this in your standalone.xml, otherwise your connections will run out before you get to 10 subs...


                    // <pool>
                    //     <min-pool-size>100</min-pool-size>
                    //     <max-pool-size>500</max-pool-size>
                    //     <prefill>true</prefill>
                    //     <use-strict-min>false</use-strict-min>
                    //     <flush-strategy>FailingConnectionOnly</flush-strategy>
                    // </pool>

// also have this:


					// <validation> <check-valid-connection-sql>select 1 from dual</check-valid-connection-sql> <validate-on-match>false</validate-on-match> </validation>




creds = require('./creds');
csautils = require('./csautils');
Q = require('q');
_ = require('lodash');


var argv = require('minimist')(process.argv.slice(2));
offeringId  = argv._[0];
catalogId  = argv._[1];
categoryName  = argv._[2];
chunks  = argv._[3];
tasksPerChunk = argv._[4];
subscriptionNamePrefix = argv._[5];


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



function bulksub(offeringId , catalogId , categoryName , chunks , tasksPerChunk , subscriptionNamePrefix) {

	offeringUrl = baseUrl + 'csa/api/mpp/mpp-offering/' + offeringId + '?catalogId=' + catalogId + '&category=' + categoryName;

	csautils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
	.then(function(xAuthToken){

		console.log( 'xauthtoken: \n\n' + xAuthToken + '\n');

		var myHttpOptions = httpOptions;
		myHttpOptions.headers = { 'Accept': 'application/json' };
		myHttpOptions.headers['X-Auth-Token'] = xAuthToken;

		return rest.get(offeringUrl , myHttpOptions)
		.spread(function(offeringData){

			var allParallelTasks = new Array();

			for (var i = 0 ; i < chunks ; i++) {
				//build an array of subscription request tasks.
				var tasks = new Array();
				for (var j = 0 ; j < tasksPerChunk ; j++) {
					var newInputData = {
						"VCPU": 5,
						"MEMORY" : 4
					}
					tasks.push(csautils.submitRequestAndWaitForCompletion(creds.u, creds.pw, "ORDER" , baseUrl ,offeringId , catalogId, categoryName, offeringData , newInputData ,  [subscriptionNamePrefix, ":" , i , '.' , j].join('') , xAuthToken ));
				}
				// create a new ubertask, which executes this chunk of tasks simultaneously.
				allParallelTasks.push( csautils.createParallelTask(tasks , "a chunk of " + tasksPerChunk + " parallel tasks") )
			}
			//promise magic to invoke all the ubertasks sequentially
			return allParallelTasks.reduce(Q.when, Q('a'))
		})

	},function(err){
		console.log('login failed.')

	})
	.then(function(data){
		console.log("done!\n\n")

		debugger;
	});;
}
// example: 
// node bulksub.js 2c9030074c745ae6014c74c0ba370b76 2c9030e44b77dd62014b7de363b82048  SOFTWARE  1  1 'my bulk request'

bulksub(offeringId , catalogId , categoryName , chunks , tasksPerChunk , subscriptionNamePrefix);





