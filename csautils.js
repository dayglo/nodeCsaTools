//csautils
csaUtils = {}
 
csaUtils.getPropertyPayload = function (global_id, name , value, type) {

type = type.toUpperCase();

return {
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
 
module.exports = csaUtils;