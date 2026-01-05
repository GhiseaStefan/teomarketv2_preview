import React, { useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import { ProductCard } from '../../components/ProductCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTranslations } from '../../utils/translations';
import type { SharedData, Currency, CustomerGroup } from '../../types';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown, ArrowUpDown, Filter, X, SlidersHorizontal } from 'lucide-react';
import styles from './index.module.css';

interface PriceTier {
    min_quantity: number;
    max_quantity: number | null;
    quantity_range: string;
    price_raw: number;
}

interface Product {
    id: number;
    name: string;
    title: string;
    image: string;
    stock_quantity?: number;
    sku?: string;
    short_description?: string;
    slug?: string;
    price_raw?: number;
    vat_included?: boolean;
    price_tiers?: PriceTier[];
}

interface BreadcrumbItem {
    name: string;
    slug: string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    breadcrumb?: BreadcrumbItem[];
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Filters {
    category_id?: number | string;
    category_slug?: string;
    search?: string;
    price_min?: string | number;
    price_max?: string | number;
    in_stock?: string | boolean;
    order_by?: string;
    order_direction?: string;
}

interface ProductListingPageProps {
    products: Product[];
    pagination: Pagination;
    category?: Category | null;
    filters: Filters;
    categories?: Category[];
}

function ProductListingContent({
    products = [],
    pagination,
    category,
    filters,
    categories = [],
}: ProductListingPageProps) {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const customerGroup = (props.customerGroup as CustomerGroup | null) || null;
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];
    const [orderBy, setOrderBy] = useState(filters.order_by || 'name');
    const [orderDirection, setOrderDirection] = useState(filters.order_direction || 'asc');
    
    // Filter states
    const [priceMin, setPriceMin] = useState<string>(filters.price_min?.toString() || '');
    const [priceMax, setPriceMax] = useState<string>(filters.price_max?.toString() || '');
    const [inStock, setInStock] = useState<string>(filters.in_stock?.toString() || '');
    const [showFilters, setShowFilters] = useState(false);
    
    const getRequestParams = (additionalParams: Record<string, any> = {}) => {
        const params: Record<string, any> = {
            ...filters,
            ...additionalParams,
        };
        return params;
    };

    const handleOrderChange = (newOrderBy: string) => {
        const newDirection = orderBy === newOrderBy && orderDirection === 'asc' ? 'desc' : 'asc';
        setOrderBy(newOrderBy);
        setOrderDirection(newDirection);
        
        router.get('/products', getRequestParams({
            order_by: newOrderBy,
            order_direction: newDirection,
        }), {
            preserveState: true,
        });
    };

