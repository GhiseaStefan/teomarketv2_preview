import { useState, useEffect } from 'react';
import { router } from '@inertiajs/react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { AdminLayout } from '../../components/admin';
import { useTranslations } from '../../utils/translations';
import { formatPrice } from '../../utils/formatPrice';
import { TrendingUp, TrendingDown, ShoppingCart, Users, Wallet, AlertTriangle, Package, FileText, ChevronRight } from 'lucide-react';
import styles from './dashboard.module.css';

interface KPIData {
    sales_today: {
        value: number;
        change: number;
        change_positive: boolean;
    };
    new_orders: {
        value: number;
        change: number;
        change_positive: boolean;
    };
    month_revenue: {
        value: number;
        change: number;
        change_positive: boolean;
    };
    new_customers: {
        value: number;
    };
    stock_alerts: {
        value: number;
    };
}

interface ChartDataPoint {
    date: string;
    day: string;
    fullDate?: string;
    total: number;
}

interface StatusDistributionPoint {
    name: string;
    value: number;
    color: string;
}

interface Order {
    id: number;
    order_number: string;
    customer_name: string;
    created_at: string;
    created_at_formatted: string;
    total: string;
    total_value: number;
    status: {
        value: string;
        name: string;
        color: string;
    };
}

interface StockAlert {
    id: number;
    name: string;
    sku: string | null;
    stock_quantity: number;
    formatted_stock: string;
    image_url: string | null;
}

interface DashboardStats {
    kpis: KPIData;
    sales_chart: ChartDataPoint[];
    status_distribution: StatusDistributionPoint[];
    latest_orders: Order[];
    stock_alerts: StockAlert[];
}

interface DashboardPageProps {
    initialStats?: DashboardStats;
}

