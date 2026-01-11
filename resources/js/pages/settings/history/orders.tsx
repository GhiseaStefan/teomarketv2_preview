import { usePage, router, Link } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { useTranslations } from '../../../utils/translations';
import Layout from '../../../components/layout/Layout';
import SettingsLayout from '../../../components/settings/SettingsLayout';
import type { SharedData, Currency } from '../../../types';
import { ShoppingBag, Calendar, CreditCard, MapPin, Package, ChevronLeft, ChevronRight, Search, ChevronDown, ChevronUp, List, Grid, X } from 'lucide-react';
import { PriceDisplay } from '../../../components/PriceDisplay/PriceDisplay';
import { formatPriceWithCurrency } from '../../../utils/priceFormatter';
import { Button } from '../../../components/ui/Button';
import styles from './orders.module.css';

interface OrderProduct {
    id: number;
    product_id: number | null;
    name: string;
    sku: string | null;
    quantity: number;
    unit_price_currency: number;
    unit_price_ron: number;
    total_currency_excl_vat: number;
    total_currency_incl_vat: number;
    total_ron_excl_vat: number;
    total_ron_incl_vat: number;
    image: string | null;
}

interface OrderAddress {
    first_name: string;
    last_name: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    county_name?: string | null;
    zip_code: string;
}

interface PaymentMethod {
    id: number;
    name: string;
}

interface OrderStatus {
    value: string;
    name: string;
    color_code: string;
}

interface Shipping {
    pickup_point_id?: string | null;
    shipping_cost_excl_vat?: number;
    shipping_cost_incl_vat?: number;
    shipping_cost_ron_excl_vat?: number;
    shipping_cost_ron_incl_vat?: number;
}

