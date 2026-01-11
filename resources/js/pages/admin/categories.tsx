import { useState, useRef, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { Search, MoreVertical, Eye, EyeOff, Trash2, Menu, X } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import styles from './categories.module.css';

interface Category {
    id: number;
    name: string;
    slug: string;
    parent_name: string;
    status: boolean;
    products_count: number;
    created_at: string | null;
}

interface CategoriesPageProps {
    categories: Category[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        search: string;
        level: number | null;
    };
    maxLevel: number;
}

export default function AdminCategories({ categories, pagination, filters: initialFilters, maxLevel }: CategoriesPageProps) {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [selectedLevel, setSelectedLevel] = useState<number | null>(initialFilters.level ?? null);
    const [selectedCategories, setSelectedCategories] = useState<Set<number>>(new Set());
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [showSearchAndFilters, setShowSearchAndFilters] = useState(false);
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
        router.get('/admin/categories', { 
            search: searchQuery,
            level: selectedLevel,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleLevelChange = (level: number | null) => {
        setSelectedLevel(level);
        router.get('/admin/categories', {
            search: searchQuery,
            level: level,
            page: 1,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearSearch = () => {
        setSearchQuery('');
        router.get('/admin/categories', {
            search: '',
            level: selectedLevel,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedCategories(new Set(categories.map(c => c.id)));
        } else {
            setSelectedCategories(new Set());
        }
    };

    const handleSelectCategory = (categoryId: number) => {
        const newSelected = new Set(selectedCategories);
        if (newSelected.has(categoryId)) {
            newSelected.delete(categoryId);
        } else {
            newSelected.add(categoryId);
        }
        setSelectedCategories(newSelected);
    };

    const handleDeactivateSelected = () => {
        if (selectedCategories.size === 0) return;

        if (confirm(t('Are you sure you want to deactivate selected categories?', 'Esti sigur ca vrei sa dezactivezi categoriile selectate?'))) {
            router.post('/admin/categories/deactivate', {
                category_ids: Array.from(selectedCategories),
            }, {
                onSuccess: () => {
                    setSelectedCategories(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const handleActivateSelected = () => {
        if (selectedCategories.size === 0) return;

        if (confirm(t('Are you sure you want to activate selected categories?', 'Esti sigur ca vrei sa activezi categoriile selectate?'))) {
            router.post('/admin/categories/activate', {
                category_ids: Array.from(selectedCategories),
            }, {
                onSuccess: () => {
                    setSelectedCategories(new Set());
                    setDropdownOpen(false);
                },
            });
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedCategories.size === 0) return;

        const confirmMessage = t('Are you sure you want to delete selected categories?', 'Esti sigur ca vrei sa stergi categoriile selectate?');
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const categoryIds = Array.from(selectedCategories);

            // Delete each category individually
            const deletePromises = categoryIds.map(async (categoryId) => {
                const response = await fetch(`/admin/categories/${categoryId}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });
                return { id: categoryId, response, data: await response.json() };
            });

            const results = await Promise.all(deletePromises);
            const failed = results.filter(r => !r.response.ok || !r.data.success);
            
            if (failed.length > 0) {
                const errorMessages = failed.map(r => r.data.message || t('Error deleting category', 'Eroare la stergerea categoriei')).join('\n');
                alert(errorMessages);
            } else {
                // Clear selection and close dropdown on success
                setSelectedCategories(new Set());
                setDropdownOpen(false);
                // Reload the page to refresh the list
                router.reload();
            }
        } catch (error) {
            console.error('Error deleting categories:', error);
            alert(t('Error deleting categories', 'Eroare la stergerea categoriilor'));
        }
    };

    const hasInactiveSelected = categories
        .filter(c => selectedCategories.has(c.id))
        .some(c => !c.status);

    const hasActiveSelected = categories
        .filter(c => selectedCategories.has(c.id))
        .some(c => c.status);

    const levelFilters = [
        { id: null, label: t('All', 'Toate') },
        ...Array.from({ length: maxLevel }, (_, i) => ({
            id: i + 1,
            label: `${t('Level', 'Nivel')} ${i + 1}`,
        })),
    ];

    return (
        <AdminLayout activeSidebarItem="categories">
            <div className={styles.categoriesPage}>
                {/* Level Filters and Search/Filter Toggle Button Row */}
                <div className={styles.topFiltersRow}>
                    <div className={styles.filterTabs}>
                        {levelFilters.map((filter) => (
                            <button
                                key={filter.id === null ? 'all' : filter.id}
                                className={`${styles.filterTab} ${selectedLevel === filter.id ? styles.filterTabActive : ''}`}
                                onClick={() => handleLevelChange(filter.id)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    
                    <div className={styles.topActionsContainer}>
                        <div className={styles.actionsContainer} ref={dropdownRef}>
                            {selectedCategories.size > 0 && (
                                <span className={styles.selectedCount}>
                                    {selectedCategories.size} {t('selected', 'selectate')}
                                </span>
                            )}
                            <button
                                className={styles.actionsButton}
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                disabled={selectedCategories.size === 0}
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
                                            <Eye size={16} />
                                            <span>{t('Activate selected', 'Activeaza selectate')}</span>
                                        </button>
                                    )}
                                    {hasActiveSelected && (
                                        <button
                                            className={styles.dropdownItem}
                                            onClick={handleDeactivateSelected}
                                        >
                                            <EyeOff size={16} />
                                            <span>{t('Deactivate selected', 'Dezactiveaza selectate')}</span>
                                        </button>
                                    )}
                                    <button
                                        className={styles.dropdownItem}
                                        onClick={handleDeleteSelected}
                                        style={{ color: 'var(--color-error)' }}
                                    >
                                        <Trash2 size={16} />
                                        <span>{t('Delete selected categories', 'Sterge categoriile selectate')}</span>
                                    </button>
                                </div>
                            )}
                        </div>
                        
                        <button
                            type="button"
                            className={styles.searchFilterToggleButton}
                            onClick={() => setShowSearchAndFilters(!showSearchAndFilters)}
                        >
                            <Search size={18} />
                            <Menu size={18} />
                        </button>
                    </div>
                </div>

                {/* Search Bar - Only shown when toggle is active */}
                {showSearchAndFilters && (
                    <div className={styles.searchBarContainer}>
                        <form onSubmit={handleSearch} className={styles.searchBarForm}>
                            <Search size={16} className={styles.searchBarIcon} />
                            <input
                                type="text"
                                placeholder={t('Search categories', 'Cautare categorii')}
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
                    <table className={styles.categoriesTable}>
                        <thead>
                            <tr>
                                <th className={styles.checkboxHeader}>
                                    <input
                                        type="checkbox"
                                        checked={categories.length > 0 && selectedCategories.size === categories.length}
                                        onChange={handleSelectAll}
                                        className={styles.checkbox}
                                    />
                                </th>
                                <th className={styles.idHeader}>{t('ID', 'ID')}</th>
                                <th>{t('Category name', 'Nume categorie')}</th>
                                <th>{t('Slug', 'Slug')}</th>
                                <th>{t('Parent', 'Parinte')}</th>
                                <th className={styles.statusHeader}>{t('Status', 'Status')}</th>
                                <th className={styles.productsCountHeader}>{t('Products', 'Produse')}</th>
                                <th>{t('Created at', 'Creat la')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className={styles.emptyState}>
                                        {t('No categories found', 'Nu s-au gasit categorii')}
                                    </td>
                                </tr>
                            ) : (
                                categories.map((category) => (
                                    <tr key={category.id} className={!category.status ? styles.inactiveRow : ''}>
                                        <td className={styles.checkboxCell}>
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.has(category.id)}
                                                onChange={() => handleSelectCategory(category.id)}
                                                className={styles.checkbox}
                                            />
                                        </td>
                                        <td className={styles.categoryId}>
                                            {category.id}
                                        </td>
                                        <td className={styles.categoryName}>
                                            <a
                                                href={`/admin/categories/${category.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.categoryLink}
                                            >
                                                {category.name}
                                            </a>
                                        </td>
                                        <td className={styles.slug}>
                                            {category.slug}
                                        </td>
                                        <td className={styles.parentName}>
                                            {category.parent_name || '-'}
                                        </td>
                                        <td className={styles.status}>
                                            <span className={category.status ? styles.statusActive : styles.statusInactive}>
                                                {category.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                            </span>
                                        </td>
                                        <td className={styles.productsCount}>
                                            {category.products_count}
                                        </td>
                                        <td className={styles.createdAt}>
                                            {category.created_at || '-'}
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
                            onClick={() => router.get('/admin/categories', {
                                search: searchQuery,
                                level: selectedLevel,
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
                            onClick={() => router.get('/admin/categories', {
                                search: searchQuery,
                                level: selectedLevel,
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
