const express = require('express'); //Import the express dependency
const app = express();              //Instantiate an express app, the main work horse of this server
const port = 5000;                  //Save the port number where your server will be listening

//Idiomatic expression in express to route and respond to a client request
app.use(express.static('public'));
app.use('/styles', express.static(__dirname + 'public/styles'));
app.use('/scripts', express.static(__dirname + 'public/scripts'));
app.get('/', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile(__dirname + '/html/loginpage.html');      
	//server responds by sending the index.html file to the client's browser
});
app.get('/index', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile(__dirname + '/html/index.html');      
	//server responds by sending the index.html file to the client's browser
});
app.get('/parameters', (req, res) => {        //get requests to the root ("/") will route here
    res.sendFile(__dirname + '/html/parameters.html');      
	//server responds by sending the index.html file to the client's browser
});

app.listen(port, () => {            //server starts listening for any attempts from a client to connect at port: {port}
    console.log(`Now listening on port ${port}`); 
});