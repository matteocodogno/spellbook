import { createContext, type ReactNode, useCallback, useEffect, useRef, useState } from "react";

interface NotesContextValue {
  notes: Record<string, string>;
  setNote: (key: string, value: string) => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const NotesContext = createContext<NotesContextValue | undefined>(undefined);

const NOTES_KEY = "ai4dev-workflow-notes";

interface NotesProviderProps {
  children: ReactNode;
}

export function NotesProvider({ children }: NotesProviderProps) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const notesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesReadyRef = useRef(false);

  // Load notes from storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        // @ts-expect-error — window.storage is a Claude artifact API
        const result = await window.storage.get(NOTES_KEY);
        if (result?.value) setNotes(JSON.parse(result.value));
      } catch { /* ignore */ }
      notesReadyRef.current = true;
    };
    load();
  }, []);

  const setNote = useCallback((key: string, value: string) => {
    setNotes(prev => {
      const next = { ...prev };
      if (value.trim() === "") delete next[key];
      else next[key] = value;

      // Debounced save to storage
      if (notesReadyRef.current) {
        if (notesDebounceRef.current) clearTimeout(notesDebounceRef.current);
        notesDebounceRef.current = setTimeout(async () => {
          try {
            // @ts-expect-error — window.storage is a Claude artifact API
            await window.storage.set(NOTES_KEY, JSON.stringify(next));
          } catch { /* ignore */ }
        }, 800);
      }
      return next;
    });
  }, []);

  const value: NotesContextValue = {
    notes,
    setNote,
  };

  return (
    <NotesContext.Provider value={value}>
      {children}
    </NotesContext.Provider>
  );
}

