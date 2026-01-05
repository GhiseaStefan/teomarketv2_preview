import { ReactNode, useState } from 'react';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Footer } from './Footer';
import { SettingsModalProvider } from '../../contexts/SettingsModalContext';
import styles from './Layout.module.css';

interface LayoutProps {
    children: ReactNode;
    activeSidebarItem?: string;
}

export default function Layout({ children, activeSidebarItem = 'home' }: LayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <SettingsModalProvider>
            <div className={styles.layout}>
                <Sidebar activeItem={activeSidebarItem} isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
                {isSidebarOpen && <div className={styles.sidebarOverlay} onClick={() => setIsSidebarOpen(false)} />}
                <div className={styles.mainContent}>
                    <Navbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
                    {children}
                    <Footer />
                </div>
            </div>
        </SettingsModalProvider>
    );
}
