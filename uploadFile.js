
var http = require('https');
var fs = require('fs');
var request = require('request');

fileUpload = {}


fileUpload.uploadDesign = function (url, filename, username, password) {


	return new Promise(function(resolve, reject) {


		var authString = 'Basic ' + new Buffer(username + ':' + password).toString('base64');

		var headers = {
			"Authorization" : authString
		};

		var formData = {
		  update: 'false',
		  updatePreserveExisting: 'false',
		  validateType:"SERVICE_BLUEPRINT",
		  previewImport: 'false',

		  file: {
		    value:  fs.createReadStream("./" + filename),
		    options: {
		      filename: filename,
		      contentType: 'application/zip'
		    }
		  }
		};

		var options = {
			method: 'POST',
			headers: headers,
			rejectUnauthorized: false,
			url: url,
			formData: formData
		};

		request.post(options, function optionalCallback(err, httpResponse, body) {
		  
		  if (err) {
		  			  	debugger;
		  	console.log('problem with request: ' + err.message);
		    reject(Error('problem with request: ' + err.message)); 
		  } else {
		  	console.log(body);
		  	resolve(body);
		  }
		  
		});
	});

}


module.exports = fileUpload;
