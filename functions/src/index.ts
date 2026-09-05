import { onSchedule } from 'firebase-functions/v2/scheduler';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

const pad = (n: number) => String(n).padStart(2, '0');
const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();

function dueOn(item: any, date: Date) {
  const day = Math.max(1, Math.min(31, Number(item.day) || 1));
  if (item.frequency === 'yearly') {
    const month = Number(item.month) || 1;
    return date.getMonth() + 1 === month && date.getDate() === Math.min(day, daysInMonth(date.getFullYear(), month));
  }
  return date.getDate() === Math.min(day, daysInMonth(date.getFullYear(), date.getMonth() + 1));
}

export const processRecurringTransactions = onSchedule({
  schedule: 'every day 02:00',
  timeZone: 'Asia/Kolkata',
  region: 'asia-south1',
}, async () => {
  const now = new Date();
  const today = dateKey(now);
  const users = await db.collection('users').get();

  for (const user of users.docs) {
    const recurring = await user.ref.collection('recurring').get();
    for (const itemDoc of recurring.docs) {
      const item = itemDoc.data();
      if (!item.active || !item.autoRecord || !dueOn(item, now)) continue;

      const transactionId = `rec-${itemDoc.id}-${today}`;
      const transactionRef = user.ref.collection(item.type === 'income' ? 'incomes' : 'expenses').doc(transactionId);
      const existing = await transactionRef.get();
      if (existing.exists) continue;

      const createdAt = Date.now();
      if (item.type === 'income') {
        await transactionRef.set({
          id: transactionId,
          title: item.title,
          amount: Number(item.amount),
          date: today,
          source: 'Recurring',
          notes: 'Automatically recorded from Recurring & Bills',
          createdAt,
          recurringId: itemDoc.id,
        });
      } else {
        const title = String(item.title || '').toLowerCase();
        const categoryId = /sip|mutual fund|stock|investment|ppf|epf|nps|fd|fixed deposit|gold/.test(title)
          ? 'investment'
          : 'utilities';
        await transactionRef.set({
          id: transactionId,
          title: item.title,
          amount: Number(item.amount),
          categoryId,
          date: today,
          paymentMethod: 'bank_transfer',
          notes: 'Automatically recorded from Recurring & Bills',
          createdAt,
          recurringId: itemDoc.id,
        });
      }

      await itemDoc.ref.update({ lastRecordedDate: today, updatedAt: FieldValue.serverTimestamp() });
    }
  }
});
