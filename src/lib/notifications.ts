import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { VaultDocument } from '../types/document';
import { formatDate } from './dates';

// Show notifications even while the app is open
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const CHANNEL = 'reminders';
let channelReady: boolean | undefined;

async function ensureChannel() {
  if (Platform.OS !== 'android' || channelReady !== undefined) return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL, {
      name: 'Expiry reminders',
      importance: Notifications.AndroidImportance.HIGH,
    });
    channelReady = true;
  } catch (e) {
    console.log('Notification channel failed, using Android default:', String(e));
    channelReady = false;
  }
}

// Asks for notification permission if needed. Returns true if allowed.
export async function ensurePermission(): Promise<boolean> {
  try {
    await ensureChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (e) {
    console.log('ensurePermission error:', String(e));
    return false;
  }
}

// Fixed identifiers, so rescheduling a document replaces its old reminders.
// "-alarm" is from the removed alarm feature; cancelling it cleans up old test data.
const idsFor = (docId: string) => [`${docId}-7d`, `${docId}-1d`, `${docId}-alarm`];

export async function cancelReminders(docId: string) {
  await Promise.all(
    idsFor(docId).map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
}

export async function syncReminders(doc: VaultDocument) {
  await ensureChannel();
  await cancelReminders(doc.id);
  if (!doc.expiryDate) return;

  const expiry = new Date(doc.expiryDate);
  const nice = formatDate(expiry);
  const at = (daysBefore: number, hour: number, minute: number) =>
    new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate() - daysBefore, hour, minute, 0);

  const jobs = [
    {
      id: `${doc.id}-7d`,
      date: at(7, 9, 0),
      title: `${doc.name} expires in 7 days`,
      body: `Expiry date: ${nice}`,
    },
    {
      id: `${doc.id}-1d`,
      date: at(1, 9, 0),
      title: `${doc.name} expires tomorrow`,
      body: `Expiry date: ${nice}`,
    },
  ];

  const now = Date.now();
  for (const job of jobs) {
    if (job.date.getTime() <= now) continue; // already in the past
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: job.id,
        content: { title: job.title, body: job.body, data: { docId: doc.id }, sound: true },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: job.date,
          ...(channelReady ? { channelId: CHANNEL } : {}),
        },
      });
    } catch (e) {
      console.log(`Could not schedule "${job.title}":`, String(e));
    }
  }
}