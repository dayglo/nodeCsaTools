//csautils

require('es6-promise').polyfill();
require('prfun');
rest = require('restler-q').spread;
var S = require('string');
var request = require('request');
var moment = require('moment');
chalk = require('chalk');

_ = require('lodash');



var xpath = require('xpath'),
    dom   = require('xmldom').DOMParser,
    XMLSerializer = require('xmldom').XMLSerializer;



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

csaUtils.getUserIdentifier = function (baseUrl , user , options) {
	var url = [baseUrl ,'csa/rest/login/' , "CSA-Provider" ,  '/' , user].join('') ;
	return csaUtils.queryAndExtract(url , '/person/id' , options)
}

csaUtils.queryAndExtract =  function (url , xpath , options) {
	//for use with legacy api
	return function() {
		return new Promise(function(resolve, reject) {
			console.log(" getting url " + url);

			var authString = 'Basic ' + new Buffer(options.username + ':' + options.password).toString('base64');

			var requestOptions = {
				rejectUnauthorized: false,
				url: url,
				headers: { "Authorization" : authString }
			};

			request.get(requestOptions, function optionalCallback(err, httpResponse, body) {
				if (err)
					reject(Error(' failure requesting document. ' + err.message)); 
				else {
					var result = "";
					try {
						result = csaUtils.xpathQuery(body,xpath)
						resolve(result);
					} catch (err){
						reject(Error(' failure while querying xpath: ' + err.message)); 
					}
				}
			});
		});  
	}
}


csaUtils.getTask = function (xAuthToken , payload, url ,httpOptions, desc) {
	return function(){

		return new Promise(function(resolve, reject) {
			console.log(desc);
			rest.postJson(url , payload , httpOptions)
			.spread(
				function(data){
					console.log("     ok!")
					resolve(data);
				},
				function(data){
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
				resolve(data);
			},function(err){
				console.log (desc + ' did not work '+ err);
				reject(desc + ' - ' + err);
			})
		});
	}
}


function buildRequestOptions(doc , newInputData){
	
		return doc.fields.reduce(function(prev,curr){
			if (typeof newInputData[curr.name] !== "undefined") {
				prev.fields[curr.id] = newInputData[curr.name]
			} else {
				prev.fields[curr.id] = curr.value;
			}
			return prev;
		},{fields:{}})
}

function log(prefix){
	return function(data) {
		var result = "";
		try {
			result = JSON.stringify(data);
		}
		catch (err) {
			result = data;
		}
		console.log(prefix + ":" + result);

		return Promise.resolve(data);
	}
}

function getAuthHeader(username , password , xAuthToken) {
	return {
		"Authorization" : 'Basic ' + new Buffer(username + ':' + password).toString('base64'),
		"X-Auth-Token" : xAuthToken
	}
}

function sendSubscriptionRequest(username,password,url,xAuthToken, requestObject , desc , catalogId){
	return function(){
		return new Promise(function(resolve, reject) {
			console.log(desc);

			var formData = {
				requestForm : JSON.stringify(requestObject)
			};

			var options = {
				method: 'POST',
				headers: getAuthHeader(username , password , xAuthToken) ,
				rejectUnauthorized: false,
				url: url,
				formData: formData
			};

			request.post(options, function optionalCallback(err, httpResponse, body) {
				if (err) {
					var errorString = '  request' + chalk.red(' not sent ') + desc + '-' + err.message;
					console.log(errorString);
					reject(Error(errorString)); 
				} else {

					//watch out for 500s here
					var reqId = JSON.parse(body).id;
					if (typeof reqId !== "undefined") {
						console.log('  request ' +chalk.green('sent') +': ' + desc + ' - Request ID:' + reqId )
						resolve({
							reqId: reqId , 
							catalogId: catalogId,
							subName: requestObject.subscriptionName
						} );
					} else {
						var resp = JSON.parse(httpResponse.body);
						reject(resp.messageKey + " - " + resp.description);
					}
				}
			});

		});
	}
}

