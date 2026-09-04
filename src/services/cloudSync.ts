import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  FirestoreError,
} from 'firebase/firestore';
import { firestore } from './firebase';
import { Expense, MonthBudgetConfig } from '../types';

export const EXPENSES_STORAGE_KEY = 'expense_tracker_records_v1';
export const BUDGETS_STORAGE_KEY = 'expense_tracker_budgets_v1';
const CLOUD_META_KEY = 'finbook_cloud_meta_v1';
const LOCAL_MIGRATION_KEY = 'finbook_cloud_migration_v1';

interface CloudPayload {
  expenses: Expense[];
  budgetsMap: Record<string, MonthBudgetConfig>;
  updatedAt?: unknown;
}

export function getUserLocalKeys(uid: string) {
  return {
    expenses: `${EXPENSES_STORAGE_KEY}_${uid}`,
    budgets: `${BUDGETS_STORAGE_KEY}_${uid}`,
  };
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function readUserLocalData(uid: string): CloudPayload {
  const keys = getUserLocalKeys(uid);
  return {
    expenses: readJson<Expense[]>(keys.expenses, []),
    budgetsMap: readJson<Record<string, MonthBudgetConfig>>(keys.budgets, {}),
  };
}

export function writeAppDataFromCloud(uid: string, payload: CloudPayload) {
  const keys = getUserLocalKeys(uid);
  writeJson(keys.expenses, payload.expenses || []);
  writeJson(keys.budgets, payload.budgetsMap || {});

  // Populate the legacy keys used by the existing dashboard before it mounts.
  writeJson(EXPENSES_STORAGE_KEY, payload.expenses || []);
  writeJson(BUDGETS_STORAGE_KEY, payload.budgetsMap || {});
}

function clearLegacyLocalData() {
  localStorage.removeItem(EXPENSES_STORAGE_KEY);
  localStorage.removeItem(BUDGETS_STORAGE_KEY);
  localStorage.removeItem(CLOUD_META_KEY);
}

async function readCloud(uid: string): Promise<CloudPayload | null> {
  const ref = doc(firestore, 'users', uid);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return null;
  const data = snapshot.data() as CloudPayload;
  return {
    expenses: Array.isArray(data.expenses) ? data.expenses : [],
    budgetsMap: data.budgetsMap && typeof data.budgetsMap === 'object' ? data.budgetsMap : {},
    updatedAt: data.updatedAt,
  };
}

export async function initializeUserCloud(uid: string): Promise<CloudPayload> {
  const cloud = await readCloud(uid);
  const migrated = localStorage.getItem(`${LOCAL_MIGRATION_KEY}_${uid}`) === '1';

  if (cloud) {
    writeAppDataFromCloud(uid, cloud);
    localStorage.setItem(`${LOCAL_MIGRATION_KEY}_${uid}`, '1');
    localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ uid, updatedAt: Date.now() }));
    return cloud;
  }

  // The previous prototype seeded demo records under the shared legacy keys.
  // Never upload those records into a brand-new user's cloud account.
  if (!migrated) clearLegacyLocalData();

  const empty: CloudPayload = {
    expenses: migrated ? readUserLocalData(uid).expenses : [],
    budgetsMap: migrated ? readUserLocalData(uid).budgetsMap : {},
  };

  writeAppDataFromCloud(uid, empty);
  localStorage.setItem(`${LOCAL_MIGRATION_KEY}_${uid}`, '1');

  if (!migrated) {
    await setDoc(doc(firestore, 'users', uid), {
      expenses: [],
      budgetsMap: {},
      updatedAt: serverTimestamp(),
    });
  }

  localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ uid, updatedAt: Date.now() }));
  return empty;
}

export async function saveUserCloudData(
  uid: string,
  expenses: Expense[],
  budgetsMap: Record<string, MonthBudgetConfig>
) {
  await setDoc(
    doc(firestore, 'users', uid),
    {
      expenses,
      budgetsMap,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  const keys = getUserLocalKeys(uid);
  writeJson(keys.expenses, expenses);
  writeJson(keys.budgets, budgetsMap);
  localStorage.setItem(CLOUD_META_KEY, JSON.stringify({ uid, updatedAt: Date.now() }));
}

export function subscribeToUserCloud(
  uid: string,
  onRemoteChange: (payload: CloudPayload) => void,
  onError: (message: string) => void
) {
  return onSnapshot(
    doc(firestore, 'users', uid),
    (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data() as CloudPayload;
      onRemoteChange({
        expenses: Array.isArray(data.expenses) ? data.expenses : [],
        budgetsMap: data.budgetsMap && typeof data.budgetsMap === 'object' ? data.budgetsMap : {},
        updatedAt: data.updatedAt,
      });
    },
    (error: FirestoreError) => {
      onError(error.message || 'Cloud sync connection failed.');
    }
  );
}

export function switchAwayFromUser(uid?: string) {
  if (uid) {
    const keys = getUserLocalKeys(uid);
    localStorage.removeItem(keys.expenses);
    localStorage.removeItem(keys.budgets);
  }
  clearLegacyLocalData();
}
