import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDate } from '../lib/dates';
import { badgeInfo } from '../lib/groups';
import type { VaultDocument } from '../types/document';

export default function DocumentCard({ doc }: { doc: VaultDocument }) {
  const router = useRouter();
  const badge = badgeInfo(doc.expiryDate);

  return (
    <Pressable
      style={styles.card}
      onPress={() => router.push({ pathname: '/add', params: { id: doc.id } })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{doc.name}</Text>
        <Text style={styles.sub}>
          {doc.category}
          {doc.expiryDate ? ` · ${formatDate(new Date(doc.expiryDate))}` : ''}
        </Text>
      </View>
      <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  title: { fontSize: 17, fontWeight: '600' },
  sub: { color: '#666', marginTop: 4 },
  badge: { fontWeight: '600' },
});