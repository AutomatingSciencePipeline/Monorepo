const express = require('express'); //Import the express dependency
const fetch = require('node-fetch');
const fs = require('fs');
var formidable = require('formidable');
const app = express(); //Instantiate an express app, the main work horse of this server
const port = 5005; //Save the port number where your server will be listening
var submit = false;
var expname = null;
var fileName = '';
var iteration = 0; //Pavani test


//const supaCreateClient = require('@supabase/supabase-js')
//const suppy = require('@supabase')
const supGoTrue = require('@supabase/gotrue-js')
const supPost = require('@supabase/postgrest-js')
const supRealTime = require('@supabase/realtime-js')
const supStorage= require('@supabase/storage-js')
const supBigBase= require('@supabase/supabase-js')
// Create a single supabase client for interacting with your database 

//SUPABASE
 var SUPABASE_URL = 'http://localhost:3000'
 var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UiLAogICAgImlhdCI6IDE2NDQ5ODc2MDAsCiAgICAiZXhwIjogMTgwMjc1NDAwMAp9.eMfl9FG32Q6lfdYXi8A4IcWc6PbwuYFNunBPad8rFaM'
 var supabase = supBigBase.createClient(SUPABASE_URL, SUPABASE_KEY)
//window.userToken = null
//Idiomatic expression in express to route and respond to a client request
app.use(express.static('public'));
app.use(express.json());
app.use('/styles', express.static(__dirname + 'public/styles'));
app.use('/scripts', express.static(__dirname + 'public/scripts'));
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/html/loginpage.html');
});
app.get('/index', (req, res) => {
	res.sendFile(__dirname + '/html/index.html');
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
		console.log('we got a file!');
		var oldpath = files.filetoupload.filepath;
		var newpath =
			'../../scripts/GLADOS_HOME/incoming/' +
			files.filetoupload.originalFilename;
		fileName = files.filetoupload.originalFilename;
		fs.rename(oldpath, newpath, function (err) {
			if (err) throw err;
			res.redirect('/parameters');
		});
	});
});
app.post('/parameters', (req, res) => {
	expname = req.body.experimentName;
	console.log(expname);

	var json = req.body;
	json['fileName'] = fileName;

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

app.post('/createuser', (req, res) => {  //need help with this 
	console.log("we are in creating user")
	console.log("iteration :")
	console.log(iteration)
	console.log(req.body.name)
	console.log(req.body.password)
	var email= req.body.name
	var password = req.body.password
	console.log("failing here")
	console.log("parsing the validate user")
	var par = JSON.parse(req)
	console.log(par.name)
	supabase.auth.signUp({
		email: email,
		password: '1234',
	  })
	supabase.auth
    .signUp({email, password}) //{ email, password }
    .then((response) => {
      response.error ? alert(response.error.message) : setToken(response)
    })
    .catch((err) => {
      alert(err)
    })
	iteration = iteration + 1; 
	
	//window.location.assign('parameters?user=' + req.body.name);
});
const fetchUserDetails = () => {
	alert(JSON.stringify(supabase.auth.user()))
  }
app.post('/validateuser', (req, res) => {  //need help with this 
	console.log("we are in validate user")
	console.log(req.body.name)
	console.log(req.body.password)
	var email = req.body.name
	var password = req.body.password
	console.log("parsing the validate user")
	console.log(JSON.parse(req))
	//supasbase 
	 supabase.auth
    .signIn({ email, password })
    .then((response) => {
      response.error ? alert(response.error.message) : setToken(response)
    })
    .catch((err) => {
      alert(err.response.text)
    })
	//window.location.assign('parameters?user=' + req.body.name);
});
//Comment out the next method before testing
app.listen(port, () => {
	//server starts listening for any attempts from a client to connect at port: {port}
	console.log(`Now listening on port ${port}`);
});

//Place functions to be tested below, there should be a copy here and in main
// function paramJSON(paramName, defaultVal, minVal, maxVal, incrementVal) {
// 	const parsedDef = parseFloat(defaultVal);
// const parsedMin = parseFloat(minVal);
// const parsedMax = parseFloat(maxVal);
// const parsedInc = parseFloat(incrementVal);
// 	if(isNaN(parsedDef) || isNaN(parsedMin) || isNaN(parsedMax) || isNaN(parsedInc)) {
// 		throw new TypeError();
// 	}
// 	var param = {
// 		"paramName" : paramName,
// 		"values" :
// 		[defaultVal,
// 		minVal,
// 		maxVal,
// 		incrementVal]
// 	}
// 	return param;
// }

// function createUser(username, password) {

// }

// function checkUser(username, password) {

// }

// function experimentParamsJSON(paramsArr, experimentName, user, experiment){

// 	const params = {
// 		"experimentName": experimentName,
// 		"user": user,
// 		"parameters": paramsArr,
// 		"file" : experiment
// 	};
// return params;

// }

// module.exports.paramJSON = paramJSON;
// module.exports.experimentParamsJSON = experimentParamsJSON;
// module.exports.createUser = createUser;
// module.exports.checkUser = checkUser;