function pollRequest(username, password, baseUrl, xAuthToken , retry) {  
	return function(reqData){
		retry--;
		if(retry === 0) {
			//console.log('           timed out request ' + reqData.reqId);
			return Promise.reject("timed out while polling request status for request " + reqData.reqId);
		} else {
			return Promise.resolve(reqData)
			.then(getRequestStatus(username, password, baseUrl, xAuthToken ))
			.then(function(requestData) {
				if(requestData.requestState === 'REJECTED')
					return Promise.reject("the request " + reqData.reqId + " was " + chalk.red( requestData.requestState) + " by CSA")
				else if(requestData.requestState === 'COMPLETED') {
					return Promise.resolve(reqData);
				}
				else
					return Promise.delay(reqData, getRandomInt(9000,11000) ).then(pollRequest(username, password, baseUrl, xAuthToken , retry));
			});
		}
	}
}

function getRequestStatus(username, password, baseUrl, xAuthToken ) {
	return function(reqData){

		var desc = "    checking progress on request " + reqData.reqId;
		console.log(desc);

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-request/' + reqData.reqId + '?catalogId=' + reqData.catalogId,
			headers: getAuthHeader(username , password , xAuthToken)
		};

		return getHttpRequest(options)
	}
}


csaUtils.submitRequest = function (username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken ) {
	return function(){
		var desc = ["submitting" , action , "request for sub: " , subName].join(' ');
		var subscriptionRequestUrl = baseUrl + 'csa/api/mpp/mpp-request/' + objectId + '?catalogId=' + catalogId;		
		var subOptions = buildRequestOptions(offeringData , newInputData ).fields  

		var subRequestDetails = {
			categoryName: categoryName,
			subscriptionName: subName,
			startDate:  moment().format('YYYY-MM-DDTHH:mm:ss') + '.000Z',
			fields: subOptions ,
			action: action
		}		
		return sendSubscriptionRequest(username, password, subscriptionRequestUrl, xAuthToken, subRequestDetails , desc , catalogId)()
	}
}

csaUtils.submitRequestAndWait = function (username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken ) {
	return function(){
		return csaUtils.submitRequest(username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken )()
		.then(pollRequest(username, password, baseUrl, xAuthToken , 20))
		.then(function(reqData){
			console.log(["      request" , reqData.subName , 'was', chalk.green('successfully fulfilled.') , "(requestID:" , reqData.reqId , ')'].join(' '));
			reqData.requestObjectId = objectId
			return Promise.resolve(reqData);
		},function(err){
			console.log("      request for " + action + " on " + subName + chalk.red(' failed') + ': ' + err);
			return(Promise.reject(err))
		});
	}
}



csaUtils.submitRequestAndWaitForSubCompletion = function (username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken ) {
	return function(){
		return csaUtils.submitRequest(username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken )()
		.then(pollRequest(username, password, baseUrl, xAuthToken , 20))
		.then(csaUtils.getSubIdFromRequest(username, password, baseUrl, xAuthToken ))
		.then(function(reqData){
			console.log(["      request" , reqData.subName , 'was', chalk.green('successfully fulfilled.') , "(requestID:" , reqData.reqId , "subscriptionId:" , reqData.subId , ')'].join(' '));
			reqData.requestObjectId = objectId
			return Promise.resolve(reqData);
		},function(err){
			console.log("      request for " + action + " on " + subName  + chalk.red(' failed') + ': ' + err);
			return(Promise.reject(err))
		});
	}
}

function postHttpRequest(options) {
	options.method = 'POST';
	return httpRequest(options);
}

function getHttpRequest(options) {
	options.method = 'GET';
	return httpRequest(options);
}

function deleteHttpRequest(options) {
	options.method = 'DELETE';
	return httpRequest(options);
}

function httpRequest(options) {
	return new Promise(function(resolve,reject){
		request(options, function(err, httpResponse, body) {
			var result = "";
			if (err) {
				reject(Error(err.message)); 
			} else {
				try {
					result = JSON.parse(body);
				}
				catch (err) {
					result = body;
				}
				resolve(result);
			}
		});
	})
}

