import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { VaultDocument } from '../types/document';

const STORAGE_KEY = 'vault-documents';

type DocumentsContextType = {
  documents: VaultDocument[];
  addDocument: (doc: Omit<VaultDocument, 'id'>) => void;
  updateDocument: (id: string, doc: Omit<VaultDocument, 'id'>) => void;
  deleteDocument: (id: string) => void;
  pendingImageUri: string | null;
  setPendingImageUri: (uri: string | null) => void;
};

const DocumentsContext = createContext<DocumentsContextType | null>(null);

export function DocumentsProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);

  // Load saved documents when the app starts
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((data) => {
        if (data) setDocuments(JSON.parse(data));
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  // Save whenever the list changes (but only after the first load finishes)
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(documents)).catch(() => {});
    }
  }, [documents, loaded]);

  const addDocument = (doc: Omit<VaultDocument, 'id'>) => {
    const newDoc = { ...doc, id: Date.now().toString() };
    setDocuments((prev) => [...prev, newDoc]);
  };
    const updateDocument = (id: string, doc: Omit<VaultDocument, 'id'>) => {
    setDocuments((prev) => prev.map((d) => (d.id === id ? { ...doc, id } : d)));
  };

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  };

  return (
        <DocumentsContext.Provider
      value={{
        documents,
        addDocument,
        updateDocument,
        deleteDocument,
        pendingImageUri,
        setPendingImageUri,
      }}
    >
      {children}
    </DocumentsContext.Provider>
  );
}

export function useDocuments() {
  const ctx = useContext(DocumentsContext);
  if (!ctx) throw new Error('useDocuments must be used inside DocumentsProvider');
  return ctx;
}