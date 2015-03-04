//csautils
csaUtils = {}
 
csaUtils.getPropertyPayload = function (global_id, name , value) {
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
    "property_type": "STRING",
    "property_value": value
                }
}
 
 
module.exports = csaUtils;