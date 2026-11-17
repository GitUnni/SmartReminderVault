import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView, StyleSheet,
  Text, TextInput,
  View,
} from 'react-native';
import DateField from '../components/DateField';
import { formatDate, formatDetailDate, parseYMD, toYMD } from '../lib/dates';
import { useDocuments } from '../lib/DocumentsContext';
import { supabase } from '../lib/supabase';
import { CATEGORIES, type Detail } from '../types/document';

// Maps the AI's JSON keys to labels shown in the Details card
const FIELD_LABELS: Record<string, Record<string, string>> = {
  medicine: {
    manufacturingDate: 'Manufactured',
    dosage: 'Dosage',
    schedule: 'Schedule (please verify)',
    instructions: 'Instructions',
    batchNumber: 'Batch number',
  },
  identity: { documentName: 'Document', documentNumber: 'Number', holderName: 'Holder' },
  insurance: {
    provider: 'Provider',
    policyNumber: 'Policy number',
    amount: 'Amount',
    holderName: 'Holder',
  },
  other: { description: 'Description' },
};

// AI keys whose values are dates (shown with a date picker)
const DATE_KEYS = ['manufacturingDate'];

const TYPE_TO_CATEGORY: Record<string, string> = {
  medicine: 'Medicine',
  identity: 'ID',
  insurance: 'Insurance',
  other: 'Other',
};

const newId = () => Date.now().toString() + Math.random().toString(36).slice(2, 6);

