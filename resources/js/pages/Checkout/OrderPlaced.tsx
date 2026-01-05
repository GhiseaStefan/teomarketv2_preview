import React from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Printer, Download } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { CheckoutProgress } from '../../components/CheckoutProgress';
import { Button } from '../../components/ui/Button';
import { PriceDisplay } from '../../components/PriceDisplay/PriceDisplay';
import { useTranslations } from '../../utils/translations';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import type { SharedData, Currency } from '../../types';
import styles from './OrderPlaced.module.css';

interface OrderProduct {
    id: number;
    name: string;
    sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    image: string | null;
}

interface ShippingAddress {
    first_name: string;
    last_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    county_name?: string | null;
    zip_code: string;
    country?: string | null;
}

interface OrderData {
    id: number;
    order_number: string;
    created_at: string;
    total_incl_vat: number;
    total_excl_vat: number;
    vat_rate_applied?: number | null;
    currency: string;
    products: OrderProduct[];
    shipping_address: ShippingAddress | null;
    estimated_delivery_date: string | null;
    shipping_method_name: string | null;
    payment_method_name: string | null;
    contact_phone?: string | null;
    contact_email?: string | null;
    shipping_cost?: number;
    subtotal?: number;
}

interface OrderPlacedPageProps {
    order?: OrderData;
    currentCurrency?: Currency;
}

