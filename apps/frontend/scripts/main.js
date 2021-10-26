
var rhit = rhit || {};

//Save

rhit.initialPage = null;
rhit.parametersPage = null;
function htmlToElement(html) {
	var template = document.createElement('template');
	html = html.trim();
	template.innerHTML = html;
	return template.content.firstChild;
}
   


rhit.InitialPageController = class {
	constructor() {
		// document.querySelectorAll("#submitAddQuote").onclick = (event) => {
		// 	console.log("submit");
		// };
		document.querySelector("#initSubmit").addEventListener("click", (event) => {
			console.log("pog");
			var x = document.querySelector("#typeNumber");
			console.log(x.value);
			window.location.href = `/parameters.html?int=${x.value}`;
		});

	}
}


rhit.ParameterPageController = class {
	constructor(int) {
		this.int = int;

		this.updateList();
		

	}

	updateList(){
		const newList = htmlToElement('<div id="parameterContainer"></div>');
		newList.appendChild(htmlToElement('<div class="row"> <div class= "col-3">Parameter Name</div> <div class= "col-2">Default Value</div> <div class= "col-2">Min Value</div> <div class= "col-2">Max Value</div> <div class= "col-2">Increment Value</div></div>'))
		for(let i = 0; i < this.int; i++) {
			const newCard = this._createCard(i);
			newCard.onclick = (event) => {
				console.log(`You clicked on ${i}`);
			}
			newList.appendChild(newCard);
		}
		newList.appendChild(htmlToElement('<div class="justify-content-center align-items-center">Executable Script/Command</div>'));
		newList.appendChild(htmlToElement('<div class="form-outline justify-content-center align-items-center d-flex"><input type="text" id="typeText parameterName${int}" class="form-control" /></div>'));

		const oldList = document.querySelector("#parameterContainer");
		oldList.removeAttribute("id");
		oldList.hidden = true;

		oldList.parentElement.append(newList);
	}
	_createCard(int) {
		return htmlToElement(`<div class="row">
		<div class="col-3 form-outline justify-content-center align-items-center d-flex">
			<input type="text" id="typeText parameterName${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="typeNumber defaultValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="typeNumber minValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="typeNumber maxValue${int}" class="form-control" />
		</div>

		<div class="col-2 form-outline justify-content-center align-items-center d-flex">
		  <input type="number" id="typeNumber incValue${int}" class="form-control" />
		</div>
	  </div>`);
	}
}
rhit.ParameterManager = class {
	constructor() {
	}
	beginListening(changeListener) {
		changeListener();
	}
	stopListening() {
	  this._unsubscribe();
	}

}
   
   

// rhit.InitialPageManager = class {
// 	constructor() {
// 		console.log("pogchamp");
// 	  this._documentSnapshots = [];
// 	  this._ref = firebase.firestore().collection(rhit.FB_COLLECTION_MOVIEQUOTES);
// 	  this._unsubscribe = null;
// 	}
// 	add(quote, movie) {
// 		// Add a new document with a generated id.
// 		this._ref.add({
//    			[rhit.FB_KEY_QUOTE]: quote,
// 			[rhit.FB_KEY_MOVIE]: movie,
// 			[rhit.FB_KEY_LAST_TOUCHED]: firebase.firestore.Timestamp.now()
// 		})
// 		.then(function(docRef) {
//     		console.log("Document written with ID: ", docRef.id);
// 		})
// 		.catch(function(error) {
//     		console.error("Error adding document: ", error);
// 		});
// 	}
// 	beginListening(changeListener) {
// 		this._unsubscribe = this._ref.orderBy(rhit.FB_KEY_LAST_TOUCHED, "desc").onSnapshot((querySnapshot) => {
// 			this._documentSnapshots = querySnapshot.docs;
// 			changeListener();
//     	});
// 	}
// 	stopListening() {
// 		this._unsubscribe();
// 	}
// 	// update(id, quote, movie) {    }
// 	// delete(id) { }
// 	get length() {
// 		return this._documentSnapshots.length;
// 	}
// 	getMovieQuoteAtIndex(index) { 
// 		const docSnapshot = this._documentSnapshots[index];
// 		const mq = new rhit.MovieQuote(
// 			docSnapshot.id,
// 			docSnapshot.get(rhit.FB_KEY_QUOTE),
// 			docSnapshot.get(rhit.FB_KEY_MOVIE),
			
// 		)
// 		return mq;
// 	}
//    }
   
/* Main */
/** function and class syntax examples */
rhit.main = function () {
	console.log("Ready");
	if(document.querySelector("#initialPage")) {
		console.log("You are on the initial page");
		//rhit.intialPageManager = new rhit.InitialPageManager();
		new rhit.InitialPageController();

	}

	if(document.querySelector("#parametersPage")) {
		console.log("You are on the parameters page");
		// mqid = rhit.storage.getMovieQuoteId();
		const queryString = window.location.search;
		const urlParams = new URLSearchParams(queryString);
		const int = urlParams.get("int");
		console.log(`Detail page for ${int}`);
		if(!int) {
			window.location.href="/";
		}
		new rhit.ParameterPageController(int);
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

rhit.main();
