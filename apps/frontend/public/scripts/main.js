//Save
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
				window.location.assign('/');
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
				this.signIn(email, password);
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
				console.log(response);
				window.location.assign('index?user=' + email);
			})
			.catch((err) => {
				console.log(err);
			});
	}
	signOut() {
		this._user = null;
		supabase.auth.singOut();
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

function paramJSON(paramName, defaultVal, minVal, maxVal, incrementVal) {
	const parsedDef = parseFloat(defaultVal);
	const parsedMin = parseFloat(minVal);
	const parsedMax = parseFloat(maxVal);
	const parsedInc = parseFloat(incrementVal);
	if (
		isNaN(parsedDef) ||
		isNaN(parsedMin) ||
		isNaN(parsedMax) ||
		isNaN(parsedInc)
	) {
		throw new TypeError();
	}
	var param = {
		paramName: paramName,
		values: [defaultVal, minVal, maxVal, incrementVal],
	};
	return param;
}

function experimentParamsJSON(paramsArr, experimentName, user, verboseBool) {
	const params = {
		experimentName: experimentName,
		user: user,
		parameters: paramsArr,
		verbose: verboseBool,
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

// LoginManager = class {
// 	constructor() {}
// 	beginListening(changeListener) {
// 		changeListener();
// 	}
// 	stopListening() {
// 		this._unsubscribe();
// 	}
// };
glados.InitialPageController = class {
	constructor(user) {
		this.user = user;
		console.log(user + ' is logged in');
		// document.querySelectorAll("#submitAddQuote").onclick = (event) => {
		// 	console.log("submit");
		// };
		document.querySelector('#initSubmit').addEventListener('click', (event) => {
			console.log('pog');
			var x = document.querySelector('#typeNumber').value;
			location.assign('parameters?int=' + x + '&user=' + this.user);
		});
	}
};

glados.ParameterPageController = class {
	constructor(int, user) {
		this.int = int;
		this.user = user;

		document
			.querySelector('#paramSubmit')
			.addEventListener('click', (event) => {
				// 		var dict = {"one" : [15, 4.5],
				// "two" : [34, 3.3],
				// "three" : [67, 5.0],
				// "four" : [32, 4.1]};
				var array = [];

				for (let i = 0; i < this.int; i++) {
					console.log('#paramName' + i);
					var paramName = document.querySelector('#paramName' + i).value;
					var defVal = document.querySelector('#defaultValue' + i).value;
					var minVal = document.querySelector('#minValue' + i).value;
					var maxVal = document.querySelector('#maxValue' + i).value;
					var incVal = document.querySelector('#incValue' + i).value;
					var param = paramJSON(paramName, defVal, minVal, maxVal, incVal);

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
				let url = 'http://localhost:5005/parameters';
				// fetch(`/`, {
				// 	mode: 'no-cors',
				// 	cache: 'no-cache'}).then(data=>{console.log(data)})

				console.log(executable);

				fetch(`/parameters`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: executable,
				}).catch((err) => console.log(err));

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

		document.querySelector('#fab').addEventListener('click', (event) => {
			var x = parseInt(this.int, 10) + 1;
			window.location.assign('parameters.html?int=' + x);
		});

		this.updateList();
	}

	updateList() {
		const newList = htmlToElement('<div id="parameterContainer"></div>');
		newList.appendChild(
			htmlToElement(
				'<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-2">Default Value</div> <div class= "col-2">Min Value</div> <div class= "col-2">Max Value</div> <div class= "col-2">Increment Value</div></div>'
			)
		);
		for (let i = 0; i < this.int; i++) {
			const newCard = this._createCard(i);
			newCard.onclick = (event) => {
				console.log(`You clicked on ${i}`);
			};
			newList.appendChild(newCard);
		}
		newList.appendChild(
			htmlToElement(
				'<div class="justify-content-center align-items-center">Experiment Name</div>'
			)
		);
		newList.appendChild(
			htmlToElement(
				'<div class="form-outline justify-content-center align-items-center d-flex"><input type="text" id="expName" class="form-control" /></div>'
			)
		);

		const oldList = document.querySelector('#parameterContainer');
		oldList.removeAttribute('id');
		oldList.hidden = true;

		oldList.parentElement.append(newList);
	}
	_createCard(int) {
		return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="paramName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="defaultValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="minValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="maxValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="incValue${int}" class="form-control" />
		</div>

	  </div>`);
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
/** function and class syntax examples */
glados.main = function () {
	console.log('Ready');

	glados.supaAuth = new glados.SupaAuthManager();
	glados.supaAuth.beginListening(() => {
		console.log('AUTH IS NOW LISTENING');
	});

	if (document.querySelector('#loginPage')) {
		glados.loginPageController = new glados.LoginPageController();
	}

	if (document.querySelector('#initialPage')) {
		console.log('You are on the initial page');
		//rhit.intialPageManager = new rhit.InitialPageManager();
		const queryString = location.search;
		const urlParams = new URLSearchParams(queryString);
		const user = urlParams.get('user');
		console.log(`Detail page for ${user}`);
		if (!user) {
			window.location.href = '/';
		}
		glados.initialPageController = new glados.InitialPageController(user);
	}

	if (document.querySelector('#parametersPage')) {
		console.log('You are on the parameters page');
		// mqid = rhit.storage.getMovieQuoteId();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const int = urlParams.get('int');
		const user = urlParams.get('user');
		console.log(`Detail page for ${int}`);
		if (!int || !user) {
			window.location.href = '/index';
		}
		glados.parameterPageController = new glados.ParameterPageController(
			int,
			user
		);
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

glados.main();
