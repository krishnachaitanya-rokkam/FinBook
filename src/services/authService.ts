import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  onAuthStateChanged,
  User,
  AuthError,
} from 'firebase/auth';
import { AuthUser } from '../types';
import { firebaseAuth } from './firebase';

const AUTH_USER_KEY = 'finbook_auth_user_v1';

function mapUser(user: User): AuthUser {
  return {
    id: user.uid,
    email: user.email || '',
    name: user.displayName || user.email?.split('@')[0] || 'FinBook User',
    avatarUrl: user.photoURL || undefined,
    provider: 'email',
    lastLogin: Date.now(),
  };
}

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_USER_KEY);
  } catch {
    // Storage may be unavailable; Firebase remains the source of truth.
  }
}

export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  return onAuthStateChanged(firebaseAuth, (user) => {
    const mapped = user ? mapUser(user) : null;
    setStoredUser(mapped);
    callback(mapped);
  });
}

export async function loginUser(email: string, password: string) {
  try {
    const c = await signInWithEmailAndPassword(firebaseAuth, email, password);
    const user = mapUser(c.user);
    setStoredUser(user);
    return { success: true, user };
  } catch (err) {
    return { success: false, error: friendlyAuthError(err) };
  }
}

export async function signupUser(email: string, password: string, name?: string) {
  try {
    const c = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    if (name?.trim()) {
      await updateProfile(c.user, { displayName: name.trim() });
    }
    const user = mapUser(c.user);
    setStoredUser(user);
    return { success: true, user };
  } catch (err) {
    return { success: false, error: friendlyAuthError(err) };
  }
}

function friendlyAuthError(error: unknown): string {
  const code = (error as AuthError | undefined)?.code || '';

  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with this email. Use Sign In instead.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a while and try again.';
    case 'auth/operation-not-allowed':
      return 'Email/Password authentication is disabled in Firebase. Enable it under Authentication → Sign-in method.';
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not configured yet. Enable Email/Password authentication in the Firebase Console.';
    case 'auth/unauthorized-domain':
      return 'This site is not authorized in Firebase. Add krishnachaitanya-rokkam.github.io under Authentication → Settings → Authorized domains.';
    case 'auth/network-request-failed':
      return 'Network error while contacting Firebase. Check your connection and try again.';
    case 'auth/invalid-api-key':
      return 'The Firebase API key is invalid or restricted. Check the Firebase project configuration.';
    case 'auth/admin-restricted-operation':
      return 'This authentication operation is restricted for the Firebase project.';
    default:
      console.error('Firebase authentication error:', error);
      return code
        ? `Authentication failed (${code}). Please check the Firebase Authentication setup.`
        : 'Unable to complete authentication. Please try again.';
  }
}

export async function logoutUser(): Promise<void> {
  setStoredUser(null);
  await signOut(firebaseAuth);
}
