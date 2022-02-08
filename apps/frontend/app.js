const express = require('express'); //Import the express dependency
const fetch = require('node-fetch');
const fs = require('fs');
var formidable = require('formidable');
const app = express(); //Instantiate an express app, the main work horse of this server
const port = 5005; //Save the port number where your server will be listening
var submit = false;
var expname = null;
var fileName = '';

//Idiomatic expression in express to route and respond to a client request
app.use(express.static('public'));
app.use(express.json());
app.use('/styles', express.static(__dirname + 'public/styles'));
app.use('/scripts', express.static(__dirname + 'public/scripts'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/html/loginpage.html');
});
app.get('/parameters', (req, res) => {
	res.sendFile(__dirname + '/html/parameters.html');
});
app.get('/favicon.ico', (req, res) => {
	res.sendFile(__dirname + '/favicon.ico');
});
app.post('/fileupload', (req, res) => {
	var form = new formidable.IncomingForm();
	form.parse(req, function (err, fields, files) {
		console.log("we got a file!");
		var oldpath = files.filetoupload.filepath;
		var newpath = '../../scripts/GLADOS_HOME/incoming/' + files.filetoupload.originalFilename;
		fileName = files.filetoupload.originalFilename;
		fs.rename(oldpath, newpath, function (err) {
			if (err) throw err;
			res.redirect('/parameters')
		});
	});
});
app.post('/parameters', (req, res) => {
	expname = req.body.experimentName;
	console.log(expname);

	var json = req.body;
	json["fileName"] = fileName;

	// submit = req.body.submit;
	// console.log(__dirname + `/exploc/experiment_${expname}`);
	// instantiate experiment on DB, recv ID.
	// as soon as id is here, create working directory under /exploc/experiemnt_[id]
	// fs.writeFile(__dirname + `/exploc/experiment_${expname}`, JSON.stringify(req.body), err => {
	// 	if (err) {
	// 		console.error(err)
	// 		return
	// 	}
	// 	//file written successfully
	// })
	console.log(json);
	fetch(`http://127.0.0.1:5000/experiment`, {
			method: 'POST',
			body: JSON.stringify(json),
			headers: {
				'Content-Type': 'application/json',
			},
		})
		.then((res) => res.json())
		.catch((error) => console.error('Error:', error));
	//		.then((json) => console.log(json));
	// announce to daemon that new experiment is online
	//
});
//Comment out the next method before testing
app.listen(port, () => {
	//server starts listening for any attempts from a client to connect at port: {port}
	console.log(`Now listening on port ${port}`);
});

//Place functions to be tested below, there should be a copy here and in main
// function paramJSONMultVals(paramName, defaultVal, minVal, maxVal, incrementVal, type) {

// 	var parsedDef;
// 	var parsedMin;
// 	var parsedMax;
// 	var parsedInc;
// 	if (type == "float") {
// 		parsedDef = Number(defaultVal);
// 		parsedMin = Number(minVal);
// 		parsedMax = Number(maxVal);
// 		parsedInc = Number(incrementVal);
// 		if (isNaN(parsedDef) || isNaN(parsedMin) || isNaN(parsedMax) || isNaN(parsedInc)) {
// 			throw new TypeError();
// 		}
// 	} else if (type == "integer") {
// 		parsedDef = Number(defaultVal);
// 		parsedMin = Number(minVal);
// 		parsedMax = Number(maxVal);
// 		parsedInc = Number(incrementVal);
// 		if (isNaN(parsedDef) || isNaN(parsedMin) || isNaN(parsedMax) || isNaN(parsedInc)) {
// 			throw new TypeError();
// 		}
// 	}

// 	var param = {
// 		"paramName": paramName,
// 		"values": [defaultVal,
// 			minVal,
// 			maxVal,
// 			incrementVal
// 		],
// 		"type": type
// 	}
// 	return param;
// }

// function createUser(username, password) {

// }

// function checkUser(username, password) {

// }

// function experimentParamsJSON(paramsArr, experimentName, user, experiment) {

// 	const params = {
// 		"experimentName": experimentName,
// 		"user": user,
// 		"parameters": paramsArr,
// 		"file": experiment
// 	};
// 	return params;

// }

// function paramJSONSingleVal(paramName, val, type) {
// 	var parsedVal;
// 	if (type == "array") {
// 		parsedVal = JSON.parse(val);
// 	} else if (type == "boolean") {
// 		if(val == "true") {
// 			parsedVal = true;
// 		}else {
// 			parsedVal = false;
// 		}
// 	} else if (type == "file") {
// 		parsedVal = val;
// 	}
// 	var param = {
// 		"paramName": paramName,
// 		"value": parsedVal,
// 		"type": type
// 	}
// 	return param;


// }

// module.exports.paramJSONMultVals = paramJSONMultVals;
// module.exports.paramJSONSingleVal = paramJSONSingleVal;
// module.exports.experimentParamsJSON = experimentParamsJSON;
// module.exports.createUser = createUser;
// module.exports.checkUser = checkUser;