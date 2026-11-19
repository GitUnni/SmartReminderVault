import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useAuth } from '../lib/AuthContext';
import { useDocuments } from '../lib/DocumentsContext';

// Opens the document's screen when the user taps one of its reminders
export default function NotificationOpener() {
  const router = useRouter();
  const { session } = useAuth();
  const { documents } = useDocuments();
  const response = Notifications.useLastNotificationResponse();
  const handled = useRef<string | null>(null);

  useEffect(() => {
    if (!response || !session) return;
    if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;

    const key = `${response.notification.request.identifier}-${response.notification.date}`;
    if (handled.current === key) return;

    const docId = response.notification.request.content.data?.docId;
    if (typeof docId !== 'string') return;
    // Wait until the saved documents have loaded, then open it
    if (!documents.some((d) => d.id === docId)) return;

    handled.current = key;
    router.push({ pathname: '/add', params: { id: docId } });
  }, [response, session, documents]);

  return null;
}