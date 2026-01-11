import { router } from '@inertiajs/react';
import { ArrowLeft, Layers, Package, Tag, Calendar, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { formatPrice } from '../../../utils/formatPrice';
import styles from './show.module.css';

interface ProductFamilyShowPageProps {
    family: {
        id: number;
        name: string;
        code: string;
        status: boolean;
        created_at: string;
        created_at_formatted: string;
        updated_at: string;
        updated_at_formatted: string;
        attributes: Array<{
            id: number;
            name: string;
            code: string;
            type: string;
            is_filterable: boolean;
            sort_order: number;
        }>;
        products: Array<{
            id: number;
            name: string;
            sku: string | null;
            ean: string | null;
            type: string;
            status: boolean;
            stock_quantity: number;
            price_ron: string;
            main_image_url: string | null;
            images: Array<{
                id: number;
                url: string;
                sort_order: number;
            }>;
            created_at: string;
            created_at_formatted: string;
        }>;
        products_count: number;
    };
}

export default function ProductFamilyShow({ family }: ProductFamilyShowPageProps) {
    const { t } = useTranslations();

    const getStatusBadgeStyle = (status: boolean) => {
        if (status) {
            return {
                backgroundColor: '#d1fae5',
                color: '#059669',
                borderColor: '#10b981',
            };
        } else {
            return {
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                borderColor: '#ef4444',
            };
        }
    };

    const getProductImage = (product: typeof family.products[0]) => {
        if (product.main_image_url) {
            return product.main_image_url;
        }
        if (product.images && product.images.length > 0) {
            const sortedImages = [...product.images].sort((a, b) => a.sort_order - b.sort_order);
            return sortedImages[0].url;
        }
        return null;
    };

    return (
        <AdminLayout activeSidebarItem="product-families">
            <div className={styles.familyShowPage}>
                {/* Header */}
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        {/* Breadcrumb */}
                        <nav className={styles.breadcrumb}>
                            <a 
                                href="/admin/product-families" 
                                onClick={(e) => { 
                                    e.preventDefault(); 
                                    router.get('/admin/product-families'); 
                                }}
                                className={styles.breadcrumbLink}
                            >
                                {t('Product Families', 'Familii de produse')}
                            </a>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <span className={styles.breadcrumbCurrent}>
                                {family.name}
                            </span>
                        </nav>
                        <div className={styles.familyTitle}>
                            <h1 className={styles.familyName}>{family.name}</h1>
                            <span
                                className={styles.statusBadge}
                                style={getStatusBadgeStyle(family.status)}
                            >
                                {family.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                            </span>
                            <span className={styles.familyCode}>
                                <code>{family.code}</code>
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className={styles.mainContent}>
                    {/* Left Column */}
                    <div className={styles.leftColumn}>
                        {/* Family Attributes */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Tag size={18} />
                                {t('Attributes', 'Atribute')}
                            </h2>
                            {family.attributes.length === 0 ? (
                                <div className={styles.emptyState}>
                                    {t('No attributes assigned to this family', 'Nu exista atribute atribuite acestei familii')}
                                </div>
                            ) : (
                                <div className={styles.attributesList}>
                                    {family.attributes.map((attribute) => (
                                        <div key={attribute.id} className={styles.attributeItem}>
                                            <div className={styles.attributeHeader}>
                                                <span className={styles.attributeName}>{attribute.name}</span>
                                                {attribute.is_filterable && (
                                                    <span className={styles.filterableBadge}>
                                                        {t('Filterable', 'Filtrabil')}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.attributeDetails}>
                                                <span className={styles.attributeCode}>
                                                    <code>{attribute.code}</code>
                                                </span>
                                                <span className={styles.attributeType}>
                                                    {t('Type', 'Tip')}: {attribute.type}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Family Products */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Package size={18} />
                                {t('Products', 'Produse')} ({family.products_count})
                            </h2>
                            {family.products.length === 0 ? (
                                <div className={styles.emptyState}>
                                    {t('No products in this family', 'Nu exista produse in aceasta familie')}
                                </div>
                            ) : (
                                <>
                                    <div className={styles.productsTable}>
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th className={styles.imageHeader}></th>
                                                    <th>{t('Product', 'Produs')}</th>
                                                    <th>{t('SKU', 'SKU')}</th>
                                                    <th>{t('EAN', 'EAN')}</th>
                                                    <th>{t('Type', 'Tip')}</th>
                                                    <th>{t('Stock', 'Stoc')}</th>
                                                    <th>{t('Price', 'Pret')}</th>
                                                    <th>{t('Status', 'Status')}</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {family.products.map((product) => {
                                                    const imageUrl = getProductImage(product);
                                                    return (
                                                        <tr key={product.id} className={!product.status ? styles.inactiveRow : ''}>
                                                            <td className={styles.productImageCell}>
                                                                {imageUrl ? (
                                                                    <img 
                                                                        src={imageUrl} 
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
                                                            <td className={styles.productName}>
                                                                <a
                                                                    href={`/admin/products/${product.id}`}
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        router.get(`/admin/products/${product.id}`);
                                                                    }}
                                                                    className={styles.productNameLink}
                                                                >
                                                                    {product.name}
                                                                </a>
                                                            </td>
                                                            <td className={styles.productSku}>{product.sku || '-'}</td>
                                                            <td className={styles.productSku}>{product.ean || '-'}</td>
                                                            <td className={styles.productType}>{product.type}</td>
                                                            <td className={styles.productStock}>{product.stock_quantity}</td>
                                                            <td className={styles.productPrice}>
                                                                {formatPrice(parseFloat(product.price_ron || '0'))} RON
                                                            </td>
                                                            <td>
                                                                <span
                                                                    className={styles.statusBadge}
                                                                    style={getStatusBadgeStyle(product.status)}
                                                                >
                                                                    {product.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                    {family.products_count > family.products.length && (
                                        <div className={styles.viewMoreContainer}>
                                            <button
                                                onClick={() => {
                                                    router.get('/admin/products', {
                                                        family_id: family.id,
                                                    });
                                                }}
                                                className={styles.viewMoreButton}
                                            >
                                                {t('View more', 'Vezi mai multe')} ({family.products_count - family.products.length} {t('more', 'in plus')})
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Right Column */}
                    <div className={styles.rightColumn}>
                        {/* Family Information */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Layers size={18} />
                                {t('Family Information', 'Informatii Familie')}
                            </h2>
                            <div className={styles.infoSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('ID', 'ID')}:</span>
                                    <span className={styles.infoValue}>#{family.id}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Code', 'Cod')}:</span>
                                    <span className={styles.infoValue}>
                                        <code>{family.code}</code>
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Status', 'Status')}:</span>
                                    <span className={styles.infoValue}>
                                        <span
                                            className={styles.statusBadge}
                                            style={getStatusBadgeStyle(family.status)}
                                        >
                                            {family.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                        </span>
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Total Products', 'Total Produse')}:</span>
                                    <span className={styles.infoValue}>{family.products_count}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Total Attributes', 'Total Atribute')}:</span>
                                    <span className={styles.infoValue}>{family.attributes.length}</span>
                                </div>
                            </div>
                        </div>

                        {/* Dates */}
                        <div className={styles.section}>
                            <h2 className={styles.sectionTitle}>
                                <Calendar size={18} />
                                {t('Dates', 'Date')}
                            </h2>
                            <div className={styles.infoSection}>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Created At', 'Data crearii')}:</span>
                                    <span className={styles.infoValue}>{family.created_at_formatted}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <span className={styles.infoLabel}>{t('Updated At', 'Data actualizarii')}:</span>
                                    <span className={styles.infoValue}>{family.updated_at_formatted}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
