import { Tabs } from 'expo-router';
import { Pressable, Text } from 'react-native';
import { supabase } from '../../lib/supabase';

const icon = (emoji: string) => () => <Text style={{ fontSize: 20 }}>{emoji}</Text>;

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#1a73e8' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'My Vault',
          tabBarLabel: 'Vault',
          tabBarIcon: icon('🔐'),
          headerRight: () => (
            <Pressable onPress={() => supabase.auth.signOut()} style={{ marginRight: 16 }}>
              <Text style={{ color: '#1a73e8', fontWeight: '600' }}>Log out</Text>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Nutrition', tabBarLabel: 'Nutrition', tabBarIcon: icon('🥗') }}
      />
    </Tabs>
  );
}