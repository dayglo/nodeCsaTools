require('es6-promise').polyfill();
require('prfun');
rest = require('restler-q').spread;
var S = require('string');
var request = require('request');
var moment = require('moment');
chalk = require('chalk');

_ = require('lodash');

var csautils = {}

function log(text,color){
	if (color){
		text = chalk[color](text)
	}
    var date = new Date().toJSON()
    var logText = "[" + date + "] " + text
    console.log (logText)
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min)) + min;
}

csautils.lookupSubscription = function (subName , categoryName , catalogId) {
	return lookup ("subscription" , subName , categoryName, catalogId, true)
}

csautils.lookupOffering = function (offeringName , categoryName , catalogNameOrId) {
	return lookup ("offering" , offeringName , categoryName, catalogNameOrId, true)
}

csautils.lookupOfferings = function (offeringName , categoryName , catalogNameOrId) {
	return lookup ("offering" , offeringName , categoryName, catalogNameOrId, false)
}

function lookup (type , name , categoryName, catalogNameOrId, oneMatchOnly) {
	return new Promise(function(resolve, reject){
		
		log ("lookup " + type)
		var catalogId = ""
		var catalogName = ""
        if (catalogNameOrId.match(/^[0-9A-Fa-f]+$/)) {
            catalogId = catalogNameOrId
        } else {
        	catalogName = catalogNameOrId
        }

		var options = {
			rejectUnauthorized: false,
			url: csautils.baseUrl + 'csa/api/mpp/mpp-'+  type +'/filter' ,
			headers: csautils.getAuthHeader(),
			json: true,
			body: {
				"name": name,
				"category":categoryName
			}
		}

		postHttpRequest(options)
		.then(
			function(itemList){
				debugger;
				if (itemList["@total_results"] === 0) {
					reject("No results were returned from query for "+ name)
				} else {

					function doesItemMatch(nameProp) {
						return function(item){
							return (
								(item[nameProp].match(name)) 
								&& 
								(
								(item.catalogId === catalogId) || 
								(item.catalogName === catalogName) 
								)
							)
						}

					}
					;
					var typeToNameProp = {
						"offering":"displayName",
						"subscription":"name"
					}
					var searchResult  = _.filter(itemList.members, doesItemMatch(typeToNameProp[type]));
					
					if (typeof searchResult == "undefined") {
						reject ("An item was found, but it was in a different catalog to the one specified." )
					} else if (oneMatchOnly && (searchResult.length > 1)) {
						reject("More than one result matched the search for a " + type + " named " + name)
					} else if (oneMatchOnly) {
						resolve(searchResult[0])
					} else {
						resolve(searchResult)
					}
				}
			}
			,function(e){
				reject("problem looking up item ID: "+ e)
			}
		)
	})
}

csautils.login =  function (baseUrl , CONSUMPTION_API_USER , CONSUMPTION_API_PASSWORD , CONSUMPTION_API_TENANT, IDM_TRANSPORT_USER , IDM_TRANSPORT_PASSWORD , REJECT_UNAUTHORIZED) {
	return new Promise(function(resolve, reject) {

		if (baseUrl.substr(baseUrl.length - 1) !== '/'){
			baseUrl += "/"
		}

		csautils.baseUrl = baseUrl

		csautils.credentials = {}
		csautils.credentials.CONSUMPTION_API_USER = CONSUMPTION_API_USER 
		csautils.credentials.CONSUMPTION_API_PASSWORD = CONSUMPTION_API_PASSWORD 
		csautils.credentials.CONSUMPTION_API_TENANT = CONSUMPTION_API_TENANT 
		csautils.credentials.IDM_TRANSPORT_USER = IDM_TRANSPORT_USER 
		csautils.credentials.IDM_TRANSPORT_PASSWORD = IDM_TRANSPORT_PASSWORD
		csautils.credentials.REJECT_UNAUTHORIZED = REJECT_UNAUTHORIZED 

		var credentialData = {
			passwordCredentials:{
				username: CONSUMPTION_API_USER,
				password: CONSUMPTION_API_PASSWORD },
			tenantName: CONSUMPTION_API_TENANT
		}

		var IdmCallOptions = {
			rejectUnauthorized : REJECT_UNAUTHORIZED,
			username : IDM_TRANSPORT_USER,
			password : IDM_TRANSPORT_PASSWORD
		}

		log( 'Authenticating...');
		rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
		.spread(
			function(data){
				log("got token.");
				csautils.credentials.xAuthToken = data.token.id;
				resolve(data.token.id);
			},
			function(data){
				reject(Error(data.code));       
			}
		);

	});  
}

