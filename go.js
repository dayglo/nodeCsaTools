debugger;
require('es6-promise').polyfill();
rest = require('restler-q').spread;
creds = require('./creds');
csaUtils = require('./csaUtils');
Q = require('q');
chalk = require('chalk');
var glob = require("glob");
var fs = require('fs');


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

var getTask = function (xAuthToken , payload, path ) {
    return function(){

        return new Promise(function(resolve, reject) {
            console.log("   sending command.");
            rest.postJson(baseUrl + path , payload , httpOptions)
            .spread(
                function(data){
                    debugger;
                    console.log("worked!")
                    console.log(data)
                    resolve(data);

                },
                function(data){
                    debugger;
                    reject(Error(data.code));
                }
            );

        });
    }
}

function getIdFromName(data , name){
    var id = ""
    for (member in data) {
        if (data[member].name == name) {
            id = data[member].global_id;
        }
    }
    return id;
}

function buildPropertyTasks(xAuthToken, componentId, properties ) {
    var tasks = properties.map(function(prop){
        debugger;
        return getTask(xAuthToken, csaUtils.getPropertyPayload(componentId, prop, 'undefined' , "STRING") , "csa/api/property" )
    });
    return tasks;
}




fs.readFile('./' + "csaPackage1.json" , 'utf8' , function (err,data) {

    csaPackage = JSON.parse(data);


    // var taskTree = [];

    //  //login
    // console.log("retrieving auth token for " + creds.u + " in organisation " + creds.org);
    // rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
    // .spread(function(data){
    //     //logged in
    //     debugger;
    //     for (paletteName in csaPackage.components) {
    //         var palette = csaPackage.components[paletteName];

    //         rest.get(baseUrl +'csa/api/metamodel' , httpOptions)
    //         .spread( function(data){
    //             console.log(" looking up palette " + paletteName);
    //             var paletteId = getIdFromName(data.members , paletteName);
    //             return rest.get(baseUrl +'csa/api/metamodel/' + paletteId , httpOptions)
    //         }).spread(function(paletteData){

    //             for (componentName in palette) {
    //                 debugger;
    //                 var component = palette[componentName];

    //                 console.log(" looking up component " + componentName);
    //                 var componentId = getIdFromName(paletteData.members , componentName);

    //                 var propTasks = [];
    //                 for (propertyName in component) {
    //                     var property = component[propertyName];
    //                     propTasks += getTask(xAuthToken, csaUtils.getPropertyPayload(componentId, property.name, property.value , property.value) , "csa/api/property" )


    //                 }

    //                 propTasks.reduce(Q.when, Q('a')).done();
                    
    //                 debugger;

    //             }
    //         });






    //     }



    // },function(error){
    //     console.log("errorall:")
    //     debugger;
    //     console.log(error.toString())
    // });














    //login
    console.log("retrieving auth token for " + creds.u + " in organisation " + creds.org);
    rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
    .spread(function(data){
        //logged in
        console.log("got token.");

        var xAuthToken = data.token.id;

        rest.get(baseUrl +'csa/api/metamodel' , httpOptions)
        .spread( function(data){
            var paletteName = "dbCloudManager Abstract Components";
            console.log(" looking up palette " + paletteName);
            var paletteId = getIdFromName(data.members , paletteName);
            return rest.get(baseUrl +'csa/api/metamodel/' + paletteId , httpOptions)
        }).spread(function(paletteData){

            var componentId = getIdFromName(paletteData.members , "DB Internal Server v1.0.0");

            propTasks = new Array();
            props = ["a1","b1","c1"] ;
            
            debugger;
            Array.prototype.push.apply(propTasks,buildPropertyTasks(xAuthToken , componentId ,  props) )

            propTasks.reduce(Q.when, Q('a')).done();
            
        },function(error){
            console.log("errorall:")
            debugger;
            console.log(error.toString())
        });


    },function(error){
        console.log("errorall:")
        debugger;
        console.log(error.toString())
    });






    // //login
    // console.log("retrieving auth token for " + creds.u + " in organisation " + creds.org);
    // rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
    // .spread(function(data){
    //     //logged in
    //     console.log("got token.");

    //     var xAuthToken = data.token.id;

    //     rest.get(baseUrl +'csa/api/metamodel' , httpOptions)
    //     .spread( function(data){
    //         var paletteName = "dbCloudManager Abstract Components";
    //         console.log(" looking up palette " + paletteName);
    //         var paletteId = getIdFromName(data.members , paletteName);
    //         return rest.get(baseUrl +'csa/api/metamodel/' + paletteId , httpOptions)
    //     }).spread(function(paletteData){
    //         var componentName = "DB Internal Server v1.0.0";
    //         console.log(" looking up component " + componentName);
    //         var componentId = getIdFromName(paletteData.members , componentName);
    //         debugger;
    //         //componentTask = getTask(xAuthToken, csaUtils.getComponentPayload("New Component" , "this is a new component.") , "csa/api/metamodel/" + "2c9030e44bdb3bfe014be06058354206" );


    //         //var a = ["snRequestId","requestor","owner","server_type","business","comment","requestNumber","count","cluster","domain","Environment","Zone","Subnet","SubnetMask","DefaultGateway","Network","DataCentre","OperatingSystem","VCores","Memory","VDisk1","VDisk2","VDisk3","LifeSpan","BcpTier","BcpScope","BcpPartners","ResourceGroup","ResourceGroupRequester","Tag","DNSDomain","DomainNam","DNSSuffixSearchList","DNSServerList","DefaultDNSSuffix","ApplicationProfile","EnableDhcp","WinsServerList","LdapOU","TimeZone","InputLocale","UserLocale","SiteLocation","Description","Volume1","Volume2","Volume3","Sockets","AquireHostname","AquireHostnam","HostName","Hostnam","AddmDataCentre","PatchDay","PatchSlot","OSPatchedBy","ServerCategoryFunction","Region","PrimaryApplication","BusinessLineMetier","CostCentre","BusinessLine","BuildProfile","Backups","BuildType","DateRequested","Application","Business","Country","SupplementarySecurityRequirements","PowerUserSecurityRequirements","IPAddress","OldHostName"];
    //         var properties = ["one","two","three"];
    //         var propTasks = properties.map(function(prop){
    //             console.log("   adding property " + prop);
    //             return getTask(xAuthToken, csaUtils.getPropertyPayload(componentId, prop, 'undefined' , "STRING") , "csa/api/property" )
    //         });

    //         propTasks.reduce(Q.when, Q('a')).done();
    //     })


    // },function(error){
    //     console.log("errorall:")
    //     debugger;
    //     console.log(error.toString())
    // });



});



