import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface EditContextType {
    hasUnsavedChanges: boolean;
    setHasUnsavedChanges: (value: boolean) => void;
    onSave: (() => void) | null;
    onDiscard: (() => void) | null;
    setSaveHandler: (handler: (() => void) | null) => void;
    setDiscardHandler: (handler: (() => void) | null) => void;
}

const EditContext = createContext<EditContextType | undefined>(undefined);

export function EditProvider({ children }: { children: ReactNode }) {
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [onSave, setSaveHandler] = useState<(() => void) | null>(null);
    const [onDiscard, setDiscardHandler] = useState<(() => void) | null>(null);

    return (
        <EditContext.Provider
            value={{
                hasUnsavedChanges,
                setHasUnsavedChanges,
                onSave,
                onDiscard,
                setSaveHandler,
                setDiscardHandler,
            }}
        >
            {children}
        </EditContext.Provider>
    );
}

export function useEdit() {
    const context = useContext(EditContext);
    if (context === undefined) {
        throw new Error('useEdit must be used within an EditProvider');
    }
    return context;
}