export default function AddScreen() {
  const router = useRouter();
  const {
    documents, addDocument, updateDocument, deleteDocument,
    pendingImageUri, setPendingImageUri,
    setPendingImageBase64,
  } = useDocuments();
  const { id } = useLocalSearchParams<{ id?: string }>();

  // If an id was passed, we are editing an existing document
  const existing = id ? documents.find((d) => d.id === id) : undefined;

  const [imageUri, setImageUri] = useState<string | null>(
    existing ? existing.imageUri : pendingImageUri
  );
  const [name, setName] = useState(existing?.name ?? '');
  const [category, setCategory] = useState(existing?.category ?? CATEGORIES[0]);
  const [expiry, setExpiry] = useState<Date | null>(
    existing?.expiryDate ? new Date(existing.expiryDate) : null
  );
  const [details, setDetails] = useState<Detail[]>(existing?.details ?? []);

  const [analyzing, setAnalyzing] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const runId = useRef(0); // lets us ignore results from an outdated analysis

  // On first open: clear the handed-over image, and analyze it if it's a new document
  useEffect(() => {
    const uri = pendingImageUri;
    setPendingImageUri(null);
    setPendingImageBase64(null);
    if (!existing && uri) analyze(uri);
  }, []);

  // ---------- Details helpers ----------
  const updateDetail = (detailId: string, patch: Partial<Detail>) =>
    setDetails((prev) => prev.map((d) => (d.id === detailId ? { ...d, ...patch } : d)));

  const removeDetail = (detailId: string) =>
    setDetails((prev) => prev.filter((d) => d.id !== detailId));

  const addDetail = (kind: 'text' | 'date') =>
    setDetails((prev) => [...prev, { id: newId(), label: '', value: '', kind }]);

  const askAddDetail = () => {
    Alert.alert('Add label', 'What kind of detail?', [
      { text: 'Text', onPress: () => addDetail('text') },
      { text: 'Date', onPress: () => addDetail('date') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // ---------- AI ----------
  const applyResult = (r: any) => {
    if (!r || r.type === 'unknown' || !r.type) {
      console.log('AI result:', JSON.stringify(r));
      const why = r?.error ? ` (${String(r.error).slice(0, 220)})` : '';
      setNote(`Couldn't read this automatically. Please fill in the details yourself.${why}`);
      return;
    }
    if (r.type === 'menu') {
      setNote('This looks like a menu. Menu scanning is coming soon. You can still save it manually.');
      return;
    }

    setCategory(TYPE_TO_CATEGORY[r.type] ?? 'Other');
    if (typeof r.name === 'string' && r.name.trim()) setName(r.name.trim());

    const exp = typeof r.expiryDate === 'string' ? parseYMD(r.expiryDate) : null;
    setExpiry(exp);

    const labels = FIELD_LABELS[r.type] ?? {};
    const extracted: Detail[] = [];
    for (const key of Object.keys(labels)) {
      const raw = r[key];
      if (!raw) continue;
      const value = String(raw);
      const isDate = DATE_KEYS.includes(key) && parseYMD(value) !== null;
      extracted.push({ id: newId(), label: labels[key], value, kind: isDate ? 'date' : 'text' });
    }
    setDetails(extracted);

    setNote(
      exp
        ? 'Filled in by AI. Please check everything before saving.'
        : 'Filled in by AI, but no expiry date was found. You can add one below if the item has one.'
    );
  };

  // Shrinks the photo so the upload is small and fast
  const shrink = async (uri: string): Promise<string> => {
    const ctx = ImageManipulator.manipulate(uri);
    ctx.resize({ width: 1280 });
    const img = await ctx.renderAsync();
    const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.6, base64: true });
    return out.base64 as string;
  };

  const analyze = async (uri: string) => {
    const myRun = ++runId.current;
    setAnalyzing(true);
    setNote(null);
    try {
      const base64 = await shrink(uri);
      if (myRun !== runId.current) return;

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out after 45 seconds')), 45000)
      );
      const call = supabase.functions.invoke('bright-service', {
        body: { imageBase64: base64, mediaType: 'image/jpeg' },
      });
      const { data, error } = (await Promise.race([call, timeout])) as any;

      if (myRun !== runId.current) return; // user changed the photo meanwhile
      if (error || !data) throw error ?? new Error('Empty response');
      applyResult(data);
    } catch (e: any) {
      let detail = e?.message ?? 'unknown error';
      try {
        if (e?.context?.text) detail += ' | ' + (await e.context.text());
      } catch {}
      console.log('analyze error:', detail);
      if (myRun === runId.current) {
        setNote(`Couldn't analyze the photo. Please fill in the details yourself. (${detail.slice(0, 160)})`);
      }
    } finally {
      if (myRun === runId.current) setAnalyzing(false);
    }
  };

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
    if (result.canceled) return;
    setImageUri(result.assets[0].uri);
    analyze(result.assets[0].uri);
  };

  const removeImage = () => {
    runId.current++; // cancel any analysis in progress
    setAnalyzing(false);
    setNote(null);
    setImageUri(null);
  };

  // ---------- Save / delete ----------
  const save = () => {
    if (analyzing) {
      Alert.alert('Please wait', 'The photo is still being analyzed.');
      return;
    }
    if (!imageUri) {
      Alert.alert('Photo needed', 'Please choose a photo of the document.');
      return;
    }
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your document a name.');
      return;
    }
    // Drop empty rows; give unnamed rows a default label
    const cleaned = details
      .filter((d) => d.value.trim())
      .map((d) => ({ ...d, label: d.label.trim() || 'Detail', value: d.value.trim() }));

    const data = {
      name: name.trim(),
      category,
      expiryDate: expiry ? expiry.toISOString() : null,
      imageUri,
      details: cleaned,
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
          <Pressable style={styles.closeBtn} onPress={removeImage} hitSlop={8}>
            <Text style={styles.closeText}>✕</Text>
          </Pressable>
        </View>
      ) : (
        <Pressable style={styles.placeholder} onPress={pickImage}>
          <Text style={styles.placeholderText}>+ Choose a photo</Text>
        </Pressable>
      )}

      {analyzing && (
        <View style={styles.banner}>
          <ActivityIndicator />
          <Text style={styles.bannerText}>Analyzing your document…</Text>
        </View>
      )}
      {note && !analyzing && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{note}</Text>
        </View>
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

      <Text style={styles.label}>Details</Text>
      <View style={styles.detailsBox}>
        {/* Expiry row: optional, and used for sorting and reminders */}
        <View style={styles.row}>
          <Text style={styles.fixedLabel}>Expiry / renewal date</Text>
          <View style={styles.rowValue}>
            <DateField
              value={expiry}
              text={expiry ? formatDate(expiry) : null}
              placeholder="Not set"
              onChange={setExpiry}
            />
          </View>
          {expiry ? (
            <Pressable style={styles.removeBtn} onPress={() => setExpiry(null)} hitSlop={8}>
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          ) : (
            <View style={styles.removeBtn} />
          )}
        </View>

        {/* Editable, deletable detail rows */}
        {details.map((d) => (
          <View key={d.id} style={styles.row}>
            <TextInput
              style={styles.rowLabel}
              placeholder="Label"
              value={d.label}
              onChangeText={(t) => updateDetail(d.id, { label: t })}
            />
            <View style={styles.rowValue}>
              {d.kind === 'date' ? (
                <DateField
                  value={parseYMD(d.value)}
                  text={d.value ? formatDetailDate(d.value) : null}
                  onChange={(date) => updateDetail(d.id, { value: toYMD(date) })}
                />
              ) : (
                <TextInput
                  style={styles.valueInput}
                  placeholder="Value"
                  multiline
                  value={d.value}
                  onChangeText={(t) => updateDetail(d.id, { value: t })}
                />
              )}
            </View>
            <Pressable style={styles.removeBtn} onPress={() => removeDetail(d.id)} hitSlop={8}>
              <Text style={styles.removeText}>✕</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addLabelBtn} onPress={askAddDetail}>
          <Text style={styles.addLabelText}>+ Add label</Text>
        </Pressable>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#eef4ff',
    borderRadius: 8,
    padding: 12,
  },
  bannerText: { flex: 1, color: '#234' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14 },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipTextActive: { color: 'white' },

  detailsBox: {
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  fixedLabel: { flex: 1, color: '#444', fontWeight: '500', paddingHorizontal: 4 },
  rowLabel: {
    flex: 1,
    color: '#444',
    fontWeight: '500',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  rowValue: { flex: 1.3 },
  valueInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
  },
  removeBtn: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  removeText: { color: '#b00020', fontSize: 16, fontWeight: '700' },
  addLabelBtn: {
    borderWidth: 1,
    borderColor: '#1a73e8',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
  },
  addLabelText: { color: '#1a73e8', fontWeight: '600' },

  saveBtn: { backgroundColor: '#1a73e8', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 24 },
  saveText: { color: 'white', fontWeight: '700', fontSize: 16 },
  deleteBtn: { borderWidth: 1, borderColor: '#b00020', borderRadius: 8, padding: 14, alignItems: 'center', marginTop: 12 },
  deleteText: { color: '#b00020', fontWeight: '700', fontSize: 16 },
});