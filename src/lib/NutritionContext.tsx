import { createContext, ReactNode, useContext, useState } from 'react';
import { ALLERGENS, CONCERN_IDS } from './concerns';
import {
  NUTRIENTS, type Dish, type Ingredient, type NutrientKey, type Per100g, type WatchFlag,
} from './nutrients';
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

const strList = (v: unknown, max: number): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()).slice(0, max)
    : [];

function normPer100g(v: any): Per100g {
  const out: Per100g = {};
  if (v && typeof v === 'object') {
    (Object.keys(NUTRIENTS) as NutrientKey[]).forEach((k) => {
      const n = v[k];
      if (typeof n === 'number' && isFinite(n) && n >= 0) out[k] = n;
    });
  }
  return out;
}

// Keeps only watch-outs from the approved list, so the app controls all explanations
function normWatch(v: unknown): WatchFlag[] {
  if (!Array.isArray(v)) return [];
  const out: WatchFlag[] = [];
  for (const w of v as any[]) {
    if (!w || typeof w.id !== 'string' || !(CONCERN_IDS as readonly string[]).includes(w.id)) continue;
    out.push({
      id: w.id,
      allergens: Array.isArray(w.allergens)
        ? w.allergens.filter((a: unknown): a is string => typeof a === 'string' && ALLERGENS.includes(a))
        : [],
      spottedIn: typeof w.spottedIn === 'string' ? w.spottedIn.trim().slice(0, 80) : '',
    });
  }
  return out;
}

// Cleans up the server's answer so the screens can trust its shape
export function normalizeDishes(items: unknown): Dish[] {
  if (!Array.isArray(items)) return [];
  const out: Dish[] = [];
  for (const raw of items as any[]) {
    const name = str(raw?.name);
    if (!name) continue;

    const ingredients: Ingredient[] = [];
    for (const r of Array.isArray(raw?.ingredients) ? raw.ingredients : []) {
      const iname = str(r?.name);
      const grams = typeof r?.grams === 'number' ? r.grams : NaN;
      if (!iname || !isFinite(grams) || grams <= 0 || grams > 3000) continue;
      ingredients.push({
        name: iname,
        grams,
        state: str(r.state) || 'prepared',
        amountBasis: r.amountBasis === 'visible' ? 'visible' : 'typical',
        source: r.source === 'usda' ? 'usda' : r.source === 'zero' ? 'zero' : 'ai_estimate',
        matched: str(r.matched) || null,
        typicalMaxGrams:
          typeof r.typicalMaxGrams === 'number' && isFinite(r.typicalMaxGrams) && r.typicalMaxGrams > 0
            ? Math.min(r.typicalMaxGrams, 5000)
            : undefined,
        per100g: normPer100g(r.per100g),
      });
    }
    if (ingredients.length === 0) continue;

    out.push({
      name,
      serving: str(raw.serving),
      confidence: ['high', 'medium', 'low'].includes(raw.confidence) ? raw.confidence : 'low',
      notes: strList(raw.notes, 3),
      watchOuts: normWatch(raw.watchOuts),
      bioactives: strList(raw.bioactives, 3),
      ingredients,
    });
  }
  return out;
}

type NutritionContextType = {
  dishes: Dish[];
  photoUri: string | null;
  setResult: (dishes: Dish[], photoUri: string | null) => void;
  clearResult: () => void;
};

const NutritionContext = createContext<NutritionContextType | null>(null);

export function NutritionProvider({ children }: { children: ReactNode }) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const setResult = (d: Dish[], uri: string | null) => {
    setDishes(d);
    setPhotoUri(uri);
  };
  const clearResult = () => {
    setDishes([]);
    setPhotoUri(null);
  };

  return (
    <NutritionContext.Provider value={{ dishes, photoUri, setResult, clearResult }}>
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const ctx = useContext(NutritionContext);
  if (!ctx) throw new Error('useNutrition must be used inside NutritionProvider');
  return ctx;
}