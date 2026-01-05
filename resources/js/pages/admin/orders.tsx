import { useState } from 'react';
import { router } from '@inertiajs/react';
import { Search, Filter, Package, Truck, MapPin } from 'lucide-react';
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
    };
}

export default function AdminOrders({ orders, pagination, filters: initialFilters }: OrdersPageProps) {
    const { t } = useTranslations();
    const [activeFilter, setActiveFilter] = useState(initialFilters.filter || 'all');
    const [searchQuery, setSearchQuery] = useState(initialFilters.search || '');

    const filters = [
        { id: 'all', label: t('All', 'Toate') },
        { id: 'new', label: t('New', 'Noi') },
        { id: 'in_delivery', label: t('In Delivery', 'In Livrare') },
        { id: 'completed', label: t('Completed', 'Finalizate') },
        { id: 'problems', label: t('Problems', 'Probleme') },
    ];

    const handleFilterChange = (filterId: string) => {
        setActiveFilter(filterId);
        router.get('/admin/orders', { filter: filterId, search: searchQuery }, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/admin/orders', { filter: activeFilter, search: searchQuery }, {
            preserveState: true,
            preserveScroll: true,
        });
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