export default function OrderPlaced({ order, currentCurrency }: OrderPlacedPageProps) {
    const { t } = useTranslations();
    const { props } = usePage<SharedData>();
    const currency = currentCurrency || (props.currentCurrency as Currency | undefined);

    if (!order) {
        return (
            <Layout>
                <Head title={t('Order Placed')} />
                <div className={styles.container}>
                    <CheckoutProgress currentStep={3} />
                    <div className={styles.content}>
                        <div className={styles.errorMessage}>
                            <p>{t('Order not found')}</p>
                            <Button variant="primary" onClick={() => router.get('/')}>
                                {t('Go Home')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    const formatPrice = (price: number): string => {
        if (!currency) {
            return price.toFixed(2);
        }
        return formatPriceWithCurrency(price, currency);
    };

    const formatEstimatedDelivery = (dateString: string): string => {
        const date = new Date(dateString);
        const locale = props.locale === 'ro' ? 'ro-RO' : 'en-US';
        const options: Intl.DateTimeFormatOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        };
        return date.toLocaleDateString(locale, options);
    };

    const handlePrint = () => {
        window.print();
    };

    const handleDownload = () => {
        // TODO: Implement download functionality when invoice generation is ready
        alert(t('Download functionality will be available soon'));
    };

    return (
        <Layout>
            <Head title={t('Order Placed')} />
            <div className={styles.progressWrapper}>
                <CheckoutProgress currentStep={3} />
            </div>
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path
                                    d="M8 12l2 2 4-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <h1 className={styles.title}>{t('Thank You!')}</h1>
                        <p className={styles.message}>{t('Your order has been placed successfully')}</p>

                        {/* Order Number */}
                        <div className={styles.orderNumberSection}>
                            <p className={styles.orderNumberLabel}>{t('Order Number')}</p>
                            <p className={styles.orderNumber}>{order.order_number}</p>
                        </div>

                        {/* Shipping Address */}
                        {order.shipping_address && (
                            <div className={styles.shippingSection}>
                                <div className={styles.shippingContent}>
                                    <div className={styles.addressColumn}>
                                        <h2 className={styles.sectionTitle}>{t('Delivery Address')}</h2>
                                        <div className={styles.addressDetails}>
                                            <p>
                                                <strong>{order.shipping_address.first_name} {order.shipping_address.last_name}</strong>
                                            </p>
                                            <p>{order.shipping_address.address_line_1}</p>
                                            {order.shipping_address.address_line_2 && (
                                                <p>{order.shipping_address.address_line_2}</p>
                                            )}
                                            <p>
                                                {order.shipping_address.city}
                                                {order.shipping_address.county_name && `, ${order.shipping_address.county_name}`}
                                                {order.shipping_address.zip_code && ` ${order.shipping_address.zip_code}`}
                                            </p>
                                            {order.shipping_address.country && (
                                                <p>{order.shipping_address.country}</p>
                                            )}
                                            <p>{t('Phone')} {order.shipping_address.phone}</p>
                                        </div>
                                        {/* Estimated Delivery - moved here, more compact */}
                                        {order.estimated_delivery_date && (
                                            <div className={styles.deliveryInline}>
                                                <span className={styles.deliveryLabel}>{t('Estimated Delivery')}:</span>
                                                <span className={styles.deliveryDate}>
                                                    {formatEstimatedDelivery(order.estimated_delivery_date)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {/* Action Buttons as Icons - Vertical, Right Side */}
                                    <div className={styles.actionIcons}>
                                        <button
                                            onClick={handlePrint}
                                            className={styles.iconButton}
                                            title={t('Print Order')}
                                        >
                                            <Printer size={20} />
                                        </button>
                                        <button
                                            onClick={handleDownload}
                                            className={styles.iconButton}
                                            title={t('Download Invoice')}
                                        >
                                            <Download size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Order Summary */}
                        <div className={styles.orderSummary}>
                            <h2 className={styles.sectionTitle}>{t('Order Summary')}</h2>
                            <div className={styles.productsList}>
                                {order.products.map((product) => (
                                    <div key={product.id} className={styles.productItem}>
                                        <div className={styles.productImage}>
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} />
                                            ) : (
                                                <div className={styles.noImage}>{t('No image')}</div>
                                            )}
                                        </div>
                                        <div className={styles.productDetails}>
                                            <h3 className={styles.productName}>{product.name}</h3>
                                            <p className={styles.productSku}>{t('SKU')}: {product.sku}</p>
                                            <div className={styles.productQuantity}>
                                                {t('Quantity')}: {product.quantity}
                                            </div>
                                            <div className={styles.productUnitPrice}>
                                                {t('Unit price')}: <PriceDisplay price={formatPrice(product.unit_price)} />
                                            </div>
                                        </div>
                                        <div className={styles.productPrice}>
                                            <PriceDisplay price={formatPrice(product.total_price)} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Total */}
                        <div className={styles.orderTotalSection}>
                            <div className={styles.totalDetails}>
                                <div className={styles.totalRow}>
                                    <span>{t('Subtotal (excl. VAT)')}:</span>
                                    <span>
                                        <PriceDisplay price={formatPrice(order.total_excl_vat)} />
                                    </span>
                                </div>
                                <div className={styles.totalRow}>
                                    <span>
                                        {t('VAT')}
                                        {order.vat_rate_applied !== null && order.vat_rate_applied !== undefined 
                                            ? ` (${order.vat_rate_applied}%)` 
                                            : ''}:
                                    </span>
                                    <span>
                                        <PriceDisplay price={formatPrice(
                                            (order.subtotal || order.total_incl_vat) - order.total_excl_vat
                                        )} />
                                    </span>
                                </div>
                                {order.shipping_cost !== undefined && order.shipping_cost !== null && (
                                    <div className={styles.totalRow}>
                                        <span>{t('Shipping Cost')}:</span>
                                        <span>
                                            {order.shipping_cost === 0 ? (
                                                <span className={styles.freeShipping}>{t('Free')}</span>
                                            ) : (
                                                <PriceDisplay price={formatPrice(order.shipping_cost)} />
                                            )}
                                        </span>
                                    </div>
                                )}
                                <div className={styles.totalDivider}></div>
                                <div className={styles.totalRowFinal}>
                                    <span>
                                        {t('Total')} <span className={styles.totalVatLabel}>
                                            ({t('with VAT')})
                                        </span>
                                    </span>
                                    <span>
                                        <PriceDisplay price={formatPrice(order.total_incl_vat)} />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