interface Order {
    id: number;
    order_number: string;
    invoice_series?: string | null;
    invoice_number?: string | null;
    currency: string;
    vat_rate_applied?: number | null;
    total_excl_vat: number;
    total_incl_vat: number;
    total_ron_excl_vat: number;
    total_ron_incl_vat: number;
    created_at: string;
    cancelled_at?: string | null;
    order_status: OrderStatus | null;
    payment_method: PaymentMethod | null;
    payment?: {
        is_paid: boolean;
        paid_at: string | null;
        paid_at_formatted: string | null;
    };
    billing_address: OrderAddress | null;
    shipping_address: OrderAddress | null;
    shipping?: Shipping | null;
    products: OrderProduct[];
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface Filters {
    status?: string;
    time_range?: string;
    search?: string;
    per_page?: number | string;
}

interface SearchResult {
    order_id: number;
    order_number: string;
    product_id: number | null;
    product_name: string;
    price: number;
    image: string | null;
    date: string;
    date_timestamp?: number;
    cancelled: boolean;
    delivered: boolean;
    status: {
        name: string;
        color_code: string;
    } | null;
}

interface OrdersPageProps {
    orders?: Order[];
    pagination?: Pagination;
    filters?: Filters;
}

function OrdersContent({ orders: pageOrders, pagination: pagePagination, filters: pageFilters }: OrdersPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData & { orders?: Order[]; pagination?: Pagination; filters?: Filters }>();
    const orders = pageOrders || (page.props.orders as Order[]) || [];
    const pagination = pagePagination || (page.props.pagination as Pagination);
    const filters = pageFilters || (page.props.filters as Filters) || {};
    const currencies = (page.props.currencies as Currency[] | undefined) || [];
    const currentCurrency = currencies.find(c => c.code === 'RON') || currencies[0] || { code: 'RON', symbol_right: ' RON', symbol_left: null };

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [viewMode, setViewMode] = useState<'expanded' | 'collapsed'>('expanded');
    const [expandedOrders, setExpandedOrders] = useState<Set<number>>(new Set());
    const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const formatAddress = (address: OrderAddress): string => {
        const parts: string[] = [];
        if (address.address_line_1) parts.push(address.address_line_1);
        if (address.address_line_2) parts.push(address.address_line_2);
        if (address.city) {
            let cityPart = address.city;
            if (address.county_name) {
                cityPart += `, ${address.county_name}`;
            }
            parts.push(cityPart);
        }
        if (address.zip_code) parts.push(address.zip_code);
        return parts.join(', ');
    };

    // Helper function to get currency object for an order
    const getOrderCurrency = (currencyCode: string): Currency => {
        const currency = currencies.find(c => c.code === currencyCode);
        if (currency) return currency;
        // Fallback to RON if currency not found
        return currencies.find(c => c.code === 'RON') || currencies[0] || { code: 'RON', symbol_right: ' RON', symbol_left: null };
    };

    // Helper function to format price in order's currency
    const formatPriceInOrderCurrency = (amount: number | string | null | undefined, orderCurrency: Currency) => {
        if (amount == null) return formatPriceWithCurrency(0, orderCurrency);
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return formatPriceWithCurrency(0, orderCurrency);
        return formatPriceWithCurrency(numAmount, orderCurrency);
    };

    const formatPrice = (amount: number | string | null | undefined) => {
        if (amount == null) return formatPriceWithCurrency(0, currentCurrency);
        const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
        if (isNaN(numAmount)) return formatPriceWithCurrency(0, currentCurrency);
        return formatPriceWithCurrency(numAmount, currentCurrency);
    };

    const handlePerPageChange = (perPage: string | number) => {
        const perPageValue = perPage === 'all' ? 999999 : parseInt(perPage as string, 10);
        router.get('/settings/history/orders', {
            per_page: perPageValue,
            page: 1,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['orders', 'pagination', 'filters'],
        });
    };

    const handleStatusChange = (status: string) => {
        router.get('/settings/history/orders', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 5),
            page: 1,
            status,
            time_range: filters.time_range || '3months',
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['orders', 'pagination', 'filters'],
        });
    };

    const handleTimeRangeChange = (timeRange: string) => {
        router.get('/settings/history/orders', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 5),
            page: 1,
            status: filters.status || 'all',
            time_range: timeRange,
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['orders', 'pagination', 'filters'],
        });
    };

    const performSearch = async (query: string) => {
        if (!query || query.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        try {
            const response = await fetch(`/settings/history/orders/search?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            if (response.ok) {
                const data = await response.json();
                setSearchResults(data.results || []);
                setShowDropdown(true);
            } else {
                setSearchResults([]);
            }
        } catch (error) {
            console.error('Search error:', error);
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setSearchQuery(value);

        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // If query is too short, clear results
        if (!value || value.length < 2) {
            setSearchResults([]);
            setShowDropdown(false);
            return;
        }

        // Set new timeout for debounce (1 second)
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(value);
        }, 1000);
    };

    const handleSearchClear = () => {
        setSearchQuery('');
        setSearchResults([]);
        setShowDropdown(false);
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        // Reset the main search filter
        router.get('/settings/history/orders', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 5),
            page: 1,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: '',
        }, {
            preserveState: true,
            only: ['orders', 'pagination', 'filters'],
        });
    };

    const handleResultClick = (orderId: number) => {
        setShowDropdown(false);
        setSearchQuery('');
        setSearchResults([]);
        // Scroll to the order in the list
        const orderElement = document.querySelector(`[data-order-id="${orderId}"]`);
        if (orderElement) {
            orderElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Highlight the order briefly
            orderElement.classList.add(styles.orderHighlight);
            setTimeout(() => {
                orderElement.classList.remove(styles.orderHighlight);
            }, 2000);
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node) &&
                searchInputRef.current &&
                !searchInputRef.current.contains(event.target as Node)
            ) {
                setShowDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/settings/history/orders', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 5),
            page: 1,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: searchQuery,
        }, {
            preserveState: true,
            only: ['orders', 'pagination', 'filters'],
        });
    };

    const handlePageChange = (page: number) => {
        const currentPerPage = filters.per_page === 'all' ? 999999 : (filters.per_page || 5);
        router.get('/settings/history/orders', {
            per_page: currentPerPage,
            page,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['orders', 'pagination'],
        });
    };

    const toggleOrderExpanded = (orderId: number) => {
        setExpandedOrders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(orderId)) {
                newSet.delete(orderId);
            } else {
                newSet.add(orderId);
            }
            return newSet;
        });
    };

    const handleViewModeChange = (mode: 'expanded' | 'collapsed') => {
        setViewMode(mode);
        if (mode === 'collapsed') {
            // In collapsed mode, all orders start collapsed
            setExpandedOrders(new Set());
        } else {
            // In expanded mode, expand all orders
            setExpandedOrders(new Set(orders.map(o => o.id)));
        }
    };

    const renderPagination = () => {
        if (!pagination || pagination.last_page <= 1) return null;

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

                    {pages.map((pageNum) => (
                        <Button
                            key={pageNum}
                            variant={pagination.current_page === pageNum ? 'primary' : 'secondary'}
                            onClick={() => handlePageChange(pageNum)}
                        >
                            {pageNum}
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
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                <div className={styles.ordersPage}>
                    <div className={styles.ordersCard}>
                        <div className={styles.pageHeader}>
                            <h1 className={styles.pageTitle}>{t('My Orders')}</h1>
                            <div className={styles.viewModeButtons}>
                                <Button
                                    variant={viewMode === 'expanded' ? 'primary' : 'secondary'}
                                    onClick={() => handleViewModeChange('expanded')}
                                    className={styles.viewModeButton}
                                    title={t('Expanded View')}
                                >
                                    <List size={16} />
                                </Button>
                                <Button
                                    variant={viewMode === 'collapsed' ? 'primary' : 'secondary'}
                                    onClick={() => handleViewModeChange('collapsed')}
                                    className={styles.viewModeButton}
                                    title={t('Collapsed View')}
                                >
                                    <Grid size={16} />
                                </Button>
                            </div>
                        </div>

                        <div className={styles.filtersSection}>
                            <div className={styles.filtersRow}>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>
                                        {t('See')}:
                                        <select
                                            value={filters.status || 'all'}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                            className={styles.filterSelect}
                                        >
                                            <option value="all">{t('All orders')}</option>
                                            <option value="active">{t('Active orders')}</option>
                                            <option value="cancelled">{t('Cancelled orders')}</option>
                                        </select>
                                    </label>
                                </div>

                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>
                                        {t('From')}:
                                        <select
                                            value={filters.time_range || '3months'}
                                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                                            className={styles.filterSelect}
                                        >
                                            <option value="3months">{t('Last 3 months')}</option>
                                            <option value="6months">{t('Last 6 months')}</option>
                                            <option value="year">{t('Respective year')}</option>
                                            <option value="all">{t('All')}</option>
                                        </select>
                                    </label>
                                </div>

                                {pagination && (
                                    <div className={styles.filterGroup}>
                                        <label className={styles.filterLabel}>
                                            {t('Show')}:
                                            <select
                                                value={filters.per_page === 'all' || filters.per_page === 999999 ? 'all' : (filters.per_page || pagination.per_page)}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    handlePerPageChange(value);
                                                }}
                                                className={`${styles.filterSelect} ${styles.perPageSelect}`}
                                            >
                                                <option value="5">5</option>
                                                <option value="10">10</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                                <option value="all">{t('All')}</option>
                                            </select>
                                        </label>
                                    </div>
                                )}

                                <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
                                    <div className={styles.searchInputWrapper}>
                                        <Search size={16} className={styles.searchIcon} />
                                        <input
                                            ref={searchInputRef}
                                            type="text"
                                            value={searchQuery}
                                            onChange={handleSearchChange}
                                            onFocus={() => {
                                                if (searchResults.length > 0) {
                                                    setShowDropdown(true);
                                                }
                                            }}
                                            placeholder={t('Search by product / order number')}
                                            className={styles.searchInput}
                                        />
                                        {searchQuery && (
                                            <button
                                                type="button"
                                                onClick={handleSearchClear}
                                                className={styles.searchClearButton}
                                            >
                                                <X size={16} />
                                            </button>
                                        )}
                                        {isSearching && (
                                            <div className={styles.searchLoading}>
                                                <div className={styles.spinner}></div>
                                            </div>
                                        )}
                                    </div>
                                    {showDropdown && searchResults.length > 0 && (
                                        <div ref={dropdownRef} className={styles.searchDropdown}>
                                            {searchResults.map((result, index) => (
                                                <div
                                                    key={`${result.order_id}-${result.product_id}-${index}`}
                                                    className={styles.searchResultItem}
                                                    onClick={() => handleResultClick(result.order_id)}
                                                >
                                                    {result.image ? (
                                                        <img
                                                            src={result.image}
                                                            alt={result.product_name}
                                                            className={styles.searchResultImage}
                                                        />
                                                    ) : (
                                                        <div className={styles.searchResultImagePlaceholder}>
                                                            {t('No image')}
                                                        </div>
                                                    )}
                                                    <div className={styles.searchResultContent}>
                                                        <div className={styles.searchResultName}>
                                                            {result.product_name}
                                                        </div>
                                                        <div className={styles.searchResultPrice}>
                                                            <PriceDisplay price={formatPrice(result.price)} />
                                                        </div>
                                                        <div className={styles.searchResultMeta}>
                                                            <span className={styles.searchResultDate}>
                                                                {result.date_timestamp
                                                                    ? new Date(result.date_timestamp * 1000).toLocaleDateString('ro-RO', {
                                                                        day: '2-digit',
                                                                        month: 'short',
                                                                        year: 'numeric'
                                                                    })
                                                                    : result.date
                                                                }
                                                            </span>
                                                            <span className={styles.searchResultOrderNumber}>
                                                                {t('Order')} #{result.order_number}
                                                            </span>
                                                        </div>
                                                        {result.status ? (
                                                            <div
                                                                className={styles.searchResultStatus}
                                                                style={{
                                                                    color: result.status.color_code || 'var(--color-text-secondary)'
                                                                }}
                                                            >
                                                                {result.status.name}
                                                            </div>
                                                        ) : result.cancelled ? (
                                                            <div className={styles.searchResultStatus}>
                                                                {t('Cancelled order')}
                                                            </div>
                                                        ) : result.delivered ? (
                                                            <div className={`${styles.searchResultStatus} ${styles.searchResultStatusDelivered}`}>
                                                                {t('Order delivered')}
                                                            </div>
                                                        ) : (
                                                            <div className={styles.searchResultStatus}>
                                                                {t('Order in progress')}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </form>
                            </div>
                        </div>

                        {orders.length === 0 ? (
                            <div className={styles.emptyState}>
                                <ShoppingBag size={48} className={styles.emptyIcon} />
                                <p className={styles.emptyText}>{t('No orders found')}</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.ordersList}>
                                    {orders.map((order) => {
                                        const isExpanded = viewMode === 'expanded' || expandedOrders.has(order.id);
                                        return (
                                            <div key={order.id} className={styles.orderCard} data-order-id={order.id}>
                                                <div
                                                    className={`${styles.orderHeader} ${viewMode === 'collapsed' ? styles.orderHeaderClickable : ''}`}
                                                    onClick={viewMode === 'collapsed' ? () => toggleOrderExpanded(order.id) : undefined}
                                                >
                                                    <div className={styles.orderHeaderLeft}>
                                                        <div className={`${styles.orderIcon} ${order.cancelled_at ? styles.orderIconCancelled : ''}`}>
                                                            <ShoppingBag size={20} />
                                                        </div>
                                                        <div className={styles.orderInfo}>
                                                            <div className={styles.orderNumber}>
                                                                {t('Order')} #{order.order_number}
                                                            </div>
                                                            <div className={styles.orderMeta}>
                                                                <span className={styles.orderDate}>
                                                                    <Calendar size={14} />
                                                                    {formatDate(order.created_at)}
                                                                </span>
                                                                {order.payment_method && (
                                                                    <span className={styles.paymentMethod}>
                                                                        <CreditCard size={14} />
                                                                        {order.payment_method.name}
                                                                    </span>
                                                                )}
                                                                {order.payment && (
                                                                    <span className={order.payment.is_paid ? styles.paymentStatusPaid : styles.paymentStatusUnpaid}>
                                                                        {order.payment.is_paid ? '✓ ' + t('Paid', 'Platit') : t('Unpaid', 'Neplatit')}
                                                                        {order.payment.is_paid && order.payment.paid_at_formatted && (
                                                                            <span className={styles.paymentDate}> ({order.payment.paid_at_formatted})</span>
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className={styles.orderHeaderRight}>
                                                        <div className={styles.orderTotal}>
                                                            <PriceDisplay price={formatPriceInOrderCurrency(
                                                                order.total_incl_vat + (order.shipping?.shipping_cost_incl_vat || 0),
                                                                getOrderCurrency(order.currency)
                                                            )} />
                                                        </div>
                                                        <Button
                                                            variant="secondary"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                router.get(`/settings/history/orders/${order.id}`);
                                                            }}
                                                            className={styles.viewDetailsButton}
                                                        >
                                                            {t('View order details')}
                                                        </Button>
                                                        {viewMode === 'collapsed' && (
                                                            <div className={styles.orderExpandIcon}>
                                                                {isExpanded ? (
                                                                    <ChevronUp size={20} />
                                                                ) : (
                                                                    <ChevronDown size={20} />
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {isExpanded && (
                                                    <div className={styles.orderContent}>
                                                        {/* Invoice Info */}
                                                        {order.invoice_series && order.invoice_number && (
                                                            <div className={styles.detailSection}>
                                                                <h3 className={styles.detailSectionTitle}>
                                                                    {t('Invoice Information')}
                                                                </h3>
                                                                <div className={styles.detailContent}>
                                                                    <span>
                                                                        {order.invoice_series} {order.invoice_number}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Products */}
                                                        <div className={styles.detailSection}>
                                                            <h3 className={styles.detailSectionTitle}>
                                                                <Package size={16} />
                                                                {t('Products')}
                                                            </h3>
                                                            <div className={styles.productsList}>
                                                                {order.products.map((product) => (
                                                                    <div key={product.id} className={styles.productItem}>
                                                                        {product.product_id ? (
                                                                            <Link href={`/products/${product.product_id}`} className={styles.productImageLink}>
                                                                                <div className={styles.productImageWrapper}>
                                                                                    {product.image ? (
                                                                                        <img
                                                                                            src={product.image}
                                                                                            alt={product.name}
                                                                                            className={styles.productImage}
                                                                                        />
                                                                                    ) : (
                                                                                        <div className={styles.productImagePlaceholder}>
                                                                                            {t('No image')}
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            </Link>
                                                                        ) : (
                                                                            <div className={styles.productImageWrapper}>
                                                                                {product.image ? (
                                                                                    <img
                                                                                        src={product.image}
                                                                                        alt={product.name}
                                                                                        className={styles.productImage}
                                                                                    />
                                                                                ) : (
                                                                                    <div className={styles.productImagePlaceholder}>
                                                                                        {t('No image')}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                        <div className={styles.productInfo}>
                                                                            {product.product_id ? (
                                                                                <Link href={`/products/${product.product_id}`} className={styles.productNameLink}>
                                                                                    <div className={styles.productName}>
                                                                                        {product.name}
                                                                                    </div>
                                                                                </Link>
                                                                            ) : (
                                                                                <div className={styles.productName}>
                                                                                    {product.name}
                                                                                </div>
                                                                            )}
                                                                            {product.sku && (
                                                                                <div className={styles.productSku}>
                                                                                    SKU: {product.sku}
                                                                                </div>
                                                                            )}
                                                                            <div className={styles.productQuantity}>
                                                                                {t('Quantity')}: {product.quantity}
                                                                            </div>
                                                                            <div className={styles.productUnitPrice}>
                                                                                {t('Unit price')}: <PriceDisplay price={formatPriceInOrderCurrency(product.unit_price_currency, getOrderCurrency(order.currency))} />
                                                                            </div>
                                                                        </div>
                                                                        <div className={styles.productPrice}>
                                                                            <PriceDisplay price={formatPriceInOrderCurrency(product.total_currency_incl_vat, getOrderCurrency(order.currency))} />
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>

                                                        {/* Addresses */}
                                                        {(order.billing_address || order.shipping_address) && (
                                                            <div className={styles.detailSection}>
                                                                <h3 className={styles.detailSectionTitle}>
                                                                    <MapPin size={16} />
                                                                    {t('Addresses')}
                                                                </h3>
                                                                <div className={styles.addressesGrid}>
                                                                    {order.billing_address && (
                                                                        <div className={styles.addressBox}>
                                                                            <div className={styles.addressLabel}>
                                                                                {t('Billing Address')}
                                                                            </div>
                                                                            <div className={styles.addressContent}>
                                                                                <div className={styles.addressName}>
                                                                                    {order.billing_address.first_name}{' '}
                                                                                    {order.billing_address.last_name}
                                                                                </div>
                                                                                <div className={styles.addressText}>
                                                                                    {formatAddress(order.billing_address)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                    {order.shipping_address && (
                                                                        <div className={styles.addressBox}>
                                                                            <div className={styles.addressLabel}>
                                                                                {t('Shipping Address')}
                                                                            </div>
                                                                            <div className={styles.addressContent}>
                                                                                {!order.shipping?.pickup_point_id && (
                                                                                    <div className={styles.addressName}>
                                                                                        {order.shipping_address.first_name}{' '}
                                                                                        {order.shipping_address.last_name}
                                                                                    </div>
                                                                                )}
                                                                                <div className={styles.addressText}>
                                                                                    {formatAddress(order.shipping_address)}
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Order Summary */}
                                                        <div className={styles.detailSection}>
                                                            <h3 className={styles.detailSectionTitle}>
                                                                {t('Order Summary')}
                                                            </h3>
                                                            <div className={styles.summaryGrid}>
                                                                <div className={styles.summaryRow}>
                                                                    <span>{t('Subtotal (excl. VAT)')}</span>
                                                                    <span>
                                                                        <PriceDisplay price={formatPriceInOrderCurrency(order.total_excl_vat, getOrderCurrency(order.currency))} />
                                                                    </span>
                                                                </div>
                                                                {order.shipping && (order.shipping.shipping_cost_excl_vat !== null && order.shipping.shipping_cost_excl_vat !== undefined) && (
                                                                    <div className={styles.summaryRow}>
                                                                        <span>{t('Shipping Cost')}</span>
                                                                        <span>
                                                                            <PriceDisplay price={formatPriceInOrderCurrency(order.shipping.shipping_cost_excl_vat || 0, getOrderCurrency(order.currency))} />
                                                                        </span>
                                                                    </div>
                                                                )}
                                                                <div className={styles.summaryRow}>
                                                                    <span>
                                                                        {t('VAT')}
                                                                        {order.vat_rate_applied !== null && order.vat_rate_applied !== undefined && (
                                                                            <span className={styles.vatRateLabel}> ({order.vat_rate_applied}%)</span>
                                                                        )}
                                                                    </span>
                                                                    <span>
                                                                        <PriceDisplay price={formatPriceInOrderCurrency(
                                                                            (order.total_incl_vat - order.total_excl_vat) +
                                                                            ((order.shipping?.shipping_cost_incl_vat || 0) - (order.shipping?.shipping_cost_excl_vat || 0)),
                                                                            getOrderCurrency(order.currency)
                                                                        )} />
                                                                    </span>
                                                                </div>
                                                                <div className={`${styles.summaryRow} ${styles.summaryRowTotal}`}>
                                                                    <span>
                                                                        {t('Total')} <span className={styles.vatRateLabel}>(cu TVA)</span>
                                                                    </span>
                                                                    <span>
                                                                        <PriceDisplay price={formatPriceInOrderCurrency(
                                                                            order.total_incl_vat + (order.shipping?.shipping_cost_incl_vat || 0),
                                                                            getOrderCurrency(order.currency)
                                                                        )} />
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                                {pagination && renderPagination()}
                            </>
                        )}
                    </div>
                </div>
            </SettingsLayout>
        </Layout>
    );
}

export default OrdersContent;
