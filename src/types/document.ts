export type Detail = {
  id: string;
  label: string;
  value: string; // for kind "date": "YYYY-MM-DD", or "YYYY-MM" when the day is unknown
  kind: 'text' | 'date';
};

export type VaultDocument = {
  id: string;
  name: string;
  category: string;
  expiryDate: string | null; // ISO string, or null when the item has no expiry
  imageUri: string | null;
  details?: Detail[];
};

export const CATEGORIES = ['Medicine', 'ID', 'Insurance', 'Vehicle', 'Warranty', 'Other'];