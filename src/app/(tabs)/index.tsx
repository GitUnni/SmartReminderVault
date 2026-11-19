import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useDocuments } from '../../lib/DocumentsContext';
import { GROUPS, daysUntil, groupOf } from '../../lib/groups';

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

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {documents.length === 0 && (
          <Text style={styles.hint}>Tap "+ Add document" to save your first one 🔐</Text>
        )}

        {GROUPS.map((g) => {
          const items = documents.filter((d) => groupOf(d.category) === g.key);
          // Expired or expiring within 30 days
          const urgent = items.filter((d) => {
            const days = daysUntil(d.expiryDate);
            return days !== null && days <= 30;
          }).length;

          return (
            <Pressable
              key={g.key}
              style={styles.groupCard}
              onPress={() => router.push({ pathname: '/group', params: { name: g.key } })}
            >
              <Text style={styles.emoji}>{g.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.groupTitle}>{g.title}</Text>
                <Text style={styles.groupDesc}>{g.description}</Text>
                <Text style={styles.count}>
                  {items.length} {items.length === 1 ? 'document' : 'documents'}
                </Text>
              </View>
              {urgent > 0 && (
                <View style={styles.urgentPill}>
                  <Text style={styles.urgentText}>{urgent} need attention</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Pressable style={styles.fab} onPress={startAdd}>
        <Text style={styles.fabText}>+ Add document</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  content: { padding: 16, paddingBottom: 110, gap: 14 },
  hint: { textAlign: 'center', color: '#666', marginBottom: 4 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 16,
    elevation: 2,
  },
  emoji: { fontSize: 36 },
  groupTitle: { fontSize: 20, fontWeight: '700' },
  groupDesc: { color: '#666', marginTop: 2 },
  count: { color: '#1a73e8', fontWeight: '600', marginTop: 6 },
  urgentPill: { backgroundColor: '#fff1e0', borderRadius: 12, paddingVertical: 4, paddingHorizontal: 10 },
  urgentText: { color: '#e67e00', fontWeight: '600', fontSize: 12 },
  chevron: { fontSize: 28, color: '#999' },
  fab: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: '#1a73e8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    elevation: 4,
  },
  fabText: { color: 'white', fontWeight: '600', fontSize: 16 },
});