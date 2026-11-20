import { fmtAmount, type Dish, type NutrientKey, type Totals } from './nutrients';

// Concerns the AI may flag from the photo (it picks ids only; all explanations live here)
export const CONCERN_IDS = [
  'caffeine', 'alcohol', 'added_sugar', 'high_sodium',
  'deep_fried', 'processed_meat', 'raw_undercooked', 'allergen',
] as const;
export type ConcernId = (typeof CONCERN_IDS)[number];

// Concerns the app calculates itself from the current amounts
type CalcId = 'sat_fat' | 'high_calorie';

export const ALLERGENS = [
  'milk', 'eggs', 'peanuts', 'tree nuts', 'wheat (gluten)', 'soy', 'fish', 'shellfish', 'sesame',
];

export type Severity = 'info' | 'notice' | 'strong' | 'extreme';

export type WatchItem = {
  key: string;
  title: string;
  severity: Severity;
  badge?: string; // e.g. "Very high"
  summary?: string; // worked out from the latest amounts
  spotted: string;
  why: string;
  guideline: string;
  quantityNote?: string;
};

type Concern = { title: string; why: string; guideline: string; quantityNote?: string };

const CONCERNS: Record<ConcernId | CalcId, Concern> = {
  caffeine: {
    title: 'Caffeine',
    why:
      'Caffeine is a stimulant. In people who are sensitive to it, or when taken in larger amounts or late in the day, it can cause difficulty sleeping, restlessness or anxiety, a faster heart rate, and an upset stomach.',
    guideline:
      'For most healthy adults, up to 400 mg a day is generally not linked to adverse effects (FDA, EFSA). Pregnant women are advised to stay under 200 mg a day (ACOG, NHS). Lower intakes are advised for children and teenagers. People with anxiety, heart rhythm problems or sleep problems, or who take certain medicines, may need to limit it further, and individual tolerance varies.',
    quantityNote:
      "The caffeine in a drink depends on the type of coffee or tea, the serving size and how it's prepared, so an amount can't be reliably estimated from a photo and none is shown. Caffeine from other drinks and foods counts toward the same daily limit. Decaffeinated versions contain much less.",
  },
  alcohol: {
    title: 'Alcohol',
    why:
      'Alcohol affects judgment, coordination and sleep, and heavier regular drinking is linked to liver disease, high blood pressure and several cancers. It can also interact with some medicines.',
    guideline:
      'Limits differ from country to country, and many health bodies say that drinking less is better. No safe amount of alcohol has been established during pregnancy.',
    quantityNote: 'The strength and size of drinks vary, so no amount is shown.',
  },
  added_sugar: {
    title: 'Added sugar',
    why:
      'Added sugar provides calories with little else, and high intakes are linked to weight gain and tooth decay. Sugary drinks are especially easy to overconsume.',
    guideline:
      'The World Health Organization advises keeping free sugars below 10% of daily energy (about 50 g on a 2,000 kcal diet), and below 5% (about 25 g) for added benefit. The FDA Daily Value for added sugars is 50 g. The American Heart Association suggests no more than about 36 g a day for men and 25 g for women. Sugars naturally inside whole fruit and plain milk are not counted. People with diabetes should follow the advice of their own care team.',
  },
  high_sodium: {
    title: 'Sodium (salt)',
    why:
      'A high sodium intake over time is linked to higher blood pressure, which raises the risk of heart disease and stroke.',
    guideline:
      'The FDA Daily Value is less than 2,300 mg of sodium a day. The World Health Organization advises less than 2,000 mg a day (about 5 g of salt) for adults. People with high blood pressure, kidney disease or heart failure are often advised to limit it more.',
  },
  sat_fat: {
    title: 'Saturated fat',
    why:
      'Diets high in saturated fat can raise LDL ("bad") cholesterol, which is a risk factor for heart disease.',
    guideline:
      'The FDA Daily Value is less than 20 g a day. The American Heart Association suggests aiming for about 13 g a day or less (around 5–6% of calories on a 2,000-calorie diet), especially for people who need to lower their cholesterol. The World Health Organization advises keeping saturated fat below 10% of daily energy.',
  },
  high_calorie: {
    title: 'High calorie content',
    why:
      'Regularly eating more energy than the body uses contributes to weight gain, and one item that supplies a large share of the day’s energy leaves less room for other foods.',
    guideline:
      'Energy needs vary widely with age, sex, body size and activity. Food labels and many guidelines use 2,000 kcal a day only as a general reference.',
  },
  deep_fried: {
    title: 'Deep-fried',
    why:
      'Deep-frying adds a lot of fat and calories, and oil that has been reused many times at high heat can break down into compounds best limited. In studies, regularly eating fried food is associated with a higher risk of weight gain and heart disease.',
    guideline:
      'No specific limit exists for fried food. Health bodies generally suggest keeping it occasional and choosing baked, grilled, steamed or boiled dishes more often.',
  },
  processed_meat: {
    title: 'Processed meat',
    why:
      'Processed meats such as sausages, bacon, ham and salami are usually high in salt and saturated fat. The World Health Organization’s cancer agency (IARC) classifies processed meat as carcinogenic to humans, based on evidence linking it to bowel cancer, with risk rising as intake increases.',
    guideline:
      'No completely safe amount has been identified. Health bodies advise limiting processed meat, with little or none being best.',
  },
  raw_undercooked: {
    title: 'Raw or lightly cooked food',
    why:
      'Raw or lightly cooked eggs, meat, fish or shellfish can carry bacteria or parasites that cause food poisoning.',
    guideline:
      'Pregnant women, young children, older adults and people with weakened immune systems are at higher risk of serious illness and are usually advised to avoid them. Food-safety agencies recommend cooking meat, poultry and eggs thoroughly.',
  },
  allergen: {
    title: 'Possible allergens',
    why:
      'A food allergy can cause reactions ranging from hives and stomach upset to a severe, life-threatening reaction (anaphylaxis).',
    guideline:
      'There is no safe amount for a person with an allergy. If you have one, check the ingredients with the restaurant or on the label.',
    quantityNote: "A photo can't show every ingredient, so the real list may be longer than this.",
  },
};

