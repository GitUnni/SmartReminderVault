export type VaultDocument = {
  id: string;
  name: string;
  category: string;
  expiryDate: string; // ISO string
  imageUri: string | null;
  fields?: Record<string, string>; // extra details, e.g. { Dosage: "500 mg" }
};

export const CATEGORIES = ['Medicine', 'ID', 'Insurance', 'Vehicle', 'Warranty', 'Other'];