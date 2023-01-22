import React, {
	useState,
	useMemo,
	useEffect,
	useContext,
	createContext,
	useDebugValue,
	FC
} from 'react';
import { firebaseApp } from './firebaseClient';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth'

export interface AuthContextType {
	user: User | null;
	userId: String | null;
	authService; // TODO find a way to make a type for this, ideally without duplicating all the function names
  }

const AuthContext = createContext<AuthContextType>({
	user: null,
	userId: null,
	authService: null
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
	children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [auth, _] = useState(getAuth(firebaseApp));

	const [user, setUser] = useState<User | null>(null);
	useDebugValue(`Current User: ${user}`);
	const [loading, setLoading] = useState(false); // TODO is their loading blocker still a relevant concept for firebase?

	// TODO this duplicates the setting functionality in signInWithEmailAndPassword, but not sure which is best practice now
	useEffect(() => onAuthStateChanged(auth, (newUser) => {
		console.log("OnAuthStateChanged fired", newUser);
		setUser(newUser);
	}), [auth]);

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

		signInWithEmailAndPassword: async (email: string, password: string) => {
			return await signInWithEmailAndPassword(auth, email, password)
			.then((userCredential) => {
				console.log("sign in success, UserCred is ", userCredential);
				setUser(userCredential.user);
			}).catch((error) => {
				console.error('Firebase sign in error', error);
				throw error;
			});
		},
		signUpWithEmailAndPassword: async (email: string, password: string) => {
			return await createUserWithEmailAndPassword(auth, email, password)
			.then((userCredential) => {
				console.log("sign up success, UserCred is ", userCredential);
			}).catch((error) => {
				console.error('Firebase sign up error', error);
				throw error;
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
		<AuthContext.Provider value={{
			user,
			userId: authService?.userId || null,
			authService }
		}>
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
