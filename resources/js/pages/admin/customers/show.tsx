import { router } from '@inertiajs/react';
import { ArrowLeft, User, MapPin, Building2, Mail, Package, CreditCard, FileText } from 'lucide-react';
import { AdminLayout } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { formatPrice } from '../../../utils/formatPrice';
import styles from './show.module.css';

interface CustomerShowPageProps {
        customer: {
            id: number;
            customer_name: string;
            customer_type: string;
            company_name: string | null;
            reg_number: string | null;
            fiscal_code: string | null;
            phone: string;
            bank_name: string | null;
            iban: string | null;
            created_at: string | null;
            created_at_formatted: string | null;
        customer_group: {
            id: number;
            name: string;
            code: string;
        } | null;
        users: Array<{
            id: number;
            first_name: string | null;
            last_name: string | null;
            email: string;
            email_verified_at: string | null;
            is_active: boolean;
            two_factor_confirmed_at: string | null;
            created_at: string;
            created_at_formatted: string;
        }>;
        addresses: Array<{
            id: number;
            address_type: string;
            is_preferred: boolean;
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
            country: {
                id: number;
                name: string;
                iso_code_2: string;
            } | null;
        }>;
        orders: Array<{
            id: number;
            order_number: string;
            created_at: string;
            created_at_formatted: string;
            status: {
                value: string;
                name: string;
                color: string;
            };
            total_ron_incl_vat: string;
            is_paid: boolean;
            paid_at: string | null;
            paid_at_formatted: string | null;
        }>;
        stats: {
            total_orders: number;
            total_spent: string;
            average_order_value: string;
            last_order_date: string | null;
            last_order_date_formatted: string | null;
        };
    };
}

