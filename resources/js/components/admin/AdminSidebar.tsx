import { useState, useEffect } from 'react';
import { Home, ShoppingBag, Package, Users, FileText, UserCircle, Star, FolderTree, ChevronDown, List, Plus, Layers, RotateCcw } from 'lucide-react';
import { Link, usePage } from '@inertiajs/react';
import type { SharedData } from '../../types';
import { useTranslations } from '../../utils/translations';
import styles from './AdminSidebar.module.css';

interface AdminSidebarProps {
    activeItem?: string;
}

interface SubTab {
    id: string;
    label: string;
    href: string;
    icon: React.ReactNode;
    isComingSoon?: boolean;
}

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    href: string;
    isComingSoon?: boolean;
    subtabs?: SubTab[];
}

export default function AdminSidebar({ activeItem = 'home' }: AdminSidebarProps) {
    const { t } = useTranslations();
    const { url } = usePage();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    
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
            id: 'returns',
            label: t('Returns', 'Returnuri'),
            icon: <RotateCcw size={18} />,
            href: '/admin/returns',
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
            subtabs: [
                {
                    id: 'categories-list',
                    label: t('List categories', 'Lista categorii'),
                    href: '/admin/categories',
                    icon: <List size={16} />,
                },
                {
                    id: 'categories-add',
                    label: t('Add category', 'Adauga categorie'),
                    href: '/admin/categories/add',
                    icon: <Plus size={16} />,
                    isComingSoon: true,
                },
            ],
        },
        {
            id: 'product-families',
            label: t('Product Families', 'Familii de produse'),
            icon: <Layers size={18} />,
            href: '/admin/product-families',
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

    const toggleExpanded = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // Auto-expand menu items when their subtabs are active
    useEffect(() => {
        sidebarItems.forEach((item) => {
            if (item.subtabs) {
                const hasActiveSubtab = item.subtabs.some(
                    (subtab) => url === subtab.href || url.startsWith(subtab.href + '/')
                );
                if (hasActiveSubtab) {
                    setExpandedItems(prev => {
                        const newSet = new Set(prev);
                        newSet.add(item.id);
                        return newSet;
                    });
                }
            }
        });
    }, [url]);

    const isExpanded = (itemId: string) => expandedItems.has(itemId);
    const isItemActive = (itemId: string) => activeItem === itemId;

    return (
        <aside className={styles.sidebar}>
            <nav className={styles.nav}>
                <ul className={styles.navList}>
                    {sidebarItems.map((item) => {
                        const isActive = isItemActive(item.id);
                        const hasSubtabs = item.subtabs && item.subtabs.length > 0;
                        const expanded = hasSubtabs ? isExpanded(item.id) : false;
                        
                        return (
                            <li key={item.id} className={styles.navItem}>
                                <div className={styles.navItemWrapper}>
                                    {hasSubtabs ? (
                                        <button
                                            onClick={() => toggleExpanded(item.id)}
                                            className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''} ${styles.navLinkWithSubtabs}`}
                                        >
                                            <span className={styles.navIcon}>{item.icon}</span>
                                            <span className={styles.navLabel}>
                                                {item.label}
                                                {item.isComingSoon && ' (soon)'}
                                            </span>
                                            <ChevronDown 
                                                size={16} 
                                                className={`${styles.chevronIcon} ${expanded ? styles.chevronIconExpanded : ''}`}
                                            />
                                        </button>
                                    ) : (
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
                                    )}
                                    
                                    {hasSubtabs && expanded && (
                                        <ul className={styles.subtabsList}>
                                            {item.subtabs!.map((subtab) => {
                                                const isSubtabActive = url === subtab.href || url.startsWith(subtab.href + '/');
                                                return (
                                                    <li key={subtab.id} className={styles.subtabItem}>
                                                        <Link
                                                            href={subtab.href}
                                                            className={`${styles.subtabLink} ${isSubtabActive ? styles.subtabLinkActive : ''}`}
                                                        >
                                                            <span className={styles.subtabIcon}>{subtab.icon}</span>
                                                            <span className={styles.subtabLabel}>
                                                                {subtab.label}
                                                            </span>
                                                            {subtab.isComingSoon && (
                                                                <span className={styles.comingSoonBadge}>
                                                                    {t('Soon', 'In curand')}
                                                                </span>
                                                            )}
                                                        </Link>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    )}
                                </div>
                            </li>
                        );
                    })}
                </ul>
            </nav>
        </aside>
    );
}
