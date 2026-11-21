import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Pressable, Text } from 'react-native';
import { AuthProvider, useAuth } from '../lib/AuthContext';
import { APP_NAME } from '../lib/config';
import { NutritionProvider, useNutrition } from '../lib/NutritionContext';
import { supabase } from '../lib/supabase';

function RootNavigator() {
  const { session, loading } = useAuth();
  const { clearResult } = useNutrition();

  // Don't leave one user's scan results in memory after they log out
  useEffect(() => {
    if (!loading && !session) clearResult();
  }, [session, loading]);

  if (loading) return null; // wait until we know if someone is logged in

  return (
    <Stack>
      {/* Only reachable when logged in */}
      <Stack.Protected guard={!!session}>
        <Stack.Screen
          name="index"
          options={{
            title: APP_NAME,
            headerRight: () => (
              <Pressable onPress={() => supabase.auth.signOut()}>
                <Text style={{ color: '#1a73e8', fontWeight: '600' }}>Log out</Text>
              </Pressable>
            ),
          }}
        />
        <Stack.Screen name="dish" options={{ title: 'Nutrition' }} />
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
      <NutritionProvider>
        <RootNavigator />
      </NutritionProvider>
    </AuthProvider>
  );
}