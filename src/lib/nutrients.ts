export type NutrientKey =
  | 'kcal' | 'protein' | 'carbs' | 'fat' | 'satFat' | 'fiber' | 'sugar' | 'sodium'
  | 'calcium' | 'iron' | 'magnesium' | 'phosphorus' | 'potassium' | 'zinc'
  | 'copper' | 'manganese' | 'selenium'
  | 'vitA' | 'vitC' | 'vitD' | 'vitE' | 'vitK' | 'folate' | 'b12' | 'choline'
  | 'ala' | 'epadha';

export type Per100g = Partial<Record<NutrientKey, number>>;

export type Ingredient = {
  name: string;
  grams: number;
  typicalMaxGrams?: number; // largest amount normally found in one serving (AI estimate)
  state: string;
  amountBasis: 'visible' | 'typical';
  source: 'usda' | 'ai_estimate' | 'zero';
  matched: string | null;
  per100g: Per100g;
};

export type WatchFlag = { id: string; allergens: string[]; spottedIn: string };

export type Dish = {
  name: string;
  serving: string;
  confidence: 'high' | 'medium' | 'low';
  notes: string[];
  watchOuts: WatchFlag[];
  bioactives: string[];
  ingredients: Ingredient[];
};

type Def = {
  label: string;
  unit: 'g' | 'mg' | 'µg' | 'kcal';
  ref?: number; // daily reference amount, in the same unit
  refNote?: string;
  highlight: boolean; // may appear in "Nutritional Highlights"
  short: string; // a few words on its role
  health: string; // cautious, standard wording (no disease claims)
};

const fda = (v: string) => `FDA Daily Value: ${v}`;

export const NUTRIENTS: Record<NutrientKey, Def> = {
  kcal: { label: 'Calories', unit: 'kcal', highlight: false, short: '', health: '' },
  protein: {
    label: 'Protein', unit: 'g', ref: 50, refNote: fda('50 g'), highlight: true,
    short: 'Building block for body tissues',
    health: 'Protein contributes to the growth and maintenance of muscle mass.',
  },
  carbs: { label: 'Carbohydrates', unit: 'g', ref: 275, refNote: fda('275 g'), highlight: false, short: '', health: '' },
  fat: { label: 'Fat', unit: 'g', ref: 78, refNote: fda('78 g'), highlight: false, short: '', health: '' },
  satFat: { label: 'Saturated fat', unit: 'g', ref: 20, refNote: fda('20 g'), highlight: false, short: '', health: '' },
  fiber: {
    label: 'Dietary fiber', unit: 'g', ref: 28, refNote: fda('28 g'), highlight: true,
    short: 'Supports digestion',
    health: 'Dietary fiber contributes to normal bowel function.',
  },
  sugar: { label: 'Sugar', unit: 'g', highlight: false, short: '', health: '' },
  sodium: {
    label: 'Sodium', unit: 'mg', ref: 2300, refNote: 'FDA Daily Value (upper limit): 2,300 mg',
    highlight: false, short: '', health: '',
  },
  calcium: {
    label: 'Calcium', unit: 'mg', ref: 1300, refNote: fda('1,300 mg'), highlight: true,
    short: 'Bones and teeth',
    health: 'Calcium is needed for the maintenance of normal bones and teeth.',
  },
  iron: {
    label: 'Iron', unit: 'mg', ref: 18, refNote: fda('18 mg'), highlight: true,
    short: 'Oxygen transport',
    health: 'Iron contributes to normal formation of red blood cells and haemoglobin.',
  },
  magnesium: {
    label: 'Magnesium', unit: 'mg', ref: 420, refNote: fda('420 mg'), highlight: true,
    short: 'Muscles and nerves',
    health: 'Magnesium contributes to normal muscle function and to a reduction of tiredness and fatigue.',
  },
  phosphorus: {
    label: 'Phosphorus', unit: 'mg', ref: 1250, refNote: fda('1,250 mg'), highlight: true,
    short: 'Bones and energy metabolism',
    health: 'Phosphorus contributes to the maintenance of normal bones and teeth and to normal energy metabolism.',
  },
  potassium: {
    label: 'Potassium', unit: 'mg', ref: 4700, refNote: fda('4,700 mg'), highlight: true,
    short: 'Nerves and muscles',
    health: 'Potassium contributes to normal functioning of the nervous system and normal muscle function.',
  },
  zinc: {
    label: 'Zinc', unit: 'mg', ref: 11, refNote: fda('11 mg'), highlight: true,
    short: 'Immune function',
    health: 'Zinc contributes to the normal function of the immune system.',
  },
  copper: {
    label: 'Copper', unit: 'mg', ref: 0.9, refNote: fda('0.9 mg'), highlight: true,
    short: 'Iron transport',
    health: 'Copper contributes to normal iron transport in the body.',
  },
  manganese: {
    label: 'Manganese', unit: 'mg', ref: 2.3, refNote: fda('2.3 mg'), highlight: true,
    short: 'Bone maintenance',
    health: 'Manganese contributes to the maintenance of normal bones.',
  },
  selenium: {
    label: 'Selenium', unit: 'µg', ref: 55, refNote: fda('55 µg'), highlight: true,
    short: 'Cell protection',
    health: 'Selenium contributes to normal immune function and to the protection of cells from oxidative stress.',
  },
  vitA: {
    label: 'Vitamin A', unit: 'µg', ref: 900, refNote: fda('900 µg RAE'), highlight: true,
    short: 'Vision and skin',
    health: 'Vitamin A contributes to the maintenance of normal vision and normal skin.',
  },
  vitC: {
    label: 'Vitamin C', unit: 'mg', ref: 90, refNote: fda('90 mg'), highlight: true,
    short: 'Immune function',
    health: 'Vitamin C contributes to the normal function of the immune system and to the protection of cells from oxidative stress.',
  },
  vitD: {
    label: 'Vitamin D', unit: 'µg', ref: 20, refNote: fda('20 µg'), highlight: true,
    short: 'Calcium absorption',
    health: 'Vitamin D contributes to normal absorption of calcium and to the maintenance of normal bones.',
  },
  vitE: {
    label: 'Vitamin E', unit: 'mg', ref: 15, refNote: fda('15 mg'), highlight: true,
    short: 'Cell protection',
    health: 'Vitamin E contributes to the protection of cells from oxidative stress.',
  },
  vitK: {
    label: 'Vitamin K', unit: 'µg', ref: 120, refNote: fda('120 µg'), highlight: true,
    short: 'Blood clotting',
    health: 'Vitamin K contributes to normal blood clotting and to the maintenance of normal bones.',
  },
  folate: {
    label: 'Folate', unit: 'µg', ref: 400, refNote: fda('400 µg DFE'), highlight: true,
    short: 'Blood formation',
    health: 'Folate contributes to normal blood formation and normal amino acid synthesis.',
  },
  b12: {
    label: 'Vitamin B12', unit: 'µg', ref: 2.4, refNote: fda('2.4 µg'), highlight: true,
    short: 'Nerves and red blood cells',
    health: 'Vitamin B12 contributes to normal functioning of the nervous system and normal red blood cell formation.',
  },
  choline: {
    label: 'Choline', unit: 'mg', ref: 550, refNote: fda('550 mg'), highlight: true,
    short: 'Fat metabolism',
    health: 'Choline contributes to normal lipid metabolism and to the maintenance of normal liver function.',
  },
  ala: {
    label: 'Omega-3 (ALA)', unit: 'g', ref: 1.6,
    refNote: 'US adequate intake: 1.6 g men, 1.1 g women (no FDA Daily Value)',
    highlight: true,
    short: 'Plant-based omega-3 fat',
    health: 'Alpha-linolenic acid (ALA) is an essential omega-3 fatty acid. The body cannot make it, so it must come from food.',
  },
  epadha: {
    label: 'Omega-3 (EPA + DHA)', unit: 'mg', ref: 250,
    refNote: 'EFSA adequate intake: 250 mg (no FDA Daily Value)',
    highlight: true,
    short: 'Marine omega-3 fats',
    health: 'EPA and DHA contribute to the normal function of the heart, and DHA to the maintenance of normal brain function.',
  },
};

