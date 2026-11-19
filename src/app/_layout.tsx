import { Stack } from 'expo-router';
import NotificationOpener from '../components/NotificationOpener';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { DocumentsProvider } from '../lib/DocumentsContext';
import { NutritionProvider } from '../lib/NutritionContext';

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) return null; // wait until we know if someone is logged in

  return (
    <>
      <NotificationOpener />
      <Stack>
        {/* Only reachable when logged in */}
        <Stack.Protected guard={!!session}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="group" options={{ title: 'Documents' }} />
          <Stack.Screen name="add" options={{ title: 'Add Document' }} />
          <Stack.Screen name="dish" options={{ title: 'Nutrition' }} />
        </Stack.Protected>

        {/* Only reachable when logged out */}
        <Stack.Protected guard={!session}>
          <Stack.Screen name="login" options={{ title: 'Welcome', headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DocumentsProvider>
        <NutritionProvider>
          <RootNavigator />
        </NutritionProvider>
      </DocumentsProvider>
    </AuthProvider>
  );
}