export default function CustomerShow({ customer }: CustomerShowPageProps) {
    const { t } = useTranslations();

    const formatAddress = (address: typeof customer.addresses[0]) => {
        const parts = [
            address.address_line_1,
            address.address_line_2,
        ].filter(Boolean);
        
        return parts.join(', ');
    };

    const getStatusBadgeStyle = (color: string) => {
        return {
            backgroundColor: `${color}20`,
            color: color,
            borderColor: color,
        };
    };

    return (
        <AdminLayout activeSidebarItem="customers">
            <div className={styles.customerShowPage}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <button
                            className={styles.backButton}
                            onClick={() => router.get('/admin/customers')}
                        >
                            <ArrowLeft size={18} />
                            <span>{t('Back', 'Inapoi')}</span>
                        </button>
                        <div className={styles.customerTitle}>
                            <div className={styles.customerHeaderInfo}>
                                <h1 className={styles.customerName}>
                                    {customer.customer_name}
                                </h1>
                                {customer.users.length > 0 && customer.users[0].email && (
                                    <div className={styles.customerEmail}>
                                        <Mail size={16} />
                                        <span>{customer.users[0].email}</span>
                                        {customer.users[0].email_verified_at ? (
                                            <span className={styles.verifiedBadge}>
                                                {t('Verified', 'Verificat')}
                                            </span>
                                        ) : (
                                            <span className={styles.unverifiedBadge}>
                                                {t('Unverified', 'Neverificat')}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                            {customer.customer_group && (
                                <span className={styles.customerGroupBadge}>
                                    {customer.customer_group.name}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={styles.headerActions}>
                        <button className={styles.actionButton}>
                            {t('Edit Customer', 'Editeaza Client')} <span className={styles.soonBadge}>{t('Soon', 'In curand')}</span>
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {/* Left Column */}
                    <div className={styles.leftColumn}>
                        {/* Customer Info */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <User size={18} />
                                {t('Customer Information', 'Informatii Client')}
                            </h2>
                            <div className={styles.infoGrid}>
                                {/* Randul 1: Contact Rapid */}
                                {customer.users.length > 0 && customer.users[0].email && (
                                    <div className={styles.infoItem}>
                                        <strong>{t('Email', 'Email')}:</strong>
                                        <span>{customer.users[0].email}</span>
                                    </div>
                                )}
                                <div className={styles.infoItem}>
                                    <strong>{t('Phone', 'Telefon')}:</strong>
                                    <span>{customer.phone || t('N/A', 'N/A')}</span>
                                </div>
                                <div className={styles.infoItem}>
                                    <strong>{t('Registration Date', 'Data Inregistrarii')}:</strong>
                                    <span>{customer.created_at_formatted || t('N/A', 'N/A')}</span>
                                </div>
                                
                                {/* Randul 2: Clasificare */}
                                <div className={styles.infoItem}>
                                    <strong>{t('Customer Type', 'Tip Client')}:</strong>
                                    <span>{customer.customer_type === 'company' ? t('Company', 'Companie') : t('Individual', 'Persoana Fizica')}</span>
                                </div>
                                {customer.users.length > 0 && customer.users[0].id ? (
                                    <div className={styles.infoItem}>
                                        <strong>{t('User ID', 'ID Utilizator')}:</strong>
                                        <span className={styles.monoText}>{customer.users[0].id}</span>
                                    </div>
                                ) : (
                                    <div className={styles.infoItem}></div>
                                )}
                                
                                {/* Randul 3: Date Tehnice */}
                                <div className={styles.infoItem}>
                                    <strong>{t('Customer ID', 'ID Client')}:</strong>
                                    <span className={styles.monoText}>{customer.id}</span>
                                </div>
                                {customer.users.length > 0 && (
                                    <>
                                        <div className={styles.infoItem}>
                                            <strong>{t('User Status', 'Status Utilizator')}:</strong>
                                            <span className={customer.users[0].is_active ? styles.statusActive : styles.statusInactive}>
                                                {customer.users[0].is_active ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                            </span>
                                        </div>
                                        <div className={styles.infoItem}>
                                            <strong>{t('Two Factor', 'Autentificare Doi Factori')}:</strong>
                                            <span className={customer.users[0].two_factor_confirmed_at ? styles.statusActive : styles.statusInactive}>
                                                {customer.users[0].two_factor_confirmed_at ? t('Enabled', 'Activat') : t('Disabled', 'Dezactivat')}
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Informatii Suplimentare pentru Companii */}
                            {(customer.company_name || customer.fiscal_code || customer.reg_number || customer.bank_name || customer.iban) && (
                                <div className={styles.additionalInfo}>
                                    <h3 className={styles.additionalInfoTitle}>{t('Additional Information', 'Informatii Suplimentare')}</h3>
                                    <div className={styles.additionalInfoGrid}>
                                        {customer.company_name && (
                                            <div className={styles.infoItem}>
                                                <strong>{t('Company Name', 'Nume Companie')}:</strong>
                                                <span>{customer.company_name}</span>
                                            </div>
                                        )}
                                        {customer.fiscal_code && (
                                            <div className={styles.infoItem}>
                                                <strong>{t('Fiscal Code', 'CUI')}:</strong>
                                                <span>{customer.fiscal_code}</span>
                                            </div>
                                        )}
                                        {customer.reg_number && (
                                            <div className={styles.infoItem}>
                                                <strong>{t('Registration Number', 'Nr. Reg. Com.')}</strong>
                                                <span>{customer.reg_number}</span>
                                            </div>
                                        )}
                                        {customer.bank_name && (
                                            <div className={styles.infoItem}>
                                                <strong>{t('Bank', 'Banca')}:</strong>
                                                <span>{customer.bank_name}</span>
                                            </div>
                                        )}
                                        {customer.iban && (
                                            <div className={styles.infoItem}>
                                                <strong>{t('IBAN', 'IBAN')}:</strong>
                                                <span className={styles.monoText}>{customer.iban}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Addresses */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <MapPin size={18} />
                                {t('Addresses', 'Adrese')} ({customer.addresses.length})
                            </h2>
                            {customer.addresses.length === 0 ? (
                                <div className={styles.emptyState}>
                                    {t('No addresses found', 'Nu exista adrese')}
                                </div>
                            ) : (
                                <div className={styles.addressesList}>
                                    {customer.addresses.map((address) => (
                                        <div key={address.id} className={styles.addressCard}>
                                            <div className={styles.addressHeader}>
                                                <span className={`${styles.addressType} ${
                                                    address.address_type === 'shipping'
                                                        ? styles.addressTypeShipping
                                                        : address.address_type === 'billing'
                                                        ? styles.addressTypeBilling
                                                        : styles.addressTypeHeadquarters
                                                }`}>
                                                    {address.address_type === 'shipping'
                                                        ? t('Shipping', 'Livrare')
                                                        : address.address_type === 'billing'
                                                        ? t('Billing', 'Facturare')
                                                        : t('Headquarters', 'Sediul')}
                                                </span>
                                                {address.is_preferred ? (
                                                    <span className={styles.preferredBadge}>
                                                        {t('Preferred', 'Preferat')}
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className={styles.addressName}>
                                                {address.first_name} {address.last_name}
                                            </div>
                                            {address.company_name && (
                                                <div className={styles.addressCompany}>
                                                    {address.company_name}
                                                </div>
                                            )}
                                            <div className={styles.addressDetails}>
                                                <div className={styles.addressMeta}>
                                                    <strong>{t('Address', 'Adresa')}</strong> {formatAddress(address)}
                                                </div>
                                                {address.city && (
                                                    <div className={styles.addressMeta}>
                                                        <strong>{t('City', 'Oras')}:</strong> {address.city}
                                                    </div>
                                                )}
                                                {address.county_name && (
                                                    <div className={styles.addressMeta}>
                                                        <strong>{t('County', 'Judet')}:</strong> {address.county_name}
                                                    </div>
                                                )}
                                                {address.zip_code && (
                                                    <div className={styles.addressMeta}>
                                                        <strong>{t('ZIP Code', 'Cod Postal')}:</strong> {address.zip_code}
                                                    </div>
                                                )}
                                                {address.country && (
                                                    <div className={styles.addressMeta}>
                                                        <strong>{t('Country', 'Tara')}:</strong> {address.country.name}
                                                    </div>
                                                )}
                                                {address.county_code && (
                                                    <div className={styles.addressMeta}>
                                                        <strong>{t('County Code', 'Cod Judet')}:</strong> {address.county_code}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.addressContact}>
                                                <div>
                                                    <strong>{t('Phone', 'Telefon')}:</strong> {address.phone}
                                                </div>
                                                <div>
                                                    {address.email}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className={styles.rightColumn}>
                        {/* Statistics */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <FileText size={18} />
                                {t('Statistics', 'Statistici')}
                            </h2>
                            <div className={styles.statsGrid}>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{customer.stats.total_orders}</div>
                                    <div className={styles.statLabel}>{t('Total Orders', 'Total Comenzi')}</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{formatPrice(parseFloat(customer.stats.total_spent))} RON</div>
                                    <div className={styles.statLabel}>{t('Total Spent', 'Total Cheltuit')}</div>
                                </div>
                                <div className={styles.statItem}>
                                    <div className={styles.statValue}>{formatPrice(parseFloat(customer.stats.average_order_value))} RON</div>
                                    <div className={styles.statLabel}>{t('Average Order', 'Valoare Medie')}</div>
                                </div>
                                {customer.stats.last_order_date && (
                                    <div className={styles.statItem}>
                                        <div className={styles.statValue}>{customer.stats.last_order_date_formatted}</div>
                                        <div className={styles.statLabel}>{t('Last Order', 'Ultima Comanda')}</div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Orders */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Package size={18} />
                                {t('Recent Orders', 'Comenzi Recente')}
                            </h2>
                            {customer.orders.length === 0 ? (
                                <div className={styles.emptyState}>
                                    {t('No orders found', 'Nu exista comenzi')}
                                </div>
                            ) : (
                                <>
                                    <div className={styles.ordersList}>
                                        {customer.orders.map((order) => (
                                            <div key={order.id} className={styles.orderCard}>
                                            <div className={styles.orderRow1}>
                                                <div className={styles.orderLeft}>
                                                    <span 
                                                        className={styles.paymentStatusIndicator}
                                                        style={{
                                                            backgroundColor: order.is_paid ? '#10b981' : '#ef4444'
                                                        }}
                                                        title={order.is_paid ? t('Paid', 'Platit') : t('Unpaid', 'Neplatit')}
                                                    />
                                                    <a
                                                        href={`/admin/orders/${order.order_number}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className={styles.orderLink}
                                                    >
                                                        #{order.order_number}
                                                    </a>
                                                </div>
                                                <span
                                                    className={styles.statusBadge}
                                                    style={getStatusBadgeStyle(order.status.color)}
                                                >
                                                    {t(order.status.name, order.status.name)}
                                                </span>
                                            </div>
                                                <div className={styles.orderRow2}>
                                                    <span className={styles.orderDate}>{order.created_at_formatted}</span>
                                                    <span className={styles.orderTotal}>{formatPrice(parseFloat(order.total_ron_incl_vat))} RON</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {customer.stats.total_orders > customer.orders.length && (
                                        <div className={styles.viewAllOrders}>
                                            <a
                                                href={`/admin/orders?customer_id=${customer.id}`}
                                                className={styles.viewAllLink}
                                            >
                                                {t('View All Orders', 'Vezi Toate Comenzile')} ({customer.stats.total_orders}) →
                                            </a>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
