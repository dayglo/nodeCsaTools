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
                    console.log("worked!")
                    console.log(data)
                    resolve(data);

                },
                function(data){
                    debugger;

                    if (data.code == "PropertyNameUniquenessError") {
                        resolve("already exists");
                    } else {
                        reject(Error(data.code));
                    }       
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
    var tasks = properties.map(function(p){
        return getTask(xAuthToken, csaUtils.getPropertyPayload(componentId, p.name, p.value , p.type ) , "csa/api/property" )
    });
    return tasks;
}




fs.readFile('./' + "csaPackage1.json" , 'utf8' , function (err,data) {

    csaPackage = JSON.parse(data);

    var paletteName = "dbCloudManager Abstract Components";

    //login
    console.log("retrieving auth token for " + creds.u + " in organisation " + creds.org);
    rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', credentialData ,IdmCallOptions )
    .spread(function(data){
        //logged in
        console.log("got token.");

        var xAuthToken = data.token.id;

        rest.get(baseUrl +'csa/api/metamodel' , httpOptions)
        .spread( function(data){

            console.log(" looking up palette " + paletteName);
            var paletteId = getIdFromName(data.members , paletteName);
            return rest.get(baseUrl +'csa/api/metamodel/' + paletteId , httpOptions)
        }).spread(function(csaPaletteData){

            var palette = csaPackage.components[paletteName];


            allTasks = new Array();

            // add a new chainable task for each component
            for (componentName in palette) {
                var component = palette[componentName];
                var componentId = getIdFromName(csaPaletteData.members , componentName);
                
                var newTasks = buildPropertyTasks(xAuthToken , componentId , component.properties);
                Array.prototype.push.apply(allTasks,newTasks);

            }

            return allTasks.reduce(Q.when, Q('a')).done();


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

});



