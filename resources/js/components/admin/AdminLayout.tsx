import { ReactNode } from 'react';
import AdminNavbar from './AdminNavbar';
import AdminSidebar from './AdminSidebar';
import { EditProvider } from '../../contexts/EditContext';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
    children: ReactNode;
    activeSidebarItem?: string;
}

export const AdminLayout = ({ children, activeSidebarItem = 'home' }: AdminLayoutProps) => {
    return (
        <EditProvider>
            <div className={styles.layout}>
                <AdminNavbar />
                <div className={styles.contentWrapper}>
                    <AdminSidebar activeItem={activeSidebarItem} />
                    <main className={styles.mainContent}>
                        {children}
                    </main>
                </div>
            </div>
        </EditProvider>
    );
};
