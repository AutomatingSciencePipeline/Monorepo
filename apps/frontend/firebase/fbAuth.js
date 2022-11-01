import React, {
	useState,
	useMemo,
	useEffect,
	useContext,
	createContext,
	useDebugValue,
} from 'react';
import { firebaseApp } from './firebaseClient';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
	const [auth, _] = useState(getAuth(firebaseApp));
	const [user, setUser] = useState();
	useDebugValue('Current User:', user);
	const [loading, setLoading] = useState(false); // TODO is their loading blocker still a relevant concept for firebase?

	// TODO this duplicates the setting functionality in signInWithEmailAndPassword, but not sure which is best practice now
	useEffect(() => {
		const unsubscribe = onAuthStateChanged(auth, (newUser) => {
			console.log("OnAuthStateChanged fired", newUser);
			setUser(newUser);
		})

		// can remove this once we're sure it isn't unsubscribing more than needed (does `auth` need to be in useEffect deps and/or state?)
		return () => {
			console.log("ROBDEBUG: Auth Unsubscribe called");
			unsubscribe();
		}
	}, [auth]);

	const authService = {
		userId: useMemo(() => {
			const newVal = user?.uid;
			console.log('userId is now', newVal);
			return newVal;
		}, [user]),

		userEmail: useMemo(() => {
			return user?.email;
		}, [user]),

		userPhotoUrl: useMemo(() => {
			return user?.photoURL;
		}, [user]),

		signInWithEmailAndPassword: async (email, password) => {
			return await signInWithEmailAndPassword(auth, email, password)
			.then((userCredential) => {
				console.log("sign in success, UserCred is ", userCredential);
				setUser(userCredential.user);
			}).catch((error) => {
				console.error('Firebase sign in error', error);
				throw error;
			});
		},
		signUpWithEmailAndPassword: async (email, password) => {
			return await createUserWithEmailAndPassword(auth, email, password)
			.then((userCredential) => {
				console.log("sign up success, UserCred is ", userCredential);
			}).catch((error) => {
				console.error('Firebase sign up error', error);
			});
		},
		signInWithGoogle: async () => {
			console.error("TODO");
		},
		signOut: async () => {
			return await signOut(auth);
		},
	};

	return (
		<AuthContext.Provider value={{ user, authService }}>
			{loading ? (
				<div>
					<h1>Loading...</h1>
				</div>
			) : (
				children
			)}
		</AuthContext.Provider>
	);
};
