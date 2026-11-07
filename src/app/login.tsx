import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) Alert.alert('Login failed', error.message);
  };

  const signUp = async () => {
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      Alert.alert('Sign up failed', error.message);
    } else if (!data.session) {
      Alert.alert('Check your email', 'We sent you a confirmation link. Confirm it, then log in.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Paperwork Vault 🔐</Text>
      <Text style={styles.subtitle}>Sign in to access your documents</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      {busy ? (
        <ActivityIndicator style={{ marginTop: 16 }} />
      ) : (
        <>
          <Pressable style={styles.primaryBtn} onPress={signIn}>
            <Text style={styles.primaryText}>Log in</Text>
          </Pressable>
          <Pressable style={styles.secondaryBtn} onPress={signUp}>
            <Text style={styles.secondaryText}>Create account</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, gap: 12 },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { color: '#666', textAlign: 'center', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, backgroundColor: 'white' },
  primaryBtn: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 8 },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderWidth: 1, borderColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center' },
  secondaryText: { color: '#1a73e8', fontWeight: '600', fontSize: 16 },
});