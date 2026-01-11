import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Search, Package, Truck, MapPin, Menu, X, ChevronDown } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import { formatPrice } from '../../utils/formatPrice';
import styles from './orders.module.css';

interface Order {
    id: number;
    order_number: string;
    created_at: string;
    created_at_formatted: string;
    client_name: string;
    client_city: string;
    status: {
        value: string;
        name: string;
        color: string;
    };
    payment: {
        method: string;
        total: string;
        is_paid: boolean;
        paid_at: string | null;
        paid_at_formatted: string | null;
    };
    shipping: {
        tracking_number: string | null;
        method_name: string;
        method_type: string | null;
        has_tracking: boolean;
        is_pickup: boolean;
    };
    products_count: number;
    products_summary: string;
}

interface PaymentMethod {
    id: number;
    name: string;
}

interface ShippingMethod {
    id: number;
    name: string;
}

interface OrdersPageProps {
    orders: Order[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        filter: string;
        search: string;
        payment_status?: string;
        order_status?: string;
        payment_method_id?: string;
        shipping_method_id?: string;
        date_from?: string;
        date_to?: string;
        amount_min?: string;
        amount_max?: string;
        city?: string;
        has_invoice?: string;
    };
    paymentMethods?: PaymentMethod[];
    shippingMethods?: ShippingMethod[];
    orderStatuses?: Array<{
        value: string;
        label: string;
        color_code: string;
    }>;
    cities?: string[];
}

