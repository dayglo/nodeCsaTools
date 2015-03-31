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

function buildRequestOptions(doc){
	
	var list = [];
   	return doc.fields.reduce(function(prev,curr){
        prev.fields[curr.id] = curr.value;
        return prev
   	},{fields:{}})

}


debugger;

function createParallelTask(tasks,desc) {
	return function(){
		return new Promise(function(resolve,reject) {

			console.log('executing ' + desc);

			var executingTasks = tasks.map(function(task) {
				return task();
			})

			return Promise.all(executingTasks)
			.then(function(data){
				debugger;
				console.log (desc + ' executed');
				resolve('one of ' + desc + ' worked');
			},function(err){
				console.log (desc + ' did not work '+ err);
				reject(desc + ' - ' + err);
			})
		});
	}
}

//${TPCLOUD_CONSUMPTION_API_URL}/mpp/mpp-request/${tpcloudOfferingIdentifier}?catalogId=${tpcloudCatalogIdentifier}

offeringId = '2c9030e44c4645c1014c55f364b60d6d'; 
catalogId = '90d9650a36988e5d0136988f03ab000f';

subscriptionRequestUrl = baseUrl + 'csa/api/mpp/mpp-request/' + offeringId + '?catalogId=' + catalogId;
offeringUrl = baseUrl + 'csa/api/mpp/mpp-offering/' + offeringId + '?catalogId=' + catalogId + '&category=SOFTWARE';

var myHttpOptions = httpOptions;
myHttpOptions.headers = { 'Accept': 'application/json' };


csaUtils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
.then(function(xAuthToken){

	myHttpOptions.headers['X-Auth-Token'] = xAuthToken;

	return rest.get(offeringUrl , myHttpOptions)
	.spread(function(data){

		debugger;

		var subRequestOptions = myHttpOptions;
		subRequestOptions.headers['Content-Type'] = 'multipart/form-data; boundary=ftbydrydrtybtyd';
		subRequestOptions.headers['X-Auth-Token'] = xAuthToken;

		var suboptions = JSON.stringify(buildRequestOptions(data));
		var suboptionsStripped = suboptions.substr(1,suboptions.length - 2); // urgh
		var payload = ""+
			'--ftbydrydrtybtyd\n'+
			'Content-Disposition: form-data; name="requestForm"\n'+
			'\n'+
			'{\n'+
			'  "categoryName": "ACCESSORY",\n'+
			'  "subscriptionName": "test bulk",\n'+
			'  "startDate": "'+  moment().format() +'",\n'+
			suboptionsStripped + ',\n'+
			'  "action": "ORDER"\n'+
			'}\n'+
			'\n'+
			'--ftbydrydrtybtyd--\n'

			payload = '{  "categoryName": "ACCESSORY",  "subscriptionName": "Virtual Linux Server v01.00 (1.0.0)",  "startDate": "2015-03-30T10:47:42.000Z",  "fields": {    "field_2c9030e44c4645c1014c55f364b60d7b": true,    "field_2c9030e44c4645c1014c55f364b70d83": "1",    "field_2c9030e44c4645c1014c55f364b60d7f": "2",    "field_2c9030e44c4645c1014c55f364b60d70": true,    "field_2c9030e44c4645c1014c55f364b70d86": 4,    "field_2c9030e44c4645c1014c55f364b60d74": 1  },  "action": "ORDER"}';


// 		var tasks = new Array();
// 		for (var i = 0 ; i < 10 ; i++) {
			
// 			tasks.push(csaUtils.getTask(xAuthToken, payload , subscriptionRequestUrl , subRequestOptions , " creating sub " + i ));

// 		}



// 		parallelTasks = createParallelTask(tasks , "ten parallel tasks");

// debugger;
// 		parallelTasks();


		var allParallelTasks = new Array()
		var chunks = 200;
		var tasksPerChunk = 10;

		for (var i = 0 ; i < chunks ; i++) {
			var tasks = new Array();
			for (var j = 0 ; j < tasksPerChunk ; j++) {
				tasks.push(csaUtils.getTask(xAuthToken, payload , subscriptionRequestUrl , subRequestOptions , " creating sub " + i + '.' + j));
			}
			allParallelTasks.push( createParallelTask(tasks , "some parallel tasks") )
		}

		debugger;




		 //kick off the promise chain! 
		return allParallelTasks.reduce(Q.when, Q('a')).done();






	},function(err){
		console.log("error in main " + err)
		debugger;
	}).then(function(data){
		onsole.log("final " + data)
		debugger;
	})

},function(err){
		debugger;
})