// ---------- Daily reference values (FDA, 2,000 kcal diet) ----------
const REF = { satFat: 20, sodium: 2300, addedSugar: 50, kcal: 2000 };

// FDA: 20% of the Daily Value or more per serving is "high". The 50% and 100% levels are this app's own steps.
function tier(pct: number): { severity: Severity; badge: string } | null {
  if (pct >= 100) return { severity: 'extreme', badge: 'Exceeds the daily reference' };
  if (pct >= 50) return { severity: 'strong', badge: 'Very high' };
  if (pct >= 20) return { severity: 'notice', badge: 'High' };
  return null;
}

function energyTier(pct: number): { severity: Severity; badge: string } | null {
  if (pct >= 100) return { severity: 'extreme', badge: 'Exceeds the daily reference' };
  if (pct >= 50) return { severity: 'strong', badge: 'Very high' };
  return null;
}

function sizePhrase(pct: number): string {
  if (pct >= 100) return 'more than the entire daily reference in a single serving';
  if (pct >= 50) return 'over half of the daily reference in a single serving';
  return 'a high share of the daily reference (the FDA calls 20% or more per serving "high")';
}

const ADDED_SUGAR_RE = /\b(sugar|syrup|honey|jaggery|molasses|icing|frosting|caramel|condensed milk)\b/i;

// Photo-based flags that should disappear when the matching ingredient is set to 0 g
const LINKED: Partial<Record<ConcernId, RegExp>> = {
  caffeine: /coffee|espresso|\btea\b|matcha|cola|cocoa|chocolate|energy drink|mocha/i,
  alcohol: /\b(wine|beer|vodka|rum|whisk(e)?y|gin|brandy|liquor|liqueur|cider|champagne|sake|tequila|alcohol)\b/i,
  processed_meat: /sausage|bacon|\bham\b|salami|pepperoni|hot dog|frankfurter|bologna|chorizo|prosciutto|luncheon/i,
};

function stillApplies(id: ConcernId, dish: Dish, grams: number[]): boolean {
  const re = LINKED[id];
  if (!re) return true;
  const matching: number[] = [];
  dish.ingredients.forEach((ing, i) => {
    if (re.test(ing.name)) matching.push(i);
  });
  if (matching.length === 0) return true; // nothing to check against, so trust the photo analysis
  return matching.some((i) => grams[i] > 0);
}

function mainSource(dish: Dish, grams: number[], key: NutrientKey, total: number) {
  if (!(total > 0)) return null;
  let bestName = '';
  let bestGrams = 0;
  let bestShare = 0;
  for (let i = 0; i < dish.ingredients.length; i++) {
    const v = dish.ingredients[i].per100g[key];
    if (typeof v !== 'number' || !(grams[i] > 0)) continue;
    const share = (v * grams[i]) / 100 / total;
    if (share > bestShare) {
      bestShare = share;
      bestName = dish.ingredients[i].name;
      bestGrams = grams[i];
    }
  }
  if (bestShare < 0.5) return null;
  return { name: bestName, grams: bestGrams, share: Math.round(bestShare * 100) };
}

