import { usePage, router, Link } from '@inertiajs/react';
import { useTranslations } from '../../../utils/translations';
import Layout from '../../../components/layout/Layout';
import SettingsLayout from '../../../components/settings/SettingsLayout';
import type { SharedData, Currency } from '../../../types';
import { CreditCard, ChevronRight, Truck, FileText, ShoppingBag } from 'lucide-react';
import { PriceDisplay } from '../../../components/PriceDisplay/PriceDisplay';
import { formatPriceWithCurrency } from '../../../utils/priceFormatter';
import { Button } from '../../../components/ui/Button';
import styles from './order.module.css';

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
    phone?: string | null;
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

interface ShippingMethod {
    id: number;
    name: string;
    code: string;
}

interface Shipping {
    id: number;
    title: string | null;
    pickup_point_id: string | null;
    tracking_number: string | null;
    shipping_cost_excl_vat?: number;
    shipping_cost_incl_vat?: number;
    shipping_cost_ron_excl_vat: number;
    shipping_cost_ron_incl_vat: number;
    shipping_method: ShippingMethod | null;
}

interface Order {
    id: number;
    order_number: string;
    invoice_series?: string | null;
    invoice_number?: string | null;
    currency: string;
    exchange_rate?: number | null;
    vat_rate_applied?: number | null;
    is_vat_exempt: boolean;
    total_excl_vat: number;
    total_incl_vat: number;
    total_ron_excl_vat: number;
    total_ron_incl_vat: number;
    created_at: string;
    cancelled_at?: string | null;
    order_status: OrderStatus | null;
    payment_method: PaymentMethod | null;
    billing_address: OrderAddress | null;
    shipping_address: OrderAddress | null;
    shipping: Shipping | null;
    products: OrderProduct[];
}

interface ShopInfo {
    company_name: string;
    shop_name: string;
}

interface OrderPageProps {
    order?: Order;
    shop_info?: ShopInfo | null;
}

