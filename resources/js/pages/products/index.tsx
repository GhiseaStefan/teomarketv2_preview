import React, { useState, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import { ProductCard } from '../../components/ProductCard';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useTranslations } from '../../utils/translations';
import type { SharedData, Currency, CustomerGroup } from '../../types';
import { ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Search as SearchIcon } from 'lucide-react';
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
    type?: 'simple' | 'configurable' | 'variant';
    has_variants?: boolean;
    has_variants_in_stock?: boolean | null;
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

interface AttributeValue {
    id: number;
    value: string;
    meta_value?: string | null;
}

interface AvailableAttribute {
    id: number;
    name: string;
    code: string;
    type: string;
    values: AttributeValue[];
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
    attributes?: Record<string, string | string[]>;
    per_page?: number;
}

interface ProductListingPageProps {
    products: Product[];
    pagination: Pagination;
    category?: Category | null;
    filters: Filters;
    categories?: Category[];
    availableAttributes?: AvailableAttribute[];
}

function ProductListingContent({
    products = [],
    pagination,
    category,
    filters,
    availableAttributes = [],
}: ProductListingPageProps) {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const customerGroup = (props.customerGroup as CustomerGroup | null) || null;
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];
    const [orderBy, setOrderBy] = useState(filters.order_by || 'name');
    const [orderDirection, setOrderDirection] = useState(filters.order_direction || 'asc');
    const [itemsPerPage, setItemsPerPage] = useState<number>(pagination.per_page || 12);

    // Sync itemsPerPage with pagination prop
    useEffect(() => {
        if (pagination.per_page) {
            setItemsPerPage(pagination.per_page);
        }
    }, [pagination.per_page]);

    // Filter states
    const [priceMin, setPriceMin] = useState<string>(filters.price_min?.toString() || '');
    const [priceMax, setPriceMax] = useState<string>(filters.price_max?.toString() || '');
    const [inStock, setInStock] = useState<string>(filters.in_stock?.toString() || '');

    // Attribute filter states - initialize from URL filters
    const getInitialAttributeFilters = () => {
        const initial: Record<string, Set<number>> = {};
        if (filters.attributes) {
            Object.entries(filters.attributes).forEach(([attrId, valueIds]) => {
                const ids = typeof valueIds === 'string'
                    ? valueIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    : Array.isArray(valueIds)
                        ? valueIds.map(id => parseInt(String(id))).filter(id => !isNaN(id))
                        : [];
                if (ids.length > 0) {
                    initial[attrId] = new Set(ids);
                }
            });
        }
        return initial;
    };
    const [attributeFilters, setAttributeFilters] = useState<Record<string, Set<number>>>(getInitialAttributeFilters());

    // Expanded/collapsed state for filter groups - initialize all as expanded
    const getInitialExpandedGroups = () => {
        const initial: Record<string, boolean> = {
            price: true,
            stock: true,
        };
        availableAttributes.forEach(attr => {
            initial[`attr_${attr.id}`] = true;
        });
        return initial;
    };

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(getInitialExpandedGroups());

    // Update expanded groups when availableAttributes change
    useEffect(() => {
        const getInitialExpandedGroups = () => {
            const initial: Record<string, boolean> = {
                price: true,
                stock: true,
            };
            availableAttributes.forEach(attr => {
                initial[`attr_${attr.id}`] = true;
            });
            return initial;
        };
        const current = getInitialExpandedGroups();
        // Preserve existing expanded state, but add new attributes as expanded
        setExpandedGroups(prev => {
            const updated = { ...prev };
            Object.keys(current).forEach(key => {
                if (!(key in updated)) {
                    updated[key] = current[key];
                }
            });
            return updated;
        });
    }, [availableAttributes]);

    // Search states for attribute filters
    const [attributeSearch, setAttributeSearch] = useState<Record<number, string>>({});

    // Sync attribute filters with URL when filters change (e.g., when navigating back/forward)
    useEffect(() => {
        const initial: Record<string, Set<number>> = {};
        if (filters.attributes) {
            Object.entries(filters.attributes).forEach(([attrId, valueIds]) => {
                const ids = typeof valueIds === 'string'
                    ? valueIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                    : Array.isArray(valueIds)
                        ? valueIds.map(id => parseInt(String(id))).filter(id => !isNaN(id))
                        : [];
                if (ids.length > 0) {
                    initial[attrId] = new Set(ids);
                }
            });
        }
        setAttributeFilters(initial);
    }, [filters.attributes]);

    // Helper function to preserve category in params
    const preserveCategory = (params: Partial<Filters & { page?: number }>): void => {
        // First check if category is in filters (from URL)
        if (filters.category_id) {
            params.category_id = filters.category_id;
        }
        if (filters.category_slug) {
            params.category_slug = filters.category_slug;
        }
        // If not in filters, use category from props
        if (!params.category_id && category?.id) {
            params.category_id = category.id;
        }
        if (!params.category_slug && category?.slug) {
            params.category_slug = category.slug;
        }
    };

    const getRequestParams = (additionalParams: Partial<Filters & { page?: number }> = {}): Partial<Filters & { page?: number }> => {
        const params: Partial<Filters & { page?: number }> = {
            ...filters,
            ...additionalParams,
        };
        // Ensure category is preserved
        preserveCategory(params);
        return params;
    };

    const handleSortChange = (value: string) => {
        // Parse value format: "name_asc", "name_desc", "price_ron_asc", "price_ron_desc", "popular"
        if (value === 'popular') {
            // Sort by popularity (based on sales/order count)
            setOrderBy('popular');
            setOrderDirection('desc');

            const params = getRequestParams({
                order_by: 'popular',
                order_direction: 'desc',
                page: 1,
            });

            router.get('/products', params, {
                preserveState: true,
                only: ['products', 'pagination', 'filters', 'availableAttributes'],
            });
            return;
        }

        // Parse value - handle fields with underscores like "price_ron_asc"
        // Split by '_' and take last part as direction, rest as field
        const parts = value.split('_');
        const direction = parts[parts.length - 1]; // Last part is direction (asc/desc)
        const field = parts.slice(0, -1).join('_'); // Everything before last part is field

        setOrderBy(field);
        setOrderDirection(direction);

        const params = getRequestParams({
            order_by: field,
            order_direction: direction,
            page: 1,
        });

        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters', 'availableAttributes'],
        });
    };

    const handleItemsPerPageChange = (value: number) => {
        setItemsPerPage(value);
        const params = getRequestParams({
            per_page: value,
            page: 1,
        });

        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters', 'availableAttributes'],
        });
    };

    // Get current sort value for dropdown
    const getCurrentSortValue = () => {
        if (orderBy === 'popular' || orderBy === 'popularity') {
            return 'popular';
        }
        if (orderBy === 'name') {
            return orderDirection === 'asc' ? 'name_asc' : 'name_desc';
        }
        if (orderBy === 'price_ron') {
            return orderDirection === 'asc' ? 'price_ron_asc' : 'price_ron_desc';
        }
        return 'popular'; // Default to popular
    };

    const handleFilterClear = () => {
        setPriceMin('');
        setPriceMax('');
        setInStock('');
        setOrderBy('name');
        setOrderDirection('asc');
        setAttributeFilters({});

        const params: Partial<Filters & { page?: number }> = {
            page: 1,
            order_by: 'name',
            order_direction: 'asc',
        };

        // Preserve category even when clearing filters
        preserveCategory(params);

        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters', 'availableAttributes'],
        });
    };

    // Check active filters based on applied filters (from URL), not local state
    const hasActiveAttributeFilters = filters.attributes && Object.keys(filters.attributes).length > 0;
    const hasActiveFilters = filters.price_min || filters.price_max || filters.in_stock || filters.search || hasActiveAttributeFilters;

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

        // Attribute filters
        if (filters.attributes) {
            Object.entries(filters.attributes).forEach(([attrId, valueIds]) => {
                const attribute = availableAttributes.find(attr => attr.id.toString() === attrId);
                if (attribute) {
                    const ids = typeof valueIds === 'string'
                        ? valueIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
                        : Array.isArray(valueIds)
                            ? valueIds.map(id => parseInt(String(id))).filter(id => !isNaN(id))
                            : [];
                    const values = attribute.values.filter(v => ids.includes(v.id)).map(v => v.value);
                    if (values.length > 0) {
                        active.push({
                            key: `attr_${attrId}`,
                            label: attribute.name,
                            value: values.join(', ')
                        });
                    }
                }
            });
        }

        return active;
    };

    const removeFilter = (key: string) => {
        let newPriceMin = filters.price_min;
        let newPriceMax = filters.price_max;
        let newInStock = filters.in_stock;
        let newSearch = filters.search;
        const newAttributeFilters = { ...attributeFilters };

        if (key === 'price') {
            newPriceMin = undefined;
            newPriceMax = undefined;
            setPriceMin('');
            setPriceMax('');
        } else if (key === 'stock') {
            newInStock = undefined;
            setInStock('');
        } else if (key === 'search') {
            newSearch = undefined;
        } else if (key.startsWith('attr_')) {
            // Remove attribute filter
            const attrId = key.replace('attr_', '');
            delete newAttributeFilters[attrId];
            setAttributeFilters(newAttributeFilters);
        }

        // Build params object explicitly without spreading old filters
        const params: Partial<Filters & { page?: number }> = {
            order_by: orderBy,
            order_direction: orderDirection,
            page: 1,
        };

        // Only include filters that are actually set
        if (newSearch) {
            params.search = newSearch;
        }
        if (newPriceMin) {
            params.price_min = newPriceMin;
        }
        if (newPriceMax) {
            params.price_max = newPriceMax;
        }
        if (newInStock) {
            params.in_stock = newInStock;
        }

        // Build attributes filter object for URL params
        const attributesObject: Record<string, string> = {};
        Object.entries(newAttributeFilters).forEach(([attrId, valueIds]) => {
            if (valueIds.size > 0) {
                attributesObject[attrId] = Array.from(valueIds).join(',');
            }
        });
        if (Object.keys(attributesObject).length > 0) {
            params.attributes = attributesObject;
        }

        // Preserve category if exists
        preserveCategory(params);

        // Apply filters with removed filter
        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters', 'availableAttributes'],
        });
    };

    const handlePriceFilterApply = () => {
        // Apply price filters - build params explicitly
        const params: Partial<Filters & { page?: number }> = {
            order_by: orderBy,
            order_direction: orderDirection,
            page: 1,
        };

        // Only include filters that are actually set
        if (filters.search) {
            params.search = filters.search;
        }
        if (priceMin) {
            params.price_min = priceMin;
        }
        if (priceMax) {
            params.price_max = priceMax;
        }
        if (inStock) {
            params.in_stock = inStock;
        }

        // Build attributes filter object for URL params
        const attributesObject: Record<string, string> = {};
        Object.entries(attributeFilters).forEach(([attrId, valueIds]) => {
            if (valueIds.size > 0) {
                attributesObject[attrId] = Array.from(valueIds).join(',');
            }
        });
        if (Object.keys(attributesObject).length > 0) {
            params.attributes = attributesObject;
        }

        // Preserve category if exists
        preserveCategory(params);

        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters', 'availableAttributes'],
        });
    };

    const handleAttributeValueToggle = (attributeId: number, valueId: number) => {
        const newFilters = { ...attributeFilters };
        if (!newFilters[attributeId]) {
            newFilters[attributeId] = new Set();
        }
        const valueSet = new Set(newFilters[attributeId]);
        if (valueSet.has(valueId)) {
            valueSet.delete(valueId);
        } else {
            valueSet.add(valueId);
        }
        if (valueSet.size === 0) {
            delete newFilters[attributeId];
        } else {
            newFilters[attributeId] = valueSet;
        }
        setAttributeFilters(newFilters);

        // Apply filters automatically - build params explicitly
        const params: Partial<Filters & { page?: number }> = {
            order_by: orderBy,
            order_direction: orderDirection,
            page: 1,
        };

        // Only include filters that are actually set
        if (filters.search) {
            params.search = filters.search;
        }
        if (priceMin) {
            params.price_min = priceMin;
        }
        if (priceMax) {
            params.price_max = priceMax;
        }
        if (inStock) {
            params.in_stock = inStock;
        }

        // Build attributes filter object for URL params
        const attributesObject: Record<string, string> = {};
        Object.entries(newFilters).forEach(([attrId, valueIds]) => {
            if (valueIds.size > 0) {
                attributesObject[attrId] = Array.from(valueIds).join(',');
            }
        });
        if (Object.keys(attributesObject).length > 0) {
            params.attributes = attributesObject;
        }

        // Preserve category if exists
        preserveCategory(params);

        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination', 'filters', 'availableAttributes'],
        });
    };

    const toggleGroup = (groupKey: string) => {
        setExpandedGroups(prev => ({
            ...prev,
            [groupKey]: !prev[groupKey],
        }));
    };

    // Filter attribute values by search
    const getFilteredAttributeValues = (attribute: AvailableAttribute) => {
        const searchTerm = (attributeSearch[attribute.id] || '').toLowerCase();
        if (!searchTerm) {
            return attribute.values;
        }
        return attribute.values.filter(v =>
            v.value.toLowerCase().includes(searchTerm) ||
            (v.meta_value && v.meta_value.toLowerCase().includes(searchTerm))
        );
    };

    const handlePageChange = (page: number) => {
        const params = getRequestParams({
            ...filters,
            page,
        });

        router.get('/products', params, {
            preserveState: true,
            only: ['products', 'pagination'],
        });
    };

    const renderPagination = () => {
        if (pagination.last_page <= 1) return null;

        const pages = [];
        const maxVisible = 5;
        let startPage = Math.max(1, pagination.current_page - Math.floor(maxVisible / 2));
        const endPage = Math.min(pagination.last_page, startPage + maxVisible - 1);

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
            <nav className={styles.breadcrumb}>
                <a href="/" onClick={(e) => { e.preventDefault(); router.get('/'); }}>
                    {t('Home')}
                </a>
                {category?.breadcrumb && category.breadcrumb.length > 0 ? (
                    category.breadcrumb.map((item, index) => (
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
                    ))
                ) : (
                    <>
                        <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                        <span className={styles.breadcrumbCurrent}>{t('All Products', 'Toate Produsele')}</span>
                    </>
                )}
            </nav>

            {/* Main Layout: Sidebar + Content */}
            <div className={styles.mainLayout}>
                {/* Sidebar Filters */}
                <aside className={styles.filtersSidebar}>
                    <div className={styles.filtersSidebarCard}>
                        <div className={styles.filtersSidebarHeader}>
                            <h2 className={styles.filtersSidebarTitle}>{t('Filters', 'Filtre')}</h2>
                        </div>

                        <div className={styles.filtersSidebarContent}>
                            {/* Price Filter */}
                            <div className={styles.filterGroupCard}>
                                <button
                                    className={styles.filterGroupHeader}
                                    onClick={() => toggleGroup('price')}
                                >
                                    <span className={styles.filterGroupTitle}>{t('Price range', 'Interval pret')}</span>
                                    {expandedGroups.price ? (
                                        <ChevronUp size={18} className={styles.filterGroupIcon} />
                                    ) : (
                                        <ChevronDown size={18} className={styles.filterGroupIcon} />
                                    )}
                                </button>
                                {expandedGroups.price && (
                                    <div className={styles.filterGroupContent}>
                                        <div className={styles.priceRangeWrapper}>
                                            <div className={styles.priceInputWrapper}>
                                                <Input
                                                    type="number"
                                                    placeholder={t('Min', 'Min')}
                                                    value={priceMin}
                                                    onChange={(e) => setPriceMin(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handlePriceFilterApply();
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
                                            <div className={styles.priceInputWrapper}>
                                                <Input
                                                    type="number"
                                                    placeholder={t('Max', 'Max')}
                                                    value={priceMax}
                                                    onChange={(e) => setPriceMax(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handlePriceFilterApply();
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
                                )}
                            </div>

                            {/* Stock Filter */}
                            <div className={styles.filterGroupCard}>
                                <button
                                    className={styles.filterGroupHeader}
                                    onClick={() => toggleGroup('stock')}
                                >
                                    <span className={styles.filterGroupTitle}>{t('Availability', 'Disponibilitate')}</span>
                                    {expandedGroups.stock ? (
                                        <ChevronUp size={18} className={styles.filterGroupIcon} />
                                    ) : (
                                        <ChevronDown size={18} className={styles.filterGroupIcon} />
                                    )}
                                </button>
                                {expandedGroups.stock && (
                                    <div className={styles.filterGroupContent}>
                                        <label className={styles.filterCheckboxLabel}>
                                            <input
                                                type="checkbox"
                                                checked={inStock === '1' || inStock === 'true'}
                                                onChange={(e) => {
                                                    const newInStock = e.target.checked ? '1' : '';
                                                    setInStock(newInStock);

                                                    // Build params explicitly
                                                    const params: Partial<Filters & { page?: number }> = {
                                                        order_by: orderBy,
                                                        order_direction: orderDirection,
                                                        page: 1,
                                                    };

                                                    // Only include filters that are actually set
                                                    if (filters.search) {
                                                        params.search = filters.search;
                                                    }
                                                    if (priceMin) {
                                                        params.price_min = priceMin;
                                                    }
                                                    if (priceMax) {
                                                        params.price_max = priceMax;
                                                    }
                                                    if (newInStock) {
                                                        params.in_stock = newInStock;
                                                    }

                                                    // Build attributes filter object for URL params
                                                    const attributesObject: Record<string, string> = {};
                                                    Object.entries(attributeFilters).forEach(([attrId, valueIds]) => {
                                                        if (valueIds.size > 0) {
                                                            attributesObject[attrId] = Array.from(valueIds).join(',');
                                                        }
                                                    });
                                                    if (Object.keys(attributesObject).length > 0) {
                                                        params.attributes = attributesObject;
                                                    }

                                                    // Preserve category if exists
                                                    preserveCategory(params);

                                                    // Apply filters automatically
                                                    router.get('/products', params, {
                                                        preserveState: true,
                                                        only: ['products', 'pagination', 'filters', 'availableAttributes'],
                                                    });
                                                }}
                                                className={styles.filterCheckbox}
                                            />
                                            <span>{t('In Stoc', 'In stoc')}</span>
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Attribute Filters */}
                            {availableAttributes && availableAttributes.length > 0 ? (
                                availableAttributes.map((attribute) => {
                                    const selectedValues = attributeFilters[attribute.id] || new Set<number>();
                                    const filteredValues = getFilteredAttributeValues(attribute);
                                    const searchTerm = attributeSearch[attribute.id] || '';
                                    const groupKey = `attr_${attribute.id}`;
                                    const isExpanded = expandedGroups[groupKey] !== false;

                                    return (
                                        <div key={attribute.id} className={styles.filterGroupCard}>
                                            <button
                                                className={styles.filterGroupHeader}
                                                onClick={() => toggleGroup(groupKey)}
                                            >
                                                <span className={styles.filterGroupTitle}>{attribute.name}</span>
                                                {isExpanded ? (
                                                    <ChevronUp size={18} className={styles.filterGroupIcon} />
                                                ) : (
                                                    <ChevronDown size={18} className={styles.filterGroupIcon} />
                                                )}
                                            </button>
                                            {isExpanded && (
                                                <div className={styles.filterGroupContent}>
                                                    {/* Search for attribute values if there are many */}
                                                    {attribute.values.length > 5 && (
                                                        <div className={styles.attributeSearchWrapper}>
                                                            <SearchIcon size={16} className={styles.attributeSearchIcon} />
                                                            <input
                                                                type="text"
                                                                placeholder={t('Search...', 'Cauta...')}
                                                                value={searchTerm}
                                                                onChange={(e) => setAttributeSearch(prev => ({
                                                                    ...prev,
                                                                    [attribute.id]: e.target.value,
                                                                }))}
                                                                className={styles.attributeSearchInput}
                                                            />
                                                        </div>
                                                    )}
                                                    {attribute.type === 'color_swatch' ? (
                                                        <div className={styles.colorSwatch}>
                                                            {filteredValues.length > 0 ? (
                                                                filteredValues.map((value) => {
                                                                    const isSelected = selectedValues.has(value.id);
                                                                    const metaValue = value.meta_value || '';
                                                                    const isGradient = metaValue.includes('gradient') || metaValue.includes('linear-gradient');
                                                                    const isTransparent = metaValue === 'transparent';

                                                                    const style: React.CSSProperties = isGradient
                                                                        ? { backgroundImage: metaValue }
                                                                        : isTransparent
                                                                            ? {
                                                                                backgroundColor: 'transparent',
                                                                                backgroundImage: 'repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 50% / 8px 8px'
                                                                            }
                                                                            : { backgroundColor: metaValue || '#ccc' };

                                                                    return (
                                                                        <div key={value.id} className={styles.colorOptionWrapper}>
                                                                            <button
                                                                                type="button"
                                                                                className={`${styles.colorOption} ${isSelected ? styles.colorOptionSelected : ''}`}
                                                                                style={style}
                                                                                onClick={() => handleAttributeValueToggle(attribute.id, value.id)}
                                                                                aria-label={value.value}
                                                                                aria-pressed={isSelected}
                                                                            />
                                                                            <span className={styles.colorTooltip}>{value.value}</span>
                                                                        </div>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className={styles.noResults}>
                                                                    {t('No results found', 'Nu s-au gasit rezultate')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <div className={styles.attributeValuesList}>
                                                            {filteredValues.length > 0 ? (
                                                                filteredValues.map((value) => {
                                                                    const isSelected = selectedValues.has(value.id);
                                                                    return (
                                                                        <label
                                                                            key={value.id}
                                                                            className={styles.filterCheckboxLabel}
                                                                        >
                                                                            <input
                                                                                type="checkbox"
                                                                                checked={isSelected}
                                                                                onChange={() => handleAttributeValueToggle(attribute.id, value.id)}
                                                                                className={styles.filterCheckbox}
                                                                            />
                                                                            <span className={styles.filterCheckboxText}>{value.value}</span>
                                                                        </label>
                                                                    );
                                                                })
                                                            ) : (
                                                                <div className={styles.noResults}>
                                                                    {t('No results found', 'Nu s-au gasit rezultate')}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            ) : null}
                        </div>
                    </div>
                </aside>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {/* Main Content Card Container */}
                    <div className={styles.mainContentCard}>
                        {/* Header and Sort Card */}
                        <div className={styles.headerAndSortCard}>
                            {/* Header */}
                            <div className={styles.headerCard}>
                                {category ? (
                                    <h1 className={styles.title}>{category.name}</h1>
                                ) : (
                                    <h1 className={styles.title}>{t('All Products', 'Toate produsele')}</h1>
                                )}
                                {pagination.total > 0 && (
                                    <p className={styles.subtitle}>
                                        {t('Showing')} {((pagination.current_page - 1) * pagination.per_page) + 1} - {Math.min(pagination.current_page * pagination.per_page, pagination.total)} {t('of')} {pagination.total} {t('products')}
                                    </p>
                                )}
                            </div>

                            {/* Active Filters Row - Inside header card */}
                            {hasActiveFilters && (
                                <div className={styles.filtersRow}>
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
                                    </div>
                                    <button
                                        className={styles.clearAllFiltersButton}
                                        onClick={handleFilterClear}
                                    >
                                        <X size={14} />
                                        {t('Clear all')}
                                    </button>
                                </div>
                            )}

                            {/* Sort Section */}
                            <div className={styles.sortSection}>
                                <div className={styles.sortControls}>
                                    <div className={styles.sortControl}>
                                        <label className={styles.sortLabel}>{t('Sort by', 'Ordoneaza')}:</label>
                                        <select
                                            className={styles.sortSelect}
                                            value={getCurrentSortValue()}
                                            onChange={(e) => handleSortChange(e.target.value)}
                                        >
                                            <option value="popular">{t('Most popular', 'Cele mai populare')}</option>
                                            <option value="name_asc">{t('Name A-Z', 'Nume A-Z')}</option>
                                            <option value="name_desc">{t('Name Z-A', 'Nume Z-A')}</option>
                                            <option value="price_ron_asc">{t('Price ascending', 'Pret crescator')}</option>
                                            <option value="price_ron_desc">{t('Price descending', 'Pret descrescator')}</option>
                                        </select>
                                    </div>
                                    <div className={styles.sortControl}>
                                        <label className={styles.sortLabel}>{t('Products', 'Produse')}:</label>
                                        <select
                                            className={styles.sortSelect}
                                            value={itemsPerPage}
                                            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                                        >
                                            <option value={12}>12 {t('per page', 'pe pagina')}</option>
                                            <option value={36}>36 {t('per page', 'pe pagina')}</option>
                                            <option value={50}>50 {t('per page', 'pe pagina')}</option>
                                            <option value={100}>100 {t('per page', 'pe pagina')}</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Products Grid */}
                        {products.length > 0 ? (
                            <>
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

                                {/* Pagination Card */}
                                {pagination.last_page > 1 && (
                                    <div className={styles.paginationCard}>
                                        {renderPagination()}
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className={styles.noProducts}>
                                <p>{t('No products found', 'Nu s-au gasit produse')}</p>
                                {filters.search && (
                                    <Button
                                        variant="primary"
                                        onClick={() => {
                                            const params: Partial<Filters & { page?: number }> = {
                                                page: 1,
                                                order_by: filters.order_by || orderBy,
                                                order_direction: filters.order_direction || orderDirection,
                                            };

                                            // Include all filters except search
                                            if (filters.price_min) {
                                                params.price_min = filters.price_min;
                                            }
                                            if (filters.price_max) {
                                                params.price_max = filters.price_max;
                                            }
                                            if (filters.in_stock) {
                                                params.in_stock = filters.in_stock;
                                            }
                                            if (filters.attributes) {
                                                params.attributes = filters.attributes;
                                            }
                                            // Preserve category if exists
                                            preserveCategory(params);

                                            router.get('/products', params);
                                        }}
                                    >
                                        {t('Clear search', 'Sterge cautarea')}
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
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