csautils.createParallelTask = function(tasks,desc) {
	return function(){
		return new Promise(function(resolve,reject) {

			log('executing ' + desc);

			var executingTasks = tasks.map(function(task) {
				return task();
			})

			return Promise.all(executingTasks)
			.then(function(data){
				log (desc + ' executed');				
				resolve(data);
			},function(err){
				log (desc + ' did not work '+ err);
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



csautils.getAuthHeader = function() {
	return {
		"Authorization" : 'Basic ' + new Buffer(csautils.credentials.CONSUMPTION_API_USER + ':' + csautils.credentials.CONSUMPTION_API_PASSWORD).toString('base64'),
		"X-Auth-Token" : csautils.credentials.xAuthToken
	}
}

function sendSubscriptionRequest(url, requestObject , desc , catalogId , action , objectId){
	return function(){
		return new Promise(function(resolve, reject) {
			log(desc);

			var formData = {
				requestForm : JSON.stringify(requestObject)
			};

			var options = {
				method: 'POST',
				headers: csautils.getAuthHeader() ,
				rejectUnauthorized: false,
				url: url,
				formData: formData
			};

			request.post(options, function (err, httpResponse, body) {
				if (err) {
					var errorString = '  request' + chalk.red(' not sent ') + desc + '-' + err.message;
					log(errorString);
					reject(Error(errorString)); 
				} else {

					//watch out for 500s here
					var reqId = JSON.parse(body).id;
					if (typeof reqId !== "undefined") {
						log('  request ' +chalk.green('sent') +': ' + desc + ' - Request ID:' + reqId )
						var result = {
							reqId: reqId , 
							catalogId: catalogId,
							subName: requestObject.subscriptionName
						}
						
						if ((action === "MODIFY_SUBSCRIPTION") || (action === "CANCEL"))
							result.subId = objectId

						if (typeof requestObject.subscriptionId !== "undefined")
							result.subId = requestObject.subscriptionId

						resolve(result);
					} else {
						var resp = JSON.parse(httpResponse.body);
						reject(resp.messageKey + " - " + resp.description);
					}
				}
			});

		});
	}
}

function pollRequest(retry, goodStatuses , badStatuses) {  
	return function(reqData){

		retry--;
		if(retry === 0) {
			//log('           timed out request ' + reqData.reqId);
			return Promise.reject("timed out while polling request status for request " + reqData.reqId);
		} else {
			return Promise.resolve(reqData)
			.then(getRequestStatus())
			.then(function(requestData) {
				var desc = "    waiting for status of request " + reqData.reqId + " to be " + goodStatuses.join(' or ') + " [" + requestData.requestState + "]";
				log(desc);
				if( _.includes(badStatuses, requestData.requestState) ) {
					return Promise.reject("the request " + reqData.reqId + " was " + chalk.red( requestData.requestState) + " by CSA")
				}
				else if( _.includes(goodStatuses, requestData.requestState) ) {
					return Promise.resolve(reqData);
				}
				else
					return Promise.delay(reqData, getRandomInt(9000,11000) ).then(pollRequest(retry, goodStatuses , badStatuses));
			});
		}
	}
}

function pollSub(retry , goodStatuses , badStatuses) {  
	return function(reqData){
		retry--;
		if(retry === 0) {
			//log('           timed out request ' + reqData.reqId);
			return Promise.reject("timed out while polling subscription status for sub " + reqData.subId);
		} else {
			return Promise.resolve(reqData)
			.then(getSubStatus())
			.then(function(subData) {
				var desc = "    waiting for status of sub to be " + goodStatuses.join(' or ') + " [" + subData.status + "]";
				log(desc);
				
				if( _.includes(badStatuses, subData.status) ) {
					return Promise.reject("the sub " + reqData.subId + " is " + chalk.red(subData.status) )
				}
				else if( _.includes(goodStatuses, subData.status) ) {
					reqData.subStatus = subData.status
					return Promise.resolve(reqData);
				}
				else
					return Promise.delay(reqData, getRandomInt(9000,11000) ).then(pollSub(retry, goodStatuses , badStatuses));
			});
		}
	}
}

function getRequestStatus() {
	return function(reqData){
		var options = {
			rejectUnauthorized: false,
			url: csautils.baseUrl + 'csa/api/mpp/mpp-request/' + reqData.reqId + '?catalogId=' + reqData.catalogId,
			headers: csautils.getAuthHeader()
		};
		return getHttpRequest(options)
	}
}

function getSubStatus() {
	return function(reqData){
		var options = {
			rejectUnauthorized: false,
			url: csautils.baseUrl + 'csa/api/mpp/mpp-subscription/' + reqData.subId ,
			headers: csautils.getAuthHeader()
		};
		return getHttpRequest(options)
	}
}

csautils.order = function  (catalogName, categoryName , offeringName , newInputData , subName ) {
	return csautils.lookupOffering (offeringName , categoryName , catalogName)
    .then(function(offering){
    	return csautils.submitRequestAndWaitForSub("ORDER" , offering.id , offering.catalogId, categoryName, offering , newInputData ,  subName )()
    })
}

csautils.modify = function  (catalogId, categoryName, subName, newInputData) {

	var start = {} 
    if (subName.match(/^.{8}_(.{4}_){3}.{12}$/)) {
        start = Promise.resolve({id:subName}) 
    } else {
    	start = csautils.lookupSubscription (subName , categoryName , catalogId)
    }

    return start
	.then (function(subscriptionSearchResult){
		var subscriptionModifyUrl = csautils.baseUrl + 'csa/api/mpp/mpp-subscription/' + subscriptionSearchResult.id + '/modify';
		return getCsaData (subscriptionModifyUrl )()
	})
    .then(function(subscription){
    	log(["MODIFY_SUBSCRIPTION" , subscription.id , catalogId, categoryName, subscription , newInputData ,  subName].join(" - "))
    	return csautils.submitRequestAndWaitForSub( "MODIFY_SUBSCRIPTION" , subscription.id , catalogId, categoryName, subscription , newInputData ,  subName )()
    })
}

csautils.cancel = function (catalogId, categoryName, subName) {

	var start = {} 
    if (subName.match(/^.{8}_(.{4}_){3}.{12}$/)) {
        start = Promise.resolve({id:subName}) 
    } else {
    	start = csautils.lookupSubscription (subName , categoryName , catalogId)
    }

    return start
	.then (function(subscriptionSearchResult){
		var subscriptionModifyUrl = csautils.baseUrl + 'csa/api/mpp/mpp-subscription/' + subscriptionSearchResult.id
		return getCsaData ( subscriptionModifyUrl )()
	})
    .then(function(subscription){
    	log(["CANCEL_SUBSCRIPTION" , subscription.id , catalogId, categoryName, subscription , {} ,  subName].join(" - "))
    	return csautils.submitRequestAndWaitForSub("CANCEL_SUBSCRIPTION"  , subscription.id , catalogId, categoryName, subscription , {} ,  subName , subscription.id )()
    })
}

csautils.control = function  (catalogId, categoryName, subName, componentName, actionName) {
	log("lookup sub")
	var mySubscriptionId = ""
	var subscriptionData = {}
	
	var start = {} 
    if (subName.match(/^.{8}_(.{4}_){3}.{12}$/)) {
        start = Promise.resolve({id:subName}) 
    } else {
    	start = csautils.lookupSubscription (subName , categoryName , catalogId)
    }

    return start
	.then (function(subscriptionSearchResult){		
		log("got sub search result")
		mySubscriptionId = subscriptionSearchResult.id
		var subscriptionUrl = csautils.baseUrl + 'csa/api/mpp/mpp-subscription/' + mySubscriptionId
		return getCsaData(subscriptionUrl)()
	})
	.then (function(subscription){
		log("got sub")
		subscriptionData = subscription;
		var instanceUrl = csautils.baseUrl + 'csa/api/mpp/mpp-instance/' + subscription.instanceId + "?catalogId=" + catalogId
		return getCsaData (instanceUrl )()
	})
	.then (function(componentModel){
		log("got component model");

		var serviceActionDetails = getControlActionNameFromComponentModel (componentModel, componentName, actionName)
		serviceActionName = serviceActionDetails.serviceActionName;
		componentId = serviceActionDetails.componentId;
		;
    	return csautils.submitRequestAndWaitForSub(serviceActionName ,  componentId , catalogId, categoryName, subscriptionData , {} ,  subName ,  mySubscriptionId)()
    })                                             
}

function getCsaData (url){
	return function(){
		var options = {
			rejectUnauthorized: false,
			url: url,
			headers: csautils.getAuthHeader(),
			json: true,
		};
		return getHttpRequest(options)	
	}
}

function getControlActionNameFromComponentModel (componentModel ,componentDisplayName, serviceActionDisplayName){
	try {

		var componentId = _.result(_.find(componentModel.components , function(component) {return component.displayName == componentDisplayName}), "id")

		var component = _.find(componentModel.components , function(component) {return component.displayName == componentDisplayName})
		var serviceActionName = _.result(_.find(component.serviceAction, function (action) {return action.displayName == serviceActionDisplayName}), 'name')
		
		if (typeof serviceActionName !== 'undefined'){
			return {serviceActionName : serviceActionName , componentId: componentId}
		} 
		else {
			log ('couldnt find the control action name from displayname '+ serviceActionDisplayName)
			throw ('couldnt find the control action name from displayname '+ serviceActionDisplayName)
		}
	}
	catch (e) {
		log("there was a problem gathering control action details: " + e)
		throw (e)
	}
}

csautils.submitRequest = function (action , objectId , catalogId, categoryName, offeringData , newInputData , subName , serviceActionSubscriptionId) {
	return function(){
		var desc = ["submitting" , action , "request for sub: " , subName].join(' ');
		var subscriptionRequestUrl = csautils.baseUrl + 'csa/api/mpp/mpp-request/' + objectId + '?catalogId=' + catalogId;		
		var subOptions = buildRequestOptions(offeringData , newInputData ).fields  
		;
		var subRequestDetails = {
			categoryName: categoryName,
			subscriptionName: subName,
			startDate:  moment().format('YYYY-MM-DDTHH:mm:ss') + '.000Z',
			fields: subOptions ,
			action: action
		}	

		if  (
				(action != "ORDER") &&
			    (action != "MODIFY_SUBSCRIPTION") &&
			    (action != "CANCEL") 
		    )
		{
			subRequestDetails.subscriptionId = serviceActionSubscriptionId;
			//delete subRequestDetails.subscriptionName;
			delete subRequestDetails.categoryName;
			delete subRequestDetails.startDate;
		}

		return sendSubscriptionRequest(subscriptionRequestUrl, subRequestDetails , desc , catalogId , action , objectId)()
	}
}

csautils.submitRequestAndWait = function (action , objectId , catalogId, categoryName, offeringData , newInputData , subName  ) {
	return function(){
		return csautils.submitRequest(action , objectId , catalogId, categoryName, offeringData , newInputData , subName  )()
		.then(pollRequest(20, ['COMPLETED'] , ['REJECTED']))
		.then(function(reqData){
			log(["      request" , reqData.subName , 'was', chalk.green('completed.') , "(requestID:" , reqData.reqId , ')'].join(' '));
			reqData.requestObjectId = objectId
			return Promise.resolve(reqData);
		},function(err){
			log("      request for " + action + " on " + subName + chalk.red(' failed') + ': ' + err);
			return(Promise.reject(err))
		});
	}
}

csautils.submitRequestAndWaitForSub = function (action , objectId , catalogId, categoryName, offeringData , newInputData , subName , subscriptionId) {
	return function() {

		var goodRequestStatuses = ['COMPLETED'];
		var badRequestStatuses = ['REJECTED'];
		var goodSubStatuses = ['ACTIVE'];
		var badSubStatuses = ['CANCELLED','TERMINATED','EXPIRED'];

		if (action == 'CANCEL_SUBSCRIPTION') {
			goodSubStatuses = ['CANCELLED'];
			badSubStatuses = ['TERMINATED','EXPIRED'];
		}

		return csautils.submitRequest(action , objectId , catalogId, categoryName, offeringData , newInputData , subName , subscriptionId )()
		.then(pollRequest(20, goodRequestStatuses , badRequestStatuses))
		.then(csautils.getSubIdFromRequest())
		.then(pollSub(20 , goodSubStatuses, badSubStatuses))
		.then(csautils.createRequestDeleter())
		.then(function(data){
			reqData = data[0];
			log(["      request for", action, "on" , reqData.subName , 'was', chalk.green('successful.') , "(requestID:" , reqData.reqId , "subscriptionId:" , reqData.subId , ')'].join(' '));
			reqData.requestObjectId = objectId
			return Promise.resolve(reqData);
		},function(err){
			log("      request for " + action + " on " + subName  + chalk.red(' failed') + ': ' + err);
			return(Promise.reject(err))
		})
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

csautils.getSubIdFromRequest = function() {
	return function(req){
		
		debugger;
		if (typeof req.subId !== "undefined") return Promise.resolve (req)

		var options = {
			rejectUnauthorized: false,
			url: csautils.baseUrl + 'csa/api/mpp/mpp-subscription/filter?page-size=1000' ,
			headers: csautils.getAuthHeader(),
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
					log(["        checking sub", sub.name , "for the request"].join(' '))
					options.url = csautils.baseUrl + "csa/api/mpp/mpp-subscription/" + sub.id
					return getHttpRequest(options);
				})
			);

		})
		.then(function(candidateSubscriptions){
			;
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

csautils.createSubscriptionGetter = function() {
	return function(subNameFilter) {

		var options = {
			rejectUnauthorized: false,
			url: csautils.baseUrl + 'csa/api/mpp/mpp-subscription/filter?page-size=1000' ,
			headers: csautils.getAuthHeader(),
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
}

function arrayify(value) {
	return _.flatten([value,[]]);
}

csautils.createSubscriptionCanceller = function() {
	return function(subscriptions) {

		var input = arrayify(subscriptions);

		var options = {
			rejectUnauthorized: false,
			headers: csautils.getAuthHeader(),
			json: true,
		};

		return Promise.all(
			input.map(function(sub){
				options.url = csautils.baseUrl + 'csa/api/mpp/mpp-subscription/' + sub.id + '/modify';
				return getHttpRequest(options)
				.then(function(subData){
					return csautils.submitRequestAndWait (	"CANCEL_SUBSCRIPTION" ,
															subData.id , 
															subData.catalogId, 
															"", 
															subData , 
															{} , 
															subData.name

					)(); // immediately start the task
				})
			})
		);
	}
}

csautils.createRequestDeleter = function() {
	return function(reqData) {

		var input = arrayify(reqData);

		var options = {
			rejectUnauthorized: false,
			headers: csautils.getAuthHeader(),
			json: true,
		};

		return Promise.all(
			input.map(function(sub){
				log(["    deleting request" , sub.reqId , "for subscription" , sub.subName].join(' '));
				options.url = csautils.baseUrl + 'csa/api/mpp/mpp-request/' + sub.reqId;
				return deleteHttpRequest(options)
				.then(function(){
					sub.requestDeleted = true;
					return Promise.resolve(sub)
				})
			})
		);
	}
}

csautils.createSubscriptionDeleter = function() {
	return function(subscriptions) {

		var input = arrayify(subscriptions);

		var options = {
			rejectUnauthorized: false,
			headers: csautils.getAuthHeader(),
			json: true,
		};

		return Promise.all(
			input.map(function(sub){
				;
				log(["      deleting sub" , sub.subName].join(' '))
				options.url = csautils.baseUrl + 'csa/api/mpp/mpp-subscription/' + sub.requestObjectId;
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