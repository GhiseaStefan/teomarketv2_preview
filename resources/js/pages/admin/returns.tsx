import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Search, Menu, X, ChevronDown, Package } from 'lucide-react';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import styles from './returns.module.css';

interface Return {
    id: number;
    return_number: string;
    order_number: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    status: string;
    customer_name: string;
    email: string;
    created_at: string;
    created_at_formatted: string;
}

interface ReturnsPageProps {
    returns: Return[];
    pagination: {
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    filters: {
        status: string;
        order_number: string;
        date_from: string;
        date_to: string;
        email: string;
        search: string;
    };
    statuses: string[];
}

export default function AdminReturns({ 
    returns, 
    pagination, 
    filters: initialFilters, 
    statuses 
}: ReturnsPageProps) {
    const { t } = useTranslations();
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');
    const [showSearchAndFilters, setShowSearchAndFilters] = useState(false);
    const [status, setStatus] = useState(initialFilters.status || '');
    const [orderNumber, setOrderNumber] = useState(initialFilters.order_number || '');
    const [dateFrom, setDateFrom] = useState(initialFilters.date_from || '');
    const [dateTo, setDateTo] = useState(initialFilters.date_to || '');
    const [email, setEmail] = useState(initialFilters.email || '');
    
    // Dropdown states
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [showOrderNumberDropdown, setShowOrderNumberDropdown] = useState(false);
    const [showDateDropdown, setShowDateDropdown] = useState(false);
    const [showEmailDropdown, setShowEmailDropdown] = useState(false);

    const getRequestParams = (overrideParams: Record<string, any> = {}) => {
        const params: Record<string, any> = {};
        
        const currentStatus = overrideParams.status !== undefined ? overrideParams.status : status;
        const currentOrderNumber = overrideParams.order_number !== undefined ? overrideParams.order_number : orderNumber;
        const currentDateFrom = overrideParams.date_from !== undefined ? overrideParams.date_from : dateFrom;
        const currentDateTo = overrideParams.date_to !== undefined ? overrideParams.date_to : dateTo;
        const currentEmail = overrideParams.email !== undefined ? overrideParams.email : email;
        const currentSearch = overrideParams.search !== undefined ? overrideParams.search : searchQuery;
        
        if (currentStatus) params.status = currentStatus;
        if (currentOrderNumber) params.order_number = currentOrderNumber;
        if (currentDateFrom) params.date_from = currentDateFrom;
        if (currentDateTo) params.date_to = currentDateTo;
        if (currentEmail) params.email = currentEmail;
        if (currentSearch) params.search = currentSearch;
        
        return params;
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilters();
    };

    const applyFilters = (newParams?: Record<string, any>) => {
        const params = getRequestParams(newParams || {});
        router.get('/admin/returns', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearSearch = () => {
        setSearchQuery('');
        router.get('/admin/returns', getRequestParams({ search: '' }), {
            preserveState: true,
            preserveScroll: true,
        });
    };
    
    const clearFilters = () => {
        setStatus('');
        setOrderNumber('');
        setDateFrom('');
        setDateTo('');
        setEmail('');
        setSearchQuery('');
        
        router.get('/admin/returns', {}, {
            preserveState: true,
            preserveScroll: true,
        });
    };
    
    const hasActiveFilters = status || orderNumber || dateFrom || dateTo || email || searchQuery;

    const getStatusText = () => {
        if (!status) return t('Status', 'Status');
        return t(status, status);
    };

    const getStatusBadgeStyle = (statusValue: string) => {
        const colors: Record<string, { bg: string; color: string; border: string }> = {
            pending: { bg: '#fef3c720', color: '#f59e0b', border: '#f59e0b' },
            received: { bg: '#f3e8ff20', color: '#8b5cf6', border: '#8b5cf6' },
            inspecting: { bg: '#fce7f320', color: '#ec4899', border: '#ec4899' },
            rejected: { bg: '#ef444420', color: '#ef4444', border: '#ef4444' },
            completed: { bg: '#6b728020', color: '#6b7280', border: '#6b7280' },
        };
        
        const colorScheme = colors[statusValue] || colors.pending;
        return {
            backgroundColor: colorScheme.bg,
            color: colorScheme.color,
            borderColor: colorScheme.border,
        };
    };

    return (
        <AdminLayout activeSidebarItem="returns">
            <div className={styles.returnsPage}>
                {/* Top Filters Row */}
                <div className={styles.topFiltersRow}>
                    <h1 className={styles.pageTitle}>{t('Returns', 'Returnuri')}</h1>
                    <button
                        type="button"
                        className={styles.searchFilterToggleButton}
                        onClick={() => setShowSearchAndFilters(!showSearchAndFilters)}
                    >
                        <Search size={18} />
                        <Menu size={18} />
                    </button>
                </div>

                {/* Search Bar */}
                {showSearchAndFilters && (
                    <div className={styles.searchBarContainer}>
                        <form onSubmit={handleSearch} className={styles.searchBarForm}>
                            <Search size={16} className={styles.searchBarIcon} />
                            <input
                                type="text"
                                placeholder={t('Search returns', 'Cautare returnuri')}
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

                {/* Advanced Filter Buttons Row */}
                {showSearchAndFilters && (
                    <div className={styles.filtersRow}>
                        <div className={styles.inlineFilters}>
                            {/* Status Filter */}
                            <div className={styles.filterButtonWrapper}>
                                <button
                                    className={`${styles.inlineFilterButton} ${status ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowStatusDropdown(!showStatusDropdown);
                                        setShowOrderNumberDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowEmailDropdown(false);
                                    }}
                                >
                                    {getStatusText()}
                                    <ChevronDown size={16} />
                                </button>
                                {showStatusDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <button
                                                className={`${styles.filterDropdownItem} ${!status ? styles.filterDropdownItemActive : ''}`}
                                                onClick={() => {
                                                    setStatus('');
                                                    setShowStatusDropdown(false);
                                                    applyFilters({ status: '' });
                                                }}
                                            >
                                                {t('All statuses', 'Toate statusurile')}
                                            </button>
                                            {statuses.map((statusValue) => (
                                                <button
                                                    key={statusValue}
                                                    className={`${styles.filterDropdownItem} ${status === statusValue ? styles.filterDropdownItemActive : ''}`}
                                                    onClick={() => {
                                                        setStatus(statusValue);
                                                        setShowStatusDropdown(false);
                                                        applyFilters({ status: statusValue });
                                                    }}
                                                >
                                                    {t(statusValue, statusValue)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Order Number Filter */}
                            <div className={styles.filterButtonWrapper}>
                                <button
                                    className={`${styles.inlineFilterButton} ${orderNumber ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowOrderNumberDropdown(!showOrderNumberDropdown);
                                        setShowStatusDropdown(false);
                                        setShowDateDropdown(false);
                                        setShowEmailDropdown(false);
                                    }}
                                >
                                    {orderNumber || t('Order number', 'Numar comanda')}
                                    <ChevronDown size={16} />
                                </button>
                                {showOrderNumberDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <input
                                                type="text"
                                                placeholder={t('Order number', 'Numar comanda')}
                                                value={orderNumber}
                                                onChange={(e) => setOrderNumber(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        setShowOrderNumberDropdown(false);
                                                        applyFilters({ order_number: orderNumber });
                                                    }
                                                }}
                                                className={styles.filterInput}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Date Range Filter */}
                            <div className={styles.filterButtonWrapper}>
                                <button
                                    className={`${styles.inlineFilterButton} ${dateFrom || dateTo ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowDateDropdown(!showDateDropdown);
                                        setShowStatusDropdown(false);
                                        setShowOrderNumberDropdown(false);
                                        setShowEmailDropdown(false);
                                    }}
                                >
                                    {dateFrom && dateTo ? `${dateFrom} - ${dateTo}` : dateFrom ? `${t('From', 'De la')}: ${dateFrom}` : dateTo ? `${t('To', 'Pana la')}: ${dateTo}` : t('Date range', 'Interval data')}
                                    <ChevronDown size={16} />
                                </button>
                                {showDateDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <div className={styles.dateInputs}>
                                                <input
                                                    type="date"
                                                    placeholder={t('From', 'De la')}
                                                    value={dateFrom}
                                                    onChange={(e) => setDateFrom(e.target.value)}
                                                    className={styles.filterInput}
                                                />
                                                <input
                                                    type="date"
                                                    placeholder={t('To', 'Pana la')}
                                                    value={dateTo}
                                                    onChange={(e) => setDateTo(e.target.value)}
                                                    className={styles.filterInput}
                                                />
                                                <button
                                                    className={styles.filterApplyButton}
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

                            {/* Email Filter */}
                            <div className={styles.filterButtonWrapper}>
                                <button
                                    className={`${styles.inlineFilterButton} ${email ? styles.inlineFilterButtonActive : ''}`}
                                    onClick={() => {
                                        setShowEmailDropdown(!showEmailDropdown);
                                        setShowStatusDropdown(false);
                                        setShowOrderNumberDropdown(false);
                                        setShowDateDropdown(false);
                                    }}
                                >
                                    {email || t('Email', 'Email')}
                                    <ChevronDown size={16} />
                                </button>
                                {showEmailDropdown && (
                                    <div className={styles.filterDropdown}>
                                        <div className={styles.filterDropdownContent}>
                                            <input
                                                type="email"
                                                placeholder={t('Email', 'Email')}
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        e.preventDefault();
                                                        setShowEmailDropdown(false);
                                                        applyFilters({ email: email });
                                                    }
                                                }}
                                                className={styles.filterInput}
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {hasActiveFilters && (
                                <button
                                    className={styles.clearFiltersButton}
                                    onClick={clearFilters}
                                >
                                    {t('Clear filters', 'Sterge filtre')}
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className={styles.tableContainer}>
                    <table className={styles.returnsTable}>
                        <thead>
                            <tr>
                                <th className={styles.idHeader}>{t('Return Number', 'Numar Retur')}</th>
                                <th>{t('Order', 'Comanda')}</th>
                                <th>{t('Product', 'Produs')}</th>
                                <th>{t('Status', 'Status')}</th>
                                <th>{t('Customer', 'Client')}</th>
                                <th>{t('Date', 'Data')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returns.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        {t('No returns found', 'Nu s-au gasit returnuri')}
                                    </td>
                                </tr>
                            ) : (
                                returns.map((returnItem) => (
                                    <tr key={returnItem.id}>
                                        <td className={styles.returnId}>
                                            <button
                                                onClick={() => router.visit(`/admin/returns/${returnItem.id}`)}
                                                className={styles.orderNumberLink}
                                            >
                                                #{returnItem.return_number}
                                            </button>
                                        </td>
                                        <td className={styles.orderNumber}>
                                            {returnItem.order_number}
                                        </td>
                                        <td className={styles.productInfo}>
                                            <div className={styles.productName}>{returnItem.product_name}</div>
                                            <div className={styles.productSku}>{t('SKU')}: {returnItem.product_sku}</div>
                                            <div className={styles.productQuantity}>{t('Quantity')}: {returnItem.quantity}</div>
                                        </td>
                                        <td className={styles.statusCell}>
                                            <span
                                                className={styles.statusBadge}
                                                style={getStatusBadgeStyle(returnItem.status)}
                                            >
                                                {t(returnItem.status, returnItem.status)}
                                            </span>
                                        </td>
                                        <td className={styles.customerInfo}>
                                            <div className={styles.customerName}>{returnItem.customer_name}</div>
                                            <div className={styles.customerEmail}>{returnItem.email}</div>
                                        </td>
                                        <td className={styles.dateTime}>
                                            {returnItem.created_at_formatted}
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
                            onClick={() => router.get('/admin/returns', {
                                ...getRequestParams(),
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
                            onClick={() => router.get('/admin/returns', {
                                ...getRequestParams(),
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
