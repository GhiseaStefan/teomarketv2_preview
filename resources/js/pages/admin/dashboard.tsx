import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
    const { t } = useTranslations();
    
    return (
        <AdminLayout activeSidebarItem="home">
            <div className={styles.dashboard}>
                <h1 className={styles.title}>{t('Admin Dashboard', 'Panou Admin')}</h1>
                <p className={styles.subtitle}>{t('Welcome to the admin panel', 'Bun venit in panoul de administrare')}</p>
            </div>
        </AdminLayout>
    );
}
