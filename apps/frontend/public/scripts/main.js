
var integerParams = 0;
var floatParams = 0;
var arrayParams = 0;
var booleParams = 0;

var glados = glados || {};
const SUPABASE_URL = 'http://localhost:8000';
const SUPABASE_KEY =
	'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UiLAogICAgImlhdCI6IDE2NDUwNzQwMDAsCiAgICAiZXhwIjogMTgwMjg0MDQwMAp9.rsAJes09D0KQ_DU_NCyFtOHlu3cSrMaKsFCPVb6pf1M';
var supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

glados.SupaAuthManager = class {
	constructor() {
		this._user = null;
	}
	beginListening(callback) {
		supabase.auth.onAuthStateChange((event, session) => {
			if (event == 'SIGNED_IN') {
				this._user = session.user;
				callback();
			} else if (event == 'SIGNED_OUT') {

			}
		});
	}
	signUp(email, password) {
		supabase.auth
			.signUp({
				email,
				password,
			})
			.then((response) => {
				console.log(response);
				if (response.error == null) {
					this.signIn(email, password);
				} else {
					alert("Account creation failed. Be sure to use the correct email format and password must be more than 6 characters.");
				}

			})
			.catch((err) => {
				console.log(err);
			});
	}
	signIn(email, password) {
		supabase.auth
			.signIn({
				email,
				password,
			})
			.then((response) => {
				if (response.error == null) {
					window.location.assign('parameters?user=' + email);
				}
			})
			.catch((err) => {
				console.log(err);
			});
	}
	signOut() {
		supabase.auth
			.signOut()
			.then((response) => {
				if (response.error == null) {
					window.location.assign('/');
				}
			})

	}
	get uid() {
		return this._user.uid;
	}
	get isSignedIn() {
		return !!this._user;
	}
};

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



function experimentParamsJSON(paramsArr, experimentName, user, verboseBool, fn) {

	const params = {
		"experimentName": experimentName,
		"user": user,
		"parameters": paramsArr,
		"verbose": verboseBool,
		"fileName": fn
	};
	return params;
}

function ValidateEmail(email) {
	if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)) {
		console.log('invalid email');
		return true;
	}
	alert('You have entered an invalid email address!');
	console.log('invalid email');
	return false;
}
glados.LoginPageController = class {
	constructor() {
		//this is for creating a user
		document
			.querySelector('#submitCreateUser')
			.addEventListener('click', (event) => {
				const username = document.querySelector('#newUsername').value;
				const password = document.querySelector('#newPassword').value;
				const pw = document.querySelector('#confirmPass').value;
				if (password === pw) {
					glados.supaAuth.signUp(username, password);
				} else {
					alert("Passwords did not match");
				}
			});

		//adding a user
		document.querySelector('#login').addEventListener('click', (event) => {
			var username = document.querySelector('#username').value;
			var password = document.querySelector('#password').value;
			glados.supaAuth.signIn(username, password);
			//
		});
	}
};



glados.LoginManager = class {
	constructor() {}
	beginListening(changeListener) {
		changeListener();
	}
	stopListening() {
		this._unsubscribe();
	}

}




glados.ParameterPageController = class {
	constructor(user) {
		this.user = user;
		this.int = 0;

		document.querySelector('#menuSignOut').addEventListener("click", (event) =>{
			glados.supaAuth.signOut();
		})

		document.querySelector("#paramSubmit").addEventListener("click", (event) => {
			var array = [];

			for (let i = 0; i < integerParams; i++) {
				console.log("#integerParamName" + i);
				var paramName = document.querySelector('#integerParamName' + i).value;
				var defVal = document.querySelector("#integerDefaultValue" + i).value
				var minVal = document.querySelector("#integerMinValue" + i).value
				var maxVal = document.querySelector("#integerMaxValue" + i).value
				var incVal = document.querySelector("#integerIncValue" + i).value
				console.log(defVal, minVal, maxVal, incVal);
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
				console.log(defVal, minVal, maxVal, incVal);
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
			var name = document.querySelector('#expName').value;
			console.log(name);
			var verbose = document.querySelector('#verboseBool').checked;
			var filename = document.querySelector('#experimentFile').value.replace('C:\\fakepath\\', '');
			console.log(filename)
			var params = experimentParamsJSON(array, name, this.user, verbose, filename);
			var executable = JSON.stringify(params);

			console.log(executable);


			fetch(`/parameters`, {
				method: 'POST',
				headers: {
					"Content-Type": 'application/json'
				},
				body: executable
			}).catch(err => console.log(err))

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
		document.querySelector("#remIntegerBtn").addEventListener("click", (event) => {
			integerParams = integerParams - 2;
			console.log("integer");
			this.int = this.int - 2;
			this.updateList(0);
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
			oldList.parentElement.append(newList);
			oldList.remove();
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
			oldList.parentElement.append(newList);
			oldList.remove();
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
			oldList.parentElement.append(newList);
			oldList.remove();
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
			oldList.parentElement.append(newList);
			oldList.remove();
		}


		newList = htmlToElement('<div id="experimentName"></div>');
		newList.appendChild(htmlToElement('<div class="justify-content-center align-items-center">Experiment Name</div>'))
		id = "#experimentName";
		newList.appendChild(htmlToElement('<div class="form-outline justify-content-center align-items-center d-flex"><input type="text" id="expName" class="form-control" /></div>'));
		oldList = document.querySelector(id);
		oldList.parentElement.append(newList);
		oldList.remove();

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
		}

	}
};
glados.ParameterManager = class {
	constructor() {}
	beginListening(changeListener) {
		changeListener();
	}
	stopListening() {
		this._unsubscribe();
	}
};

/* Main */
glados.main = function () {
	console.log('Ready');

	glados.supaAuth = new glados.SupaAuthManager();
	glados.supaAuth.beginListening(() => {
		console.log('AUTH IS NOW LISTENING');
	});

	if (document.querySelector('#loginPage')) {
		glados.loginPageController = new glados.LoginPageController();
	}

	if (document.querySelector('#parametersPage')) {
		console.log('You are on the parameters page');
		// mqid = rhit.storage.getMovieQuoteId();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const user = urlParams.get('user');
		if (!user) {
			window.location.href = '/';
		}
		glados.parameterPageController = new glados.ParameterPageController(user);
	}
};

glados.main();
