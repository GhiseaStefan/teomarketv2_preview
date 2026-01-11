import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Search, X, Menu, MoreVertical, CheckCircle2, XCircle } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import styles from './product-families.module.css';

interface ProductFamily {
    id: number;
    name: string;
    code: string;
    status: boolean;
    products_count: number;
    created_at: string;
    created_at_formatted: string;
}

interface ProductFamiliesPageProps {
    productFamilies: ProductFamily[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
    };
}

export default function AdminProductFamilies({
    productFamilies,
    pagination,
    filters: initialFilters,
}: ProductFamiliesPageProps) {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [showSearch, setShowSearch] = useState(!!initialFilters.search);
    const [selectedFamilies, setSelectedFamilies] = useState<Set<number>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };

        if (dropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dropdownOpen]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/product-families', {
            search: searchQuery,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearSearch = () => {
        setSearchQuery('');
        router.get('/admin/product-families', {
            search: '',
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedFamilies(new Set(productFamilies.map(f => f.id)));
        } else {
            setSelectedFamilies(new Set());
        }
    };

    const handleSelectFamily = (familyId: number) => {
        const newSelected = new Set(selectedFamilies);
        if (newSelected.has(familyId)) {
            newSelected.delete(familyId);
        } else {
            newSelected.add(familyId);
        }
        setSelectedFamilies(newSelected);
    };

    const handleDeactivateSelected = () => {
        if (selectedFamilies.size === 0) return;

        if (confirm(t('Are you sure you want to deactivate selected product families?', 'Esti sigur ca vrei sa dezactivezi familiile de produse selectate?'))) {
            router.post('/admin/product-families/deactivate', {
                family_ids: Array.from(selectedFamilies),
            }, {
                onSuccess: () => {
                    setSelectedFamilies(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const handleActivateSelected = () => {
        if (selectedFamilies.size === 0) return;

        if (confirm(t('Are you sure you want to activate selected product families?', 'Esti sigur ca vrei sa activezi familiile de produse selectate?'))) {
            router.post('/admin/product-families/activate', {
                family_ids: Array.from(selectedFamilies),
            }, {
                onSuccess: () => {
                    setSelectedFamilies(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const hasInactiveSelected = productFamilies
        .filter(f => selectedFamilies.has(f.id))
        .some(f => !f.status);

    const hasActiveSelected = productFamilies
        .filter(f => selectedFamilies.has(f.id))
        .some(f => f.status);

    const getStatusBadgeStyle = (status: boolean) => {
        if (status) {
            return {
                backgroundColor: '#d1fae5',
                color: '#059669',
                borderColor: '#10b981',
            };
        } else {
            return {
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderColor: '#ef4444',
            };
        }
    };

    return (
        <AdminLayout activeSidebarItem="product-families">
            <div className={styles.productFamiliesPage}>
                {/* Top Filters Row with Actions and Toggle Button */}
                <div className={styles.topFiltersRow}>
                    <h1 className={styles.pageTitle}>{t('Product Families', 'Familii de produse')}</h1>
                    <div className={styles.topActionsContainer}>
                        <div className={styles.actionsContainer} ref={dropdownRef}>
                            {selectedFamilies.size > 0 && (
                                <span className={styles.selectedCount}>
                                    {selectedFamilies.size} {t('selected', 'selectate')}
                                </span>
                            )}
                            <button
                                className={styles.actionsButton}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                disabled={selectedFamilies.size === 0}
                            >
                                <MoreVertical size={18} />
                            </button>
                            {dropdownOpen && (
                                <div className={styles.dropdownMenu}>
                                    {hasInactiveSelected && (
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={handleActivateSelected}
                                        >
                                            <CheckCircle2 size={16} />
                                            <span>{t('Activate selected', 'Activeaza selectate')}</span>
                                        </button>
                                    )}
                                    {hasActiveSelected && (
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={handleDeactivateSelected}
                                        >
                                            <XCircle size={16} />
                                            <span>{t('Deactivate selected', 'Dezactiveaza selectate')}</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            className={styles.searchFilterToggleButton}
                            onClick={() => setShowSearch(!showSearch)}
                        >
                            <Search size={18} />
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Bar - Only shown when toggle is active */}
                {showSearch && (
                    <div className={styles.searchBarContainer}>
                        <form onSubmit={handleSearch} className={styles.searchBarForm}>
                            <Search size={16} className={styles.searchBarIcon} />
                            <input
                                type="text"
                                placeholder={t('Search product families', 'Cauta familii de produse')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchBarInput}
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={clearSearch}
                                    className={styles.searchBarCancel}
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </form>
                    </div>
                )}

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.familiesTable}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxHeader}>
                                    <input
                                        type="checkbox"
                                        checked={productFamilies.length > 0 && selectedFamilies.size === productFamilies.length}
                                        onChange={handleSelectAll}
                                        className={styles.checkbox}
                                    />
                                </th>
                                <th className={styles.idHeader}>{t('ID', 'ID')}</th>
                                <th>{t('Name', 'Nume')}</th>
                                <th>{t('Code', 'Cod')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th>{t('Products Count', 'Numar produse')}</th>
                                <th>{t('Created At', 'Data crearii')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productFamilies.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={styles.emptyState}>
                                        {t('No product families found', 'Nu s-au gasit familii de produse')}
                                    </td>
                                </tr>
                            ) : (
                                productFamilies.map((family) => (
                                    <tr key={family.id} className={!family.status ? styles.inactiveRow : ''}>
                                        <td className={styles.checkboxCell}>
                                            <input
                                                type="checkbox"
                                                checked={selectedFamilies.has(family.id)}
                                                onChange={() => handleSelectFamily(family.id)}
                                                className={styles.checkbox}
                                            />
                                        </td>
                                        <td className={styles.familyId}>
                                            #{family.id}
                                        </td>
                                        <td className={styles.familyName}>
                                            <a
                                                href={`/admin/product-families/${family.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.familyLink}
                                            >
                                                {family.name}
                                            </a>
                                        </td>
                                        <td className={styles.familyCode}>
                                            <code>{family.code}</code>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusBadge}
                                                style={getStatusBadgeStyle(family.status)}
                                            >
                                                {family.status
                                                    ? t('Active', 'Activ')
                                                    : t('Inactive', 'Inactiv')}
                                            </span>
                                        </td>
                                        <td className={styles.productsCount}>
                                            {family.products_count}
                                        </td>
                                        <td className={styles.createdAt}>
                                            {family.created_at_formatted}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className={styles.pagination}>
                        <button
                            disabled={pagination.current_page === 1}
                            onClick={() => router.get('/admin/product-families', {
                                search: searchQuery,
                                page: pagination.current_page - 1,
                            })}
                            className={styles.paginationButton}
                        >
                            {t('Previous', 'Anterior')}
                        </button>
                        <span className={styles.paginationInfo}>
                            {t('Page', 'Pagina')} {pagination.current_page} {t('of', 'din')} {pagination.last_page}
                        </span>
                        <button
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() => router.get('/admin/product-families', {
                                search: searchQuery,
                                page: pagination.current_page + 1,
                            })}
                            className={styles.paginationButton}
                        >
                            {t('Next', 'Urmator')}
                        </button>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