export default function AdminDashboard({ initialStats }: DashboardPageProps) {
    const { t } = useTranslations();
    const [stats, setStats] = useState<DashboardStats | null>(initialStats || null);
    const [loading, setLoading] = useState(!initialStats);

    // Pluralization function for Romanian stock alerts
    const formatStockAlert = (quantity: number): string => {
        if (quantity === 1) {
            return `${quantity} ${t('piece', 'bucată')} ${t('remaining', 'rămasă')}`;
        }
        return `${quantity} ${t('pieces', 'bucăți')} ${t('remaining', 'rămase')}`;
    };

    // Format chart X-axis labels (already formatted by backend as "01 Ian")
    const formatChartLabel = (day: string): string => {
        // Backend already provides format like "01 Ian", just return as is
        return day;
    };

    // Calculate tick interval based on data length to avoid overcrowding
    const getTickInterval = (dataLength: number): number => {
        if (dataLength <= 7) return 0; // Show all labels for a week
        if (dataLength <= 14) return 1; // Show every other day for 2 weeks
        if (dataLength <= 21) return 2; // Show every 3rd day for 3 weeks
        return 3; // Show every 4th day for a month
    };

    useEffect(() => {
        if (!initialStats) {
            // Fetch stats on mount if not provided
            fetchStats();
        }
    }, []);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const response = await fetch('/admin/dashboard-stats', {
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleKPIClick = (type: string) => {
        switch (type) {
            case 'new_orders':
                router.get('/admin/orders', { filter: 'new' });
                break;
            case 'stock_alerts':
                // Navigate to products page with filter for products with stock <= 5
                router.get('/admin/products', { stock_max: '5' });
                break;
            case 'new_customers':
                // Navigate to customers page
                router.get('/admin/customers');
                break;
            default:
                // Other KPIs can navigate to orders page
                router.get('/admin/orders');
                break;
        }
    };

    const handleOrderClick = (orderNumber: string) => {
        router.get(`/admin/orders/${orderNumber}/edit`);
    };

    return (
        <AdminLayout activeSidebarItem="home">
            <div className={styles.dashboard}>
                <h1 className={styles.title}>{t('Admin Dashboard', 'Panou Admin')}</h1>

                {/* KPI Cards */}
                <div className={styles.kpiGrid}>
                    {/* Sales Today */}
                    <div
                        className={styles.kpiCard}
                        onClick={() => handleKPIClick('sales_today')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleKPIClick('sales_today');
                            }
                        }}
                    >
                        {loading ? (
                            <div className={styles.skeleton} />
                        ) : (
                            <>
                                <div className={styles.kpiHeader}>
                                    <FileText size={20} className={styles.kpiIcon} />
                                    <span className={styles.kpiLabel}>
                                        {t('Sales Today', 'Vanzari Azi')}
                                    </span>
                                </div>
                                <div className={styles.kpiValue}>
                                    {stats?.kpis.sales_today.value
                                        ? `${formatPrice(stats.kpis.sales_today.value)} RON`
                                        : '0,00 RON'}
                                </div>
                                {stats?.kpis.sales_today.change !== undefined && (
                                    <div
                                        className={`${styles.kpiChange} ${stats.kpis.sales_today.change_positive
                                            ? styles.positive
                                            : styles.negative
                                            }`}
                                    >
                                        {stats.kpis.sales_today.change_positive ? (
                                            <TrendingUp size={14} />
                                        ) : (
                                            <TrendingDown size={14} />
                                        )}
                                        <span>
                                            {Math.abs(stats.kpis.sales_today.change).toFixed(1)}%{' '}
                                            {t('vs. Yesterday', 'vs. Ieri')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* New Orders */}
                    <div
                        className={styles.kpiCard}
                        onClick={() => handleKPIClick('new_orders')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleKPIClick('new_orders');
                            }
                        }}
                    >
                        {loading ? (
                            <div className={styles.skeleton} />
                        ) : (
                            <>
                                <div className={styles.kpiHeader}>
                                    <ShoppingCart size={20} className={styles.kpiIcon} />
                                    <span className={styles.kpiLabel}>
                                        {t('New Orders', 'Comenzi Noi')}
                                    </span>
                                </div>
                                <div className={styles.kpiValue}>
                                    {stats?.kpis.new_orders.value ?? 0}
                                </div>
                                {stats?.kpis.new_orders.change !== undefined && (
                                    <div
                                        className={`${styles.kpiChange} ${stats.kpis.new_orders.change_positive
                                            ? styles.positive
                                            : styles.negative
                                            }`}
                                    >
                                        {stats.kpis.new_orders.change_positive ? (
                                            <TrendingUp size={14} />
                                        ) : (
                                            <TrendingDown size={14} />
                                        )}
                                        <span>
                                            {Math.abs(stats.kpis.new_orders.change).toFixed(1)}%{' '}
                                            {t('vs. Yesterday', 'vs. ieri')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Month Revenue */}
                    <div
                        className={styles.kpiCard}
                        onClick={() => handleKPIClick('month_revenue')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleKPIClick('month_revenue');
                            }
                        }}
                    >
                        {loading ? (
                            <div className={styles.skeleton} />
                        ) : (
                            <>
                                <div className={styles.kpiHeader}>
                                    <Wallet size={20} className={styles.kpiIcon} />
                                    <span className={styles.kpiLabel}>
                                        {t('This Month Revenue', 'Venituri Luna Asta')}
                                    </span>
                                </div>
                                <div className={styles.kpiValue}>
                                    {stats?.kpis.month_revenue.value
                                        ? `${formatPrice(stats.kpis.month_revenue.value)} RON`
                                        : '0,00 RON'}
                                </div>
                                {stats?.kpis.month_revenue.change !== undefined && (
                                    <div
                                        className={`${styles.kpiChange} ${stats.kpis.month_revenue.change_positive
                                            ? styles.positive
                                            : styles.negative
                                            }`}
                                    >
                                        {stats.kpis.month_revenue.change_positive ? (
                                            <TrendingUp size={14} />
                                        ) : (
                                            <TrendingDown size={14} />
                                        )}
                                        <span>
                                            {Math.abs(stats.kpis.month_revenue.change).toFixed(1)}%{' '}
                                            {t('vs. Last Month', 'vs. luna trecută')}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* New Customers */}
                    <div
                        className={styles.kpiCard}
                        onClick={() => handleKPIClick('new_customers')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleKPIClick('new_customers');
                            }
                        }}
                    >
                        {loading ? (
                            <div className={styles.skeleton} />
                        ) : (
                            <>
                                <div className={styles.kpiHeader}>
                                    <Users size={20} className={styles.kpiIcon} />
                                    <span className={styles.kpiLabel}>
                                        {t('New Customers', 'Clienti Noi')}
                                    </span>
                                </div>
                                <div className={styles.kpiValue}>
                                    {stats?.kpis.new_customers.value ?? 0}
                                </div>
                                <div className={styles.kpiSubtext}>
                                    {t('Last 30 days', 'Ultimele 30 zile')}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Stock Alerts */}
                    <div
                        className={styles.kpiCard}
                        onClick={() => handleKPIClick('stock_alerts')}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                handleKPIClick('stock_alerts');
                            }
                        }}
                    >
                        {loading ? (
                            <div className={styles.skeleton} />
                        ) : (
                            <>
                                <div className={styles.kpiHeader}>
                                    <AlertTriangle size={20} className={styles.kpiIcon} />
                                    <span className={styles.kpiLabel}>
                                        {t('Stock Alerts', 'Alerte Stoc')}
                                    </span>
                                </div>
                                <div className={styles.kpiValue}>
                                    {stats?.kpis.stock_alerts.value ?? 0}
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Charts Section */}
                <div className={styles.chartsGrid}>
                    {/* Sales Chart */}
                    <div className={styles.chartSection}>
                        <h2 className={styles.sectionTitle}>
                            {t('Sales Evolution', 'Evolutia Vanzarilor')} - {t('Last 30 Days', 'Ultimele 30 Zile')}
                        </h2>
                        {loading ? (
                            <div className={styles.chartSkeleton} />
                        ) : (
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart
                                        data={stats?.sales_chart || []}
                                        margin={{
                                            top: 5,
                                            right: 10,
                                            left: 0,
                                            bottom: stats?.sales_chart && stats.sales_chart.length > 14 ? 30 : 10
                                        }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="3 3"
                                            stroke="var(--color-border)"
                                            vertical={false}
                                            strokeOpacity={0.3}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            stroke="var(--color-text-secondary)"
                                            style={{ fontSize: '12px' }}
                                            tick={{ fill: 'var(--color-text-secondary)' }}
                                            tickFormatter={formatChartLabel}
                                            interval={getTickInterval(stats?.sales_chart?.length || 0)}
                                            angle={stats?.sales_chart && stats.sales_chart.length > 14 ? -45 : 0}
                                            textAnchor={stats?.sales_chart && stats.sales_chart.length > 14 ? 'end' : 'middle'}
                                            height={stats?.sales_chart && stats.sales_chart.length > 14 ? 60 : 30}
                                        />
                                        <YAxis
                                            stroke="var(--color-text-secondary)"
                                            style={{ fontSize: '11px' }}
                                            tickFormatter={(value) => `${formatPrice(value)}`}
                                            width={70}
                                            tick={{ fill: 'var(--color-text-secondary)', fontSize: '11px' }}
                                            label={{
                                                value: 'RON',
                                                angle: -90,
                                                position: 'left',
                                                style: {
                                                    textAnchor: 'middle',
                                                    fill: 'var(--color-text-secondary)',
                                                    fontSize: '11px',
                                                },
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--color-background)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                            }}
                                            labelFormatter={(label, payload) => {
                                                if (payload && payload.length > 0) {
                                                    const dataPoint = payload[0].payload as ChartDataPoint;
                                                    // Use fullDate if available (e.g., "7 Ianuarie"), otherwise format from date
                                                    if (dataPoint.fullDate) {
                                                        return dataPoint.fullDate;
                                                    }
                                                    // Fallback: format the date nicely
                                                    if (dataPoint.date) {
                                                        const date = new Date(dataPoint.date);
                                                        const monthNames = [
                                                            'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
                                                            'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
                                                        ];
                                                        return `${date.getDate()} ${monthNames[date.getMonth()]}`;
                                                    }
                                                }
                                                return label;
                                            }}
                                            formatter={(value: number) => [
                                                `${formatPrice(value)} RON`,
                                                t('Sales', 'Vanzari'),
                                            ]}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="total"
                                            stroke="var(--color-admin-600)"
                                            strokeWidth={2}
                                            dot={{ fill: 'var(--color-admin-600)', r: 4 }}
                                            activeDot={{ r: 6 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>

                    {/* Status Distribution Chart */}
                    <div className={styles.chartSection}>
                        <h2 className={styles.sectionTitle}>
                            {t('Status Distribution', 'Distribuția Statusurilor')}
                        </h2>
                        {loading ? (
                            <div className={styles.chartSkeleton} />
                        ) : (
                            <div className={styles.chartContainer}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={stats?.status_distribution || []}
                                            cx="40%"
                                            cy="50%"
                                            labelLine={false}
                                            outerRadius={80}
                                            innerRadius={50}
                                            fill="#8884d8"
                                            dataKey="value"
                                        >
                                            {(stats?.status_distribution || []).map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: 'var(--color-background)',
                                                border: '1px solid var(--color-border)',
                                                borderRadius: '8px',
                                                padding: '8px 12px',
                                                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                            }}
                                            formatter={(value: number, name: string, props: any) => {
                                                const total = (stats?.status_distribution || []).reduce((sum, item) => sum + item.value, 0);
                                                const percent = total > 0 ? ((value / total) * 100).toFixed(1) : '0';
                                                const statusName = t(props.payload.name, props.payload.name);
                                                return [`${value} ${t('Orders', 'Comenzi')} (${percent}%)`, statusName];
                                            }}
                                        />
                                        <Legend
                                            verticalAlign="middle"
                                            align="right"
                                            layout="vertical"
                                            iconType="circle"
                                            wrapperStyle={{
                                                fontSize: '12px',
                                                paddingLeft: '20px',
                                            }}
                                            formatter={(value, entry: any) => {
                                                const total = (stats?.status_distribution || []).reduce((sum, item) => sum + item.value, 0);
                                                const item = (stats?.status_distribution || []).find(item => item.name === value);
                                                const percent = total > 0 && item ? ((item.value / total) * 100).toFixed(1) : '0';
                                                return `${t(value, value)} (${percent}%)`;
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bottom Section: Orders and Alerts */}
                <div className={styles.bottomSection}>
                    {/* Latest Orders */}
                    <div className={styles.ordersSection}>
                        <h2 className={styles.sectionTitle}>
                            {t('Latest Orders', 'Ultimele Comenzi')}
                        </h2>
                        {loading ? (
                            <div className={styles.tableSkeleton}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={styles.skeletonRow} />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.ordersTable}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th>{t('Order ID', 'ID Comanda')}</th>
                                            <th>{t('Customer', 'Client')}</th>
                                            <th>{t('Date', 'Data')}</th>
                                            <th>{t('Total', 'Total')}</th>
                                            <th>{t('Status', 'Status')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats?.latest_orders.length ? (
                                            stats.latest_orders.map((order) => (
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
                                                    <td>{order.customer_name}</td>
                                                    <td>{order.created_at_formatted}</td>
                                                    <td>
                                                        {formatPrice(order.total_value)} RON
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={styles.statusBadge}
                                                            style={{
                                                                backgroundColor: order.status.color + '20',
                                                                color: order.status.color,
                                                            }}
                                                        >
                                                            {t(order.status.name, order.status.name)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className={styles.emptyState}>
                                                    {t('No orders found', 'Nu exista comenzi')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Stock Alerts */}
                    <div className={styles.alertsSection}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                <AlertTriangle size={20} />
                                {t('Stock Alerts', 'Alerte Stoc')}
                            </h2>
                            {stats?.kpis.stock_alerts.value && stats.kpis.stock_alerts.value > 0 && (
                                <button
                                    className={styles.viewAllLink}
                                    onClick={() => router.get('/admin/products', { stock_max: '5' })}
                                >
                                    {t('View all', 'Vezi toate')} ({stats.kpis.stock_alerts.value})
                                    <ChevronRight size={14} />
                                </button>
                            )}
                        </div>
                        {loading ? (
                            <div className={styles.alertsSkeleton}>
                                {[...Array(5)].map((_, i) => (
                                    <div key={i} className={styles.skeletonAlert} />
                                ))}
                            </div>
                        ) : (
                            <div className={styles.alertsList}>
                                {stats?.stock_alerts.length ? (
                                    stats.stock_alerts.map((alert) => (
                                        <div
                                            key={alert.id}
                                            className={styles.alertItem}
                                            onClick={() =>
                                                router.get(`/admin/products/${alert.id}`)
                                            }
                                        >
                                            {alert.image_url ? (
                                                <img
                                                    src={alert.image_url}
                                                    alt={alert.name}
                                                    className={styles.alertImage}
                                                />
                                            ) : (
                                                <Package size={16} className={styles.alertIcon} />
                                            )}
                                            <div className={styles.alertContent}>
                                                <div className={styles.alertName}>{alert.name}</div>
                                                <div className={styles.alertStock}>
                                                    {t('Only', 'Doar')} {formatStockAlert(alert.stock_quantity)}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        {t('No stock alerts', 'Nu exista alerte de stoc')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
