import { Home, ShoppingBag, Package, Users, FileText, UserCircle, Star, FolderTree } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import type { SharedData } from '../../types';
import { useTranslations } from '../../utils/translations';
import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
    activeItem?: string;
}

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
    isComingSoon?: boolean;
}

export default function AdminSidebar({ activeItem = 'home' }: AdminSidebarProps) {
    const { t } = useTranslations();
    
    const sidebarItems: SidebarItem[] = [
        {
            id: 'home',
            label: t('Home', 'Acasa'),
            icon: <Home size={18} />,
            href: '/admin',
        },
        {
            id: 'orders',
            label: t('Orders', 'Comenzi'),
            icon: <ShoppingBag size={18} />,
            href: '/admin/orders',
        },
        {
            id: 'products',
            label: t('Products', 'Produse'),
            icon: <Package size={18} />,
            href: '/admin/products',
        },
        {
            id: 'categories',
            label: t('Categories', 'Categorii'),
            icon: <FolderTree size={18} />,
            href: '/admin/categories',
            isComingSoon: true,
        },
        {
            id: 'customers',
            label: t('Customers', 'Clienti'),
            icon: <Users size={18} />,
            href: '/admin/customers',
        },
        {
            id: 'users',
            label: t('Team', 'Echipa'),
            icon: <UserCircle size={18} />,
            href: '/admin/users',
        },
        {
            id: 'reviews',
            label: t('Reviews', 'Recenzii'),
            icon: <Star size={18} />,
            href: '/admin/reviews',
            isComingSoon: true,
        },
        {
            id: 'content',
            label: t('Content', 'Continut'),
            icon: <FileText size={18} />,
            href: '/admin/content',
            isComingSoon: true,
        },
    ];

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    {sidebarItems.map((item) => {
                        const isActive = activeItem === item.id;
                        return (
                            <li key={item.id} className={styles.navItem}>
                                <Link
                                    href={item.href}
                                    className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
                                >
                                    <span className={styles.navIcon}>{item.icon}</span>
                                    <span className={styles.navLabel}>
                                        {item.label}
                                        {item.isComingSoon && ' (soon)'}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
