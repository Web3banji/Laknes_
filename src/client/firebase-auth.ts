/**
 * LAKNES Firebase Google Authentication Integration
 * Provides standard, automatic Google Sign-In with real account selection and approval.
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import firebaseConfigFile from '../../firebase-applet-config.json';

let firebaseApp: FirebaseApp | null = null;
let firebaseAuthInstance: Auth | null = null;

export function getFirebaseInstance(): { app: FirebaseApp; auth: Auth } {
  if (!firebaseApp) {
    if (getApps().length > 0) {
      firebaseApp = getApp();
    } else {
      firebaseApp = initializeApp(firebaseConfigFile);
    }
    firebaseAuthInstance = getAuth(firebaseApp);
  }
  return { app: firebaseApp, auth: firebaseAuthInstance! };
}

export interface GoogleAuthResult {
  email: string;
  name?: string;
  picture?: string;
  idToken?: string;
  firebaseUser: FirebaseUser;
}

/**
 * Initiates the standard Google Sign-In popup flow.
 * Directs user to accounts.google.com to choose their Gmail and approve access.
 */
export async function triggerGoogleSignIn(): Promise<GoogleAuthResult> {
  const { auth } = getFirebaseInstance();
  const provider = new GoogleAuthProvider();

  // Add scopes
  provider.addScope('https://www.googleapis.com/auth/userinfo.email');
  provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

  // Ensure user is presented with their Google accounts list to choose their Gmail
  provider.setCustomParameters({
    prompt: 'select_account',
  });

  const result = await signInWithPopup(auth, provider);
  const user = result.user;
  const idToken = await user.getIdToken();

  return {
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'Elysian Member',
    picture: user.photoURL || undefined,
    idToken,
    firebaseUser: user,
  };
}
