import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import DocumentCard from '../components/DocumentCard';
import { useDocuments } from '../lib/DocumentsContext';
import { GROUPS, groupOf, sortByExpiry } from '../lib/groups';

export default function GroupScreen() {
  const { name } = useLocalSearchParams<{ name?: string }>();
  const { documents } = useDocuments();

  const group = GROUPS.find((g) => g.key === name);
  const items = sortByExpiry(documents.filter((d) => group && groupOf(d.category) === group.key));

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: group ? `${group.emoji} ${group.title}` : 'Documents' }} />

      {items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>Go back and tap "+ Add document" to add one.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => <DocumentCard doc={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold' },
  emptyText: { color: '#666', textAlign: 'center' },
});