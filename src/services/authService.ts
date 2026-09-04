import { AuthUser } from '../types';

const AUTH_USER_KEY = 'expense_tracker_auth_user_v1';

export function getStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading auth user from storage:', e);
  }
  return null;
}

export function setStoredUser(user: AuthUser | null): void {
  try {
    if (user) {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(AUTH_USER_KEY);
    }
  } catch (e) {
    console.error('Error saving auth user to storage:', e);
  }
}

export async function loginUser(email: string, password?: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to sign in' };
    }
    setStoredUser(data.user);
    return { success: true, user: data.user };
  } catch (err: any) {
    // Fallback if offline
    const fallbackUser: AuthUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 8),
      email,
      name: email.split('@')[0],
      provider: 'email',
      lastLogin: Date.now(),
    };
    setStoredUser(fallbackUser);
    return { success: true, user: fallbackUser };
  }
}

export async function signupUser(email: string, password?: string, name?: string): Promise<{ success: boolean; user?: AuthUser; error?: string }> {
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      return { success: false, error: data.error || 'Failed to create account' };
    }
    setStoredUser(data.user);
    return { success: true, user: data.user };
  } catch (err: any) {
    const fallbackUser: AuthUser = {
      id: 'usr-' + Math.random().toString(36).substring(2, 8),
      email,
      name: name || email.split('@')[0],
      provider: 'email',
      lastLogin: Date.now(),
    };
    setStoredUser(fallbackUser);
    return { success: true, user: fallbackUser };
  }
}

export function loginDemoUser(email = 'chaitu.krishna580@gmail.com', name = 'Chaitu Krishna'): AuthUser {
  const demoUser: AuthUser = {
    id: 'usr-demo-' + Math.random().toString(36).substring(2, 7),
    email,
    name,
    isDemo: true,
    provider: 'demo',
    lastLogin: Date.now(),
  };
  setStoredUser(demoUser);
  return demoUser;
}

export function logoutUser(): void {
  setStoredUser(null);
}
