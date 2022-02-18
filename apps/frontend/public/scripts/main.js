//Save
var integerParams = 0;
var floatParams = 0;
var arrayParams = 0;
var booleParams = 0;
var fileParams = 0;

function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}

function paramJSONSingleVal(paramName, val, type) {
	var parsedVal;
	if (type == "array") {
		parsedVal = JSON.parse(val);
	} else if (type == "boolean") {
		parsedVal = (val === 'true');
	} else if (type == "file") {
		parsedVal = val;
	}
	var param = {
		"paramName": paramName,
		"value": parsedVal,
		"type": type
	}
	return param;


}

function paramJSONMultVals(paramName, defaultVal, minVal, maxVal, incrementVal, type) {

	var parsedDef;
	var parsedMin;
	var parsedMax;
	var parsedInc;
	if (type == "float") {
		parsedDef = parseFloat(defaultVal);
		parsedMin = parseFloat(minVal);
		parsedMax = parseFloat(maxVal);
		parsedInc = parseFloat(incrementVal);
		if (isNaN(parsedDef) || isNaN(parsedMin) || isNaN(parsedMax) || isNaN(parsedInc)) {
			throw new TypeError();
		}
	} else if (type == "int") {
		parsedDef = parseInt(defaultVal);
		parsedMin = parseInt(minVal);
		parsedMax = parseInt(maxVal);
		parsedInc = parseInt(incrementVal);
		if (isNaN(parsedDef) || isNaN(parsedMin) || isNaN(parsedMax) || isNaN(parsedInc)) {
			throw new TypeError();
		}
	}

	var param = {
		"paramName": paramName,
		"values": [defaultVal,
			minVal,
			maxVal,
			incrementVal
		],
		"type": type
	}
	return param;
}

function createUser(username, password) {

}

function checkUser(username, password) {

}


function experimentParamsJSON(paramsArr, experimentName, user, verboseBool) {

	const params = {
		"experimentName": experimentName,
		"user": user,
		"parameters": paramsArr,
		"verbose": verboseBool
	};
	return params;

}

function loginQueryJSON (username, password){
	const userProfile = {
		"email" : username, 
		"password" : password
	}

	return userProfile
}


function ValidateEmail(email) 
{
 if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email))
  {
	  console.log("invalid email")
    return (true)
  }
    alert("You have entered an invalid email address!")
	console.log("invalid email")
    return (false)
}
LoginPageController = class {
	constructor() {
		//this is for creating a user 
		document.querySelector("#submitCreateUser").addEventListener("click", (event) => {
			var username = document.querySelector("#newUsername").value;
			var password = document.querySelector("#newPassword").value;
			console.log("new user created!", username, password);
			console.log(" i am in the fetch")
			if(ValidateEmail(username)==false){
				return;
			}
			var params = loginQueryJSON(username, password);
			var profile = JSON.stringify(params);
			
			fetch(`/createuser`, {
				method: 'POST',
				headers : {
					"Content-Type" : 'application/json'
				},
				body: profile}).catch(err => console.log(err)) //TODO: 
		});

		//adding a user 
		document.querySelector("#login").addEventListener("click", (event) => {
			var username = document.querySelector("#username").value;
			var password = document.querySelector("#password").value;

			var params = loginQueryJSON(username, password);
			var profile = JSON.stringify(params);
			//
			fetch(`/validateuser`, {
				method: 'POST',
				headers : {
					"Content-Type" : 'application/json'
				},
				body: profile}).then((response) => {
					console.log("front end validate")
					//console.log(response.json())
					response.json().then((data) => {
						console.log("inside data")
						console.log(data.boolean)
						if(data.boolean){
							window.location.assign('index?user=' + username)
						}
						//
					})
					//console.log("res bool")
					//console.log(res.boolean)
					//if(res.boolean){
						
					//}

					

				}).catch(err => console.log(err))

		});
	}

}

LoginManager = class {
	constructor() {}
	beginListening(changeListener) {
		changeListener();
	}
	stopListening() {
		this._unsubscribe();
	}

}




