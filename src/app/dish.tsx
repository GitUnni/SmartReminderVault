import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNutrition } from '../lib/NutritionContext';
import {
  NUTRIENTS, REFERENCE_NOTE, computeTotals, fmtAmount, getHighlights, type NutrientKey,
} from '../lib/nutrients';

const MULTIPLIERS = [0.5, 1, 1.5, 2];
const TILES: NutrientKey[] = ['protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];

const CONFIDENCE_LABEL = { high: 'High confidence', medium: 'Medium confidence', low: 'Low confidence' };
const CONFIDENCE_COLOR = { high: '#2e7d32', medium: '#e67e00', low: '#b00020' };

const gramText = (g: number) => String(Math.round(g * 10) / 10);

export default function DishScreen() {
  const { index } = useLocalSearchParams<{ index?: string }>();
  const { dishes } = useNutrition();
  const dish = dishes[Number(index)];

  const [mult, setMult] = useState(1);
  const [gramsText, setGramsText] = useState<string[]>(() =>
    (dish?.ingredients ?? []).map((i) => gramText(i.grams))
  );

  if (!dish) {
    return (
      <View style={styles.missing}>
        <Text>This item isn't available anymore. Scan again from the Nutrition tab.</Text>
      </View>
    );
  }

  const effective = gramsText.map((t) => {
    const n = parseFloat(t.replace(',', '.'));
    return isFinite(n) && n > 0 ? Math.min(n, 5000) : 0;
  });

  const totals = computeTotals(dish.ingredients, effective);
  const highlights = getHighlights(totals);
  const kcal = totals.kcal?.amount;
  const totalGrams = effective.reduce((a, b) => a + b, 0);

  const usdaCount = dish.ingredients.filter((i) => i.source === 'usda').length;
  const aiCount = dish.ingredients.filter((i) => i.source === 'ai_estimate').length;
  const anyTypical = dish.ingredients.some((i) => i.amountBasis === 'typical');

  const applyMultiplier = (m: number) => {
    setMult(m);
    setGramsText(dish.ingredients.map((i) => gramText(i.grams * m)));
  };

  const tileValue = (key: NutrientKey) => {
    const t = totals[key];
    if (!t) return { value: '–', pct: null as number | null };
    const def = NUTRIENTS[key];
    const pct = def.ref ? Math.round((t.amount / def.ref) * 100) : null;
    return { value: `${fmtAmount(t.amount)} ${def.unit}`, pct };
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: dish.name }} />

      {/* Summary */}
      <View style={styles.card}>
        <Text style={styles.name}>{dish.name}</Text>
        {dish.serving !== '' && <Text style={styles.serving}>{dish.serving}</Text>}
        <Text style={styles.kcal}>
          {kcal === undefined ? '–' : `~${Math.round(kcal)}`} <Text style={styles.kcalUnit}>kcal</Text>
        </Text>
        <Text style={styles.serving}>For about {Math.round(totalGrams)} g in total</Text>
        <Text style={[styles.conf, { color: CONFIDENCE_COLOR[dish.confidence] }]}>
          {CONFIDENCE_LABEL[dish.confidence]}
        </Text>
      </View>

      {dish.confidence === 'low' ? (
        <View style={[styles.banner, styles.warnBanner]}>
          <Text style={styles.bannerText}>
            Limited information: the photo doesn't clearly show what's in this or how much. Please check the amounts below and adjust them.
          </Text>
        </View>
      ) : anyTypical ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            Some amounts are typical-portion assumptions, not measured from the photo. Adjust them below for a better estimate.
          </Text>
        </View>
      ) : null}

      {/* Portion editor */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Your portion</Text>
        <View style={styles.chips}>
          {MULTIPLIERS.map((m) => (
            <Pressable
              key={m}
              onPress={() => applyMultiplier(m)}
              style={[styles.chip, mult === m && styles.chipActive]}
            >
              <Text style={mult === m ? styles.chipTextActive : undefined}>
                {m === 1 ? 'As estimated' : `×${m}`}
              </Text>
            </Pressable>
          ))}
        </View>

        {dish.ingredients.map((ing, i) => (
          <View key={`${ing.name}-${i}`} style={styles.ingRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.ingTop}>
                <Text style={styles.ingName}>{ing.name}</Text>
                <View
                  style={[
                    styles.badge,
                    ing.source === 'usda' ? styles.badgeUsda : ing.source === 'zero' ? styles.badgeZero : styles.badgeAi,
                  ]}
                >
                  <Text style={styles.badgeText}>
                    {ing.source === 'usda' ? 'USDA' : ing.source === 'zero' ? 'No nutrients' : 'AI estimate'}
                  </Text>
                </View>
              </View>
              <Text style={styles.ingSub}>
                {ing.source === 'usda' && ing.matched
                  ? `Database entry: ${ing.matched}`
                  : ing.source === 'ai_estimate'
                  ? 'No database match, so the AI estimated the basics only'
                  : 'Plain water'}
              </Text>
              <Text style={styles.ingSub}>
                {ing.state} · {ing.amountBasis === 'visible' ? 'amount judged from the photo' : 'typical amount assumed'}
              </Text>
            </View>
            <View style={styles.gramBox}>
              <TextInput
                style={styles.gramInput}
                keyboardType="decimal-pad"
                value={gramsText[i] ?? ''}
                onChangeText={(t) =>
                  setGramsText((prev) => prev.map((v, idx) => (idx === i ? t : v)))
                }
              />
              <Text style={styles.gramUnit}>g</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Nutritional Highlights */}
      <Text style={styles.heading}>Nutritional Highlights</Text>
      {highlights.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.plain}>
            No single vitamin, mineral or fiber reaches 10% of its daily reference in this portion, so nothing is highlighted.
          </Text>
        </View>
      ) : (
        highlights.map((h) => (
          <View key={h.key} style={styles.card}>
            <View style={styles.hTop}>
              <Text style={styles.hName}>{h.label}</Text>
              <Text style={styles.hPct}>
                {Math.round(h.pct)}%{h.partial ? '+' : ''}
              </Text>
            </View>
            <Text style={styles.hAmount}>
              {h.partial ? 'At least ' : ''}
              {fmtAmount(h.amount)} {h.unit} in this portion
            </Text>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.min(100, h.pct)}%` }]} />
            </View>
            <Text style={styles.hShort}>{h.short}</Text>
            <Text style={styles.hRef}>{h.refNote}</Text>
          </View>
        ))
      )}

      {/* Key nutrients */}
      <Text style={styles.heading}>Key nutrients</Text>
      <View style={styles.grid}>
        {TILES.map((key) => {
          const t = tileValue(key);
          return (
            <View key={key} style={styles.tile}>
              <Text style={styles.tileLabel}>{NUTRIENTS[key].label}</Text>
              <Text style={styles.tileValue}>{t.value}</Text>
              {t.pct !== null && <Text style={styles.tilePct}>{t.pct}% DV</Text>}
            </View>
          );
        })}
      </View>

      {/* Health relevance */}
      {highlights.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Health relevance</Text>
          {highlights.map((h) => (
            <Text key={h.key} style={styles.health}>
              <Text style={styles.healthLabel}>{h.label}: </Text>
              {h.health}
            </Text>
          ))}
        </View>
      )}

      {dish.bioactives.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Also present, not quantified</Text>
          {dish.bioactives.map((b, i) => (
            <Text key={i} style={styles.plain}>• {b}</Text>
          ))}
          <Text style={styles.hRef}>
            Amounts vary widely by variety and aren't reliably available in food databases, so no number is shown.
          </Text>
        </View>
      )}

      {dish.watchOuts.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Watch out for</Text>
          {dish.watchOuts.map((w, i) => (
            <Text key={i} style={styles.watch}>• {w}</Text>
          ))}
        </View>
      )}

      {/* Transparency */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>How these numbers were calculated</Text>
        <Text style={styles.plain}>
          • Amounts: an AI estimated how much of each ingredient is in the portion. This is an approximation, not a weighed measurement. You can edit every amount above.
        </Text>
        <Text style={styles.plain}>
          • Nutrition values: {usdaCount} of {dish.ingredients.length} ingredients matched USDA FoodData Central entries (Foundation or SR Legacy)
          {aiCount > 0 ? `; ${aiCount} used an AI estimate of the basic nutrients only` : ''}. These are database values for typical foods, not lab tests of this exact dish.
        </Text>
        <Text style={styles.plain}>
          • A nutrient missing from a database entry counts as zero, so totals can only be understated, never padded. A "+" or "At least" marks a total that may be incomplete.
        </Text>
        <Text style={styles.plain}>• {REFERENCE_NOTE}</Text>
        {dish.notes.map((n, i) => (
          <Text key={i} style={styles.plain}>• {n}</Text>
        ))}
        <Text style={styles.hRef}>
          Real values vary with variety, ripeness, recipe and preparation. This is general information, not medical or dietary advice. Foods do not prevent, treat or cure disease.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 14, paddingBottom: 48 },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 14, padding: 16, gap: 6, elevation: 2 },
  heading: { fontSize: 18, fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  name: { fontSize: 22, fontWeight: '700' },
  serving: { color: '#777', fontSize: 13 },
  kcal: { fontSize: 34, fontWeight: '800', color: '#e67e00', marginTop: 4 },
  kcalUnit: { fontSize: 16, color: '#999', fontWeight: '500' },
  conf: { fontWeight: '700', fontSize: 13, marginTop: 2 },
  banner: { backgroundColor: '#eef4ff', borderRadius: 8, padding: 12 },
  warnBanner: { backgroundColor: '#fff4e5' },
  bannerText: { color: '#234' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  chip: { borderWidth: 1, borderColor: '#ccc', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  chipActive: { backgroundColor: '#1a73e8', borderColor: '#1a73e8' },
  chipTextActive: { color: 'white' },
  ingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  ingTop: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ingName: { fontWeight: '600', fontSize: 15 },
  ingSub: { color: '#777', fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 8, paddingVertical: 2, paddingHorizontal: 8 },
  badgeUsda: { backgroundColor: '#e6f4ea' },
  badgeAi: { backgroundColor: '#fff1e0' },
  badgeZero: { backgroundColor: '#eee' },
  badgeText: { fontSize: 11, fontWeight: '700', color: '#333' },
  gramBox: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  gramInput: { width: 64, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 8, textAlign: 'right', backgroundColor: 'white' },
  gramUnit: { color: '#666' },
  hTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  hName: { fontSize: 17, fontWeight: '700' },
  hPct: { fontSize: 17, fontWeight: '800', color: '#1a73e8' },
  hAmount: { fontSize: 15, color: '#222' },
  track: { height: 10, borderRadius: 5, backgroundColor: '#e8eefc', overflow: 'hidden', marginVertical: 4 },
  fill: { height: '100%', backgroundColor: '#1a73e8', borderRadius: 5 },
  hShort: { color: '#444' },
  hRef: { color: '#888', fontSize: 11, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '31%', flexGrow: 1, backgroundColor: 'white', borderRadius: 12, padding: 12, elevation: 1 },
  tileLabel: { color: '#777', fontSize: 12 },
  tileValue: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  tilePct: { color: '#1a73e8', fontSize: 12, marginTop: 2 },
  health: { color: '#333', lineHeight: 21, marginTop: 4 },
  healthLabel: { fontWeight: '700' },
  plain: { color: '#333', lineHeight: 21 },
  watch: { color: '#b45309', lineHeight: 22 },
});