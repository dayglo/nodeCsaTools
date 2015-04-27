require('es6-promise').polyfill();
rest = require('restler-q').spread;
creds = require('./creds');
csaUtils = require('./csaUtils');
uploadFile = require('./uploadFile');
Q = require('q');
chalk = require('chalk');
var glob = require("glob");
var fs = require('fs');


var ncp = require('ncp').ncp;

var xpath = require('xpath'),
    dom   = require('xmldom').DOMParser,
    XMLSerializer = require('xmldom').XMLSerializer;

var uuid = require('node-uuid');

var admzip = require('adm-zip');
 


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



function getIdFromName(data , name){
	var id = ""
	for (member in data) {
		if (data[member].name == name) {
			id = data[member].global_id;
		}
	}
	return id;
}

function buildPropertyTasks(xAuthToken, componentId, properties , httpOptions ) {
	var tasks = properties.map(function(p){
		return csaUtils.getTask(xAuthToken, csaUtils.getPropertyPayload(componentId, p.name, p.value , p.type ) , baseUrl + "csa/api/property" ,  httpOptions , 'creating property ' + p.name)
	});
	return tasks;
}


function createComponents(packageFile) {

	fs.readFile(packageFile , 'utf8' , function (err,data) {

		csaPackage = JSON.parse(data);

		var paletteName = "dbCloudManager Abstract Components";

		//login
		console.log("retrieving auth token for " + creds.u + " in organisation " + creds.org);

		csaUtils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions)
		.then(function(xAuthToken){
			//logged in

			rest.get(baseUrl +'csa/api/metamodel' , httpOptions)
			.spread( function(data){

				console.log(" looking up palette " + paletteName);
				var paletteId = getIdFromName(data.members , paletteName);
				return rest.get(baseUrl +'csa/api/metamodel/' + paletteId , httpOptions)
			}).spread(function(csaPaletteData){

				var palette = csaPackage.components[paletteName];


				allTasks = new Array();

				// for each component 
				for (componentName in palette) {
					var component = palette[componentName];
					var componentId = getIdFromName(csaPaletteData.members , componentName);
					
					// add some new task to the allTasks queue for each property
					var newTasks = buildPropertyTasks(xAuthToken , componentId , component.properties , httpOptions );
					Array.prototype.push.apply(allTasks,newTasks);

				}
				//kick off the promise chain! 
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
}

function readFile(filePath){
	return function (){
		return new Promise(function(resolve,reject){
			fs.readFile(filePath, 'utf8', function (err,data) {
				if (err) {
					console.log(err);
					reject(err)
				} else {
					console.log('read file successfully');
					resolve(data);
				}
			});
		})
	}
}

function writeFile(filePath){
	return function (data){
		return new Promise(function(resolve,reject){
			fs.writeFile(filePath, data, function (err) {
				if (err) {
					console.log(err);
					debugger;
					reject(err)
				} else {
					debugger;
					console.log('written file successfully');
					resolve(data);
				}
			});
		})
	}
}



function editXmlFile(newDesignName , designUuid) {
	return function(data) {
		return new Promise(function(resolve,reject){
			try{

				var optionModelUuid =  uuid.v1().replace(/-/g,'');
				var nameUuid = uuid.v1();

				var substitutions = {
					"/ServiceBlueprint/id":designUuid,
					"/ServiceBlueprint/objectId":designUuid,
					"/ServiceBlueprint/description":"test",
					"/ServiceBlueprint/name":nameUuid,
					"/ServiceBlueprint/displayName":newDesignName,
					"/ServiceBlueprint/optionModel/id":optionModelUuid,
					"/ServiceBlueprint/optionModel/objectId":optionModelUuid
				}

				var editedDoc = Object.keys(substitutions).reduce(function(prev,curr,index,raw){

					elementName = curr.substring(curr.lastIndexOf("/")+1);
					return csaUtils.editXmlElementText(prev,curr,elementName,substitutions[curr]) ;
				},data);

				resolve(editedDoc);

			} catch (err) {
				reject(err);
			}

		});
	}
}

function createZip(folderPath , outputPath) {
	return function (){
		return new Promise(function(resolve,reject){
			fs.readdir(folderPath, function (err, files) { 
				
				try {
					if (!err) {
						var zip = new admzip();
						debugger;
						for (file in files){
							zip.addLocalFile(folderPath + "/" + files[file]);
						}
						zip.writeZip(outputPath);

						resolve();
					}
					else {
						reject(err)
					}
				} catch (err) {
					reject(err)
				}
				
			});
		})
	}
}


function createDesigns(packageFile) {

	var designUuid =  uuid.v1().replace(/-/g,'');
	newDesignName = 'waaaat' ;
	newDesignFileName = 'SERVICE_DESIGN_'+ newDesignName + '_'+  designUuid;
	fullFilePath = './tmp/' + newDesignFileName + '/import.xml'
	outputZipFilePath = './tmp/' + newDesignFileName + '/importme.zip';

	fs.readFile(packageFile , 'utf8' , function (err,data) {
		csaPackage = JSON.parse(data);

		copyFolder('./resources/emptyDesign', './tmp/' + newDesignFileName)
		.then(readFile(fullFilePath))
		.then(editXmlFile(newDesignName, designUuid))
		.then(writeFile(fullFilePath))
		.then(createZip('./tmp/' + newDesignFileName , outputZipFilePath))
		.then(csaUtils.loginAndGetToken(baseUrl , credentialData ,IdmCallOptions))
		.then(function(xAuthToken){

			return uploadFile.uploadDesign(baseUrl + '/csa/rest/import?userIdentifier=90d96588360da0c701360da0f1d600a1&exceptionCode=200',
											outputZipFilePath,
											creds.u,
											creds.pw);
		});
	});
}


function copyFolder(source, destination){
	return new Promise(function(resolve, reject) {
		ncp(source, destination, function (err) {
			if (err) {
				reject(Error(err)); 
			} else {
				resolve();
			}
		});
	});
}


//createComponents('./' + "csaPackage1-full.json");
createDesigns('./' + "csaPackage1-full.json");