csaUtils.getSubIdFromRequest = function(username, password , baseUrl ,xAuthToken) {
	return function(reqData){

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-subscription/filter?page-size=100' ,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
			body: {
				name: reqData.subName
				//requestState: "ACTIVE" nor 'status' works here
			}
		};

		return postHttpRequest(options)
		.then(function(subscriptions){

			return Promise.all(
				subscriptions.members.map(function(sub){
					console.log(["checking sub", sub.name , "for the request"].join(' '))
					options.url = baseUrl + "csa/api/mpp/mpp-subscription/" + sub.id
					return getHttpRequest(options);
				})
			);

		})
		//.then(log("debug1: "))
		.then(function(subs){
			var result = _.result(_.find(subs, function(sub) {
				return sub.requestId === reqData.reqId;
			}), 'id');

			if (typeof result === "undefined")
				return Promise.reject("could not look up subscription ID from request" + JSON.stringify(reqData)  )
			else {
				reqData.subId = result;
				return Promise.resolve(reqData);
			} 
		})
	}
}

csaUtils.createSubscriptionGetter = function(username, password , baseUrl ,xAuthToken) {
	return function(subNameFilter) {

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-subscription/filter?page-size=10000' ,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
			body: {
				name: subNameFilter
				//requestState: "ACTIVE" nor 'status' works here
			}
		};

		return postHttpRequest(options)
		.then(function(subscriptions){
			return Promise.resolve(	project(subscriptions.members , ['id' , 'name']) ) ;
		})
	}
}

function existy(x) { return x != null };

function cat() {
	var head = _.first(arguments); 
	if (existy(head))
		return head.concat.apply(head, _.rest(arguments)); 
	else
		return []; 
}

function construct(head, tail) { 
	return cat([head], _.toArray(tail));
}


function project(table, keys) { 
	return _.map(table, function(obj) {
		return _.pick.apply(null, construct(obj, keys)); 
	});
};

csaUtils.createSubscriptionCanceller = function(username, password , baseUrl ,xAuthToken) {
	return function(subscriptions) {

		var options = {
			rejectUnauthorized: false,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
		};

		var cancelRequestPromises = subscriptions.map(function(sub){

			options.url = baseUrl + 'csa/api/mpp/mpp-subscription/' + sub.id + '/modify';
			return getHttpRequest(options)
			.then(function(subData){
				return csaUtils.submitRequestAndWait (	username, 
														password, 
														"CANCEL_SUBSCRIPTION" , 
														baseUrl , 
														subData.id , 
														subData.catalogId, 
														"", 
														subData , 
														{} , 
														subData.name , 
														xAuthToken
				)();

			})
		});

		return Promise.all(cancelRequestPromises);
	}

}


csaUtils.createSubscriptionDeleter = function(username, password , baseUrl ,xAuthToken) {
	return function(subscriptions) {


		var options = {
			rejectUnauthorized: false,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
		};

		var deletePromises = subscriptions.map(function(sub){
			console.log(["deleting sub" , sub.name].join(' '))
			options.url = baseUrl + 'csa/api/mpp/mpp-subscription/' + sub.requestObjectId;
			return deleteHttpRequest(options)	
		});

		return Promise.all(deletePromises)
		.then(function(data){
			return Promise.resolve ( project(data , ['description' , 'args']))
		})
	}
}

csaUtils.editXmlElementText = function(xml,xmlPath,newElementName,value){
	//TODO: Shouldnt need newElementName, should be able to just replace the text node. 
	// ah who am i kidding this will never be fixed.

	var doc = new dom().parseFromString(xml);
	var newIdElement = doc.createElement(newElementName).appendChild(doc.createTextNode(value));
	oldid = xpath.select(xmlPath, doc , true);
	oldid.replaceChild(newIdElement.parentNode,oldid);
	return oldid.ownerDocument.toString();

}

csaUtils.xpathQuery = function (xml,xPath){
	var doc = new dom().parseFromString(xml);
	var selected =  xpath.select(xPath, doc , true);
	return selected.childNodes[0].data;
}



 
module.exports = csaUtils;