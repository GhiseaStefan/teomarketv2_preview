import { usePage, router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslations } from '../../utils/translations';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import type { SharedData } from '../../types';
import { RotateCcw, Search, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import styles from './returns.module.css';

interface Return {
    id: number;
    return_number: string;
    order_id: number;
    order_number: string;
    order_date: string;
    order_date_formatted: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    status: string;
    return_reason: string;
    return_reason_details: string | null;
    is_product_opened: string;
    created_at: string;
    created_at_formatted: string;
    updated_at: string;
    updated_at_formatted: string;
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

interface ReturnsPageProps {
    returns?: Return[];
    pagination?: Pagination;
    filters?: Filters;
}

function ReturnsContent({ returns: pageReturns, pagination: pagePagination, filters: pageFilters }: ReturnsPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData & { returns?: Return[]; pagination?: Pagination; filters?: Filters }>();
    const returns = pageReturns || (page.props.returns as Return[]) || [];
    const pagination = pagePagination || (page.props.pagination as Pagination);
    const filters = pageFilters || (page.props.filters as Filters) || {};

    const [searchQuery, setSearchQuery] = useState(filters.search || '');

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

    const handlePerPageChange = (perPage: string | number) => {
        const perPageValue = perPage === 'all' ? 999999 : parseInt(perPage as string, 10);
        router.get('/settings/returns', {
            per_page: perPageValue,
            page: 1,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['returns', 'pagination', 'filters'],
        });
    };

    const handleStatusChange = (status: string) => {
        router.get('/settings/returns', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 10),
            page: 1,
            status,
            time_range: filters.time_range || '3months',
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['returns', 'pagination', 'filters'],
        });
    };

    const handleTimeRangeChange = (timeRange: string) => {
        router.get('/settings/returns', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 10),
            page: 1,
            status: filters.status || 'all',
            time_range: timeRange,
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['returns', 'pagination', 'filters'],
        });
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/settings/returns', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 10),
            page: 1,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: searchQuery,
        }, {
            preserveState: true,
            only: ['returns', 'pagination', 'filters'],
        });
    };

    const handleSearchClear = () => {
        setSearchQuery('');
        router.get('/settings/returns', {
            per_page: filters.per_page === 'all' ? 999999 : (filters.per_page || 10),
            page: 1,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: '',
        }, {
            preserveState: true,
            only: ['returns', 'pagination', 'filters'],
        });
    };

    const handlePageChange = (page: number) => {
        const currentPerPage = filters.per_page === 'all' ? 999999 : (filters.per_page || 10);
        router.get('/settings/returns', {
            per_page: currentPerPage,
            page,
            status: filters.status || 'all',
            time_range: filters.time_range || '3months',
            search: filters.search || '',
        }, {
            preserveState: true,
            only: ['returns', 'pagination'],
        });
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
                <div className={styles.returnsPage}>
                    <div className={styles.returnsCard}>
                        <div className={styles.pageHeader}>
                            <h1 className={styles.pageTitle}>{t('My Returns')}</h1>
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
                                            <option value="all">{t('All statuses')}</option>
                                            <option value="pending">{t('pending')}</option>
                                            <option value="received">{t('received')}</option>
                                            <option value="inspecting">{t('inspecting')}</option>
                                            <option value="rejected">{t('rejected')}</option>
                                            <option value="completed">{t('completed')}</option>
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
                                            type="text"
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            placeholder={t('Search by order number / product name')}
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
                                    </div>
                                </form>
                            </div>
                        </div>

                        {returns.length === 0 ? (
                            <div className={styles.emptyState}>
                                <RotateCcw size={48} className={styles.emptyIcon} />
                                <p className={styles.emptyText}>{t('No returns found')}</p>
                            </div>
                        ) : (
                            <>
                                <div className={styles.returnsList}>
                                    {returns.map((returnItem) => (
                                        <div key={returnItem.id} className={styles.returnCard}>
                                            <div className={styles.returnHeader}>
                                                <div className={styles.returnHeaderLeft}>
                                                    <div className={styles.returnIcon}>
                                                        <RotateCcw size={20} />
                                                    </div>
                                                    <div className={styles.returnInfo}>
                                                        <div className={styles.returnNumber}>
                                                            {returnItem.return_number}
                                                        </div>
                                                        <div className={styles.returnMeta}>
                                                            <span className={styles.returnDate}>
                                                                {t('Order number')}: {returnItem.order_number}
                                                            </span>
                                                            <span className={styles.returnDate}>
                                                                {t('Order date')}: {returnItem.order_date_formatted}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.returnStatus}>
                                                    <span
                                                        className={styles.statusBadge}
                                                        style={getStatusBadgeStyle(returnItem.status)}
                                                    >
                                                        {t(returnItem.status, returnItem.status)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={styles.returnContent}>
                                                <div className={styles.returnDetails}>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>{t('Product Name')}:</span>
                                                        <span className={styles.detailValue}>{returnItem.product_name}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>{t('Product SKU')}:</span>
                                                        <span className={styles.detailValue}>{returnItem.product_sku}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>{t('Quantity')}:</span>
                                                        <span className={styles.detailValue}>{returnItem.quantity}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>{t('Return Reason')}:</span>
                                                        <span className={styles.detailValue}>{t(returnItem.return_reason, returnItem.return_reason)}</span>
                                                    </div>
                                                    {returnItem.return_reason_details && (
                                                        <div className={styles.detailRow}>
                                                            <span className={styles.detailLabel}>{t('Reason Details')}:</span>
                                                            <span className={styles.detailValue}>{returnItem.return_reason_details}</span>
                                                        </div>
                                                    )}
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>{t('Product Opened')}:</span>
                                                        <span className={styles.detailValue}>{t(returnItem.is_product_opened === 'yes' ? 'Yes' : 'No')}</span>
                                                    </div>
                                                    <div className={styles.detailRow}>
                                                        <span className={styles.detailLabel}>{t('Submitted At')}:</span>
                                                        <span className={styles.detailValue}>{returnItem.created_at_formatted}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {renderPagination()}
                            </>
                        )}
                    </div>
                </div>
            </SettingsLayout>
        </Layout>
    );
}

export default function ReturnsPage(props: ReturnsPageProps) {
    return <ReturnsContent {...props} />;
}
