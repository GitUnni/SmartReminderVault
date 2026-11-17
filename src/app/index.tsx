import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useDocuments } from '../lib/DocumentsContext';
import { formatDate } from '../lib/dates';
import type { VaultDocument } from '../types/document';

function badgeInfo(expiryDate: string | null) {
  if (!expiryDate) return { text: 'No expiry', color: '#666' };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((new Date(expiryDate).getTime() - today.getTime()) / 86400000);
  if (days < 0) return { text: `Expired ${-days}d ago`, color: '#b00020' };
  if (days === 0) return { text: 'Expires today', color: '#b00020' };
  if (days <= 30) return { text: `${days} days left`, color: '#e67e00' };
  return { text: `${days} days left`, color: '#2e7d32' };
}

const timeOf = (d: VaultDocument) => (d.expiryDate ? new Date(d.expiryDate).getTime() : Infinity);

export default function HomeScreen() {
  const router = useRouter();
  const { documents, setPendingImageUri } = useDocuments();

  const startAdd = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access to add documents.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;

    setPendingImageUri(result.assets[0].uri);
    router.push('/add');
  };

  // Nearest expiry first; documents without an expiry go to the bottom
  const sorted = [...documents].sort((a, b) => {
    const ta = timeOf(a);
    const tb = timeOf(b);
    if (ta === tb) return 0;
    return ta < tb ? -1 : 1;
  });

  return (
    <View style={styles.container}>
      {sorted.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No documents yet 🔐</Text>
          <Text style={styles.emptyText}>Tap the button below to add your first one.</Text>
        </View>
      ) : (
        <FlatList
          data={sorted}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 12 }}
          renderItem={({ item }) => {
            const badge = badgeInfo(item.expiryDate);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push({ pathname: '/add', params: { id: item.id } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>{item.name}</Text>
                  <Text style={styles.cardSub}>
                    {item.category}
                    {item.expiryDate ? ` · ${formatDate(new Date(item.expiryDate))}` : ''}
                  </Text>
                </View>
                <Text style={[styles.badge, { color: badge.color }]}>{badge.text}</Text>
              </Pressable>
            );
          }}
        />
      )}

      <Pressable style={styles.fab} onPress={startAdd}>
        <Text style={styles.fabText}>+ Add document</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold' },
  emptyText: { color: '#666' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: { fontSize: 17, fontWeight: '600' },
  cardSub: { color: '#666', marginTop: 4 },
  badge: { fontWeight: '600' },
  fab: {
    position: 'absolute',
    bottom: 32,
    alignSelf: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    elevation: 4,
  },
  fabText: { color: 'white', fontWeight: '600', fontSize: 16 },
});