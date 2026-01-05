import { createContext, useContext, ReactNode, useState } from 'react';

interface SettingsModalContextType {
    isModalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
}

const SettingsModalContext = createContext<SettingsModalContextType | undefined>(undefined);

export const useSettingsModal = () => {
    const context = useContext(SettingsModalContext);
    if (!context) {
        throw new Error('useSettingsModal must be used within SettingsModalProvider');
    }
    return context;
};

interface SettingsModalProviderProps {
    children: ReactNode;
}

export const SettingsModalProvider = ({ children }: SettingsModalProviderProps) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    return (
        <SettingsModalContext.Provider value={{ isModalOpen, openModal, closeModal }}>
            {children}
        </SettingsModalContext.Provider>
    );
};
