import type { VaultDocument } from '../types/document';

export type GroupKey = 'medicine' | 'docs' | 'others';

export const GROUPS: {
  key: GroupKey;
  title: string;
  emoji: string;
  description: string;
  categories: string[];
}[] = [
  { key: 'medicine', title: 'Medicine', emoji: '💊', description: 'Medicines and prescriptions', categories: ['Medicine'] },
  { key: 'docs', title: 'Docs', emoji: '📄', description: 'ID, insurance, vehicle, warranty', categories: ['ID', 'Insurance', 'Vehicle', 'Warranty'] },
  { key: 'others', title: 'Others', emoji: '📦', description: 'Everything else', categories: ['Other'] },
];

export function groupOf(category: string): GroupKey {
  return GROUPS.find((g) => g.categories.includes(category))?.key ?? 'others';
}

// Whole days from today until the expiry date (negative = already expired). null = no expiry.
export function daysUntil(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((new Date(expiryDate).getTime() - today.getTime()) / 86400000);
}

export function badgeInfo(expiryDate: string | null) {
  const days = daysUntil(expiryDate);
  if (days === null) return { text: 'No expiry', color: '#666' };
  if (days < 0) return { text: `Expired ${-days}d ago`, color: '#b00020' };
  if (days === 0) return { text: 'Expires today', color: '#b00020' };
  const text = `${days} ${days === 1 ? 'day' : 'days'} left`;
  return { text, color: days <= 30 ? '#e67e00' : '#2e7d32' };
}

// Nearest expiry first; documents without an expiry go to the bottom
export function sortByExpiry(docs: VaultDocument[]): VaultDocument[] {
  const t = (d: VaultDocument) => (d.expiryDate ? new Date(d.expiryDate).getTime() : Infinity);
  return [...docs].sort((a, b) => {
    const ta = t(a);
    const tb = t(b);
    if (ta === tb) return 0;
    return ta < tb ? -1 : 1;
  });
}