const PRIORITY: ConcernId[] = [
  'alcohol', 'caffeine', 'high_sodium', 'added_sugar', 'processed_meat', 'deep_fried',
];
const SEV_RANK: Record<Severity, number> = { extreme: 2, strong: 3, notice: 4, info: 5 };

function rank(it: WatchItem): number {
  if (it.key === 'allergen') return 0;
  if (it.key === 'raw_undercooked') return 1;
  const priority = Math.max(0, PRIORITY.indexOf(it.key as ConcernId));
  return SEV_RANK[it.severity] * 10 + priority + (it.key.startsWith('qty-') ? -0.5 : 0);
}

// Everything below works from the CURRENT gram amounts, so it changes as the user edits them.
export function buildWatchItems(dish: Dish, totals: Totals, grams: number[]): WatchItem[] {
  const items: WatchItem[] = [];
  const flag = (id: string) => dish.watchOuts.find((w) => w.id === id);
  const spot = (id: string) => {
    const f = flag(id);
    return f && f.spottedIn ? `Spotted: ${f.spottedIn}` : '';
  };
  const mk = (id: ConcernId | CalcId, extra: Partial<WatchItem> & { severity: Severity }): WatchItem => {
    const c = CONCERNS[id];
    return { key: id, title: c.title, spotted: '', why: c.why, guideline: c.guideline, quantityNote: c.quantityNote, ...extra };
  };
  const sourceLine = (key: NutrientKey, total: number) => {
    const s = mainSource(dish, grams, key, total);
    return s ? `Main source: ${s.name} (${fmtAmount(s.grams)} g), about ${s.share}% of it` : '';
  };

  // 1) Saturated fat, from the latest amounts
  const sat = totals.satFat;
  if (sat) {
    const pct = (sat.amount / REF.satFat) * 100;
    const t = tier(pct);
    if (t) {
      items.push(
        mk('sat_fat', {
          severity: t.severity,
          badge: t.badge,
          summary: `This portion has about ${fmtAmount(sat.amount)} g of saturated fat${sat.partial ? ' or more' : ''}: ${Math.round(pct)}% of the 20 g FDA Daily Value, ${sizePhrase(pct)}.`,
          spotted: sourceLine('satFat', sat.amount),
        })
      );
    }
  }

  // 2) Sodium
  const sodium = totals.sodium;
  if (sodium) {
    const pct = (sodium.amount / REF.sodium) * 100;
    const t = tier(pct); // the numbers decide: no card if sodium is low
    if (t) {
      items.push(
        mk('high_sodium', {
          severity: t.severity,
          badge: t.badge,
          summary: `This portion has about ${fmtAmount(sodium.amount)} mg of sodium${sodium.partial ? ' or more' : ''}: ${Math.round(pct)}% of the 2,300 mg FDA Daily Value (an upper limit), ${sizePhrase(pct)}.`,
          spotted: sourceLine('sodium', sodium.amount),
        })
      );
    }
  } else if (flag('high_sodium')) {
    items.push(mk('high_sodium', { severity: 'info', spotted: spot('high_sodium') }));
  }

  // 3) Added sugar: from ingredients that are sugars or syrups, or flagged from the photo with real sugar in the data
  let addedGrams = 0;
  const addedNames: string[] = [];
  dish.ingredients.forEach((ing, i) => {
    const s = ing.per100g.sugar;
    if (ADDED_SUGAR_RE.test(ing.name) && typeof s === 'number' && grams[i] > 0) {
      addedGrams += (s * grams[i]) / 100;
      addedNames.push(ing.name);
    }
  });
  const totalSugar = totals.sugar?.amount ?? 0;
  const tenPercent = REF.addedSugar * 0.2;
  if (addedGrams >= tenPercent) {
    const pct = (addedGrams / REF.addedSugar) * 100;
    const t = tier(pct);
    if (t) {
      items.push(
        mk('added_sugar', {
          severity: t.severity,
          badge: t.badge,
          summary: `About ${fmtAmount(addedGrams)} g of sugar here comes from added sugars (${addedNames.join(', ')}): ${Math.round(pct)}% of the 50 g FDA Daily Value for added sugars, ${sizePhrase(pct)}.`,
          spotted: '',
        })
      );
    }
  } else if (flag('added_sugar') && totalSugar >= tenPercent) {
    items.push(
      mk('added_sugar', {
        severity: 'info',
        summary: `This portion has about ${fmtAmount(totalSugar)} g of sugars in total. That includes natural sugars from fruit or milk, and how much is added can't be told from a photo.`,
        spotted: spot('added_sugar'),
      })
    );
  }

  // 4) Calories
  const kcal = totals.kcal;
  if (kcal) {
    const pct = (kcal.amount / REF.kcal) * 100;
    const t = energyTier(pct);
    if (t) {
      items.push(
        mk('high_calorie', {
          severity: t.severity,
          badge: t.badge,
          summary: `This portion has roughly ${Math.round(kcal.amount)} kcal: ${Math.round(pct)}% of a 2,000 kcal reference day in a single serving.`,
          spotted: sourceLine('kcal', kcal.amount),
        })
      );
    }
  }

  // 5) Unusually large amount of a single ingredient
  dish.ingredients.forEach((ing, i) => {
    const g = grams[i];
    const max = ing.typicalMaxGrams;
    if (!(g > 0) || !max || ing.source === 'zero') return;
    const ratio = g / max;
    if (ratio < 2) return;

    const part = (key: NutrientKey) => {
      const v = ing.per100g[key];
      return typeof v === 'number' ? (v * g) / 100 : 0;
    };
    const kcalAmt = part('kcal');
    const satAmt = part('satFat');
    const sodAmt = part('sodium');
    const sugAmt = ADDED_SUGAR_RE.test(ing.name) ? part('sugar') : 0;

    const kcalPct = (kcalAmt / REF.kcal) * 100;
    const satPct = (satAmt / REF.satFat) * 100;
    const sodPct = (sodAmt / REF.sodium) * 100;
    const sugPct = (sugAmt / REF.addedSugar) * 100;

    // Avoid false alarms: it must also matter nutritionally
    if (!(kcalPct >= 10 || satPct >= 20 || sodPct >= 20 || sugPct >= 20)) return;

    const parts: string[] = [];
    if (kcalPct >= 10) parts.push(`about ${Math.round(kcalAmt)} kcal (${Math.round(kcalPct)}% of a 2,000 kcal day)`);
    if (satPct >= 20) parts.push(`${fmtAmount(satAmt)} g of saturated fat (${Math.round(satPct)}% of the 20 g Daily Value)`);
    if (sodPct >= 20) parts.push(`${fmtAmount(sodAmt)} mg of sodium (${Math.round(sodPct)}% of the 2,300 mg Daily Value)`);
    if (sugPct >= 20) parts.push(`${fmtAmount(sugAmt)} g of added sugar (${Math.round(sugPct)}% of the 50 g Daily Value)`);

    const ratioText = ratio >= 10 ? `${Math.round(ratio)} times` : `${Math.round(ratio * 10) / 10} times`;
    items.push({
      key: `qty-${i}`,
      title: `Large amount of ${ing.name}`,
      severity: ratio >= 4 ? 'extreme' : 'strong',
      badge: ratio >= 4 ? 'Unusually large amount' : 'Large amount',
      summary: `${fmtAmount(g)} g of ${ing.name} is about ${ratioText} the ${fmtAmount(max)} g a single serving of this dish usually contains. On its own it supplies ${parts.join('; ')}.`,
      spotted: `Typical for this dish: up to about ${fmtAmount(max)} g (AI estimate)`,
      why:
        'Amounts far above what a single serving normally contains can add up to a large share of a whole day’s saturated fat, sodium, sugar or energy. It is also worth double-checking the amount in case of a typing slip.',
      guideline:
        'For comparison, daily reference values for adults on a 2,000-calorie diet (FDA): saturated fat 20 g, sodium 2,300 mg, added sugars 50 g.',
    });
  });

  // 6) Photo-based concerns, re-checked against the current ingredients
  const done = new Set<string>(['added_sugar', 'high_sodium']);
  for (const f of dish.watchOuts) {
    const id = f.id as ConcernId;
    if (done.has(id) || !(id in CONCERNS)) continue;
    if (!stillApplies(id, dish, grams)) continue;

    let title = CONCERNS[id].title;
    if (id === 'allergen') {
      const list = f.allergens.filter((a) => ALLERGENS.includes(a));
      if (list.length === 0) continue;
      title = `${title}: ${list.join(', ')}`;
    }
    done.add(id);
    items.push(mk(id, { severity: 'info', title, spotted: spot(id) }));
  }

  return items.sort((a, b) => rank(a) - rank(b));
}