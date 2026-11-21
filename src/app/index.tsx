import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { NUTRITION_FUNCTION } from '../lib/config';
import { shrinkToBase64 } from '../lib/image';
import { computeTotals } from '../lib/nutrients';
import { normalizeDishes, useNutrition } from '../lib/NutritionContext';
import { supabase } from '../lib/supabase';

const grams = (v?: number) => (v === undefined ? '–' : `${Math.round(v)}g`);

const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };
const CONFIDENCE_COLOR = { high: '#2e7d32', medium: '#e67e00', low: '#b00020' };

export default function ScanScreen() {
  const router = useRouter();
  const { dishes, photoUri, setResult, clearResult } = useNutrition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = async (uri: string) => {
    setBusy(true);
    setError(null);
    try {
      const base64 = await shrinkToBase64(uri, 1600); // a bit larger so small text stays readable

      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out after 110 seconds')), 110000)
      );
      const call = supabase.functions.invoke(NUTRITION_FUNCTION, {
        body: { imageBase64: base64, mediaType: 'image/jpeg' },
      });
      const { data, error: fnError } = (await Promise.race([call, timeout])) as any;
      if (fnError || !data) throw fnError ?? new Error('Empty response');

      if (data.type === 'unknown' && data.error) {
        console.log('nutrition error:', data.error);
        setError(`Couldn't analyze the photo. Please try again. (${String(data.error).slice(0, 160)})`);
        return;
      }
      if (data.usdaError) console.log('USDA problem:', data.usdaError);

      const found = normalizeDishes(data.items);
      if (found.length === 0) {
        setError("I couldn't find any food in this photo. Try a clearer photo of a menu or a dish.");
        return;
      }
      setResult(found, uri);
    } catch (e: any) {
      let detail = e?.message ?? 'unknown error';
      try {
        if (e?.context?.text) detail += ' | ' + (await e.context.text());
      } catch {}
      console.log('nutrition error:', detail);
      setError(`Couldn't analyze the photo. Please try again. (${detail.slice(0, 160)})`);
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow camera access to scan a menu or dish.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) scan(result.assets[0].uri);
  };

  const chooseFromGallery = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled) scan(result.assets[0].uri);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Scan a menu or a dish</Text>
      <Text style={styles.sub}>
        Photograph a restaurant menu, a meal, or a drink to see a nutrition breakdown by ingredient.
      </Text>

      <View style={styles.buttons}>
        <Pressable style={[styles.primaryBtn, busy && styles.disabled]} onPress={takePhoto} disabled={busy}>
          <Text style={styles.primaryText}>📷 Take a photo</Text>
        </Pressable>
        <Pressable style={[styles.secondaryBtn, busy && styles.disabled]} onPress={chooseFromGallery} disabled={busy}>
          <Text style={styles.secondaryText}>🖼️ Gallery</Text>
        </Pressable>
      </View>

      <Text style={styles.privacy}>
        Photos are sent to Google's Gemini AI to identify the food. Please don't scan photos with people or personal documents.
      </Text>

      {busy && (
        <View style={styles.banner}>
          <ActivityIndicator />
          <Text style={styles.bannerText}>Identifying ingredients and looking up nutrition data… this can take up to a minute.</Text>
        </View>
      )}
      {error && !busy && (
        <View style={[styles.banner, styles.errorBanner]}>
          <Text style={styles.bannerText}>{error}</Text>
        </View>
      )}

      {dishes.length > 0 && !busy && (
        <>
          <View style={styles.resultHeader}>
            {photoUri && <Image source={{ uri: photoUri }} style={styles.thumb} />}
            <View style={{ flex: 1 }}>
              <Text style={styles.resultTitle}>
                {dishes.length} {dishes.length === 1 ? 'item' : 'items'} found
              </Text>
              <Text style={styles.approx}>
                Estimates based on the photo and the USDA database. Open an item to see exactly how it was calculated.
              </Text>
            </View>
            <Pressable onPress={clearResult} hitSlop={8}>
              <Text style={styles.clear}>Clear</Text>
            </Pressable>
          </View>

          {dishes.map((dish, index) => {
            const totals = computeTotals(dish.ingredients, dish.ingredients.map((i) => i.grams));
            const kcal = totals.kcal?.amount;
            return (
              <Pressable
                key={`${dish.name}-${index}`}
                style={styles.card}
                onPress={() => router.push({ pathname: '/dish', params: { index: String(index) } })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.dishName}>{dish.name}</Text>
                  {dish.serving !== '' && <Text style={styles.serving}>{dish.serving}</Text>}
                  <Text style={styles.macros}>
                    P {grams(totals.protein?.amount)} · C {grams(totals.carbs?.amount)} · F {grams(totals.fat?.amount)}
                  </Text>
                  <Text style={[styles.conf, { color: CONFIDENCE_COLOR[dish.confidence] }]}>
                    {CONFIDENCE_LABEL[dish.confidence]}
                  </Text>
                </View>
                <View style={styles.kcalBox}>
                  <Text style={styles.kcal}>{kcal === undefined ? '–' : `~${Math.round(kcal)}`}</Text>
                  <Text style={styles.kcalUnit}>kcal</Text>
                </View>
              </Pressable>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: '700' },
  sub: { color: '#666' },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 4 },
  primaryBtn: { flex: 1.4, backgroundColor: '#1a73e8', borderRadius: 10, padding: 14, alignItems: 'center' },
  primaryText: { color: 'white', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { flex: 1, borderWidth: 1, borderColor: '#1a73e8', borderRadius: 10, padding: 14, alignItems: 'center' },
  secondaryText: { color: '#1a73e8', fontWeight: '600', fontSize: 16 },
  disabled: { opacity: 0.5 },
  privacy: { color: '#888', fontSize: 12 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eef4ff', borderRadius: 8, padding: 12 },
  errorBanner: { backgroundColor: '#fff1f0' },
  bannerText: { flex: 1, color: '#234' },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  thumb: { width: 52, height: 52, borderRadius: 8, backgroundColor: '#eee' },
  resultTitle: { fontSize: 17, fontWeight: '700' },
  approx: { color: '#777', fontSize: 12, marginTop: 2 },
  clear: { color: '#b00020', fontWeight: '600' },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, elevation: 2, gap: 12 },
  dishName: { fontSize: 17, fontWeight: '600' },
  serving: { color: '#777', marginTop: 2, fontSize: 12 },
  macros: { color: '#555', marginTop: 6 },
  conf: { marginTop: 4, fontSize: 12, fontWeight: '600' },
  kcalBox: { alignItems: 'center' },
  kcal: { fontSize: 20, fontWeight: '700', color: '#e67e00' },
  kcalUnit: { color: '#999', fontSize: 12 },
});