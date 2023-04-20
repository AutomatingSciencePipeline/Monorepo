import React, {
	useState,
	useMemo,
	useEffect,
	useContext,
	createContext,
	useDebugValue,
} from 'react';
import { firebaseApp } from './firebaseClient';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import noImage from '../images/NoImage.png';
import { FirebaseError } from 'firebase/app';
import { StaticImageData } from 'next/image';

// We must explicitly type specify the contents of authService because the info gets "lost" when going through the useAuth hook
export interface AuthServiceType {
	userId: string | undefined;
	userEmail: string | null | undefined;
	userPhotoUrl: string | StaticImageData;
	signInWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	signUpWithEmailAndPassword: (email: string, password: string) => Promise<void>;
	signInWithGoogle: () => Promise<void>;
	sendPasswordResetEmail: (email: string) => Promise<void>;
	signOut: () => Promise<void>;
}

export interface AuthContextType {
	user: User | null;
	userId: string | null;
	authService: AuthServiceType;
	loading: boolean;
}

// We know this will become non-null immediately so okay to typecast https://stackoverflow.com/questions/63080452/react-createcontextnull-not-allowed-with-typescript
const AuthContext = createContext({} as AuthContextType);

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

	const authService: AuthServiceType = {
		userId: useMemo(() => {
			const newVal = user?.uid;
			console.log('userId is now', newVal);
			return newVal;
		}, [user]),

		userEmail: useMemo(() => {
			return user?.email;
		}, [user]),

		userPhotoUrl: useMemo(() => {
			return user?.photoURL || noImage;
		}, [user]),

		signInWithEmailAndPassword: async (email: string, password: string) => {
			return await signInWithEmailAndPassword(auth, email, password)
				.then((userCredential) => {
					console.log('sign in success, UserCred is ', userCredential);
				// no need to set state because onAuthStateChanged will pick it up
				}).catch((error: FirebaseError) => {
					console.error('Firebase sign in error', error);
					throw error;
				});
		},

		signUpWithEmailAndPassword: async (email: string, password: string) => {
			return await createUserWithEmailAndPassword(auth, email, password)
				.then((userCredential) => {
					console.log('sign up success, UserCred is ', userCredential);
				}).catch((error: FirebaseError) => {
					console.error('Firebase sign up error', error);
					throw error;
				});
		},

		signInWithGoogle: async () => {
			console.error('TODO');
		},

		sendPasswordResetEmail: async (email: string) => {
			try {
				await sendPasswordResetEmail(auth, email);
			} catch (error) {
				console.error('Firebase password reset error', error);
				throw error;
			}
		},

		signOut: async () => {
			await signOut(auth);
			setUser(null);
		},
	};

	return (
		<AuthContext.Provider value={{
			user,
			userId: authService?.userId || null,
			authService,
			loading,
		}
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
