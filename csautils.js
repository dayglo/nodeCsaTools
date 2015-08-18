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

csautils = {}
 
function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

csautils.getPropertyPayload = function (global_id, name , value, type) {

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

csautils.getComponentPayload = function ( name , description , consumerVisible) {   
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

csautils.loginAndGetToken =  function (baseUrl , credentialData ,IdmCallOptions) {

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

csautils.getUserIdentifier = function (baseUrl , user , options) {
	var url = [baseUrl ,'csa/rest/login/' , "CSA-Provider" ,  '/' , user].join('') ;
	return csautils.queryAndExtract(url , '/person/id' , options)
}

csautils.queryAndExtract =  function (url , xpath , options) {
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
						result = csautils.xpathQuery(body,xpath)
						resolve(result);
					} catch (err){
						reject(Error(' failure while querying xpath: ' + err.message)); 
					}
				}
			});
		});  
	}
}

csautils.getTask = function (xAuthToken , payload, url ,httpOptions, desc) {
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

csautils.createParallelTask = function(tasks,desc) {
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

function getTriggerMap(dependencies) {

    var triggerGroupList = _.filter(
    _.map(dependencies, function (dep) {
        return _.uniq(
        _.map(dep.triggers, function (field) {
            return field.replace(".value", "").replace(".visible", "")
        }))
    }), function (trig) {
        // there's no point including groups with only one field, 
        // as that means there are no others to switch off.
        return trig.length > 1;
    });

    return _.reduce(triggerGroupList, function (final, group) {
        //accumulate by merging objects
        return _.merge(final,
        _.reduce(group, function (acc, field) {
            acc[field] = _.without(group, field)
            return acc;
        }, {}))
    }, {})

}

function buildRequestOptions(offeringDoc , newInputData) {
    
    var triggerMap = getTriggerMap(offeringDoc.dependencies);

    return _.reduce(offeringDoc.fields, function (prev, curr) {

        // if name matches a regex of this  904ECD17_5EE9_58FA_A50D_64F6F70E7C35 , then check new input key against displayname
        // if not, check new input key against name.
        // This is because the CSA api needs us to be able to select options as well as fields.

        var newValue = newInputData[curr.name];
        if (curr.name.match(/^.{8}_(.{4}_){3}.{12}$/)) {
            newValue = newInputData[curr.displayName]
        } 

        if (typeof newValue !== "undefined") {

            // write the main field + value to the output object
            prev.fields[curr.id] = newValue;

            //get and add negated fields for the main field.
            var fieldsToNegate = triggerMap[curr.id];
            //log("  fields to negate for current field " + JSON.stringify(fieldsToNegate))

            var negatedFields = _.reduce(fieldsToNegate  , function(accFields , fieldId){
                accFields[fieldId] = !newValue;
                return accFields
            },{})
           
            prev.fields = _.merge(prev.fields , negatedFields)

        } else {
            // just pass the value through unaffected.
            prev.fields[curr.id] = curr.value;
        }
        
        return prev;
    }, {
        fields: {}
    })
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

function pollSub(username, password, baseUrl, xAuthToken , retry) {  
	return function(reqData){
		retry--;
		if(retry === 0) {
			//console.log('           timed out request ' + reqData.reqId);
			return Promise.reject("timed out while polling subscription status for sub " + reqData.subId);
		} else {
			return Promise.resolve(reqData)
			.then(getSubStatus(username, password, baseUrl, xAuthToken ))
			.then(function(subData) {
				if( (subData.status === 'CANCELLED') || (subData.status === 'TERMINATED') || (subData.status === 'EXPIRED') )
					return Promise.reject("the request " + reqData.subId + " was " + chalk.red(subData.status) )
				else if(subData.status === 'ACTIVE') {
					reqData.subStatus = subData.status
					return Promise.resolve(reqData);
				}
				else
					return Promise.delay(reqData, getRandomInt(9000,11000) ).then(pollSub(username, password, baseUrl, xAuthToken , retry));
			});
		}
	}
}

function getRequestStatus(username, password, baseUrl, xAuthToken ) {
	return function(reqData){

		var desc = "    getting status of request " + reqData.reqId;
		console.log(desc);

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-request/' + reqData.reqId + '?catalogId=' + reqData.catalogId,
			headers: getAuthHeader(username , password , xAuthToken)
		};

		return getHttpRequest(options)
	}
}

function getSubStatus(username, password, baseUrl, xAuthToken ) {
	return function(reqData){

		var desc = "    getting status of subscription " + reqData.subId;
		console.log(desc);

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-subscription/' + reqData.subId ,
			headers: getAuthHeader(username , password , xAuthToken)
		};

		return getHttpRequest(options)
	}
}

csautils.submitRequest = function (username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken ) {
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

csautils.submitRequestAndWait = function (username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken ) {
	return function(){
		return csautils.submitRequest(username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken )()
		.then(pollRequest(username, password, baseUrl, xAuthToken , 20))
		.then(function(reqData){
			console.log(["      request" , reqData.subName , 'was', chalk.green('completed.') , "(requestID:" , reqData.reqId , ')'].join(' '));
			reqData.requestObjectId = objectId
			return Promise.resolve(reqData);
		},function(err){
			console.log("      request for " + action + " on " + subName + chalk.red(' failed') + ': ' + err);
			return(Promise.reject(err))
		});
	}
}

csautils.submitRequestAndWaitForCompletion = function (username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken ) {
	return function(){
		return csautils.submitRequest(username, password, action , baseUrl , objectId , catalogId, categoryName, offeringData , newInputData , subName , xAuthToken )()
		.then(pollRequest(username, password, baseUrl, xAuthToken , 20))
		.then(csautils.getSubIdFromRequest(username, password, baseUrl, xAuthToken ))
		.then(pollSub(username, password, baseUrl, xAuthToken , 20))
		.then(csautils.createRequestDeleter(username, password, baseUrl, xAuthToken ))
		.then(function(data){
			reqData = data[0];
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

csautils.getSubIdFromRequest = function(username, password , baseUrl ,xAuthToken) {
	return function(req){

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-subscription/filter?page-size=1000' ,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
			body: {
				name: req.subName
				//requestState: neither "ACTIVE" nor 'status' works here
			}
		};

		return postHttpRequest(options)
		.then(function(candidateSubscriptionList){

			return Promise.all(
				candidateSubscriptionList.members.map(function(sub){
					console.log(["        checking sub", sub.name , "for the request"].join(' '))
					options.url = baseUrl + "csa/api/mpp/mpp-subscription/" + sub.id
					return getHttpRequest(options);
				})
			);

		})
		.then(function(candidateSubscriptions){
			var result = _.result(_.find(candidateSubscriptions, function(sub) {
				return sub.requestId === req.reqId;
			}), 'id');

			if (typeof result === "undefined")
				return Promise.reject("could not look up subscription ID from request" + JSON.stringify(req)  )
			else {
				req.subId = result;
				return Promise.resolve(req);
			} 
		})
	}
}

csautils.createSubscriptionGetter = function(username, password , baseUrl ,xAuthToken) {
	return function(subNameFilter) {

		var options = {
			rejectUnauthorized: false,
			url: baseUrl + 'csa/api/mpp/mpp-subscription/filter?page-size=1000' ,
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

function arrayify(value) {
	return _.flatten([value,[]]);
}

csautils.createSubscriptionCanceller = function(username, password , baseUrl ,xAuthToken) {
	return function(subscriptions) {

		var input = arrayify(subscriptions);

		var options = {
			rejectUnauthorized: false,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
		};

		return Promise.all(
			input.map(function(sub){
				options.url = baseUrl + 'csa/api/mpp/mpp-subscription/' + sub.id + '/modify';
				return getHttpRequest(options)
				.then(function(subData){
					return csautils.submitRequestAndWait (	username, 
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
					)(); // immediately start the task
				})
			})
		);
	}
}

csautils.createRequestDeleter = function(username, password , baseUrl ,xAuthToken) {
	return function(reqData) {

		var input = arrayify(reqData);

		var options = {
			rejectUnauthorized: false,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
		};

		return Promise.all(
			input.map(function(sub){
				console.log(["    deleting request" , sub.reqId , "for subscription" , sub.subName].join(' '));
				options.url = baseUrl + 'csa/api/mpp/mpp-request/' + sub.reqId;
				return deleteHttpRequest(options)
				.then(function(){
					sub.requestDeleted = true;
					return Promise.resolve(sub)
				})
			})
		);
	}
}

csautils.createSubscriptionDeleter = function(username, password , baseUrl ,xAuthToken) {
	return function(subscriptions) {

		var input = arrayify(subscriptions);

		var options = {
			rejectUnauthorized: false,
			headers: getAuthHeader(username , password , xAuthToken),
			json: true,
		};

		return Promise.all(
			input.map(function(sub){
				debugger;
				console.log(["      deleting sub" , sub.subName].join(' '))
				options.url = baseUrl + 'csa/api/mpp/mpp-subscription/' + sub.requestObjectId;
				return deleteHttpRequest(options)
				.then(function(data){
					sub.description = data.description;
					sub.args = data.args;
					sub.subscriptionDeleted = true;
					return Promise.resolve(sub)
				})
			})
		);
	}
}

csautils.editXmlElementText = function(xml,xmlPath,newElementName,value){
	//TODO: Shouldnt need newElementName, should be able to just replace the text node. 
	// ah who am i kidding this will never be fixed.

	var doc = new dom().parseFromString(xml);
	var newIdElement = doc.createElement(newElementName).appendChild(doc.createTextNode(value));
	oldid = xpath.select(xmlPath, doc , true);
	oldid.replaceChild(newIdElement.parentNode,oldid);
	return oldid.ownerDocument.toString();

}

csautils.xpathQuery = function (xml,xPath){
	var doc = new dom().parseFromString(xml);
	var selected =  xpath.select(xPath, doc , true);
	return selected.childNodes[0].data;
}



 
module.exports = csautils;