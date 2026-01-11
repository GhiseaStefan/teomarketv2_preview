import { router } from '@inertiajs/react';
import { ArrowLeft, Package, Truck, MapPin, CreditCard, Calendar, User, Receipt, Euro, Calculator, FileText, MoreVertical, ChevronDown, Wallet, Banknote, Phone, Mail, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { formatPrice } from '../../../utils/formatPrice';
import { useState, useRef, useEffect } from 'react';
import styles from './show.module.css';

interface OrderShowPageProps {
    order: {
        id: number;
        order_number: string;
        invoice_series: string | null;
        invoice_number: string | null;
        created_at: string;
        created_at_formatted: string;
        status: {
            value: string;
            name: string;
            color: string;
        };
        customer: {
            id: number;
            email: string | null;
            name: string;
        } | null;
        shipping_address: {
            first_name: string;
            last_name: string;
            company_name: string | null;
            phone: string;
            email: string;
            address_line_1: string;
            address_line_2: string | null;
            city: string;
            county_name: string | null;
            county_code: string | null;
            zip_code: string;
            country_id: number | null;
            country_name: string | null;
        } | null;
        billing_address: {
            first_name: string;
            last_name: string;
            company_name: string | null;
            fiscal_code: string | null;
            reg_number: string | null;
            phone: string;
            email: string;
            address_line_1: string;
            address_line_2: string | null;
            city: string;
            county_name: string | null;
            county_code: string | null;
            zip_code: string;
            country_id: number | null;
            country_name: string | null;
        } | null;
        payment: {
            method: string;
            method_code: string | null;
            is_paid: boolean;
            paid_at: string | null;
            paid_at_formatted: string | null;
        };
        shipping: {
            method_name: string;
            method_type: string | null;
            tracking_number: string | null;
            title: string | null;
            shipping_cost_excl_vat: string;
            shipping_cost_incl_vat: string;
            shipping_cost_ron_excl_vat: string;
            shipping_cost_ron_incl_vat: string;
            is_pickup: boolean;
            courier_data: {
                point_id?: string | null;
                point_name?: string | null;
                provider?: string | null;
                locker_details?: {
                    address?: string | null;
                    city?: string | null;
                    county_name?: string | null;
                    county_code?: string | null;
                    zip_code?: string | null;
                    country_id?: number | null;
                    lat?: number | null;
                    long?: number | null;
                } | null;
            } | null;
        };
        products: Array<{
            id: number;
            name: string;
            sku: string;
            ean: string;
            quantity: number;
            image_url: string | null;
            unit_price_currency: string;
            unit_price_ron: string;
            total_currency_excl_vat: string;
            total_currency_incl_vat: string;
            total_ron_excl_vat: string;
            total_ron_incl_vat: string;
            vat_percent: number;
        }>;
        totals: {
            subtotal_excl_vat: string;
            subtotal_incl_vat: string;
            total_ron_excl_vat: string;
            total_ron_incl_vat: string;
            vat_rate: number;
            currency: string;
            exchange_rate: number;
        };
        history: Array<{
            id: number;
            action: string;
            description: string | null;
            old_value: any;
            new_value: any;
            created_at: string;
            created_at_formatted: string;
            user: {
                id: number;
                name: string;
                email: string;
            } | null;
        }>;
    };
}

export default function OrderShow({ order }: OrderShowPageProps) {
    const { t } = useTranslations();
    const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
    const actionsDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
                setIsActionsDropdownOpen(false);
            }
        };

        if (isActionsDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isActionsDropdownOpen]);

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
                backgroundColor: '#10b98120',
                color: '#10b981',
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

    const getPaymentMethodIcon = (methodCode: string | null) => {
        if (!methodCode) return null;
        
        const code = methodCode.toLowerCase();
        
        // Card payment (card, credit_card, debit_card, stripe, online, paypal, etc.)
        if (
            code.includes('card') || 
            code.includes('credit') || 
            code.includes('debit') ||
            code === 'stripe' ||
            code === 'online' ||
            code === 'paypal' ||
            code.includes('visa') ||
            code.includes('mastercard')
        ) {
            return <CreditCard size={16} className={styles.paymentMethodIcon} />;
        }
        
        // Bank transfer / OP (op, transfer, bank_transfer, etc.)
        if (code.includes('op') || code.includes('transfer') || code.includes('bank')) {
            return <Wallet size={16} className={styles.paymentMethodIcon} />;
        }
        
        // Cash on delivery / Ramburs (ramburs, cod, cash_on_delivery, etc.)
        if (code.includes('ramburs') || code.includes('cod') || code.includes('cash')) {
            return <Banknote size={16} className={styles.paymentMethodIcon} />;
        }
        
        return null;
    };

    const formatAddress = (address: typeof order.shipping_address | typeof order.billing_address) => {
        if (!address) return <span>{t('N/A', 'N/A')}</span>;

        const lines: React.ReactNode[] = [];

        // Company name (for billing address)
        if ('company_name' in address && address.company_name) {
            lines.push(
                <div key="company_name">
                    <strong>{t('Company Name', 'Nume Companie')}:</strong> {address.company_name}
                </div>
            );
        }

        // Fiscal code (for billing address)
        if ('fiscal_code' in address && address.fiscal_code) {
            lines.push(
                <div key="fiscal_code">
                    <strong>{t('Fiscal Code', 'CUI')}:</strong> {address.fiscal_code}
                </div>
            );
        }

        // Registration number (for billing address)
        if ('reg_number' in address && address.reg_number) {
            lines.push(
                <div key="reg_number">
                    <strong>{t('Registration Number', 'Nr. Reg. Com.')}</strong> {address.reg_number}
                </div>
            );
        }

        // Address lines with label
        if (address.address_line_1 || address.address_line_2) {
            const addressParts: string[] = [];
            if (address.address_line_1) {
                addressParts.push(address.address_line_1);
            }
            if (address.address_line_2) {
                addressParts.push(address.address_line_2);
            }
            lines.push(
                <div key="address">
                    <strong>{t('Address', 'Adresa')}</strong> {addressParts.join(', ')}
                </div>
            );
        }

        // Format location info on separate lines: Oras, Judet, Tara
        if (address.city) {
            lines.push(
                <div key="city">
                    <strong>{t('City', 'Oras')}:</strong> {address.city}
                </div>
            );
        }
        if (address.county_name) {
            lines.push(
                <div key="county">
                    <strong>{t('County', 'Judet')}:</strong> {address.county_name}
                    {address.county_code && ` (${address.county_code})`}
                </div>
            );
        }
        if (address.country_name) {
            lines.push(
                <div key="country">
                    <strong>{t('Country', 'Tara')}:</strong> {address.country_name}
                </div>
            );
        }

        if (address.zip_code) {
            lines.push(
                <div key="zip_code">
                    <strong>{t('ZIP Code', 'Cod Postal')}:</strong> {address.zip_code}
                </div>
            );
        }

        // Add phone and email in the same format
        if (address.phone) {
            lines.push(
                <div key="phone">
                    <strong>{t('Phone', 'Telefon')}:</strong> {address.phone}
                </div>
            );
        }
        if (address.email) {
            lines.push(
                <div key="email">
                    <strong>{t('Email', 'Email')}:</strong> {address.email}
                </div>
            );
        }

        return <>{lines}</>;
    };

    const formatAddressCompact = (address: typeof order.shipping_address | typeof order.billing_address) => {
        if (!address) return null;

        const parts: React.ReactNode[] = [];

        // Company name (for billing address) - on separate line if exists
        if ('company_name' in address && address.company_name) {
            parts.push(
                <div key="company_name" className={styles.addressCompanyCompact}>
                    {address.company_name}
                </div>
            );
        }

        // Fiscal code and registration number (for billing address)
        const fiscalInfo: string[] = [];
        if ('fiscal_code' in address && address.fiscal_code) {
            fiscalInfo.push(`CUI: ${address.fiscal_code}`);
        }
        if ('reg_number' in address && address.reg_number) {
            fiscalInfo.push(`Nr. Reg. Com.: ${address.reg_number}`);
        }
        if (fiscalInfo.length > 0) {
            parts.push(
                <div key="fiscal" className={styles.addressFiscalCompact}>
                    {fiscalInfo.join(' | ')}
                </div>
            );
        }

        // Address line
        const addressParts: string[] = [];
        if (address.address_line_1) {
            addressParts.push(address.address_line_1);
        }
        if (address.address_line_2) {
            addressParts.push(address.address_line_2);
        }
        if (addressParts.length > 0) {
            parts.push(
                <div key="address" className={styles.addressLineCompact}>
                    {addressParts.join(', ')}
                </div>
            );
        }

        // Location info in one line: City, County, Country, ZIP
        const locationParts: string[] = [];
        if (address.city) {
            locationParts.push(address.city);
        }
        if (address.county_name) {
            const county = `Jud. ${address.county_name}${address.county_code ? ` (${address.county_code})` : ''}`;
            locationParts.push(county);
        }
        if (address.country_name) {
            locationParts.push(address.country_name);
        }
        if (address.zip_code) {
            locationParts.push(address.zip_code);
        }
        if (locationParts.length > 0) {
            parts.push(
                <div key="location" className={styles.addressLocationCompact}>
                    {locationParts.join(', ')}
                </div>
            );
        }

        // Contact info with icons
        const contactInfo: React.ReactNode[] = [];
        if (address.phone) {
            contactInfo.push(
                <div key="phone" className={styles.addressContactItem}>
                    <Phone size={14} className={styles.addressContactIcon} />
                    <span>{address.phone}</span>
                </div>
            );
        }
        if (address.email) {
            contactInfo.push(
                <div key="email" className={styles.addressContactItem}>
                    <Mail size={14} className={styles.addressContactIcon} />
                    <span>{address.email}</span>
                </div>
            );
        }
        if (contactInfo.length > 0) {
            parts.push(
                <div key="contact" className={styles.addressContactCompact}>
                    {contactInfo}
                </div>
            );
        }

        return <>{parts}</>;
    };

    return (
        <AdminLayout activeSidebarItem="orders">
            <div className={styles.orderShowPage}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {/* Breadcrumb */}
                        <nav className={styles.breadcrumb}>
                            <a 
                                href="/admin/orders" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    router.get('/admin/orders'); 
                                }}
                                className={styles.breadcrumbLink}
                            >
                                {t('Orders', 'Comenzi')}
                            </a>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <span className={styles.breadcrumbCurrent}>
                                #{order.order_number}
                            </span>
                        </nav>
                        <div className={styles.orderTitle}>
                            <h1 className={styles.orderNumber}>#{order.order_number}</h1>
                            <span
                                className={styles.statusBadge}
                                style={getStatusBadgeStyle(order.status.color)}
                            >
                                {t(order.status.name, order.status.name)}
                            </span>
                            <span
                                className={styles.paymentStatusBadge}
                                style={getPaymentStatusBadgeStyle(order.payment.is_paid)}
                            >
                                {order.payment.is_paid ? t('Paid', 'Platit') : t('Unpaid', 'Neplatit')}
                            </span>
                            {order.totals.currency !== 'RON' && order.totals.exchange_rate && (
                                <span className={styles.exchangeRate}>
                                    {t('Exchange Rate', 'Curs')}: 1 {order.totals.currency} = {formatPrice(order.totals.exchange_rate)} RON
                                </span>
                            )}
                            {order.customer && (
                                <a
                                    href={`/admin/customers/${order.customer.id}`}
                                    className={styles.customerLink}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        router.get(`/admin/customers/${order.customer!.id}`);
                                    }}
                                >
                                    <User size={16} />
                                    {order.customer.name}
                                </a>
                            )}
                        </div>
                    </div>
                    <div className={styles.headerActions} ref={actionsDropdownRef}>
                        <button
                            className={styles.actionsDropdownButton}
                            onClick={() => setIsActionsDropdownOpen(!isActionsDropdownOpen)}
                        >
                            <span>{t('Actions', 'Actiuni')}</span>
                            <ChevronDown size={16} className={isActionsDropdownOpen ? styles.chevronRotated : ''} />
                        </button>
                        {isActionsDropdownOpen && (
                            <div className={styles.actionsDropdownMenu}>
                                <button 
                                    className={styles.actionDropdownItem}
                                    onClick={() => router.get(`/admin/orders/${order.order_number}/edit`)}
                                >
                                    {t('Modify Order', 'Modifica Comanda')}
                                </button>
                                <button className={styles.actionDropdownItem}>
                                    {t('Generate Invoice', 'Genereaza Factura')} <span className={styles.soonBadge}>{t('Soon', 'In curand')}</span>
                                </button>
                                <button className={styles.actionDropdownItem}>
                                    {t('Generate AWB', 'Genereaza AWB')} <span className={styles.soonBadge}>{t('Soon', 'In curand')}</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {/* Left Column */}
                    <div className={styles.leftColumn}>
                        {/* Order Products */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Package size={18} />
                                {t('Order Products', 'Produse Comanda')}
                            </h2>
                            <div className={styles.productsTable}>
                                <table>
                                    <thead>
                                        <tr>
                                            <th className={styles.imageHeader}></th>
                                            <th>{t('Product', 'Produs')}</th>
                                            <th>{t('SKU', 'SKU')}</th>
                                            <th>{t('EAN', 'EAN')}</th>
                                            <th className={styles.quantityHeader}>{t('Quantity', 'Cantitate')}</th>
                                            <th>{t('Unit Price', 'Pret unitar')}</th>
                                            <th>{t('Total', 'Total')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.products.map((product, index) => (
                                            <tr key={product.id} className={order.products.length === 1 ? styles.lastRowSingle : ''}>
                                                <td className={styles.productImageCell}>
                                                    {product.image_url ? (
                                                        <img 
                                                            src={product.image_url} 
                                                            alt={product.name}
                                                            className={styles.productThumbnail}
                                                            loading="lazy"
                                                        />
                                                    ) : (
                                                        <div className={styles.productThumbnailPlaceholder}>
                                                            <Package size={16} />
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={styles.productName}>{product.name}</td>
                                                <td className={styles.productSku}>{product.sku || '-'}</td>
                                                <td className={styles.productSku}>{product.ean || '-'}</td>
                                                <td className={styles.productQuantity}>{product.quantity}</td>
                                                <td className={styles.productPrice}>
                                                    <div className={styles.pricePrimary}>
                                                        {formatPrice(product.unit_price_currency)} {order.totals.currency}
                                                    </div>
                                                    {order.totals.currency !== 'RON' && (
                                                        <div className={styles.priceSecondary}>
                                                            {formatPrice(product.unit_price_ron)} RON
                                                        </div>
                                                    )}
                                                </td>
                                                <td className={styles.productTotal}>
                                                    <div className={styles.pricePrimary}>
                                                        {formatPrice(product.total_currency_incl_vat)} {order.totals.currency}
                                                    </div>
                                                    {order.totals.currency !== 'RON' && (
                                                        <div className={styles.priceSecondary}>
                                                            {formatPrice(product.total_ron_incl_vat)} RON
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Calculator size={18} />
                                {t('Order Summary', 'Sumar Comanda')}
                            </h2>
                            <div className={styles.summary}>
                                <div className={styles.summaryDetails}>
                                    <div className={styles.summaryRow}>
                                        <div className={styles.summaryLabel}>
                                            <span className={styles.summaryLabelText}>
                                                {t('Subtotal', 'Subtotal')}
                                                <span className={styles.summaryNote}>({t('without VAT', 'fara TVA')})</span>
                                            </span>
                                        </div>
                                        <div className={styles.summaryValue}>
                                            <span className={styles.pricePrimary}>
                                                {formatPrice(order.totals.subtotal_excl_vat)} {order.totals.currency}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.summaryRowDivider}></div>
                                    <div className={styles.summaryRow}>
                                        <div className={styles.summaryLabel}>
                                            <span className={styles.summaryLabelText}>
                                                {t('Shipping', 'Livrare')} <span className={styles.summaryNote}>(fara TVA)</span>
                                            </span>
                                        </div>
                                        <div className={styles.summaryValue}>
                                            <span className={styles.pricePrimary}>
                                                {formatPrice(order.shipping.shipping_cost_excl_vat)} {order.totals.currency}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.summaryRowDivider}></div>
                                    <div className={styles.summaryRow}>
                                        <div className={styles.summaryLabel}>
                                            <span className={styles.summaryLabelText}>
                                                {t('VAT', 'TVA')}
                                                <span className={styles.summaryNote}>({order.totals.vat_rate}%)</span>
                                            </span>
                                        </div>
                                        <div className={styles.summaryValue}>
                                            <span className={styles.pricePrimary}>
                                                {formatPrice(
                                                    (parseFloat(order.totals.subtotal_incl_vat) - parseFloat(order.totals.subtotal_excl_vat)) +
                                                    (parseFloat(order.shipping.shipping_cost_incl_vat) - parseFloat(order.shipping.shipping_cost_excl_vat))
                                                )} {order.totals.currency}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.summaryDivider}></div>

                                <div className={styles.summaryTotal}>
                                    <div className={styles.summaryTotalLabel}>
                                        {t('Total Payment', 'Total de Plata')}
                                        <span className={styles.summaryTotalNote}>({t('with VAT', 'cu TVA')})</span>
                                    </div>
                                    <div className={styles.summaryTotalValue}>
                                        {formatPrice(
                                            parseFloat(order.totals.subtotal_incl_vat) + parseFloat(order.shipping.shipping_cost_incl_vat)
                                        )} {order.totals.currency}
                                    </div>
                                </div>

                                {order.totals.currency !== 'RON' && (
                                    <>
                                        <div className={styles.summaryDividerLight}></div>
                                        <div className={styles.summaryAccounting}>
                                            <div className={styles.summaryAccountingLabel}>
                                                <FileText size={14} className={styles.summaryAccountingIcon} />
                                                <span>{t('Accounting Equivalent', 'Echivalent Contabil')}</span>
                                            </div>
                                            <div className={styles.summaryAccountingValue}>
                                                {formatPrice(order.totals.total_ron_incl_vat)} RON
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Order Timeline */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Calendar size={18} />
                                {t('Order Timeline', 'Istoric Comanda')}
                            </h2>
                            <div className={styles.timeline}>
                                {order.history.length === 0 ? (
                                    <div className={styles.timelineEmpty}>
                                        {t('No history available', 'Nu exista istoric')}
                                    </div>
                                ) : (
                                    order.history.map((entry, index) => (
                                        <div key={entry.id} className={styles.timelineItem}>
                                            <div className={styles.timelineDot}></div>
                                            <div className={styles.timelineContent}>
                                                <div className={styles.timelineHeader}>
                                                    <span className={styles.timelineAction}>{entry.action}</span>
                                                    <span className={styles.timelineDate}>{entry.created_at_formatted}</span>
                                                </div>
                                                {entry.description && (
                                                    <div className={styles.timelineDescription}>{entry.description}</div>
                                                )}
                                                {entry.user && (
                                                    <div className={styles.timelineUser}>
                                                        <User size={12} />
                                                        {entry.user.name || entry.user.email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className={styles.rightColumn}>
                        {/* Address & Contact */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <MapPin size={18} />
                                {t('Shipping Address', 'Adresa de Livrare')}
                            </h2>
                            <div className={styles.addressInfoCompact}>
                                {order.shipping_address && (
                                    <>
                                        <div className={styles.addressNameCompact}>
                                            {order.shipping_address.first_name} {order.shipping_address.last_name}
                                        </div>
                                        {formatAddressCompact(order.shipping_address)}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Billing Address */}
                        {order.billing_address && (
                            <div className={styles.section}>
                                <h2 className={styles.sectionTitle}>
                                    <CreditCard size={18} />
                                    {t('Billing Address', 'Adresa de Facturare')}
                                </h2>
                                <div className={styles.addressInfoCompact}>
                                    <div className={styles.addressNameCompact}>
                                        {order.billing_address.first_name} {order.billing_address.last_name}
                                    </div>
                                    {formatAddressCompact(order.billing_address)}
                                </div>
                            </div>
                        )}

                        {/* Payment & Shipping Info */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <CreditCard size={18} />
                                {t('Payment & Shipping', 'Plata & Livrare')}
                            </h2>
                            
                            {/* Payment Section */}
                            <div className={styles.paymentSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Payment Method', 'Modalitate de plata')}:</span>
                                    <div className={styles.infoValue}>
                                        <div className={styles.paymentMethodContainer}>
                                            {getPaymentMethodIcon(order.payment.method_code)}
                                            <span className={styles.paymentMethodName}>{order.payment.method}</span>
                                        </div>
                                        <div className={styles.paymentStatusRow}>
                                            <span className={styles.paymentStatusBadge} style={getPaymentStatusBadgeStyle(order.payment.is_paid)}>
                                                {order.payment.is_paid ? t('Paid', 'Platit') : t('Unpaid', 'Neplatit')}
                                            </span>
                                            {order.payment.is_paid && order.payment.paid_at_formatted && (
                                                <span className={styles.paymentDate}>{order.payment.paid_at_formatted}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Divider */}
                            <div className={styles.sectionDivider}></div>

                            {/* Shipping Section */}
                            <div className={styles.shippingSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Shipping Method', 'Modalitate livrare')}:</span>
                                    <div className={styles.infoValue}>
                                        <div className={styles.shippingMethodInfo}>
                                            {order.shipping.is_pickup ? (
                                                <MapPin size={14} className={styles.shippingIcon} />
                                            ) : (
                                                <Truck size={14} className={styles.shippingIcon} />
                                            )}
                                            <span>{order.shipping.method_name}</span>
                                        </div>
                                    </div>
                                </div>
                                
                                {order.shipping.tracking_number && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>{t('Tracking Number', 'Numar AWB')}:</span>
                                        <div className={styles.infoValue}>
                                            <a
                                                href={`#tracking-${order.shipping.tracking_number}`}
                                                className={styles.trackingLink}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    // TODO: Open tracking
                                                }}
                                            >
                                                {order.shipping.tracking_number}
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {order.shipping.is_pickup && order.shipping.courier_data && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>{t('Pickup Point Details', 'Detalii Punct Ridicare')}:</span>
                                        <div className={styles.infoValue}>
                                            <div className={styles.pickupDetailsCompact}>
                                                {order.shipping.courier_data.point_name && (
                                                    <span className={styles.pickupPointName}>
                                                        {order.shipping.courier_data.point_name}
                                                        {order.shipping.courier_data.point_id && (
                                                            <span className={styles.pickupPointId}> (ID: {order.shipping.courier_data.point_id})</span>
                                                        )}
                                                    </span>
                                                )}
                                                {order.shipping.courier_data.locker_details && (
                                                    <div className={styles.pickupAddress}>
                                                        {order.shipping.courier_data.locker_details.address && (
                                                            <span>{order.shipping.courier_data.locker_details.address}</span>
                                                        )}
                                                        {order.shipping.courier_data.locker_details.city && (
                                                            <span>
                                                                {order.shipping.courier_data.locker_details.address && ', '}
                                                                {order.shipping.courier_data.locker_details.city}
                                                            </span>
                                                        )}
                                                        {order.shipping.courier_data.locker_details.county_name && (
                                                            <span>
                                                                {order.shipping.courier_data.locker_details.city && ', '}
                                                                Jud. {order.shipping.courier_data.locker_details.county_name}
                                                                {order.shipping.courier_data.locker_details.county_code && ` (${order.shipping.courier_data.locker_details.county_code})`}
                                                            </span>
                                                        )}
                                                        {order.shipping.courier_data.locker_details.zip_code && (
                                                            <span> ({order.shipping.courier_data.locker_details.zip_code})</span>
                                                        )}
                                                    </div>
                                                )}
                                                {order.shipping.courier_data.provider && (
                                                    <div className={styles.pickupProvider}>
                                                        {t('Provider', 'Furnizor')}: {order.shipping.courier_data.provider}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Additional Info */}
                            <div className={styles.additionalInfoSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Order Date', 'Data Comenzii')}:</span>
                                    <span className={styles.infoValue}>{order.created_at_formatted}</span>
                                </div>
                                {order.invoice_number && (
                                    <div className={styles.infoRow}>
                                        <span className={styles.infoLabel}>{t('Invoice', 'Factura')}:</span>
                                        <span className={styles.infoValue}>{order.invoice_series} {order.invoice_number}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