export default function AdminOrders({ 
    orders, 
    pagination, 
    filters: initialFilters, 
    paymentMethods = [], 
    shippingMethods = [], 
    orderStatuses = [],
    cities = [] 
}: OrdersPageProps) {
    const { t } = useTranslations();
    const [activeFilter, setActiveFilter] = useState(initialFilters.filter || 'all');
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [showSearchAndFilters, setShowSearchAndFilters] = useState(false);
    
    // Advanced filter states
    const [paymentStatus, setPaymentStatus] = useState(initialFilters.payment_status || '');
    const [orderStatus, setOrderStatus] = useState(initialFilters.order_status || '');
    const [paymentMethodId, setPaymentMethodId] = useState(initialFilters.payment_method_id || '');
    const [shippingMethodId, setShippingMethodId] = useState(initialFilters.shipping_method_id || '');
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to || '');
    const [amountMin, setAmountMin] = useState(initialFilters.amount_min || '');
    const [amountMax, setAmountMax] = useState(initialFilters.amount_max || '');
    const [city, setCity] = useState(initialFilters.city || '');
    const [hasInvoice, setHasInvoice] = useState(initialFilters.has_invoice || '');
    
    // Dropdown states
    const [showPaymentStatusDropdown, setShowPaymentStatusDropdown] = useState(false);
    const [showOrderStatusDropdown, setShowOrderStatusDropdown] = useState(false);
    const [showPaymentMethodDropdown, setShowPaymentMethodDropdown] = useState(false);
    const [showShippingMethodDropdown, setShowShippingMethodDropdown] = useState(false);
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [showAmountDropdown, setShowAmountDropdown] = useState(false);
    const [showCityDropdown, setShowCityDropdown] = useState(false);
    const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false);
    const [citySearch, setCitySearch] = useState('');

    const filters = [
        { id: 'all', label: t('All', 'Toate') },
        { id: 'new', label: t('New', 'Noi') },
        { id: 'in_delivery', label: t('In Delivery', 'In Livrare') },
        { id: 'completed', label: t('Completed', 'Finalizate') },
        { id: 'problems', label: t('Problems', 'Probleme') },
    ];

    const getRequestParams = (overrideParams: Record<string, any> = {}) => {
        const params: Record<string, any> = {
            filter: overrideParams.filter !== undefined ? overrideParams.filter : activeFilter,
            search: overrideParams.search !== undefined ? overrideParams.search : searchQuery,
        };
        
        // Use override values if provided, otherwise use state values
        const currentPaymentStatus = overrideParams.payment_status !== undefined ? overrideParams.payment_status : paymentStatus;
        const currentOrderStatus = overrideParams.order_status !== undefined ? overrideParams.order_status : orderStatus;
        const currentPaymentMethodId = overrideParams.payment_method_id !== undefined ? overrideParams.payment_method_id : paymentMethodId;
        const currentShippingMethodId = overrideParams.shipping_method_id !== undefined ? overrideParams.shipping_method_id : shippingMethodId;
        const currentDateFrom = overrideParams.date_from !== undefined ? overrideParams.date_from : dateFrom;
        const currentDateTo = overrideParams.date_to !== undefined ? overrideParams.date_to : dateTo;
        const currentAmountMin = overrideParams.amount_min !== undefined ? overrideParams.amount_min : amountMin;
        const currentAmountMax = overrideParams.amount_max !== undefined ? overrideParams.amount_max : amountMax;
        const currentCity = overrideParams.city !== undefined ? overrideParams.city : city;
        const currentHasInvoice = overrideParams.has_invoice !== undefined ? overrideParams.has_invoice : hasInvoice;
        
        // Only add payment_status if it's not empty
        if (currentPaymentStatus && currentPaymentStatus !== '') {
            params.payment_status = currentPaymentStatus;
        }
        // Only add order_status if it's not empty
        if (currentOrderStatus && currentOrderStatus !== '') {
            params.order_status = currentOrderStatus;
        }
        // Only add filters if they have values
        if (currentPaymentMethodId && currentPaymentMethodId !== '') {
            params.payment_method_id = currentPaymentMethodId;
        }
        if (currentShippingMethodId && currentShippingMethodId !== '') {
            params.shipping_method_id = currentShippingMethodId;
        }
        if (currentDateFrom && currentDateFrom !== '') {
            params.date_from = currentDateFrom;
        }
        if (currentDateTo && currentDateTo !== '') {
            params.date_to = currentDateTo;
        }
        if (currentAmountMin && currentAmountMin !== '') {
            params.amount_min = currentAmountMin;
        }
        if (currentAmountMax && currentAmountMax !== '') {
            params.amount_max = currentAmountMax;
        }
        if (currentCity && currentCity !== '') {
            params.city = currentCity;
        }
        // Only add has_invoice if it's not empty
        if (currentHasInvoice && currentHasInvoice !== '') {
            params.has_invoice = currentHasInvoice;
        }
        
        return params;
    };

    const handleFilterChange = (filterId: string) => {
        setActiveFilter(filterId);
        router.get('/admin/orders', getRequestParams({ filter: filterId }), {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = (newParams?: Record<string, any>) => {
        const params = getRequestParams(newParams || {});
        router.get('/admin/orders', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearSearch = () => {
        setSearchQuery('');
        router.get('/admin/orders', getRequestParams({ search: '' }), {
            preserveState: true,
            preserveScroll: true,
        });
    };
    
    const clearFilters = () => {
        setPaymentStatus('');
        setOrderStatus('');
        setPaymentMethodId('');
        setShippingMethodId('');
        setDateFrom('');
        setDateTo('');
        setAmountMin('');
        setAmountMax('');
        setCity('');
        setCitySearch('');
        setHasInvoice('');
        
        router.get('/admin/orders', {
            filter: activeFilter,
            search: searchQuery,
        }, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    
    const hasActiveFilters = paymentStatus || orderStatus || paymentMethodId || shippingMethodId || dateFrom || dateTo || amountMin || amountMax || city || hasInvoice;
    
    const getPaymentStatusText = () => {
        if (!paymentStatus) return t('Payment status', 'Status plata');
        return paymentStatus === 'paid' || paymentStatus === '1' ? t('Paid', 'Platit') : t('Unpaid', 'Neplatit');
    };
    
    const getOrderStatusText = () => {
        if (!orderStatus) return t('Order status', 'Status comanda');
        const status = orderStatuses.find(s => s.value === orderStatus);
        return status ? t(status.label, status.label) : t('Order status', 'Status comanda');
    };
    
    const getPaymentMethodName = () => {
        if (!paymentMethodId) return t('Payment method', 'Metoda plata');
        const method = paymentMethods.find(m => m.id.toString() === paymentMethodId);
        return method ? method.name : t('Payment method', 'Metoda plata');
    };
    
    const getShippingMethodName = () => {
        if (!shippingMethodId) return t('Shipping method', 'Metoda livrare');
        const method = shippingMethods.find(m => m.id.toString() === shippingMethodId);
        return method ? method.name : t('Shipping method', 'Metoda livrare');
    };
    
    const getDateRangeText = () => {
        if (!dateFrom && !dateTo) return t('Date range', 'Interval data');
        if (dateFrom && dateTo) return `${dateFrom} - ${dateTo}`;
        if (dateFrom) return `${t('From', 'De la')}: ${dateFrom}`;
        if (dateTo) return `${t('To', 'Pana la')}: ${dateTo}`;
        return t('Date range', 'Interval data');
    };
    
    const getAmountRangeText = () => {
        if (!amountMin && !amountMax) return t('Amount range', 'Interval suma');
        if (amountMin && amountMax) return `${amountMin} - ${amountMax} RON`;
        if (amountMin) return `${t('Min', 'Min')}: ${amountMin} RON`;
        if (amountMax) return `${t('Max', 'Max')}: ${amountMax} RON`;
        return t('Amount range', 'Interval suma');
    };
    
    const filteredCities = cities.filter(c => 
        c.toLowerCase().includes(citySearch.toLowerCase())
    );
    
    const getInvoiceStatusText = () => {
        if (!hasInvoice) return t('Invoice status', 'Status factura');
        return hasInvoice === 'yes' || hasInvoice === '1' ? t('With invoice', 'Cu factura') : t('Without invoice', 'Fara factura');
    };

    const getStatusBadgeStyle = (color: string) => {
        return {
            backgroundColor: `${color}20`,
            color: color,
            borderColor: color,
        };
    };

    const getPaymentStatusBadgeStyle = (isPaid: boolean) => {
        if (isPaid) {
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

    return (
        <AdminLayout activeSidebarItem="orders">
            <div className={styles.ordersPage}>
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
                                placeholder={t('Searching all orders', 'Cautare toate comenzile')}
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
                            {/* Payment Status Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${paymentStatus ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowPaymentStatusDropdown(!showPaymentStatusDropdown);
                                        setShowOrderStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowCityDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {getPaymentStatusText()}
                                    <ChevronDown size={16} />
                                </button>
                                {showPaymentStatusDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.filterDropdownItems}>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${!paymentStatus ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = '';
                                                        setPaymentStatus(newStatus);
                                                        setShowPaymentStatusDropdown(false);
                                                        // Force update by clearing the filter
                                                        const params = getRequestParams({ payment_status: newStatus });
                                                        // Remove payment_status from params if empty
                                                        if (!params.payment_status || params.payment_status === '') {
                                                            delete params.payment_status;
                                                        }
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('All', 'Toate')}
                                                </button>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${paymentStatus === 'paid' || paymentStatus === '1' ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = 'paid';
                                                        setPaymentStatus(newStatus);
                                                        setShowPaymentStatusDropdown(false);
                                                        // Force update by clearing and setting the new value
                                                        const params = getRequestParams({ payment_status: newStatus });
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('Paid', 'Platit')}
                                                </button>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${paymentStatus === 'unpaid' || paymentStatus === '0' ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = 'unpaid';
                                                        setPaymentStatus(newStatus);
                                                        setShowPaymentStatusDropdown(false);
                                                        // Force update by clearing and setting the new value
                                                        const params = getRequestParams({ payment_status: newStatus });
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('Unpaid', 'Neplatit')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Order Status Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${orderStatus ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowOrderStatusDropdown(!showOrderStatusDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowCityDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {getOrderStatusText()}
                                    <ChevronDown size={16} />
                                </button>
                                {showOrderStatusDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.filterDropdownItems}>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${!orderStatus ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = '';
                                                        setOrderStatus(newStatus);
                                                        setShowOrderStatusDropdown(false);
                                                        const params = getRequestParams({ order_status: newStatus });
                                                        if (!params.order_status || params.order_status === '') {
                                                            delete params.order_status;
                                                        }
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('All', 'Toate')}
                                                </button>
                                                {orderStatuses.map((status) => (
                                                    <button
                                                        key={status.value}
                                                        className={`${styles.filterDropdownItem} ${orderStatus === status.value ? styles.filterDropdownItemActive : ''}`}
                                                        onClick={() => {
                                                            const newStatus = status.value;
                                                            setOrderStatus(newStatus);
                                                            setShowOrderStatusDropdown(false);
                                                            const params = getRequestParams({ order_status: newStatus });
                                                            router.get('/admin/orders', params, {
                                                                preserveState: true,
                                                                preserveScroll: true,
                                                            });
                                                        }}
                                                    >
                                                        {t(status.label, status.label)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Payment Method Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${paymentMethodId ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowPaymentMethodDropdown(!showPaymentMethodDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowOrderStatusDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowCityDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {getPaymentMethodName()}
                                    <ChevronDown size={16} />
                                </button>
                                {showPaymentMethodDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.filterDropdownItems}>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${!paymentMethodId ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newId = '';
                                                        setPaymentMethodId(newId);
                                                        setShowPaymentMethodDropdown(false);
                                                        applyFilters({ payment_method_id: newId });
                                                    }}
                                                >
                                                    {t('All payment methods', 'Toate metodele de plata')}
                                                </button>
                                                {paymentMethods.map((method) => (
                                                    <button
                                                        key={method.id}
                                                        className={`${styles.filterDropdownItem} ${paymentMethodId === method.id.toString() ? styles.filterDropdownItemActive : ''}`}
                                                        onClick={() => {
                                                            const newId = method.id.toString();
                                                            setPaymentMethodId(newId);
                                                            setShowPaymentMethodDropdown(false);
                                                            applyFilters({ payment_method_id: newId });
                                                        }}
                                                    >
                                                        {method.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Shipping Method Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${shippingMethodId ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowShippingMethodDropdown(!showShippingMethodDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowOrderStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowCityDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {getShippingMethodName()}
                                    <ChevronDown size={16} />
                                </button>
                                {showShippingMethodDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.filterDropdownItems}>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${!shippingMethodId ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newId = '';
                                                        setShippingMethodId(newId);
                                                        setShowShippingMethodDropdown(false);
                                                        applyFilters({ shipping_method_id: newId });
                                                    }}
                                                >
                                                    {t('All shipping methods', 'Toate metodele de livrare')}
                                                </button>
                                                {shippingMethods.map((method) => (
                                                    <button
                                                        key={method.id}
                                                        className={`${styles.filterDropdownItem} ${shippingMethodId === method.id.toString() ? styles.filterDropdownItemActive : ''}`}
                                                        onClick={() => {
                                                            const newId = method.id.toString();
                                                            setShippingMethodId(newId);
                                                            setShowShippingMethodDropdown(false);
                                                            applyFilters({ shipping_method_id: newId });
                                                        }}
                                                    >
                                                        {method.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Date Range Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${dateFrom || dateTo ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowDateDropdown(!showDateDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowCityDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {getDateRangeText()}
                                    <ChevronDown size={16} />
                                </button>
                                {showDateDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.rangeFilterContent}>
                                                <div className={styles.rangeInputGroup}>
                                                    <label className={styles.rangeLabel}>{t('From', 'De la')}</label>
                                                    <input
                                                        type="date"
                                                        value={dateFrom}
                                                        onChange={(e) => setDateFrom(e.target.value)}
                                                        className={styles.rangeInput}
                                                    />
                                                </div>
                                                <div className={styles.rangeInputGroup}>
                                                    <label className={styles.rangeLabel}>{t('To', 'Pana la')}</label>
                                                    <input
                                                        type="date"
                                                        value={dateTo}
                                                        onChange={(e) => setDateTo(e.target.value)}
                                                        className={styles.rangeInput}
                                                    />
                                                </div>
                                                <button
                                                    className={styles.applyRangeButton}
                                                    onClick={() => {
                                                        setShowDateDropdown(false);
                                                        applyFilters({ date_from: dateFrom, date_to: dateTo });
                                                    }}
                                                >
                                                    {t('Apply', 'Aplica')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Amount Range Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${amountMin || amountMax ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowAmountDropdown(!showAmountDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowCityDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {getAmountRangeText()}
                                    <ChevronDown size={16} />
                                </button>
                                {showAmountDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.rangeFilterContent}>
                                                <div className={styles.rangeInputGroup}>
                                                    <label className={styles.rangeLabel}>{t('Min', 'Min')} (RON)</label>
                                                    <input
                                                        type="number"
                                                        placeholder={t('Min', 'Min')}
                                                        value={amountMin}
                                                        onChange={(e) => setAmountMin(e.target.value)}
                                                        className={styles.rangeInput}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <div className={styles.rangeInputGroup}>
                                                    <label className={styles.rangeLabel}>{t('Max', 'Max')} (RON)</label>
                                                    <input
                                                        type="number"
                                                        placeholder={t('Max', 'Max')}
                                                        value={amountMax}
                                                        onChange={(e) => setAmountMax(e.target.value)}
                                                        className={styles.rangeInput}
                                                        min="0"
                                                        step="0.01"
                                                    />
                                                </div>
                                                <button
                                                    className={styles.applyRangeButton}
                                                    onClick={() => {
                                                        setShowAmountDropdown(false);
                                                        applyFilters({ amount_min: amountMin, amount_max: amountMax });
                                                    }}
                                                >
                                                    {t('Apply', 'Aplica')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* City Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${city ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowCityDropdown(!showCityDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowInvoiceDropdown(false);
                                    }}
                                >
                                    {city || t('City', 'Oras')}
                                    <ChevronDown size={16} />
                                </button>
                                {showCityDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.filterDropdownSearch}>
                                                <Search size={14} className={styles.filterDropdownSearchIcon} />
                                                <input
                                                    type="text"
                                                    placeholder={t('Search cities', 'Cauta orase')}
                                                    value={citySearch}
                                                    onChange={(e) => setCitySearch(e.target.value)}
                                                    className={styles.filterDropdownSearchInput}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                            </div>
                                            <div className={styles.filterDropdownItems}>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${!city ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newCity = '';
                                                        setCity(newCity);
                                                        setCitySearch('');
                                                        setShowCityDropdown(false);
                                                        applyFilters({ city: newCity });
                                                    }}
                                                >
                                                    {t('All cities', 'Toate orasele')}
                                                </button>
                                                {filteredCities.map((cityName) => (
                                                    <button
                                                        key={cityName}
                                                        className={`${styles.filterDropdownItem} ${city === cityName ? styles.filterDropdownItemActive : ''}`}
                                                        onClick={() => {
                                                            setCity(cityName);
                                                            setCitySearch('');
                                                            setShowCityDropdown(false);
                                                            applyFilters({ city: cityName });
                                                        }}
                                                    >
                                                        {cityName}
                                                    </button>
                                                ))}
                                                {filteredCities.length === 0 && citySearch && (
                                                    <div className={styles.filterDropdownNoResults}>
                                                        {t('No cities found', 'Nu s-au gasit orase')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Invoice Status Filter */}
                            <div className={styles.filterButtonWrapper} data-filter-wrapper>
                                <button
                                    className={`${styles.inlineFilterButton} ${hasInvoice ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowInvoiceDropdown(!showInvoiceDropdown);
                                        setShowPaymentStatusDropdown(false);
                                        setShowPaymentMethodDropdown(false);
                                        setShowShippingMethodDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowAmountDropdown(false);
                                        setShowCityDropdown(false);
                                    }}
                                >
                                    {getInvoiceStatusText()}
                                    <ChevronDown size={16} />
                                </button>
                                {showInvoiceDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.filterDropdownItems}>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${!hasInvoice ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = '';
                                                        setHasInvoice(newStatus);
                                                        setShowInvoiceDropdown(false);
                                                        const params = getRequestParams({ has_invoice: newStatus });
                                                        if (!params.has_invoice || params.has_invoice === '') {
                                                            delete params.has_invoice;
                                                        }
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('All', 'Toate')}
                                                </button>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${hasInvoice === 'yes' || hasInvoice === '1' ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = 'yes';
                                                        setHasInvoice(newStatus);
                                                        setShowInvoiceDropdown(false);
                                                        const params = getRequestParams({ has_invoice: newStatus });
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('With invoice', 'Cu factura')}
                                                </button>
                                                <button
                                                    className={`${styles.filterDropdownItem} ${hasInvoice === 'no' || hasInvoice === '0' ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        const newStatus = 'no';
                                                        setHasInvoice(newStatus);
                                                        setShowInvoiceDropdown(false);
                                                        const params = getRequestParams({ has_invoice: newStatus });
                                                        router.get('/admin/orders', params, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
                                                    }}
                                                >
                                                    {t('Without invoice', 'Fara factura')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Clear All Filters Button */}
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
                    <table className={styles.ordersTable}>
                        <thead>
                            <tr>
                                <th>{t('Order', '# Comanda')}</th>
                                <th>{t('Date & Time', 'Data')}</th>
                                <th>{t('Client & City', 'Client')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th>{t('Payment', 'Plata')}</th>
                                <th>{t('Logistics', 'Logistica')}</th>
                                <th>{t('Products', 'Produse')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className={styles.emptyState}>
                                        {t('No orders found', 'Nu s-au gasit comenzi')}
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order) => (
                                    <tr key={order.id}>
                                        <td className={styles.orderNumber}>
                                            <a
                                                href={`/admin/orders/${order.order_number}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.orderLink}
                                            >
                                                #{order.order_number}
                                            </a>
                                        </td>
                                        <td className={styles.dateTime}>
                                            {order.created_at_formatted}
                                        </td>
                                        <td className={styles.clientInfo}>
                                            <div className={styles.clientName}>{order.client_name}</div>
                                        </td>
                                        <td>
                                            <span
                                                className={styles.statusBadge}
                                                style={getStatusBadgeStyle(order.status.color)}
                                            >
                                                {t(order.status.name, order.status.name)}
                                            </span>
                                        </td>
                                        <td className={styles.paymentInfo}>
                                            <div className={styles.paymentMethod}>{order.payment.method}</div>
                                            <div className={styles.paymentTotal}>{formatPrice(order.payment.total)} RON</div>
                                            {order.payment.is_paid ? (
                                                <span className={styles.paymentStatusBadge} style={getPaymentStatusBadgeStyle(true)}>
                                                    {t('Paid', 'Platit')}
                                                </span>
                                            ) : (
                                                <span className={styles.paymentStatusBadge} style={getPaymentStatusBadgeStyle(false)}>
                                                    {t('Unpaid', 'Neplatit')}
                                                </span>
                                            )}
                                        </td>
                                        <td className={styles.logisticsInfo}>
                                            <div className={styles.shippingMethod}>
                                                {order.shipping.is_pickup ? (
                                                    <MapPin size={16} className={styles.shippingTypeIcon} title={t('Pickup Point', 'Punct de ridicare')} />
                                                ) : (
                                                    <Truck size={16} className={styles.shippingTypeIcon} title={t('Courier', 'Curier')} />
                                                )}
                                                <span>{order.shipping.method_name}</span>
                                            </div>
                                            {order.shipping.has_tracking ? (
                                                <div className={styles.trackingContainer}>
                                                    {order.shipping.is_pickup && (
                                                        <MapPin size={14} className={styles.lockerIcon} title={t('Pickup Point', 'Punct de ridicare')} />
                                                    )}
                                                    <a
                                                        href={`#tracking-${order.shipping.tracking_number}`}
                                                        className={styles.trackingLink}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            // TODO: Open tracking modal or navigate to tracking page
                                                        }}
                                                    >
                                                        {order.shipping.tracking_number}
                                                    </a>
                                                </div>
                                            ) : (
                                                <button className={styles.generateAWBButton}>
                                                    {t('Generate AWB', 'Genereaza AWB')} <span className={styles.soonBadge}>{t('Soon', 'In curand')}</span>
                                                </button>
                                            )}
                                        </td>
                                        <td className={styles.productsInfo}>
                                            <div className={styles.productsCount}>
                                                <Package size={14} />
                                                <span>{order.products_count} {t('products', 'produse')}</span>
                                            </div>
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
                            onClick={() => router.get('/admin/orders', {
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
                            onClick={() => router.get('/admin/orders', {
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
