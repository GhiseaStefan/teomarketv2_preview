import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { SettingsModalProvider } from '../../contexts/SettingsModalContext';
import { ProductCard } from '../../components/ProductCard';
import { useTranslations } from '../../utils/translations';
import type { SharedData, Currency, CustomerGroup } from '../../types';
import { Heart } from 'lucide-react';
import styles from './index.module.css';

interface PriceTier {
    min_quantity: number;
    max_quantity: number | null;
    quantity_range: string;
    price_raw: number;
}

interface Product {
    id: number;
    name: string;
    image: string | null;
    stock_quantity?: number;
    sku?: string | null;
    short_description?: string | null;
    price_raw?: number;
    vat_included?: boolean;
    price_tiers?: PriceTier[];
}

interface WishlistPageProps {
    products: Product[];
}

function WishlistContent({ products = [] }: WishlistPageProps) {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const customerGroup = (props.customerGroup as CustomerGroup | null) || null;
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];
    const [orderBy, setOrderBy] = useState<'name' | 'price_ron'>('name');
    const [orderDirection, setOrderDirection] = useState<'asc' | 'desc'>('asc');
    const [sortedProducts, setSortedProducts] = useState<Product[]>(products);

    // Sort products
    React.useEffect(() => {
        const sorted = [...products].sort((a, b) => {
            let comparison = 0;

            if (orderBy === 'name') {
                comparison = (a.name || '').localeCompare(b.name || '');
            } else if (orderBy === 'price_ron') {
                const priceA = a.price_raw ?? 0;
                const priceB = b.price_raw ?? 0;
                comparison = priceA - priceB;
            }

            return orderDirection === 'asc' ? comparison : -comparison;
        });

        setSortedProducts(sorted);
    }, [products, orderBy, orderDirection]);

    // Get current sort value for dropdown
    const getCurrentSortValue = (): string => {
        return `${orderBy}_${orderDirection}`;
    };

    // Handle sort change from dropdown
    const handleSortChange = (value: string) => {
        // Parse value format: "name_asc", "name_desc", "price_ron_asc", "price_ron_desc"
        const parts = value.split('_');
        const direction = parts[parts.length - 1] as 'asc' | 'desc'; // Last part is direction
        const field = parts.slice(0, -1).join('_') as 'name' | 'price_ron'; // Everything before last part is field

        setOrderBy(field);
        setOrderDirection(direction);
    };

    return (
        <>
            <Head title={t('My Favorites')} />
            <div className={styles.wishlistPage}>
                <div className={styles.wishlistCard}>
                    <div className={styles.pageHeader}>
                        <h1 className={styles.pageTitle}>
                            {t('My Favorites')}
                            {products.length > 0 && (
                                <span className={styles.productCount}> ({products.length})</span>
                            )}
                        </h1>
                    </div>

                    {/* Sort Section */}
                    {products.length > 0 && (
                        <div className={styles.sortSection}>
                            <div className={styles.sortControls}>
                                <div className={styles.sortControl}>
                                    <label className={styles.sortLabel}>{t('Sort by', 'Ordoneaza')}:</label>
                                    <select
                                        className={styles.sortSelect}
                                        value={getCurrentSortValue()}
                                        onChange={(e) => handleSortChange(e.target.value)}
                                    >
                                        <option value="name_asc">{t('Name A-Z', 'Nume A-Z')}</option>
                                        <option value="name_desc">{t('Name Z-A', 'Nume Z-A')}</option>
                                        <option value="price_ron_asc">{t('Price ascending', 'Pret crescator')}</option>
                                        <option value="price_ron_desc">{t('Price descending', 'Pret descrescator')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Grid */}
                    {products.length > 0 ? (
                        <div className={styles.productsGrid}>
                            {sortedProducts.map((product) => (
                                <ProductCard
                                    key={product.id}
                                    id={product.id}
                                    name={product.name}
                                    image={product.image}
                                    stock_quantity={product.stock_quantity}
                                    sku={product.sku}
                                    short_description={product.short_description}
                                    price_raw={product.price_raw}
                                    vat_included={product.vat_included}
                                    price_tiers={product.price_tiers}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                                <Heart size={64} strokeWidth={1.5} />
                            </div>
                            <h2 className={styles.emptyTitle}>{t('Your wishlist is empty')}</h2>
                            <p className={styles.emptyText}>
                                {t('Start adding products to your favorites to see them here')}
                            </p>
                            <button
                                className={styles.emptyButton}
                                onClick={() => router.get('/products')}
                            >
                                {t('Browse Products')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

export default function WishlistPage(props: WishlistPageProps) {
    return (
        <Layout activeSidebarItem="me">
            <SettingsModalProvider>
                <SettingsLayout>
                    <WishlistContent {...props} />
                </SettingsLayout>
            </SettingsModalProvider>
        </Layout>
    );
}
