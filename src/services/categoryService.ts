import { collection, deleteDoc, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { Category } from '../types';
import { firestore } from './firebase';

export type CustomCategory = Category & { createdAt: number };

// Keep custom categories directly under the authenticated user's document.
// Firestore collection paths must contain an odd number of path segments.
const categoriesRef = (uid: string) => collection(firestore, 'users', uid, 'categories');

export function subscribeToCustomCategories(uid: string, onChange: (categories: CustomCategory[]) => void, onError?: (error: Error) => void) {
  return onSnapshot(categoriesRef(uid), snapshot => {
    const categories = snapshot.docs
      .map(d => ({ id: d.id, ...d.data() } as CustomCategory))
      .sort((a, b) => a.name.localeCompare(b.name));
    onChange(categories);
  }, error => onError?.(error));
}

export async function saveCustomCategory(uid: string, category: CustomCategory) {
  await setDoc(doc(categoriesRef(uid), category.id), category);
}

export async function deleteCustomCategory(uid: string, id: string) {
  await deleteDoc(doc(categoriesRef(uid), id));
}