function OrderContent({ order: pageOrder, shop_info: pageShopInfo }: OrderPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData & { order?: Order; shop_info?: ShopInfo | null }>();
    const order = pageOrder || (page.props.order as Order);
    const shopInfo = pageShopInfo || (page.props.shop_info as ShopInfo | null | undefined);
    const currencies = (page.props.currencies as Currency[] | undefined) || [];
    const currentCurrency = currencies.find(c => c.code === 'RON') || currencies[0] || { code: 'RON', symbol_right: ' RON', symbol_left: null };

    if (!order) {
        return (
            <Layout activeSidebarItem="me">
                <SettingsLayout>
                    <div className={styles.orderPage}>
                        <div className={styles.orderCard}>
                            <p>{t('No orders found')}</p>
                        </div>
                    </div>
                </SettingsLayout>
            </Layout>
        );
    }

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

    const formatDateShort = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ro-RO', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
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

    // Helper function to get currency object for the order
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

    const getShippingStatusText = () => {
        // Use shipping title if available, otherwise use order status
        if (order.shipping?.title) {
            return order.shipping.title;
        }
        if (order.order_status) {
            return order.order_status.name;
        }
        return t('Order in progress');
    };

    const getDeliveryDate = () => {
        // If we have shipping info with tracking, we can estimate delivery date
        // Otherwise return null to hide the field
        if (order.shipping?.tracking_number || order.order_status) {
            // Estimate delivery date based on order status or shipping method
            // This is a fallback - ideally delivery_date should come from backend
            const orderDate = new Date(order.created_at);
            // Add days based on shipping method or status
            if (order.shipping?.shipping_method?.code === 'pickup' || order.order_status?.name?.toLowerCase().includes('ridicat')) {
                orderDate.setDate(orderDate.getDate() + 1); // Pickup usually next day
            } else {
                orderDate.setDate(orderDate.getDate() + 3); // Standard delivery 3 days
            }
            return formatDateShort(orderDate.toISOString());
        }
        return null;
    };


    return (
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                <div className={styles.orderPage}>
                    {/* Breadcrumb */}
                    <nav className={styles.breadcrumb}>
                        <a
                            href="/settings/history/orders"
                            onClick={(e) => {
                                e.preventDefault();
                                router.get('/settings/history/orders');
                            }}
                        >
                            {t('My Orders')}
                        </a>
                        <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                        <span className={styles.breadcrumbCurrent}>{t('Order Details')}</span>
                    </nav>

                    <div className={styles.orderCard}>
                        {/* Main Order Card */}
                        <div className={styles.mainOrderCard}>
                            {/* Top Bar */}
                            <div className={styles.cardTopBar}>
                                <div className={styles.topBarLeft}>
                                    <ShoppingBag size={20} className={styles.orderNumberIcon} />
                                    <div className={styles.orderNumber}>
                                        {t('Order')} {order.order_number}
                                    </div>
                                </div>
                                <div className={styles.topBarRight}>
                                    <div className={styles.deliveryDate}>
                                        <span className={styles.deliveryDateLabel}>{t('Placed on')}:</span>
                                        <span className={styles.deliveryDateValue}>{formatDate(order.created_at)}</span>
                                    </div>
                                    {getDeliveryDate() && (
                                        <div className={styles.deliveryDate}>
                                            <span className={styles.deliveryDateLabel}>{t('Delivery date')}:</span>
                                            <span className={styles.deliveryDateValue}>{getDeliveryDate()}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Three Columns */}
                            <div className={styles.infoColumns}>
                                {/* Delivery Method Column */}
                                <div className={styles.infoColumn}>
                                    <h3 className={styles.columnTitle}>
                                        <Truck size={16} />
                                        {t('Delivery method')}
                                    </h3>
                                    <div className={styles.columnContent}>
                                        {order.shipping?.shipping_method ? (
                                            <>
                                                {/* Modalitatea */}
                                                <p className={styles.deliveryMethodName}>
                                                    {order.shipping.pickup_point_id
                                                        ? `${t('Personal pickup from')} ${order.shipping.pickup_point_id}`
                                                        : `${t('Courier')}: ${order.shipping.shipping_method.name}`
                                                    }
                                                </p>

                                                {/* Cost livrare */}
                                                {order.shipping && (order.shipping.shipping_cost_excl_vat !== null && order.shipping.shipping_cost_excl_vat !== undefined) && (
                                                    <p className={styles.infoLine}>
                                                        <strong>{t('Shipping Cost')}:</strong> <PriceDisplay price={formatPriceInOrderCurrency(order.shipping.shipping_cost_excl_vat || 0, getOrderCurrency(order.currency))} />
                                                    </p>
                                                )}

                                                {/* Pentru: nume prenume, telefon */}
                                                {order.shipping_address && (
                                                    <>
                                                        <p className={styles.infoLine}>
                                                            <strong>{t('For')}:</strong> {order.shipping_address.first_name} {order.shipping_address.last_name}
                                                            {order.shipping_address.phone && `, ${order.shipping_address.phone}`}
                                                        </p>

                                                        {/* Adresa */}
                                                        <p className={styles.infoLine}>
                                                            <strong>{t('Address')}</strong> {formatAddress(order.shipping_address)}
                                                        </p>
                                                    </>
                                                )}

                                                {/* Mesaj pentru locker box */}
                                                {order.shipping.pickup_point_id && (
                                                    <p className={styles.infoLine}>
                                                        <em>{t('To be presented at delivery')}: {t('Code received by email or in client account')}</em>
                                                    </p>
                                                )}
                                            </>
                                        ) : order.shipping_address ? (
                                            <>
                                                {/* Fallback daca nu exista shipping method dar exista adresa */}
                                                <p className={styles.deliveryMethodName}>
                                                    {t('Delivery method')}
                                                </p>
                                                <p className={styles.infoLine}>
                                                    <strong>{t('For')}:</strong> {order.shipping_address.first_name} {order.shipping_address.last_name}
                                                    {order.shipping_address.phone && `, ${order.shipping_address.phone}`}
                                                </p>
                                                <p className={styles.infoLine}>
                                                    <strong>{t('Address')}</strong> {formatAddress(order.shipping_address)}
                                                </p>
                                            </>
                                        ) : (
                                            <p>-</p>
                                        )}
                                    </div>
                                </div>

                                {/* Billing Details Column */}
                                <div className={styles.infoColumn}>
                                    <h3 className={styles.columnTitle}>
                                        <FileText size={16} />
                                        {t('Billing details')}
                                    </h3>
                                    <div className={styles.columnContent}>
                                        {order.billing_address ? (
                                            <>
                                                <p className={styles.infoLine}>
                                                    <strong>{t('For')}:</strong> {order.billing_address.first_name} {order.billing_address.last_name}
                                                    {order.billing_address.phone && `, ${order.billing_address.phone}`}
                                                </p>
                                                <p className={styles.infoLine}>
                                                    <strong>{t('Address')}</strong> {formatAddress(order.billing_address)}
                                                </p>
                                            </>
                                        ) : (
                                            <p>-</p>
                                        )}
                                    </div>
                                </div>

                                {/* Payment Method Column */}
                                <div className={styles.infoColumn}>
                                    <h3 className={styles.columnTitle}>
                                        <CreditCard size={16} />
                                        {t('Payment method')}
                                    </h3>
                                    <div className={styles.columnContent}>
                                        {order.payment_method ? (
                                            <>
                                                <p>{order.payment_method.name}</p>
                                                <p className={styles.paymentAccepted}>
                                                    {t('Payment accepted')}
                                                </p>
                                                <p className={styles.totalValue}>
                                                    {t('Total value')} <PriceDisplay price={formatPriceInOrderCurrency(order.total_incl_vat + (order.shipping?.shipping_cost_incl_vat || 0), getOrderCurrency(order.currency))} />
                                                </p>
                                                {order.invoice_series && order.invoice_number && (
                                                    <Button
                                                        variant="secondary"
                                                        className={styles.invoiceButton}
                                                    >
                                                        {t('Invoice')} {order.invoice_series} {order.invoice_number}.pdf
                                                    </Button>
                                                )}
                                            </>
                                        ) : (
                                            <p>-</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Separator */}
                            <div className={styles.separator}></div>

                            {/* Products List */}
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
                </div>
            </SettingsLayout>
        </Layout>
    );
}

export default OrderContent;
