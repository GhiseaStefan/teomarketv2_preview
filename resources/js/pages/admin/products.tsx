import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Search, Filter, Package, Box } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import { formatPrice } from '../../utils/formatPrice';
import styles from './products.module.css';

interface Product {
    id: number;
    sku: string;
    ean: string;
    name: string;
    model: string;
    brand_name: string;
    price_ron: string;
    stock_quantity: number;
    status: boolean;
    image_url: string | null;
    created_at: string;
    created_at_formatted: string;
}

interface ProductsPageProps {
    products: Product[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        filter: string;
        search: string;
    };
}

export default function AdminProducts({ products, pagination, filters: initialFilters }: ProductsPageProps) {
    const { t } = useTranslations();
    const [activeFilter, setActiveFilter] = useState(initialFilters.filter || 'all');
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');

    const filters = [
        { id: 'all', label: t('All', 'Toate') },
        { id: 'active', label: t('Active', 'Active') },
        { id: 'inactive', label: t('Inactive', 'Inactive') },
        { id: 'out_of_stock', label: t('Out of Stock', 'Stoc Epuizat') },
    ];

    const handleFilterChange = (filterId: string) => {
        setActiveFilter(filterId);
        router.get('/admin/products', { filter: filterId, search: searchQuery }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/products', { filter: activeFilter, search: searchQuery }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const getStatusBadgeStyle = (isActive: boolean) => {
        if (isActive) {
            return {
                backgroundColor: '#d1fae5',
                color: '#059669',
                borderColor: '#10b981',
            };
        } else {
            return {
                backgroundColor: '#ef444420',
                color: '#ef4444',
                borderColor: '#ef4444',
            };
        }
    };

    const getStockBadgeStyle = (stockQuantity: number) => {
        if (stockQuantity > 0) {
            return {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                borderColor: '#60a5fa',
            };
        } else {
            return {
                backgroundColor: '#ef444420',
                color: '#ef4444',
                borderColor: '#ef4444',
            };
        }
    };

    return (
        <AdminLayout activeSidebarItem="products">
            <div className={styles.productsPage}>
                {/* Header with Filters */}
                <div className={styles.header}>
                    <div className={styles.filterTabs}>
                        {filters.map((filter) => (
                            <button
                                key={filter.id}
                                className={`${styles.filterTab} ${activeFilter === filter.id ? styles.filterTabActive : ''}`}
                                onClick={() => handleFilterChange(filter.id)}
                            >
                                {filter.label}
                            </button>
                        ))}
                    </div>
                    <div className={styles.headerActions}>
                        <form onSubmit={handleSearch} className={styles.searchForm}>
                            <Search size={18} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={t('Search', 'Cauta')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </form>
                        <button className={styles.filterButton}>
                            <Filter size={18} />
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.productsTable}>
                        <thead>
                            <tr>
                                <th>{t('Product', 'Produs')}</th>
                                <th>{t('SKU', 'SKU')}</th>
                                <th>{t('Brand', 'Marca')}</th>
                                <th>{t('Price', 'Pret')}</th>
                                <th>{t('Stock', 'Stoc')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th>{t('Date', 'Data')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={styles.emptyState}>
                                        {t('No products found', 'Nu s-au gasit produse')}
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => (
                                    <tr key={product.id}>
                                        <td className={styles.productInfo}>
                                            <div className={styles.productImageContainer}>
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className={styles.productImage}
                                                    />
                                                ) : (
                                                    <div className={styles.productImagePlaceholder}>
                                                        <Package size={20} />
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.productDetails}>
                                                <a
                                                    href={`/admin/products/${product.id}`}
                                                    className={styles.productNameLink}
                                                >
                                                    {product.name}
                                                </a>
                                                {product.model && (
                                                    <div className={styles.productModel}>{product.model}</div>
                                                )}
                                            </div>
                                        </td>
                                        <td className={styles.sku}>
                                            {product.sku || '-'}
                                        </td>
                                        <td className={styles.brand}>
                                            {product.brand_name}
                                        </td>
                                        <td className={styles.price}>
                                            {formatPrice(product.price_ron)} RON
                                        </td>
                                        <td>
                                            <span
                                                className={styles.stockBadge}
                                                style={getStockBadgeStyle(product.stock_quantity)}
                                            >
                                                {product.stock_quantity}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusBadge}
                                                style={getStatusBadgeStyle(product.status)}
                                            >
                                                {product.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                            </span>
                                        </td>
                                        <td className={styles.dateTime}>
                                            {product.created_at_formatted}
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
                            onClick={() => router.get('/admin/products', {
                                filter: activeFilter,
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
                            onClick={() => router.get('/admin/products', {
                                filter: activeFilter,
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
