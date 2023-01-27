import React, {
	useState,
	useMemo,
	useEffect,
	useContext,
	createContext,
	useDebugValue,
} from 'react';
import { firebaseApp } from './firebaseClient';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';

export interface AuthContextType {
	user: User | null;
	userId: String | null;
	authService; // TODO find a way to make a type for this, ideally without duplicating all the function names
  }

const AuthContext = createContext<AuthContextType>({
	user: null,
	userId: null,
	authService: null,
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
	children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
	const [auth] = useState(getAuth(firebaseApp));

	const [user, setUser] = useState<User | null>(null);
	useDebugValue(`Current User: ${user}`);
	const [loading, setLoading] = useState(true);

	useEffect(() => onAuthStateChanged(auth, (newUser) => {
		console.log('OnAuthStateChanged fired', newUser);
		setLoading(false);
		if (newUser) {
			console.log('User is signed in');
			setUser(newUser);
		} else {
			console.log('No user signed in');
		}
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
					console.log('sign in success, UserCred is ', userCredential);
				// no need to set state because onAuthStateChanged will pick it up
				}).catch((error) => {
					console.error('Firebase sign in error', error);
					throw error;
				});
		},
		signUpWithEmailAndPassword: async (email: string, password: string) => {
			return await createUserWithEmailAndPassword(auth, email, password)
				.then((userCredential) => {
					console.log('sign up success, UserCred is ', userCredential);
				}).catch((error) => {
					console.error('Firebase sign up error', error);
					throw error;
				});
		},
		signInWithGoogle: async () => {
			console.error('TODO');
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
					<h1>Authenticating...</h1>
					<p>If you see this text for more than a few seconds, something is wrong.</p>
				</div>
			) : (
				children
			)}
		</AuthContext.Provider>
	);
};