export const REFERENCE_NOTE =
  'Percentages use FDA Daily Values for adults on a 2,000-calorie diet. Omega-3 fats use adequate-intake references, shown on each card.';

// ---------- Maths ----------

export type Totals = Partial<Record<NutrientKey, { amount: number; partial: boolean }>>;

// Adds up each nutrient across ingredients: per-100 g value x grams / 100.
// "partial" means at least one ingredient had no value for it, so the total may be understated.
export function computeTotals(ingredients: Ingredient[], grams: number[]): Totals {
  const totals: Totals = {};
  (Object.keys(NUTRIENTS) as NutrientKey[]).forEach((key) => {
    let amount = 0;
    let any = false;
    let partial = false;
    ingredients.forEach((ing, i) => {
      const g = grams[i];
      if (!(g > 0)) return;
      const v = ing.per100g[key];
      if (typeof v === 'number') {
        amount += (v * g) / 100;
        any = true;
      } else if (ing.source === 'ai_estimate') {
        partial = true; // AI estimates only cover the basics
      }
    });
    if (any) totals[key] = { amount, partial };
  });
  return totals;
}

export type Highlight = {
  key: NutrientKey;
  label: string;
  unit: string;
  amount: number;
  pct: number;
  partial: boolean;
  short: string;
  health: string;
  refNote: string;
};

// Picks the nutrients that make THIS food special: those reaching at least 10% of the daily reference
export function getHighlights(totals: Totals): Highlight[] {
  const list: Highlight[] = [];
  (Object.keys(NUTRIENTS) as NutrientKey[]).forEach((key) => {
    const def = NUTRIENTS[key];
    const t = totals[key];
    if (!def.highlight || !def.ref || !t) return;
    const pct = (t.amount / def.ref) * 100;
    if (pct < 10) return;
    list.push({
      key, label: def.label, unit: def.unit, amount: t.amount, pct, partial: t.partial,
      short: def.short, health: def.health, refNote: def.refNote ?? '',
    });
  });
  return list.sort((a, b) => b.pct - a.pct).slice(0, 6);
}

export function fmtAmount(v: number): string {
  if (v >= 100) return String(Math.round(v));
  if (v >= 1) return String(Math.round(v * 10) / 10);
  if (v >= 0.1) return String(Math.round(v * 100) / 100);
  return String(Math.round(v * 1000) / 1000);
}