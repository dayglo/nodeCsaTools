//csautils

require('es6-promise').polyfill();
require('prfun');
rest = require('restler-q').spread;
var S = require('string');
var request = require('request');
var moment = require('moment');

csaUtils = {}
 
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

csaUtils.getPropertyPayload = function (global_id, name , value, type) {

	type = type.toUpperCase();

	if (  Array.isArray(value) ) {
		type = "LIST"
	}

	if (type == "INTEGER") {
		type = "NUMBER"
	}

	var payload = {
			"@type": "",
			"description": "",
			"ext": {
					"csa_confidential": false,
					"csa_consumer_visible": true,
					"csa_critical_system_object": false,
					"csa_name_key": name
			},
			"global_id": null,
			"name": name,
			"owner": {
					"global_id": global_id
			},
			"ownership": null,
			"property_type": type,
			"property_value": value
	}

	if (type == "LIST") {

		var values = value.map(function(v){
			return {
			"value_type" : "STRING",
			"value" : v,
			"name" : v,
			"description" : ""
			}
		});

		payload.property_value = values;
	} 

	return payload;
}

csaUtils.getComponentPayload = function ( name , description , consumerVisible) {   
		var propName = name.toUpperCase().replace(' ','');

		return {
			"global_id": null,
			"@type": "",
			"name": name,
			"description": description,
			"icon": "/csa/api/blobstore/other.png?tag=library",
			"ext": {
				"csa_critical_system_object": false,
				"csa_name_key": propName,
				"csa_consumer_visible": consumerVisible,
				"csa_pattern": false,
				"csa_parent": null
			}
		}
}

csaUtils.loginAndGetToken =  function (baseUrl , credentialData ,IdmCallOptions) {

	return new Promise(function(resolve, reject) {
		console.log('Authenticating...');

		rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
		.spread(
			function(data){
				console.log("got token.");
				resolve(data.token.id);
			},
			function(data){
				reject(Error(data.code));       
			}
		);

	});  
}

csaUtils.getTask = function (xAuthToken , payload, url ,httpOptions, desc) {
	return function(){

		return new Promise(function(resolve, reject) {
			console.log(desc);
			rest.postJson(url , payload , httpOptions)
			.spread(
				function(data){
					debugger;
					console.log("     ok!")
					resolve(data);


				},
				function(data){
					debugger;

					if (data.code == "PropertyNameUniquenessError") {
						console.log("     already exists") ;  
						resolve("PropertyNameUniquenessError");

					}else if (S(data).contains('HTTP Status 415')) {
						console.log("     result: failed with 415") ;  
						resolve("failed with 415");

					} else {
						console.log(data);
						reject(Error(data.code));
					}       
				}
				);

		});
	}
}


csaUtils.createParallelTask = function(tasks,desc) {
	return function(){
		return new Promise(function(resolve,reject) {

			console.log('executing ' + desc);

			var executingTasks = tasks.map(function(task) {
				return task();
			})

			return Promise.all(executingTasks)
			.then(function(data){
				console.log (desc + ' executed');
				resolve('one of ' + desc + ' worked');
			},function(err){
				console.log (desc + ' did not work '+ err);
				reject(desc + ' - ' + err);
			})
		});
	}
}


function buildRequestOptions(doc){
	
	var list = [];
		return doc.fields.reduce(function(prev,curr){
				prev.fields[curr.id] = curr.value;
				return prev
		},{fields:{}})

}

function pollRequest(username, password, baseUrl, xAuthToken , retry) {  
	return function(reqData){
		if(!retry) retry = 5;
		if(!retry--) throw new Error('Too many retries');

		return Promise.resolve(reqData)
		.then(getRequestStatus(username, password, baseUrl, xAuthToken ))
		.then(function(requestData) {
			debugger
			if(requestData.requestState === 'REJECTED') throw new Error("the request "+ reqData.reqId +" was rejected by CSA");
			if(requestData.requestState === 'COMPLETED') return requestData;

			return Promise.delay(reqData, getRandomInt(5000,20000) ).then(pollRequest(username, password, baseUrl, xAuthToken , retry));
		});
	}
}


function getRequestStatus(username, password, baseUrl, xAuthToken ) {
	return function(reqData){
		return new Promise(function(resolve, reject) {
				var desc = "    checking progress on request " + reqData.reqId;
				console.log(desc);

				var authString = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

				var headers = {
					"Authorization" : authString,
					"X-Auth-Token" : xAuthToken
				};

				var options = {
					rejectUnauthorized: false,
					url: baseUrl + 'csa/api/mpp/mpp-request/' + reqData.reqId + '?catalogId=' + reqData.catalogId,
					headers:headers
				};

				request.get(options, function optionalCallback(err, httpResponse, body) {
					if (err) {
						console.log('       failure while ' + err.message);
						reject(Error('       failure while ' + err.message)); 
					} else {
						resolve(JSON.parse(body));
					}
			});
		})
	}
}


function sendSubscriptionRequest(username,password,url,xAuthToken, requestObject , desc , catalogId){
	return function(){
		return new Promise(function(resolve, reject) {

			var authString = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

			var headers = {
				"Authorization" : authString,
				"X-Auth-Token" : xAuthToken
			};

			var formData = {
				requestForm : JSON.stringify(requestObject)
			};

			var options = {
				method: 'POST',
				headers: headers,
				rejectUnauthorized: false,
				url: url,
				formData: formData
			};

			request.post(options, function optionalCallback(err, httpResponse, body) {
				if (err) {
					console.log('  failed to ' + desc + '-' + err.message);
					reject(Error('failed to ' + desc + '-' + err.message)); 
				} else {
					var reqId = JSON.parse(body).id;
					console.log('  success: ' + desc + ' - Request ID:' + reqId )
					resolve({reqId:reqId , catalogId:catalogId} );
				}
			});

		});
	}
}

csaUtils.requestSubscription = function (username, password, baseUrl , offeringId , catalogId, categoryName, offeringData , subName , xAuthToken ) {
	return function(){

		var desc = " creating sub :" + subName;
		var subscriptionRequestUrl = baseUrl + 'csa/api/mpp/mpp-request/' + offeringId + '?catalogId=' + catalogId;
		var subRequestDetails = {
			categoryName: categoryName,
			subscriptionName: subName,
			startDate:  moment().format('YYYY-MM-DDTHH:mm:ss') + '.000Z',
			fields: buildRequestOptions(offeringData).fields,
			action: "ORDER"
		}

		return sendSubscriptionRequest(username, password, subscriptionRequestUrl, xAuthToken, subRequestDetails , desc , catalogId)()
		.then(pollRequest(username, password, baseUrl, xAuthToken , 5))
		.then(function(requestData){
			console.log("  request " + requestData.id +" (subscription " + requestData.subscription.displayName + ') was successfully fulfilled');
		});
	}
}


 
module.exports = csaUtils;