ParameterPageController = class {
	constructor(user) {
		this.user = user;
		this.int = 0;

		document.querySelector("#paramSubmit").addEventListener("click", (event) => {
			// 		var dict = {"one" : [15, 4.5],
			// "two" : [34, 3.3],
			// "three" : [67, 5.0],
			// "four" : [32, 4.1]};
			var array = [];

			for (let i = 0; i < integerParams; i++) {
				console.log("#integerParamName" + i);
				var paramName = document.querySelector('#integerParamName' + i).value;
				var defVal = document.querySelector("#integerDefaultValue" + i).value
				var minVal = document.querySelector("#integerMinValue" + i).value
				var maxVal = document.querySelector("#integerMaxValue" + i).value
				var incVal = document.querySelector("#integerIncValue" + i).value
				var param = paramJSONMultVals(paramName, defVal, minVal, maxVal, incVal, "integer");


				array.push(param);
			}
			for (let i = 0; i < floatParams; i++) {
				console.log("#floatParamName" + i);
				var paramName = document.querySelector('#floatParamName' + i).value;
				var defVal = document.querySelector("#floatDefaultValue" + i).value
				var minVal = document.querySelector("#floatMinValue" + i).value
				var maxVal = document.querySelector("#floatMaxValue" + i).value
				var incVal = document.querySelector("#floatIncValue" + i).value
				var param = paramJSONMultVals(paramName, defVal, minVal, maxVal, incVal, "float");


				array.push(param);
			}
			for (let i = 0; i < arrayParams; i++) {
				var paramName = document.querySelector('#arrayParamName' + i).value;
				var val = document.querySelector('#arrayValues' + i).value;
				var param = paramJSONSingleVal(paramName, val, "array");

				array.push(param);
			}
			for (let i = 0; i < booleParams; i++) {
				var paramName = document.querySelector('#booleParamName' + i).value;
				var val = document.querySelector('#booleValue' + i).value;
				var param = paramJSONSingleVal(paramName, val, "boolean");

				array.push(param);
			}
			for (let i = 0; i < arrayParams; i++) {
				var paramName = document.querySelector('#fileParamName' + i).value;
				var val = document.querySelector('#filePath' + i).value;
				var param = paramJSONSingleVal(paramName, val, "file");

				array.push(param);
			}
			var name = document.querySelector('#expName').value;
			var verbose = document.querySelector('#verboseBool').checked;
			var params = experimentParamsJSON(array, name, this.user, verbose);
			var executable = JSON.stringify(params);
			//this.download(executable, 'exp.json', 'json');

			// Creating a XHR object
			//let xhr = new XMLHttpRequest();
			//let url = "https://194.195.213.242:5000/experiment";
			let url = "http://localhost:5005/parameters";
			// fetch(`/`, {
			// 	mode: 'no-cors',
			// 	cache: 'no-cache'}).then(data=>{console.log(data)})

			console.log(executable);


			fetch(`/parameters`, {
				method: 'POST',
				headers: {
					"Content-Type": 'application/json'
				},
				body: executable
			}).catch(err => console.log(err))

			// open a connection
			//			xhr.open("POST", url, true);
			//
			//			// Set the request header i.e. which type of content you are sending
			//			xhr.setRequestHeader("Content-Type", "application/json");
			//
			//			// Create a state change callback
			//			xhr.onreadystatechange = function () {
			//				if (xhr.readyState === 4 && xhr.status === 200) {
			//					// Print received data from server
			//					result.innerHTML = this.responseText;
			//				}
			//			};
			//
			//			xhr.send(executable);
		});
		document.querySelector("#addIntegerBtn").addEventListener("click", (event) => {

			this.updateList(0);

		})
		document.querySelector("#addFloatBtn").addEventListener("click", (event) => {

			this.updateList(1);

		})
		document.querySelector("#addArrayBtn").addEventListener("click", (event) => {

			this.updateList(2);

		})
		document.querySelector("#addBooleanBtn").addEventListener("click", (event) => {
			this.updateList(3);

		})
		document.querySelector("#addFileBtn").addEventListener("click", (event) => {
			this.updateList(4);

		})
		document.querySelector("#remIntegerBtn").addEventListener("click", (event) => {
			integerParams = integerParams - 2;
			console.log("integer");
			this.int = this.int - 2;
			this.updateList(0);
		})
		document.querySelector("#remFileBtn").addEventListener("click", (event) => {
			fileParams = fileParams - 2;
			console.log("file");
			this.int = this.int - 2;
			this.updateList(4);
		})
		document.querySelector("#remBooleanBtn").addEventListener("click", (event) => {
			booleParams = booleParams - 2;
			console.log("boole");
			this.int = this.int - 2;
			this.updateList(3);
		})
		document.querySelector("#remArrayBtn").addEventListener("click", (event) => {
			arrayParams = arrayParams - 2;
			console.log("array");
			this.int = this.int - 2;
			this.updateList(2);
		})
		document.querySelector("#remFloatBtn").addEventListener("click", (event) => {
			floatParams = floatParams - 2;
			console.log("float");
			this.int = this.int - 2;
			this.updateList(1);
		})









	}

	updateList(type) {
		var newList;
		var id;
		if (type == 0) {
			this.int = this.int + 1;
			integerParams = integerParams + 1;
			//Integer
			//
			//
			newList = htmlToElement('<div id="integerContainer"></div>');
			if (integerParams != 0) {
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Integer Parameters</div></div>'));
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-2">Default Value</div> <div class= "col-2">Min Value</div> <div class= "col-2">Max Value</div> <div class= "col-2">Increment Value</div></div>'));

			}
			id = "#integerContainer";
			for (var i = 0; i < integerParams; i++) {
				const newCard = this._createCard(0, i);
				newList.appendChild(newCard);
			}
			var oldList = document.querySelector(id);
			oldList.removeAttribute("id");
			oldList.hidden = true;
			oldList.parentElement.append(newList);
		} else if (type == 1) {
			this.int = this.int + 1;
			floatParams = floatParams + 1;

			//		Float
			//
			//
			newList = htmlToElement('<div id="floatContainer"></div>');
			if (floatParams != 0) {
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Float Parameters</div></div>'));
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-2">Default Value</div> <div class= "col-2">Min Value</div> <div class= "col-2">Max Value</div> <div class= "col-2">Increment Value</div></div>'));
			}
			id = "#floatContainer";
			for (var i = 0; i < floatParams; i++) {
				const newCard = this._createCard(1, i);
				newList.appendChild(newCard);
			}
			oldList = document.querySelector(id);
			oldList.removeAttribute("id");
			oldList.hidden = true;
			oldList.parentElement.append(newList);
		} else if (type == 2) {
			this.int = this.int + 1;
			arrayParams = arrayParams + 1;

			//		Array
			//
			//

			newList = htmlToElement('<div id="arrayContainer"></div>');
			if (arrayParams != 0) {
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Array Parameters</div></div>'));
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-8">Values</div></div>'));
			}
			id = "#arrayContainer";
			for (var i = 0; i < arrayParams; i++) {
				const newCard = this._createCard(2, i);
				newList.appendChild(newCard);
			}
			oldList = document.querySelector(id);
			oldList.removeAttribute("id");
			oldList.hidden = true;
			oldList.parentElement.append(newList);
		} else if (type == 3) {
			this.int = this.int + 1;
			booleParams = booleParams + 1;

			//		Boolean
			//
			//
			newList = htmlToElement('<div id="booleContainer"></div>');
			if (booleParams != 0) {
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Boolean Parameters</div></div>'));
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-2">Value</div></div>'));
			}
			id = "#booleContainer";
			for (var i = 0; i < booleParams; i++) {
				const newCard = this._createCard(3, i);
				newList.appendChild(newCard);
			}
			oldList = document.querySelector(id);
			oldList.removeAttribute("id");
			oldList.hidden = true;
			oldList.parentElement.append(newList);
		} else if (type == 4) {
			this.int = this.int + 1;
			fileParams = fileParams + 1;
			// File
			//
			//
			newList = htmlToElement('<div id="fileContainer"></div>');
			if (fileParams != 0) {
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">File Parameters</div></div>'));
				newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-8">File path</div></div>'));
			}
			id = "#fileContainer";
			for (var i = 0; i < fileParams; i++) {
				const newCard = this._createCard(4, i);
				newList.appendChild(newCard);
			}
			oldList = document.querySelector(id);
			oldList.removeAttribute("id");
			oldList.hidden = true;
			oldList.parentElement.append(newList);
		}


		newList = htmlToElement('<div id="experimentName"></div>');
		newList.appendChild(htmlToElement('<div class="justify-content-center align-items-center">Experiment Name</div>'))
		id = "#experimentName";
		newList.appendChild(htmlToElement('<div class="form-outline justify-content-center align-items-center d-flex"><input type="text" id="expName" class="form-control" /></div>'));
		oldList = document.querySelector(id);
		oldList.removeAttribute("id");
		oldList.hidden = true;
		oldList.parentElement.append(newList);

	}
	_createCard(type, int) {
		if (type == 0) {
			return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="integerParamName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="integerDefaultValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="integerMinValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="integerMaxValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="integerIncValue${int}" class="form-control" />
		</div>

	  </div>`);
		} else if (type == 1) {
			return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="floatParamName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="floatDefaultValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="floatMinValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="floatMaxValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="floatIncValue${int}" class="form-control" />
		</div>

	  </div>`);
		} else if (type == 2) {
			return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="arrayParamName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="text" id="arrayValues${int}" class="form-control" />
		</div>
	  </div>`);
		} else if (type == 3) {
			return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="booleParamName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="text" id="booleValue${int}" class="form-control" />
		</div>
	  </div>`);
		} else if (type == 4) {
			return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="fileParamName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="text" id="filePath${int}" class="form-control" />
		</div>
	  </div>`);
		}

	}
}
ParameterManager = class {
	constructor() {}
	beginListening(changeListener) {
		changeListener();
	}
	stopListening() {
		this._unsubscribe();
	}

}

/* Main */
/** function and class syntax examples */
main = function () {
	console.log("Ready");
	if (document.querySelector("#loginPage")) {
		console.log("You are on the login page");

		new LoginPageController();
	}

	if (document.querySelector("#parametersPage")) {
		console.log("You are on the parameters page");
		// mqid = rhit.storage.getMovieQuoteId();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const user = urlParams.get("user");
		console.log(`Detail page for ${user}`);
		if (!user) {
			window.location.href = "/";
		}
		new ParameterPageController(user);
	}

	// const ref = firebase.firestore().collection("MovieQuotes");
	// ref.onSnapshot((querySnap) => {

	// 	querySnap.forEach((doc) => {
	// 		console.log(doc.data());
	// 	})
	// })
	// ref.add({
	// 	quote: "popping off",
	// 	movie: "GamerPogchamp"

	// })

};

main();