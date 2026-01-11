import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { Search, Filter, Package, Box, X, ChevronDown, Menu } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import { formatPrice } from '../../utils/formatPrice';
import styles from './products.module.css';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}

interface Product {
    id: number;
    sku: string;
    ean: string;
    name: string;
    model: string;
    brand_name: string;
    category_name: string;
    price_ron: string;
    stock_quantity: number;
    status: boolean;
    image_url: string | null;
    type?: 'simple' | 'configurable' | 'variant';
    variants_count?: number;
    has_low_stock_variants?: boolean;
    created_at: string;
    created_at_formatted: string;
}

interface Brand {
    id: number;
    name: string;
}

interface Category {
    id: number;
    name: string;
}

interface ProductFamily {
    id: number;
    name: string;
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
        brand_id?: string;
        category_id?: string;
        family_id?: string;
        price_min?: string;
        price_max?: string;
        stock_min?: string;
        stock_max?: string;
        product_type?: string;
    };
    brands?: Brand[];
    categories?: Category[];
    productFamilies?: ProductFamily[];
}

export default function AdminProducts({ products, pagination, filters: initialFilters, brands = [], categories = [], productFamilies = [] }: ProductsPageProps) {
    const { t } = useTranslations();
    const [activeFilter, setActiveFilter] = useState(initialFilters.filter || 'all');
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [showFilters, setShowFilters] = useState(false);
    const [showSearchAndFilters, setShowSearchAndFilters] = useState(false);
    const [showBrandDropdown, setShowBrandDropdown] = useState(false);
    const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
    const [showFamilyDropdown, setShowFamilyDropdown] = useState(false);
    const [showPriceDropdown, setShowPriceDropdown] = useState(false);
    const [showStockDropdown, setShowStockDropdown] = useState(false);
    const [showProductTypeDropdown, setShowProductTypeDropdown] = useState(false);
    
    // Search states for dropdowns
    const [brandSearch, setBrandSearch] = useState('');
    const [categorySearch, setCategorySearch] = useState('');
    const [familySearch, setFamilySearch] = useState('');
    
    // Advanced filter states
    const [brandId, setBrandId] = useState(initialFilters.brand_id || '');
    const [categoryId, setCategoryId] = useState(initialFilters.category_id || '');
    const [familyId, setFamilyId] = useState(initialFilters.family_id || '');
    const [priceMin, setPriceMin] = useState(initialFilters.price_min || '');
    const [priceMax, setPriceMax] = useState(initialFilters.price_max || '');
    const [stockMin, setStockMin] = useState(initialFilters.stock_min || '');
    const [stockMax, setStockMax] = useState(initialFilters.stock_max || '');
    const [productType, setProductType] = useState(initialFilters.product_type || '');

    // Debounce search query (500ms delay)
    const debouncedSearchQuery = useDebounce(searchQuery, 500);
    const isInitialMount = useRef(true);

    // Memoize applyFilters to avoid infinite loops
    const applyFilters = useCallback((newBrandId?: string, newCategoryId?: string, newFamilyId?: string, newProductType?: string) => {
        const params: Record<string, any> = {
            filter: activeFilter,
            search: debouncedSearchQuery || searchQuery, // Use debounced value
        };

        const currentBrandId = newBrandId !== undefined ? newBrandId : brandId;
        const currentCategoryId = newCategoryId !== undefined ? newCategoryId : categoryId;
        const currentFamilyId = newFamilyId !== undefined ? newFamilyId : familyId;
        const currentProductType = newProductType !== undefined ? newProductType : productType;

        if (currentBrandId) params.brand_id = currentBrandId;
        if (currentCategoryId) params.category_id = currentCategoryId;
        if (currentFamilyId) params.family_id = currentFamilyId;
        if (currentProductType) params.product_type = currentProductType;
        if (priceMin) params.price_min = priceMin;
        if (priceMax) params.price_max = priceMax;
        if (stockMin) params.stock_min = stockMin;
        if (stockMax) params.stock_max = stockMax;

        router.get('/admin/products', params, {
            preserveState: true,
            preserveScroll: true,
            replace: false, // Ensure history entries are created
        });
    }, [activeFilter, debouncedSearchQuery, searchQuery, brandId, categoryId, familyId, productType, priceMin, priceMax, stockMin, stockMax]);

    // Auto-search when debounced query changes (but not on initial mount)
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Search automatically when debounced query changes
        // Use replace: true for auto-search to avoid polluting history with every keystroke
        // But use replace: false for manual searches (form submit) to create history entries
        const params: Record<string, any> = {
            filter: activeFilter,
            search: debouncedSearchQuery,
        };
        if (brandId) params.brand_id = brandId;
        if (categoryId) params.category_id = categoryId;
        if (familyId) params.family_id = familyId;
        if (productType) params.product_type = productType;
        if (priceMin) params.price_min = priceMin;
        if (priceMax) params.price_max = priceMax;
        if (stockMin) params.stock_min = stockMin;
        if (stockMax) params.stock_max = stockMax;

        router.get('/admin/products', params, {
            preserveState: true,
            preserveScroll: true,
            replace: true, // Replace current history entry for auto-search to avoid polluting history
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [debouncedSearchQuery]);

    const filters = [
        { id: 'all', label: t('All', 'Toate') },
        { id: 'active', label: t('Active', 'Active') },
        { id: 'inactive', label: t('Inactive', 'Inactive') },
        { id: 'out_of_stock', label: t('Out of Stock', 'Stoc Epuizat') },
    ];

    const handleFilterChange = (filterId: string) => {
        setActiveFilter(filterId);
        const params: Record<string, any> = {
            filter: filterId,
            search: searchQuery,
        };
        if (brandId) params.brand_id = brandId;
        if (categoryId) params.category_id = categoryId;
        if (familyId) params.family_id = familyId;
        if (productType) params.product_type = productType;
        if (priceMin) params.price_min = priceMin;
        if (priceMax) params.price_max = priceMax;
        if (stockMin) params.stock_min = stockMin;
        if (stockMax) params.stock_max = stockMax;
        router.get('/admin/products', params, {
            preserveState: true,
            preserveScroll: true,
            replace: false, // Ensure history entries are created
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        // For form submit, search immediately using current searchQuery
        const params: Record<string, any> = {
            filter: activeFilter,
            search: searchQuery,
        };
        if (brandId) params.brand_id = brandId;
        if (categoryId) params.category_id = categoryId;
        if (familyId) params.family_id = familyId;
        if (productType) params.product_type = productType;
        if (priceMin) params.price_min = priceMin;
        if (priceMax) params.price_max = priceMax;
        if (stockMin) params.stock_min = stockMin;
        if (stockMax) params.stock_max = stockMax;
        router.get('/admin/products', params, {
            preserveState: true,
            preserveScroll: true,
            replace: false, // Ensure history entries are created
        });
    };

    const clearFilters = () => {
        setBrandId('');
        setCategoryId('');
        setFamilyId('');
        setProductType('');
        setPriceMin('');
        setPriceMax('');
        setStockMin('');
        setStockMax('');
        
        router.get('/admin/products', {
            filter: activeFilter,
            search: searchQuery,
        }, {
            preserveState: true,
            preserveScroll: true,
            replace: false, // Ensure history entries are created
        });
    };

    const hasActiveFilters = brandId || categoryId || familyId || productType || priceMin || priceMax || stockMin || stockMax;

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

    const clearSearch = () => {
        setSearchQuery('');
        // Clear will trigger debounce, but we can also clear immediately
        const params: Record<string, any> = {
            filter: activeFilter,
            search: '', // Clear search
        };
        if (brandId) params.brand_id = brandId;
        if (categoryId) params.category_id = categoryId;
        if (familyId) params.family_id = familyId;
        if (productType) params.product_type = productType;
        if (priceMin) params.price_min = priceMin;
        if (priceMax) params.price_max = priceMax;
        if (stockMin) params.stock_min = stockMin;
        if (stockMax) params.stock_max = stockMax;
        router.get('/admin/products', params, {
            preserveState: true,
            preserveScroll: true,
            replace: false, // Ensure history entries are created
        });
    };

    const getSelectedProductTypeName = () => {
        if (!productType) return t('Product type', 'Tip produs');
        const typeMap: Record<string, string> = {
            'simple': t('Simple'),
            'configurable': t('Configurable'),
            'variant': t('Variant'),
        };
        return typeMap[productType] || t('Product type', 'Tip produs');
    };

    const getSelectedBrandName = () => {
        if (!brandId) return t('Brand', 'Marca');
        const brand = brands.find(b => b.id.toString() === brandId);
        return brand ? brand.name : t('Brand', 'Marca');
    };

    const getSelectedCategoryName = () => {
        if (!categoryId) return t('Category', 'Categorie');
        const category = categories.find(c => c.id.toString() === categoryId);
        return category ? category.name : t('Category', 'Categorie');
    };

    const getSelectedFamilyName = () => {
        if (!familyId) return t('Product Family', 'Familie produs');
        const family = productFamilies.find(f => f.id.toString() === familyId);
        return family ? family.name : t('Product Family', 'Familie produs');
    };

    const getPriceRangeText = () => {
        if (!priceMin && !priceMax) return t('Price range', 'Interval pret');
        if (priceMin && priceMax) return `${priceMin} - ${priceMax}`;
        if (priceMin) return `${t('Min', 'Min')}: ${priceMin}`;
        if (priceMax) return `${t('Max', 'Max')}: ${priceMax}`;
        return t('Price range', 'Interval pret');
    };

    const getStockRangeText = () => {
        if (!stockMin && !stockMax) return t('Stock range', 'Interval stoc');
        if (stockMin && stockMax) return `${stockMin} - ${stockMax}`;
        if (stockMin) return `${t('Min', 'Min')}: ${stockMin}`;
        if (stockMax) return `${t('Max', 'Max')}: ${stockMax}`;
        return t('Stock range', 'Interval stoc');
    };

    // Filter brands, categories, and families based on search
    const filteredBrands = brands.filter(brand => 
        brand.name.toLowerCase().includes(brandSearch.toLowerCase())
    );
    
    const filteredCategories = categories.filter(category => 
        category.name.toLowerCase().includes(categorySearch.toLowerCase())
    );

    const filteredFamilies = productFamilies.filter(family => 
        family.name.toLowerCase().includes(familySearch.toLowerCase())
    );

    return (
        <AdminLayout activeSidebarItem="products">
            <div className={styles.productsPage}>
                {/* Status Filters and Search/Filter Toggle Button Row */}
                <div className={styles.topFiltersRow}>
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
                    
                    <button
                        type="button"
                        className={styles.searchFilterToggleButton}
                        onClick={() => setShowSearchAndFilters(!showSearchAndFilters)}
                    >
                        <Search size={18} />
                        <Menu size={18} />
                    </button>
                </div>

                {/* Search Bar - Only shown when toggle is active */}
                {showSearchAndFilters && (
                    <div className={styles.searchBarContainer}>
                        <form onSubmit={handleSearch} className={styles.searchBarForm}>
                            <Search size={16} className={styles.searchBarIcon} />
                            <input
                                type="text"
                                placeholder={t('Searching all products', 'Cautare toate produsele')}
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

                {/* Advanced Filter Buttons Row - Only shown when toggle is active */}
                {showSearchAndFilters && (
                <div className={styles.filtersRow}>
                    <div className={styles.inlineFilters}>
                        {/* Brand Filter */}
                        <div className={styles.filterButtonWrapper} data-filter-wrapper>
                            <button
                                className={`${styles.inlineFilterButton} ${brandId ? styles.inlineFilterButtonActive : ''}`}
                                onClick={() => {
                                    setShowBrandDropdown(!showBrandDropdown);
                                    setShowCategoryDropdown(false);
                                    setShowPriceDropdown(false);
                                    setShowStockDropdown(false);
                                    setShowProductTypeDropdown(false);
                                }}
                            >
                                {getSelectedBrandName()}
                                <ChevronDown size={16} />
                            </button>
                            {showBrandDropdown && (
                                <div className={styles.filterDropdown}>
                                    <div className={styles.filterDropdownContent}>
                                        <div className={styles.filterDropdownSearch}>
                                            <Search size={14} className={styles.filterDropdownSearchIcon} />
                                            <input
                                                type="text"
                                                placeholder={t('Search brands', 'Cauta marci')}
                                                value={brandSearch}
                                                onChange={(e) => setBrandSearch(e.target.value)}
                                                className={styles.filterDropdownSearchInput}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className={styles.filterDropdownItems}>
                                            <button
                                                className={`${styles.filterDropdownItem} ${!brandId ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setBrandId('');
                                                    setBrandSearch('');
                                                    setShowBrandDropdown(false);
                                                    applyFilters('', undefined);
                                                }}
                                            >
                                                {t('All brands', 'Toate marci')}
                                            </button>
                                            {filteredBrands.map((brand) => (
                                                <button
                                                    key={brand.id}
                                                    className={`${styles.filterDropdownItem} ${brandId === brand.id.toString() ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newBrandId = brand.id.toString();
                                                        setBrandId(newBrandId);
                                                        setBrandSearch('');
                                                        setShowBrandDropdown(false);
                                                        applyFilters(newBrandId, undefined);
                                                    }}
                                                >
                                                    {brand.name}
                                                </button>
                                            ))}
                                            {filteredBrands.length === 0 && brandSearch && (
                                                <div className={styles.filterDropdownNoResults}>
                                                    {t('No brands found', 'Nu s-au gasit marci')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Category Filter */}
                        <div className={styles.filterButtonWrapper} data-filter-wrapper>
                            <button
                                className={`${styles.inlineFilterButton} ${categoryId ? styles.inlineFilterButtonActive : ''}`}
                                onClick={() => {
                                    setShowCategoryDropdown(!showCategoryDropdown);
                                    setShowBrandDropdown(false);
                                    setShowPriceDropdown(false);
                                    setShowStockDropdown(false);
                                    setShowProductTypeDropdown(false);
                                }}
                            >
                                {getSelectedCategoryName()}
                                <ChevronDown size={16} />
                            </button>
                            {showCategoryDropdown && (
                                <div className={styles.filterDropdown}>
                                    <div className={styles.filterDropdownContent}>
                                        <div className={styles.filterDropdownSearch}>
                                            <Search size={14} className={styles.filterDropdownSearchIcon} />
                                            <input
                                                type="text"
                                                placeholder={t('Search categories', 'Cauta categorii')}
                                                value={categorySearch}
                                                onChange={(e) => setCategorySearch(e.target.value)}
                                                className={styles.filterDropdownSearchInput}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className={styles.filterDropdownItems}>
                                            <button
                                                className={`${styles.filterDropdownItem} ${!categoryId ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setCategoryId('');
                                                    setCategorySearch('');
                                                    setShowCategoryDropdown(false);
                                                    applyFilters(undefined, '');
                                                }}
                                            >
                                                {t('All categories', 'Toate categoriile')}
                                            </button>
                                            {filteredCategories.map((category) => (
                                                <button
                                                    key={category.id}
                                                    className={`${styles.filterDropdownItem} ${categoryId === category.id.toString() ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newCategoryId = category.id.toString();
                                                        setCategoryId(newCategoryId);
                                                        setCategorySearch('');
                                                        setShowCategoryDropdown(false);
                                                        applyFilters(undefined, newCategoryId);
                                                    }}
                                                >
                                                    {category.name}
                                                </button>
                                            ))}
                                            {filteredCategories.length === 0 && categorySearch && (
                                                <div className={styles.filterDropdownNoResults}>
                                                    {t('No categories found', 'Nu s-au gasit categorii')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Family Filter */}
                        <div className={styles.filterButtonWrapper} data-filter-wrapper>
                            <button
                                className={`${styles.inlineFilterButton} ${familyId ? styles.inlineFilterButtonActive : ''}`}
                                onClick={() => {
                                    setShowFamilyDropdown(!showFamilyDropdown);
                                    setShowBrandDropdown(false);
                                    setShowCategoryDropdown(false);
                                    setShowPriceDropdown(false);
                                    setShowStockDropdown(false);
                                    setShowProductTypeDropdown(false);
                                }}
                            >
                                {getSelectedFamilyName()}
                                <ChevronDown size={16} />
                            </button>
                            {showFamilyDropdown && (
                                <div className={styles.filterDropdown}>
                                    <div className={styles.filterDropdownContent}>
                                        <div className={styles.filterDropdownSearch}>
                                            <Search size={14} className={styles.filterDropdownSearchIcon} />
                                            <input
                                                type="text"
                                                placeholder={t('Search families', 'Cauta familii')}
                                                value={familySearch}
                                                onChange={(e) => setFamilySearch(e.target.value)}
                                                className={styles.filterDropdownSearchInput}
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className={styles.filterDropdownItems}>
                                            <button
                                                className={`${styles.filterDropdownItem} ${!familyId ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setFamilyId('');
                                                    setFamilySearch('');
                                                    setShowFamilyDropdown(false);
                                                    applyFilters(undefined, undefined, '');
                                                }}
                                            >
                                                {t('All families', 'Toate familiile')}
                                            </button>
                                            {filteredFamilies.map((family) => (
                                                <button
                                                    key={family.id}
                                                    className={`${styles.filterDropdownItem} ${familyId === family.id.toString() ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newFamilyId = family.id.toString();
                                                        setFamilyId(newFamilyId);
                                                        setFamilySearch('');
                                                        setShowFamilyDropdown(false);
                                                        applyFilters(undefined, undefined, newFamilyId);
                                                    }}
                                                >
                                                    {family.name}
                                                </button>
                                            ))}
                                            {filteredFamilies.length === 0 && familySearch && (
                                                <div className={styles.filterDropdownNoResults}>
                                                    {t('No families found', 'Nu s-au gasit familii')}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Price Range Filter */}
                        <div className={styles.filterButtonWrapper} data-filter-wrapper>
                            <button
                                className={`${styles.inlineFilterButton} ${priceMin || priceMax ? styles.inlineFilterButtonActive : ''}`}
                                onClick={() => {
                                    setShowPriceDropdown(!showPriceDropdown);
                                    setShowBrandDropdown(false);
                                    setShowCategoryDropdown(false);
                                    setShowFamilyDropdown(false);
                                    setShowStockDropdown(false);
                                    setShowProductTypeDropdown(false);
                                }}
                            >
                                {getPriceRangeText()}
                                <ChevronDown size={16} />
                            </button>
                            {showPriceDropdown && (
                                <div className={styles.filterDropdown}>
                                    <div className={styles.filterDropdownContent}>
                                        <div className={styles.rangeFilterContent}>
                                            <div className={styles.rangeInputGroup}>
                                                <label className={styles.rangeLabel}>{t('Min', 'Min')}</label>
                                                <input
                                                    type="number"
                                                    placeholder={t('Min', 'Min')}
                                                    value={priceMin}
                                                    onChange={(e) => setPriceMin(e.target.value)}
                                                    className={styles.rangeInput}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className={styles.rangeInputGroup}>
                                                <label className={styles.rangeLabel}>{t('Max', 'Max')}</label>
                                                <input
                                                    type="number"
                                                    placeholder={t('Max', 'Max')}
                                                    value={priceMax}
                                                    onChange={(e) => setPriceMax(e.target.value)}
                                                    className={styles.rangeInput}
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <button
                                                className={styles.applyRangeButton}
                                                onClick={() => {
                                                    setShowPriceDropdown(false);
                                                    applyFilters();
                                                }}
                                            >
                                                {t('Apply', 'Aplica')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stock Range Filter */}
                        <div className={styles.filterButtonWrapper} data-filter-wrapper>
                            <button
                                className={`${styles.inlineFilterButton} ${stockMin || stockMax ? styles.inlineFilterButtonActive : ''}`}
                                onClick={() => {
                                    setShowStockDropdown(!showStockDropdown);
                                    setShowBrandDropdown(false);
                                    setShowCategoryDropdown(false);
                                    setShowFamilyDropdown(false);
                                    setShowPriceDropdown(false);
                                    setShowProductTypeDropdown(false);
                                }}
                            >
                                {getStockRangeText()}
                                <ChevronDown size={16} />
                            </button>
                            {showStockDropdown && (
                                <div className={styles.filterDropdown}>
                                    <div className={styles.filterDropdownContent}>
                                        <div className={styles.rangeFilterContent}>
                                            <div className={styles.rangeInputGroup}>
                                                <label className={styles.rangeLabel}>{t('Min', 'Min')}</label>
                                                <input
                                                    type="number"
                                                    placeholder={t('Min', 'Min')}
                                                    value={stockMin}
                                                    onChange={(e) => setStockMin(e.target.value)}
                                                    className={styles.rangeInput}
                                                    min="0"
                                                    step="1"
                                                />
                                            </div>
                                            <div className={styles.rangeInputGroup}>
                                                <label className={styles.rangeLabel}>{t('Max', 'Max')}</label>
                                                <input
                                                    type="number"
                                                    placeholder={t('Max', 'Max')}
                                                    value={stockMax}
                                                    onChange={(e) => setStockMax(e.target.value)}
                                                    className={styles.rangeInput}
                                                    min="0"
                                                    step="1"
                                                />
                                            </div>
                                            <button
                                                className={styles.applyRangeButton}
                                                onClick={() => {
                                                    setShowStockDropdown(false);
                                                    applyFilters();
                                                }}
                                            >
                                                {t('Apply', 'Aplica')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Product Type Filter */}
                        <div className={styles.filterButtonWrapper} data-filter-wrapper>
                            <button
                                className={`${styles.inlineFilterButton} ${productType ? styles.inlineFilterButtonActive : ''}`}
                                onClick={() => {
                                    setShowProductTypeDropdown(!showProductTypeDropdown);
                                    setShowBrandDropdown(false);
                                    setShowCategoryDropdown(false);
                                    setShowFamilyDropdown(false);
                                    setShowPriceDropdown(false);
                                    setShowStockDropdown(false);
                                }}
                            >
                                {getSelectedProductTypeName()}
                                <ChevronDown size={16} />
                            </button>
                            {showProductTypeDropdown && (
                                <div className={styles.filterDropdown}>
                                    <div className={styles.filterDropdownContent}>
                                        <div className={styles.filterDropdownItems}>
                                            <button
                                                className={`${styles.filterDropdownItem} ${!productType ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setProductType('');
                                                    setShowProductTypeDropdown(false);
                                                    applyFilters(undefined, undefined, '');
                                                }}
                                            >
                                                {t('All types', 'Toate tipurile')}
                                            </button>
                                            <button
                                                className={`${styles.filterDropdownItem} ${productType === 'simple' ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setProductType('simple');
                                                    setShowProductTypeDropdown(false);
                                                    applyFilters(undefined, undefined, 'simple');
                                                }}
                                            >
                                                {t('Simple')}
                                            </button>
                                            <button
                                                className={`${styles.filterDropdownItem} ${productType === 'configurable' ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setProductType('configurable');
                                                    setShowProductTypeDropdown(false);
                                                    applyFilters(undefined, undefined, 'configurable');
                                                }}
                                            >
                                                {t('Configurable')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Add Filter Button (if needed) */}
                        {hasActiveFilters && (
                            <button
                                className={styles.clearAllFiltersButton}
                                onClick={clearFilters}
                                title={t('Clear all filters', 'Sterge toate filtrele')}
                            >
                                <X size={16} />
                                {t('Clear all', 'Sterge toate')}
                            </button>
                        )}
                    </div>
                </div>
                )}

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.productsTable}>
                        <thead>
                            <tr>
                                <th>{t('Product', 'Produs')}</th>
                                <th>{t('Type', 'Tip')}</th>
                                <th>{t('SKU', 'SKU')}</th>
                                <th>{t('EAN', 'EAN')}</th>
                                <th>{t('Brand', 'Marca')}</th>
                                <th>{t('Category', 'Categorie')}</th>
                                <th>{t('Price', 'Pret')}</th>
                                <th>{t('Stock', 'Stoc')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th>{t('Date', 'Data')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className={styles.emptyState}>
                                        {t('No products found', 'Nu s-au gasit produse')}
                                    </td>
                                </tr>
                            ) : (
                                products.map((product) => {
                                    const getTypeLabel = (type?: string) => {
                                        switch (type) {
                                            case 'configurable':
                                                return t('Configurable');
                                            case 'variant':
                                                return t('Variant');
                                            case 'simple':
                                            default:
                                                return t('Simple');
                                        }
                                    };

                                    const getTypeBadgeStyle = (type?: string) => {
                                        switch (type) {
                                            case 'configurable':
                                                return {
                                                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                                                    color: '#7c3aed',
                                                    borderColor: '#8b5cf6',
                                                };
                                            case 'variant':
                                                return {
                                                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                                    color: '#2563eb',
                                                    borderColor: '#3b82f6',
                                                };
                                            default:
                                                return {
                                                    backgroundColor: 'rgba(107, 114, 128, 0.1)',
                                                    color: '#4b5563',
                                                    borderColor: '#9ca3af',
                                                };
                                        }
                                    };

                                    return (
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
                                            <td className={styles.type}>
                                                <span
                                                    className={styles.typeBadge}
                                                    style={getTypeBadgeStyle(product.type)}
                                                >
                                                    {getTypeLabel(product.type)}
                                                    {product.type === 'configurable' && product.variants_count !== undefined && (
                                                        <span className={styles.variantsCount}>
                                                            {' '}({product.variants_count})
                                                        </span>
                                                    )}
                                                </span>
                                            </td>
                                            <td className={styles.sku}>
                                                {product.sku || '-'}
                                            </td>
                                            <td className={styles.ean}>
                                                {product.ean || '-'}
                                            </td>
                                            <td className={styles.brand}>
                                                {product.brand_name}
                                            </td>
                                            <td className={styles.category}>
                                                {product.category_name}
                                            </td>
                                            <td className={styles.price}>
                                                {formatPrice(product.price_ron)} RON
                                            </td>
                                            <td>
                                                <div className={styles.stockCell}>
                                                    <span
                                                        className={styles.stockBadge}
                                                        style={getStockBadgeStyle(product.stock_quantity)}
                                                    >
                                                        {product.stock_quantity}
                                                    </span>
                                                    {product.type === 'configurable' && product.has_low_stock_variants && (
                                                        <span
                                                            className={styles.lowStockAlertBadge}
                                                            title={t('This configurable product has variants with stock <= 0')}
                                                        >
                                                            ⚠️
                                                        </span>
                                                    )}
                                                </div>
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
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.last_page > 1 && (
                    <div className={styles.pagination}>
                        <button
                            disabled={pagination.current_page === 1}
                            onClick={() => {
                                const params: Record<string, any> = {
                                    filter: activeFilter,
                                    search: searchQuery,
                                    page: pagination.current_page - 1,
                                };
                                if (brandId) params.brand_id = brandId;
                                if (categoryId) params.category_id = categoryId;
                                if (familyId) params.family_id = familyId;
                                if (productType) params.product_type = productType;
                                if (priceMin) params.price_min = priceMin;
                                if (priceMax) params.price_max = priceMax;
                                if (stockMin) params.stock_min = stockMin;
                                if (stockMax) params.stock_max = stockMax;
                                router.get('/admin/products', params, {
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: false, // Ensure history entries are created
                                });
                            }}
                            className={styles.paginationButton}
                        >
                            {t('Previous', 'Anterior')}
                        </button>
                        <span className={styles.paginationInfo}>
                            {t('Page', 'Pagina')} {pagination.current_page} {t('of', 'din')} {pagination.last_page}
                        </span>
                        <button
                            disabled={pagination.current_page === pagination.last_page}
                            onClick={() => {
                                const params: Record<string, any> = {
                                    filter: activeFilter,
                                    search: searchQuery,
                                    page: pagination.current_page + 1,
                                };
                                if (brandId) params.brand_id = brandId;
                                if (categoryId) params.category_id = categoryId;
                                if (familyId) params.family_id = familyId;
                                if (productType) params.product_type = productType;
                                if (priceMin) params.price_min = priceMin;
                                if (priceMax) params.price_max = priceMax;
                                if (stockMin) params.stock_min = stockMin;
                                if (stockMax) params.stock_max = stockMax;
                                router.get('/admin/products', params, {
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: false, // Ensure history entries are created
                                });
                            }}
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
