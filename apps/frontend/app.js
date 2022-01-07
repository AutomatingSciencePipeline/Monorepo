const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 5000;                  //Save the port number where your server will be listening

//Idiomatic expression in express to route and respond to a client request
app.use(express.static('public'));
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
    res.sendFile(__dirname + 'favicon.ico');
});

app.post('/api/launchexp/', (req,res) => {
    let name = req.body.experimentName;
    let uid = req.body.user;
    let baseParams = req.body.parameters;
    // instantiate experiment on DB, recv ID.
    // as soon as id is here, create working directory under /exploc/experiemnt_[id]
    // announce to daemon that new experiment is online
    //
})

//Comment out the next method before testing
app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`); 
});


//Place functions to be tested below, there should be a copy here and in main
// function paramJSON(paramName, defaultVal, minVal, maxVal, incrementVal) {
// 	const parsedDef = parseInt(defaultVal);
// 	const parsedMin = parseInt(minVal);
// 	const parsedMax = parseInt(maxVal);
// 	const parsedInc = parseInt(incrementVal);
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
 

// function experimentParamsJSON(paramsArr, experimentName, user){
// 			const params = {
// 				"experimentName": experimentName,
// 				"user": user,
// 				"parameters": paramsArr,
// 			};
// 	return params;

// }


// module.exports.paramJSON = paramJSON;
// module.exports.experimentParamsJSON = experimentParamsJSON;
// module.exports.createUser = createUser;
// module.exports.checkUser = checkUser;

