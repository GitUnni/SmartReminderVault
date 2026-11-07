export type VaultDocument = {
  id: string;
  name: string;
  category: string;
  expiryDate: string; // ISO string, e.g. "2027-03-15T00:00:00.000Z"
  imageUri: string | null;
};

export const CATEGORIES = ['Insurance', 'Vehicle', 'ID', 'Warranty', 'Other'];