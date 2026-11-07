import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  Alert,
  Image,
  Pressable,
  ScrollView, StyleSheet,
  Text, TextInput,
  View,
} from 'react-native';
import { useDocuments } from '../lib/DocumentsContext';
import { CATEGORIES } from '../types/document';

export default function AddScreen() {
  const router = useRouter();
  const {
    documents, addDocument, updateDocument, deleteDocument,
    pendingImageUri, setPendingImageUri,
  } = useDocuments();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // If an id was passed, we are editing an existing document
  const existing = id ? documents.find((d) => d.id === id) : undefined;
  const existingDate = existing ? new Date(existing.expiryDate) : null;

  const [imageUri, setImageUri] = useState<string | null>(
    existing ? existing.imageUri : pendingImageUri
  );
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? CATEGORIES[0]);

  // Date is kept as three separate text fields so it is fully editable.
  // Later, OCR can simply call setDay / setMonth / setYear to prefill them.
  const [day, setDay] = useState(
    existingDate ? String(existingDate.getDate()).padStart(2, '0') : ''
  );
  const [month, setMonth] = useState(
    existingDate ? String(existingDate.getMonth() + 1).padStart(2, '0') : ''
  );
  const [year, setYear] = useState(existingDate ? String(existingDate.getFullYear()) : '');

  const monthRef = useRef<ComponentRef<typeof TextInput>>(null);
  const yearRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Clear the handed-over image so the next "Add document" starts fresh
  useEffect(() => {
    setPendingImageUri(null);
  }, []);

  const onlyDigits = (text: string) => text.replace(/[^0-9]/g, '');

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please allow photo access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  };

  const buildDate = (): Date | null => {
    const d = Number(day);
    const m = Number(month);
    const y = Number(year);
    if (!d || !m || year.length !== 4) return null;
    const date = new Date(y, m - 1, d);
    // Rejects impossible dates like 31/02/2027
    if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) {
      return null;
    }
    return date;
  };

  const save = () => {
    if (!imageUri) {
      Alert.alert('Photo needed', 'Please choose a photo of the document.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your document a name.');
      return;
    }
    const date = buildDate();
    if (!date) {
      Alert.alert('Invalid date', 'Please enter a valid expiry date (DD / MM / YYYY).');
      return;
    }
    const data = {
      name: name.trim(),
      category,
      expiryDate: date.toISOString(),
      imageUri,
    };
    if (existing) updateDocument(existing.id, data);
    else addDocument(data);
    router.back();
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert('Delete document?', `"${existing.name}" will be removed permanently.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteDocument(existing.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: existing ? 'Edit Document' : 'Add Document' }} />

      {/* Photo preview with a close button */}
      {imageUri ? (
        <View style={styles.previewWrap}>
          <Image source={{ uri: imageUri }} style={styles.preview} />
          <Pressable style={styles.closeBtn} onPress={() => setImageUri(null)} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.placeholder} onPress={pickImage}>
          <Text style={styles.placeholderText}>+ Choose a photo</Text>
        </Pressable>
      )}

      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Car insurance"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Category</Text>
      <View style={styles.chips}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCategory(c)}
            style={[styles.chip, category === c && styles.chipActive]}
          >
            <Text style={category === c && styles.chipTextActive}>{c}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Expiry / renewal date</Text>
      <View style={styles.dateRow}>
        <TextInput
          style={[styles.input, styles.dateSmall]}
          placeholder="DD"
          keyboardType="number-pad"
          maxLength={2}
          value={day}
          onChangeText={(t) => {
            const v = onlyDigits(t);
            setDay(v);
            if (v.length === 2) monthRef.current?.focus();
          }}
        />
        <Text style={styles.slash}>/</Text>
        <TextInput
          ref={monthRef}
          style={[styles.input, styles.dateSmall]}
          placeholder="MM"
          keyboardType="number-pad"
          maxLength={2}
          value={month}
          onChangeText={(t) => {
            const v = onlyDigits(t);
            setMonth(v);
            if (v.length === 2) yearRef.current?.focus();
          }}
        />
        <Text style={styles.slash}>/</Text>
        <TextInput
          ref={yearRef}
          style={[styles.input, styles.dateLarge]}
          placeholder="YYYY"
          keyboardType="number-pad"
          maxLength={4}
          value={year}
          onChangeText={(t) => setYear(onlyDigits(t))}
        />
      </View>

      <Pressable style={styles.saveBtn} onPress={save}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>

      {existing && (
        <Pressable style={styles.deleteBtn} onPress={confirmDelete}>
          <Text style={styles.deleteText}>Delete document</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 8 },
  label: { fontWeight: '600', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  previewWrap: { alignSelf: 'center', width: '100%' },
  preview: { width: '100%', height: 260, borderRadius: 12, resizeMode: 'contain', backgroundColor: '#eee' },
  closeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: { color: 'white', fontSize: 16, fontWeight: '700' },
  placeholder: {
    height: 160,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#1a73e8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: { color: '#1a73e8', fontWeight: '600', fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipTextActive: { color: 'white' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateSmall: { width: 64, textAlign: 'center' },
  dateLarge: { width: 96, textAlign: 'center' },
  slash: { fontSize: 20, color: '#666' },
  saveBtn: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveText: { color: 'white', fontWeight: '700', fontSize: 16 },
  deleteBtn: { borderWidth: 1, borderColor: '#b00020', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  deleteText: { color: '#b00020', fontWeight: '700', fontSize: 16 },
});