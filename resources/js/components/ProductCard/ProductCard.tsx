import React, { useState } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { ShoppingCart, Heart } from 'lucide-react';
import { useTranslations } from '../../utils/translations';
import { useToast } from '../../contexts/ToastContext';
import type { CustomerGroup, Currency, SharedData } from '../../types';
import { PriceDisplay } from '../PriceDisplay/PriceDisplay';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import styles from './ProductCard.module.css';

export interface PriceTier {
    min_quantity: number;
    max_quantity: number | null;
    quantity_range: string;
    price_raw: number; // For backward compatibility (includes VAT)
    price_display?: number; // Price already calculated for customer group display (preferred)
}

export interface ProductCardProps {
    id: number;
    name: string;
    image: string | null;
    stock_quantity?: number;
    sku?: string;
    short_description?: string;
    price_tiers?: PriceTier[];
    customerGroup?: CustomerGroup | null;
    price_raw?: number;
    vat_included?: boolean;
}

export const ProductCard = ({
    id,
    name,
    image,
    stock_quantity,
    sku,
    short_description,
    price_tiers = [],
    customerGroup: propCustomerGroup,
    price_raw,
    vat_included = true,
}: ProductCardProps) => {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const { showToast } = useToast();
    const customerGroupFromProps = (props.customerGroup as CustomerGroup | null) || null;
    const customerGroup = propCustomerGroup || customerGroupFromProps;
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];
    const productUrl = `/products/${id}`;
    const isInStock = stock_quantity === undefined || stock_quantity > 0;
    const [isHovered, setIsHovered] = useState(false);
    const [isAddingToCart, setIsAddingToCart] = useState(false);
    const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
    const user = props.auth?.user;
    const isAuthenticated = !!user;
    const wishlistItems = (props.wishlistItems as any[]) || [];

    // Check if product is in wishlist from props (reacts to changes automatically)
    const isInWishlist = wishlistItems.some((item: any) => (item.product_id || item.id) === id);

    // Show SKU and stock for all users
    const isB2CDefault = !customerGroup || customerGroup.code === 'B2C';
    const showTechnicalInfo = true;

    const formatQuantityRange = (minQuantity: number, nextMinQuantity?: number): string => {
        if (nextMinQuantity) {
            return `${minQuantity} - ${nextMinQuantity - 1}`;
        }
        return `${minQuantity}+`;
    };

    const getDisplayTierPrice = (tier: PriceTier): string => {
        if (currentCurrency) {
            // Use price_display if available (already calculated by backend), otherwise fallback to price_raw
            const displayPrice = tier.price_display ?? tier.price_raw;
            return formatPriceWithCurrency(displayPrice, currentCurrency);
        }
        // Fallback
        const displayPrice = tier.price_display ?? tier.price_raw;
        return displayPrice.toFixed(2);
    };

    const handleAddToCart = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isInStock || isAddingToCart) {
            return;
        }

        setIsAddingToCart(true);

        try {
            router.post('/cart/add', {
                product_id: id,
                quantity: 1,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    showToast(t('Item added to cart'), 'success');
                    router.reload({ only: ['cartSummary', 'cartItems'] });
                },
                onError: (errors) => {
                    let errorMessage = t('Insufficient stock');

                    if (errors.product_id) {
                        errorMessage = Array.isArray(errors.product_id) ? errors.product_id[0] : errors.product_id;
                    } else if (errors.quantity) {
                        errorMessage = Array.isArray(errors.quantity) ? errors.quantity[0] : errors.quantity;
                    } else if (errors.message) {
                        errorMessage = Array.isArray(errors.message) ? errors.message[0] : errors.message;
                    } else if (typeof errors === 'string') {
                        errorMessage = errors;
                    } else if (Object.keys(errors).length > 0) {
                        const firstErrorKey = Object.keys(errors)[0];
                        const firstError = errors[firstErrorKey];
                        errorMessage = Array.isArray(firstError) ? firstError[0] : firstError;
                    }

                    showToast(errorMessage, 'error');
                },
                onFinish: () => {
                    setIsAddingToCart(false);
                },
            });
        } catch (error) {
            console.error('Error adding to cart:', error);
            showToast(t('Error processing request. Please try again.'), 'error');
            setIsAddingToCart(false);
        }
    };

    const handleToggleWishlist = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!isAuthenticated) {
            router.get('/login');
            return;
        }

        if (isTogglingWishlist) {
            return;
        }

        setIsTogglingWishlist(true);

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            if (isInWishlist) {
                // Remove from wishlist
                const response = await fetch(`/wishlist/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    credentials: 'same-origin',
                });

                if (response.ok) {
                    // Reload wishlist data - this will update wishlistItems in props
                    router.reload({ only: ['wishlistItems', 'wishlistSummary'] });
                } else {
                    alert(t('Error removing from wishlist'));
                }
            } else {
                // Add to wishlist
                router.post('/wishlist/add', {
                    product_id: id,
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
                        // Reload wishlist data - this will update wishlistItems in props
                        router.reload({ only: ['wishlistItems', 'wishlistSummary'] });
                    },
                    onError: (errors) => {
                        let errorMessage = t('Error adding to wishlist');
                        if (errors.message) {
                            errorMessage = Array.isArray(errors.message) ? errors.message[0] : errors.message;
                        }
                        alert(errorMessage);
                    },
                });
            }
        } catch (error) {
            console.error('Error toggling wishlist:', error);
            alert(t('Error processing request. Please try again.'));
        } finally {
            setIsTogglingWishlist(false);
        }
    };

    return (
        <div
            className={`${styles.productCard} ${isB2CDefault ? styles.productCardB2C : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <Link href={productUrl} className={styles.productLink}>
                <div className={styles.productImageWrapper}>
                    {image ? (
                        <img
                            src={image}
                            alt={name}
                            className={styles.productImage}
                        />
                    ) : (
                        <div className={styles.productImagePlaceholder}>
                            {t('No image')}
                        </div>
                    )}
                    {!isInStock && (
                        <div className={styles.outOfStockBadge}>
                            {t('Out of stock')}
                        </div>
                    )}
                    <button
                        className={`${styles.wishlistButton} ${isInWishlist ? styles.wishlistButtonActive : ''}`}
                        onClick={handleToggleWishlist}
                        disabled={isTogglingWishlist}
                        title={isInWishlist ? t('Remove from wishlist') : t('Add to wishlist')}
                    >
                        <Heart
                            size={20}
                            fill={isInWishlist ? '#ef4444' : 'none'}
                            stroke={isInWishlist ? '#ef4444' : '#000000'}
                        />
                    </button>
                </div>
                <div className={styles.productInfo}>
                    <h3 className={styles.productTitle}>{name}</h3>

                    {/* Price Tiers Table */}
                    {price_tiers && price_tiers.length > 0 && (
                        <div className={styles.priceTiersContainer}>
                            <div className={styles.priceTiersTable}>
                                <div className={styles.priceTiersHeader}>
                                    <div className={styles.priceTierHeader}>{t('Quantity')}</div>
                                    <div className={`${styles.priceTierHeader} ${styles.priceTierHeaderRight}`}>{t('Price')}</div>
                                </div>
                                <div className={styles.priceTiersBody}>
                                    {price_tiers.map((tier, index) => {
                                        const nextTier = price_tiers[index + 1];
                                        const quantityRange = formatQuantityRange(tier.min_quantity, nextTier?.min_quantity);
                                        const displayPrice = getDisplayTierPrice(tier);

                                        return (
                                            <div key={tier.min_quantity} className={styles.priceTierRow}>
                                                <div className={styles.priceTierQuantity}>{quantityRange}</div>
                                                <div className={styles.priceTierPrice}>
                                                    <PriceDisplay price={displayPrice} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </Link>
            <div className={styles.productFooter}>
                <div className={styles.productTechnicalInfo}>
                    {showTechnicalInfo && sku && (
                        <div className={styles.productSku}>
                            SKU: {sku}
                        </div>
                    )}
                    {showTechnicalInfo && stock_quantity !== undefined && isInStock && (
                        <div className={styles.productStock}>
                            {t('Stock')}: {stock_quantity}
                        </div>
                    )}
                </div>
                <button
                    className={styles.addToCartButtonFixed}
                    onClick={handleAddToCart}
                    disabled={!isInStock || isAddingToCart}
                    title={t('Add to Cart')}
                >
                    <ShoppingCart size={16} />
                    <span>{isAddingToCart ? t('Adding...') : t('Add to Cart')}</span>
                </button>
            </div>
        </div>
    );
};

