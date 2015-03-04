debugger;
require('es6-promise').polyfill();
rest = require('restler-q').spread;
creds = require('./creds');
csaUtils = require('./csaUtils');
Q = require('q');


//q = require ('q');
//var authString = enc(u + ":" + pw);
var baseUrl = "https://vm01:8444/";
var data = {
    "passwordCredentials" :
    {
        "username" : creds.u,
        "password" : creds.pw
    },
    "tenantName" : creds.org
};
options = {
    rejectUnauthorized : false,
    username: creds.u,
    password: creds.pw
}
IdmCallOptions = {
    rejectUnauthorized : false,
    username: creds.idmU,
    password: creds.idmPw
}
var getTask = function (xAuthToken , payload, path) {
    return function(){
        return new Promise(function(resolve, reject) {
          rest.postJson(baseUrl + path , payload , options)
          .spread(function(data){
            debugger;
            console.log("worked!")
            console.log(data)
            resolve(data);
        },function(data){
            debugger;
            reject(Error(data.code));
        });
      });
    }
}


console.log("retrieving auth token for " + creds.u + " in organisation " + creds.org);
rest.postJson(baseUrl + 'idm-service/v2.0/tokens/', data ,IdmCallOptions )
.spread(function(data){
    console.log("got token.");
    var xAuthToken = data.token.id;
    //var a = ["snRequestId","requestor","owner","server_type","business","comment","requestNumber","count","cluster","domain","Environment","Zone","Subnet","SubnetMask","DefaultGateway","Network","DataCentre","OperatingSystem","VCores","Memory","VDisk1","VDisk2","VDisk3","LifeSpan","BcpTier","BcpScope","BcpPartners","ResourceGroup","ResourceGroupRequester","Tag","DNSDomain","DomainNam","DNSSuffixSearchList","DNSServerList","DefaultDNSSuffix","ApplicationProfile","EnableDhcp","WinsServerList","LdapOU","TimeZone","InputLocale","UserLocale","SiteLocation","Description","Volume1","Volume2","Volume3","Sockets","AquireHostname","AquireHostnam","HostName","Hostnam","AddmDataCentre","PatchDay","PatchSlot","OSPatchedBy","ServerCategoryFunction","Region","PrimaryApplication","BusinessLineMetier","CostCentre","BusinessLine","BuildProfile","Backups","BuildType","DateRequested","Application","Business","Country","SupplementarySecurityRequirements","PowerUserSecurityRequirements","IPAddress","OldHostName"];
    var properties = ["qwqssww","qwswsqw","ewfwswsw"];
    var tasks = properties.map(function(prop){
        console.log("adding property " + prop);
        return getTask(xAuthToken, csaUtils.getPropertyPayload('2c9030e44bdb3bfe014be0608a7b4209', prop, 'undefined') , "csa/api/property" )
    });

    tasks.reduce(Q.when, Q('a')).done();
},function(error){
    console.log("errorall:")
    debugger;
    console.log(error.toString())
});
