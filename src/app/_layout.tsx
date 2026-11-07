import { Stack } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { DocumentsProvider } from '../lib/DocumentsContext';
import { supabase } from '../lib/supabase';

function RootNavigator() {
  const { session, loading } = useAuth();

  if (loading) return null; // wait until we know if someone is logged in

  return (
    <Stack>
      {/* Only reachable when logged in */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen
          name="index"
          options={{
            title: 'My Vault',
            headerRight: () => (
              <Pressable onPress={() => supabase.auth.signOut()}>
                <Text style={{ color: '#1a73e8', fontWeight: '600' }}>Log out</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="add" options={{ title: 'Add Document' }} />
      </Stack.Protected>

      {/* Only reachable when logged out */}
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ title: 'Welcome', headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <DocumentsProvider>
        <RootNavigator />
      </DocumentsProvider>
    </AuthProvider>
  );
}