    const handleFilterApply = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        router.get('/products', getRequestParams({
            search: filters.search || undefined,
            price_min: priceMin || undefined,
            price_max: priceMax || undefined,
            in_stock: inStock || undefined,
            order_by: orderBy,
            order_direction: orderDirection,
            page: 1, // Reset to first page when filtering
        }), {
            preserveState: true,
            only: ['products', 'pagination', 'filters'],
        });
    };

    const handleFilterClear = () => {
        setPriceMin('');
        setPriceMax('');
        setInStock('');
        setOrderBy('name');
        setOrderDirection('asc');
        
        const params: Record<string, any> = {
            page: 1,
        };
        
        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters'],
        });
    };

    // Check active filters based on applied filters (from URL), not local state
    const hasActiveFilters = filters.price_min || filters.price_max || filters.in_stock || filters.search;

    const getActiveFilters = () => {
        const active: Array<{ key: string; label: string; value: string }> = [];
        
        // Use filters from URL (applied filters), not local state
        if (filters.price_min || filters.price_max) {
            const currencySymbol = currentCurrency 
                ? `${currentCurrency.symbol_left || ''}${currentCurrency.symbol_right || ''}` 
                : '';
            const range = filters.price_min && filters.price_max 
                ? `${filters.price_min}${currencySymbol ? ` ${currencySymbol}` : ''} - ${filters.price_max}${currencySymbol ? ` ${currencySymbol}` : ''}` 
                : filters.price_min 
                    ? `≥ ${filters.price_min}${currencySymbol ? ` ${currencySymbol}` : ''}` 
                    : `≤ ${filters.price_max}${currencySymbol ? ` ${currencySymbol}` : ''}`;
            active.push({ key: 'price', label: t('Price'), value: range });
        }
        if (filters.in_stock === '1' || filters.in_stock === 'true' || filters.in_stock === true) {
            active.push({ key: 'stock', label: t('Stock'), value: t('In Stoc') });
        }
        if (filters.search) {
            active.push({ key: 'search', label: t('Search'), value: filters.search });
        }
        
        return active;
    };

    const removeFilter = (key: string) => {
        let newPriceMin = filters.price_min;
        let newPriceMax = filters.price_max;
        let newInStock = filters.in_stock;
        let newSearch = filters.search;

        switch (key) {
            case 'price':
                newPriceMin = undefined;
                newPriceMax = undefined;
                setPriceMin('');
                setPriceMax('');
                break;
            case 'stock':
                newInStock = undefined;
                setInStock('');
                break;
            case 'search':
                newSearch = undefined;
                break;
        }

        // Apply filters with removed filter
        router.get('/products', getRequestParams({
            search: newSearch || undefined,
            price_min: newPriceMin || undefined,
            price_max: newPriceMax || undefined,
            in_stock: newInStock || undefined,
            order_by: filters.order_by || orderBy,
            order_direction: filters.order_direction || orderDirection,
            page: 1,
        }), {
            preserveState: true,
            only: ['products', 'pagination', 'filters'],
        });
    };

    const handlePageChange = (page: number) => {
        router.get('/products', getRequestParams({
            ...filters,
            page,
        }), {
            preserveState: true,
            only: ['products', 'pagination'],
        });
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;

        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxVisible / 2));
        let endPage = Math.min(pagination.last_page, startPage + maxVisible - 1);

        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(i);
        }

        return (
            <div className={styles.pagination}>
                <Button
                    variant="secondary"
                    onClick={() => handlePageChange(pagination.current_page - 1)}
                    disabled={pagination.current_page === 1}
                >
                    <ChevronLeft size={16} />
                    {t('Previous')}
                </Button>
                
                <div className={styles.paginationPages}>
                    {startPage > 1 && (
                        <>
                            <Button
                                variant={pagination.current_page === 1 ? 'primary' : 'secondary'}
                                onClick={() => handlePageChange(1)}
                            >
                                1
                            </Button>
                            {startPage > 2 && <span className={styles.paginationEllipsis}>...</span>}
                        </>
                    )}
                    
                    {pages.map((page) => (
                        <Button
                            key={page}
                            variant={pagination.current_page === page ? 'primary' : 'secondary'}
                            onClick={() => handlePageChange(page)}
                        >
                            {page}
                        </Button>
                    ))}
                    
                    {endPage < pagination.last_page && (
                        <>
                            {endPage < pagination.last_page - 1 && (
                                <span className={styles.paginationEllipsis}>...</span>
                            )}
                            <Button
                                variant={pagination.current_page === pagination.last_page ? 'primary' : 'secondary'}
                                onClick={() => handlePageChange(pagination.last_page)}
                            >
                                {pagination.last_page}
                            </Button>
                        </>
                    )}
                </div>
                
                <Button
                    variant="secondary"
                    onClick={() => handlePageChange(pagination.current_page + 1)}
                    disabled={pagination.current_page === pagination.last_page}
                >
                    {t('Next')}
                    <ChevronRight size={16} />
                </Button>
            </div>
        );
    };

    return (
        <div className={styles.container}>
                {/* Breadcrumb */}
                {(category?.breadcrumb && category.breadcrumb.length > 0) && (
                    <nav className={styles.breadcrumb}>
                        <a href="/" onClick={(e) => { e.preventDefault(); router.get('/'); }}>
                            {t('Home')}
                        </a>
                        {category.breadcrumb.map((item, index) => (
                            <React.Fragment key={item.slug}>
                                <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                                {index < category.breadcrumb!.length - 1 ? (
                                    <a 
                                        href={`/categories/${item.slug}`}
                                        onClick={(e) => { e.preventDefault(); router.get(`/categories/${item.slug}`); }}
                                    >
                                        {item.name}
                                    </a>
                                ) : (
                                    <span className={styles.breadcrumbCurrent}>{item.name}</span>
                                )}
                            </React.Fragment>
                        ))}
                    </nav>
                )}
                {/* Header */}
                <div className={styles.header}>
                    {category ? (
                        <h1 className={styles.title}>{category.name}</h1>
                    ) : (
                        <h1 className={styles.title}>{t('All Products')}</h1>
                    )}
                    {pagination.total > 0 && (
                        <p className={styles.subtitle}>
                            {t('Showing')} {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total)} {t('of')} {pagination.total} {t('products')}
                        </p>
                    )}
                </div>

                {/* Filters and Search */}
                <div className={styles.filtersSection}>
                    {/* Sort Row */}
                    <div className={styles.filtersRow}>
                        <div className={styles.sortSection}>
                            <div className={styles.sortButtons}>
                                <button
                                    className={`${styles.sortButton} ${orderBy === 'name' ? styles.sortButtonActive : ''}`}
                                    onClick={() => handleOrderChange('name')}
                                    title={t('Sort by name')}
                                >
                                    <span>{t('Name')}</span>
                                    {orderBy === 'name' ? (
                                        orderDirection === 'asc' ? (
                                            <ArrowUp size={14} className={styles.sortArrow} />
                                        ) : (
                                            <ArrowDown size={14} className={styles.sortArrow} />
                                        )
                                    ) : (
                                        <ArrowUpDown size={14} className={styles.sortArrowInactive} />
                                    )}
                                </button>
                                <button
                                    className={`${styles.sortButton} ${orderBy === 'price_ron' ? styles.sortButtonActive : ''}`}
                                    onClick={() => handleOrderChange('price_ron')}
                                    title={t('Sort by price')}
                                >
                                    <span>{t('Price')}</span>
                                    {orderBy === 'price_ron' ? (
                                        orderDirection === 'asc' ? (
                                            <ArrowUp size={14} className={styles.sortArrow} />
                                        ) : (
                                            <ArrowDown size={14} className={styles.sortArrow} />
                                        )
                                    ) : (
                                        <ArrowUpDown size={14} className={styles.sortArrowInactive} />
                                    )}
                                </button>
                            </div>
                            <button
                                className={`${styles.filtersToggleButton} ${showFilters ? styles.filtersToggleButtonActive : ''}`}
                                onClick={() => setShowFilters(!showFilters)}
                                title={t('Filters')}
                            >
                                <SlidersHorizontal size={18} />
                                {hasActiveFilters && (
                                    <span className={styles.filtersToggleBadge}>
                                        {getActiveFilters().length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Active Filters Display */}
                    {hasActiveFilters && (
                        <div className={styles.activeFiltersSection}>
                            <div className={styles.activeFiltersLabel}>
                                <Filter size={16} />
                                <span>{t('Active filters')}:</span>
                            </div>
                            <div className={styles.activeFiltersList}>
                                {getActiveFilters().map((filter) => (
                                    <div key={filter.key} className={styles.activeFilterBadge}>
                                        <span className={styles.activeFilterLabel}>{filter.label}:</span>
                                        <span className={styles.activeFilterValue}>{filter.value}</span>
                                        <button
                                            className={styles.removeFilterButton}
                                            onClick={() => removeFilter(filter.key)}
                                            title={t('Remove filter')}
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <button
                                    className={styles.clearAllFiltersButton}
                                    onClick={handleFilterClear}
                                >
                                    <X size={14} />
                                    {t('Clear all')}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filters Row */}
                    {showFilters && (
                        <div className={styles.filtersPanel}>
                            <div className={styles.filtersHeader}>
                                <div className={styles.filtersTitleWrapper}>
                                    <SlidersHorizontal size={18} className={styles.filtersTitleIcon} />
                                    <h3 className={styles.filtersTitle}>{t('Filters')}</h3>
                                </div>
                            </div>
                            <div className={styles.filtersContent}>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>{t('Price range')}</label>
                                    <div className={styles.priceRangeWrapper}>
                                        <div className={styles.priceInputWrapper}>
                                            <Input
                                                type="number"
                                                placeholder={t('Min')}
                                                value={priceMin}
                                                onChange={(e) => setPriceMin(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleFilterApply();
                                                    }
                                                }}
                                                className={styles.priceInput}
                                            />
                                            {currentCurrency && (
                                                <span className={styles.priceCurrency}>
                                                    {currentCurrency.symbol_left || ''}{currentCurrency.symbol_right || ''}
                                                </span>
                                            )}
                                        </div>
                                        <span className={styles.priceRangeSeparator}>-</span>
                                        <div className={styles.priceInputWrapper}>
                                            <Input
                                                type="number"
                                                placeholder={t('Max')}
                                                value={priceMax}
                                                onChange={(e) => setPriceMax(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        handleFilterApply();
                                                    }
                                                }}
                                                className={styles.priceInput}
                                            />
                                            {currentCurrency && (
                                                <span className={styles.priceCurrency}>
                                                    {currentCurrency.symbol_left || ''}{currentCurrency.symbol_right || ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>{t('Availability')}</label>
                                    <label className={styles.filterCheckboxLabel}>
                                        <input
                                            type="checkbox"
                                            checked={inStock === '1' || inStock === 'true'}
                                            onChange={(e) => setInStock(e.target.checked ? '1' : '')}
                                            className={styles.filterCheckbox}
                                        />
                                        <span>{t('In Stoc')}</span>
                                    </label>
                                </div>

                                <div className={styles.filterActions}>
                                    <Button 
                                        variant="primary" 
                                        onClick={handleFilterApply}
                                        className={styles.applyFiltersButton}
                                    >
                                        {t('Apply filters')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Products Grid */}
                {products.length > 0 ? (
                    <>
                        <div className={styles.productsGridWrapper}>
                            <div className={styles.productsGrid}>
                                {products.map((product) => (
                                    <ProductCard 
                                        key={product.id} 
                                        {...product} 
                                        customerGroup={customerGroup}
                                        price_raw={product.price_raw}
                                        vat_included={product.vat_included}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Pagination */}
                        {renderPagination()}
                    </>
                ) : (
                    <div className={styles.noProducts}>
                        <p>{t('No products found')}</p>
                        {filters.search && (
                            <Button
                                variant="primary"
                                onClick={() => {
                                    router.get('/products', getRequestParams({
                                        ...filters,
                                        search: undefined,
                                    }));
                                }}
                            >
                                {t('Clear search')}
                            </Button>
                        )}
                    </div>
                )}
            </div>
    );
}

export default function ProductListingPage(props: ProductListingPageProps) {
    return (
        <Layout activeSidebarItem="products">
            <ProductListingContent {...props} />
        </Layout>
    );
}

