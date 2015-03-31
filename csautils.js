//csautils

require('es6-promise').polyfill();
rest = require('restler-q').spread;
var S = require('string');

csaUtils = {}
 
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

    rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
    .spread(
      function(data){
        console.log("logged in.")
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
 
module.exports = csaUtils;