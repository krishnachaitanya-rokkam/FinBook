import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile, onAuthStateChanged, User } from 'firebase/auth';
import { AuthUser } from '../types';
import { firebaseAuth } from './firebase';

function mapUser(user: User): AuthUser {
  return { id: user.uid, email: user.email || '', name: user.displayName || user.email?.split('@')[0] || 'FinBook User', avatarUrl: user.photoURL || undefined, provider: 'email', lastLogin: Date.now() };
}
export function getStoredUser(): AuthUser | null { return null; }
export function setStoredUser(_user: AuthUser | null): void {}
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void { return onAuthStateChanged(firebaseAuth, user => callback(user ? mapUser(user) : null)); }
export async function loginUser(email: string, password: string) { try { const c = await signInWithEmailAndPassword(firebaseAuth, email, password); return { success: true, user: mapUser(c.user) }; } catch (err: any) { return { success: false, error: friendlyAuthError(err?.code) }; } }
export async function signupUser(email: string, password: string, name?: string) { try { const c = await createUserWithEmailAndPassword(firebaseAuth, email, password); if (name?.trim()) await updateProfile(c.user, { displayName: name.trim() }); return { success: true, user: mapUser(c.user) }; } catch (err: any) { return { success: false, error: friendlyAuthError(err?.code) }; } }
function friendlyAuthError(code?: string): string { switch (code) { case 'auth/email-already-in-use': return 'An account already exists with this email.'; case 'auth/invalid-credential': return 'Incorrect email or password.'; case 'auth/weak-password': return 'Password must be at least 6 characters.'; case 'auth/invalid-email': return 'Please enter a valid email address.'; case 'auth/too-many-requests': return 'Too many attempts. Please try again later.'; default: return 'Unable to complete authentication. Please try again.'; } }
export async function logoutUser(): Promise<void> { await signOut(firebaseAuth); }
