import { useState, useCallback, useRef, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { useTranslations } from '../../utils/translations';
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, Info } from 'lucide-react';
import { PriceDisplay } from '../../components/PriceDisplay/PriceDisplay';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import type { SharedData, Currency } from '../../types';
import styles from './Index.module.css';

interface PriceTier {
    tier_index: number;
    min_quantity: number;
    max_quantity: number | null;
    label: string;
}

interface PriceTierInfo {
    tier_index: number;
    min_quantity: number;
    max_quantity: number | null;
    quantity_range: string;
    price_excl_vat: number;
    price_incl_vat: number;
    is_current: boolean;
}

interface CartItem {
    cart_key: string;
    product_id: number;
    name: string;
    sku: string | null;
    ean: string | null;
    image: string | null;
    quantity: number;
    stock_quantity: number;
    unit_price_raw: number;
    total_price_raw: number;
    unit_price_excl_vat?: number;
    unit_price_incl_vat?: number;
    total_price_excl_vat?: number;
    total_price_incl_vat?: number;
    vat_rate: number;
    vat_included: boolean;
    price_tier?: PriceTier | null;
    price_tiers?: PriceTierInfo[];
    items_to_next_tier?: number | null;
}

interface CartSummary {
    total_items: number;
    total_excl_vat: number;
    total_incl_vat: number;
    vat_rate: number;
    vat_included: boolean;
}

interface Cart {
    items: CartItem[];
    summary: CartSummary;
}

interface CartPageProps {
    cart: Cart;
}

export default function CartIndex({ cart }: CartPageProps) {
    const { t } = useTranslations();
    const { props } = usePage<SharedData>();
    const currentCurrency = (props.currentCurrency as Currency | undefined);
    const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
    const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
    const [localQuantities, setLocalQuantities] = useState<Record<string, number>>({});

    // Clear local quantities when cart data updates (after reload)
    useEffect(() => {
        setLocalQuantities({});
    }, [cart.items]);

    // Cache CSRF token to avoid querying DOM on every request
    const csrfTokenRef = useRef<string | null>(null);
    
    // Initialize CSRF token on mount
    useEffect(() => {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        if (token) {
            csrfTokenRef.current = token;
        }
    }, []);

    const getCsrfToken = useCallback(() => {
        // Always try to get fresh token from DOM first (in case it changed)
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        if (token) {
            csrfTokenRef.current = token;
            return token;
        }
        // Fallback to cached token if available
        if (csrfTokenRef.current) {
            return csrfTokenRef.current;
        }
        return '';
    }, []);

    const formatPrice = (price: number): string => {
        if (!currentCurrency) {
            return price.toFixed(2);
        }
        return formatPriceWithCurrency(price, currentCurrency);
    };

    const handleQuantityChange = useCallback(async (cartKey: string, newQuantity: number) => {
        if (newQuantity < 1) {
            return;
        }

        // Prevent duplicate requests for the same item
        if (updatingItems.has(cartKey)) {
            return;
        }

        setUpdatingItems(prev => new Set(prev).add(cartKey));

        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                console.error('CSRF token not available, reloading page');
                window.location.reload();
                return;
            }

            const response = await fetch(`/cart/${encodeURIComponent(cartKey)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ quantity: newQuantity }),
            });

            // Check response status first
            if (!response.ok) {
                // Get content type to determine if it's JSON or HTML
                const contentType = response.headers.get('content-type') || '';
                
                if (contentType.includes('application/json')) {
                    // It's a JSON error response, parse it
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                } else {
                    // It's likely an HTML error page (CSRF mismatch, validation error page, etc.)
                    // Read as text to avoid JSON parse error
                    const text = await response.text();
                    
                    // Check if it's a CSRF error
                    if (response.status === 419 || text.includes('CSRF') || text.includes('419')) {
                        console.error('CSRF token mismatch, reloading page');
                        window.location.reload();
                        return;
                    }
                    
                    throw new Error(`Server returned non-JSON response (status: ${response.status})`);
                }
            }

            // Response is OK, check content type
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`Expected JSON response, got ${contentType || 'unknown content type'}`);
            }

            const data = await response.json();

            if (data.success) {
                router.reload({ only: ['cart', 'cartSummary', 'cartItems'] });
            } else {
                console.error('Error updating quantity:', data.message || 'Unknown error');
            }
        } catch (error) {
            console.error('Error updating quantity:', error);
            // Only reload on CSRF errors, not on other errors
            if (error instanceof Error && (error.message.includes('CSRF') || error.message.includes('419'))) {
                window.location.reload();
            }
        } finally {
            setUpdatingItems(prev => {
                const next = new Set(prev);
                next.delete(cartKey);
                return next;
            });
        }
    }, [updatingItems, getCsrfToken]);

    const handleRemove = useCallback(async (cartKey: string) => {
        // Prevent duplicate requests
        if (removingItems.has(cartKey)) {
            return;
        }

        setRemovingItems(prev => new Set(prev).add(cartKey));

        try {
            const csrfToken = getCsrfToken();
            if (!csrfToken) {
                console.error('CSRF token not available, reloading page');
                window.location.reload();
                return;
            }

            const response = await fetch(`/cart/${encodeURIComponent(cartKey)}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });

            // Check response status first
            if (!response.ok) {
                // Get content type to determine if it's JSON or HTML
                const contentType = response.headers.get('content-type') || '';
                
                if (contentType.includes('application/json')) {
                    // It's a JSON error response, parse it
                    const errorData = await response.json();
                    throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
                } else {
                    // It's likely an HTML error page (CSRF mismatch, validation error page, etc.)
                    // Read as text to avoid JSON parse error
                    const text = await response.text();
                    
                    // Check if it's a CSRF error
                    if (response.status === 419 || text.includes('CSRF') || text.includes('419')) {
                        console.error('CSRF token mismatch, reloading page');
                        window.location.reload();
                        return;
                    }
                    
                    throw new Error(`Server returned non-JSON response (status: ${response.status})`);
                }
            }

            // Response is OK, check content type
            const contentType = response.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
                throw new Error(`Expected JSON response, got ${contentType || 'unknown content type'}`);
            }

            const data = await response.json();

            if (data.success) {
                router.reload({ only: ['cart', 'cartSummary', 'cartItems'] });
            }
        } catch (error) {
            console.error('Error removing item:', error);
            // Only reload on CSRF errors, not on other errors
            if (error instanceof Error && (error.message.includes('CSRF') || error.message.includes('419'))) {
                window.location.reload();
            }
        } finally {
            setRemovingItems(prev => {
                const next = new Set(prev);
                next.delete(cartKey);
                return next;
            });
        }
    }, [removingItems, getCsrfToken]);

    const isEmpty = !cart.items || cart.items.length === 0;

    return (
        <Layout>
            <Head title={t('Shopping Cart')} />
            <div className={styles.container}>
                {!isEmpty && (
                    <div className={styles.header}>
                        <h1 className={styles.title}>
                            <ShoppingCart size={24} />
                            {t('Shopping Cart')}
                        </h1>
                    </div>
                )}

                {isEmpty ? (
                    <div className={styles.emptyCart}>
                        <ShoppingCart size={64} className={styles.emptyCartIcon} />
                        <h2 className={styles.emptyCartTitle}>{t('Your cart is empty')}</h2>
                        <p className={styles.emptyCartText}>
                            {t('Continue shopping')} to add items to your cart.
                        </p>
                        <Button
                            variant="primary"
                            onClick={() => router.get('/products')}
                            className={styles.continueButton}
                        >
                            <ArrowLeft size={16} />
                            {t('Continue shopping')}
                        </Button>
                    </div>
                ) : (
                    <div className={styles.cartContent}>
                        <div className={styles.itemsSection}>
                            <div className={styles.itemsHeader}>
                                <h2 className={styles.itemsTitle}>{t('Products')}</h2>
                            </div>

                            <div className={styles.cartTable}>
                                <div className={styles.tableHeader}>
                                    <div className={styles.tableHeaderCell}>{t('Product')}</div>
                                    <div className={styles.tableHeaderCell}>{t('Description')}</div>
                                    <div className={styles.tableHeaderCell}>{t('Price')}</div>
                                    <div className={styles.tableHeaderCell}>{t('Quantity')}</div>
                                    <div className={styles.tableHeaderCell}>{t('Total')}</div>
                                    <div className={styles.tableHeaderCell}>{t('Remove')}</div>
                                </div>

                                <div className={styles.tableBody}>
                                    {cart.items.map((item) => {
                                        // Use vat_included from item to determine which price to show
                                        // Each item can have its own customer_group, so use item.vat_included instead of summary
                                        const showVat = item.vat_included;
                                        const unitPrice = showVat
                                            ? (item.unit_price_incl_vat ?? item.unit_price_raw)
                                            : (item.unit_price_excl_vat ?? item.unit_price_raw);
                                        const totalPrice = showVat
                                            ? (item.total_price_incl_vat ?? item.total_price_raw)
                                            : (item.total_price_excl_vat ?? item.total_price_raw);

                                        // Calculate next tier price for badge display
                                        let nextTierPrice: number | null = null;
                                        if (item.items_to_next_tier && item.items_to_next_tier > 0 && item.price_tier && item.price_tiers) {
                                            const currentTierIndex = item.price_tier.tier_index;
                                            const nextTier = item.price_tiers.find(tier => tier.tier_index === currentTierIndex + 1);
                                            if (nextTier) {
                                                nextTierPrice = showVat ? nextTier.price_incl_vat : nextTier.price_excl_vat;
                                            }
                                        }

                                        // Tooltip content for price tiers
                                        const tierTooltipContent = item.price_tiers && item.price_tiers.length > 0 ? (
                                            <div className={styles.tierTooltipContent}>
                                                <div className={styles.tierTooltipHeader}>
                                                    <strong>{t('Price tiers')}</strong>
                                                </div>
                                                <div className={styles.tierTooltipList}>
                                                    {item.price_tiers.map((tier) => (
                                                        <div
                                                            key={tier.tier_index}
                                                            className={`${styles.tierTooltipItem} ${tier.is_current ? styles.tierTooltipItemCurrent : ''}`}
                                                        >
                                                            <div className={styles.tierTooltipRange}>
                                                                {t('Tier')} {tier.tier_index}: {tier.quantity_range} {t('units')}
                                                                {tier.is_current && <span className={styles.tierCurrentBadge}>{t('Current')}</span>}
                                                            </div>
                                                            <div className={styles.tierTooltipPrice}>
                                                                {showVat ? (
                                                                    <PriceDisplay price={formatPrice(tier.price_incl_vat)} />
                                                                ) : (
                                                                    <PriceDisplay price={formatPrice(tier.price_excl_vat)} />
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {item.items_to_next_tier && item.items_to_next_tier > 0 && (
                                                    <div className={styles.tierTooltipNext}>
                                                        <span>
                                                            {t('Add')} {item.items_to_next_tier} {item.items_to_next_tier === 1 ? t('item') : t('items')} {t('to reach next tier')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : null;

                                        return (
                                            <div key={item.cart_key} className={styles.tableRow}>
                                                <div className={styles.tableCell} data-label="">
                                                    <Link href={`/products/${item.product_id}`} className={styles.itemImageLink}>
                                                        <div className={styles.itemImage}>
                                                            {item.image ? (
                                                                <img src={item.image} alt={item.name} />
                                                            ) : (
                                                                <div className={styles.imagePlaceholder}>
                                                                    {t('No image')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {item.image && (
                                                            <div className={styles.imagePreview}>
                                                                <div className={styles.imagePreviewTitle}>{item.name}</div>
                                                                <div className={styles.imagePreviewImage}>
                                                                    <img src={item.image} alt={item.name} />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Link>
                                                </div>

                                                <div className={styles.tableCell} data-label={t('Description')}>
                                                    <div className={styles.itemDetails}>
                                                        <div className={styles.itemNameRow}>
                                                            <Link href={`/products/${item.product_id}`} className={styles.itemNameLink} title={item.name}>
                                                                <h3 className={styles.itemName} title={item.name}>{item.name}</h3>
                                                            </Link>
                                                        </div>
                                                        {item.price_tier && (
                                                            <div className={styles.priceTierContainer}>
                                                                <div className={styles.priceTierRow}>
                                                                    {item.price_tiers && item.price_tiers.length > 0 ? (
                                                                        <div className={styles.tierTooltip}>
                                                                            <span
                                                                                className={`${styles.priceTierBadge} ${styles[`priceTierBadge${item.price_tier.tier_index}`]}`}
                                                                                title={t('Price tier')}
                                                                            >
                                                                                {t('Tier')} {item.price_tier.tier_index}
                                                                                <span className={styles.tierRange}>({item.price_tier.label})</span>
                                                                            </span>
                                                                            {tierTooltipContent}
                                                                        </div>
                                                                    ) : (
                                                                        <span
                                                                            className={`${styles.priceTierBadge} ${styles[`priceTierBadge${item.price_tier.tier_index}`]}`}
                                                                            title={t('Price tier')}
                                                                        >
                                                                            {t('Tier')} {item.price_tier.tier_index}
                                                                            <span className={styles.tierRange}>({item.price_tier.label})</span>
                                                                        </span>
                                                                    )}
                                                                    {item.price_tiers && item.price_tiers.length > 0 && (
                                                                        <div className={styles.tierTooltip}>
                                                                            <Info size={14} className={styles.tierInfoIcon} />
                                                                            {tierTooltipContent}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {item.sku && (
                                                            <p className={styles.itemMeta}>
                                                                {t('SKU')}: {item.sku}
                                                            </p>
                                                        )}
                                                        <p className={styles.itemMeta}>
                                                            {t('Stock')}: {item.stock_quantity > 0 ? `${item.stock_quantity} ${t('units')}` : t('Out of stock')}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className={styles.tableCell} data-label={t('Price')}>
                                                    <PriceDisplay price={formatPrice(unitPrice)} />
                                                </div>

                                                <div className={styles.tableCell} data-label={t('Quantity')}>
                                                    <div className={styles.quantityCellContainer}>
                                                        <div className={styles.quantityControls}>
                                                            <button
                                                                className={styles.quantityButton}
                                                                onClick={() => handleQuantityChange(item.cart_key, item.quantity - 1)}
                                                                disabled={item.quantity <= 1 || updatingItems.has(item.cart_key)}
                                                                title={t('Decrease quantity')}
                                                            >
                                                                <Minus size={14} />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                className={styles.quantityInput}
                                                                value={
                                                                    localQuantities[item.cart_key] !== undefined
                                                                        ? localQuantities[item.cart_key]
                                                                        : item.quantity
                                                                }
                                                                onChange={(e) => {
                                                                    const value = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                                                                    if (value === '' || (!isNaN(value as number) && value >= 1)) {
                                                                        setLocalQuantities(prev => ({
                                                                            ...prev,
                                                                            [item.cart_key]: value === '' ? '' : value as number
                                                                        }));
                                                                    }
                                                                }}
                                                                onBlur={(e) => {
                                                                    const value = parseInt(e.target.value, 10);
                                                                    if (!isNaN(value) && value >= 1) {
                                                                        if (value !== item.quantity) {
                                                                            // Keep local quantity set during update to prevent flicker
                                                                            // handleQuantityChange will trigger reload which will reset state
                                                                            handleQuantityChange(item.cart_key, value);
                                                                            // Don't clear localQuantities here - it will be reset after reload
                                                                        } else {
                                                                            // Value unchanged, clear local state immediately
                                                                            setLocalQuantities(prev => {
                                                                                const next = { ...prev };
                                                                                delete next[item.cart_key];
                                                                                return next;
                                                                            });
                                                                        }
                                                                    } else {
                                                                        // Invalid value, reset to original
                                                                        setLocalQuantities(prev => {
                                                                            const next = { ...prev };
                                                                            delete next[item.cart_key];
                                                                            return next;
                                                                        });
                                                                    }
                                                                }}
                                                                onKeyDown={(e) => {
                                                                    if (e.key === 'Enter') {
                                                                        e.currentTarget.blur();
                                                                    }
                                                                }}
                                                                min="1"
                                                                disabled={updatingItems.has(item.cart_key)}
                                                            />
                                                            <button
                                                                className={styles.quantityButton}
                                                                onClick={() => handleQuantityChange(item.cart_key, item.quantity + 1)}
                                                                disabled={updatingItems.has(item.cart_key)}
                                                                title={t('Increase quantity')}
                                                            >
                                                                <Plus size={14} />
                                                            </button>
                                                        </div>
                                                        {item.items_to_next_tier && item.items_to_next_tier > 0 && item.price_tier && nextTierPrice && (
                                                            <div
                                                                className={`${styles.nextTierBadge} ${styles[`nextTierBadge${item.price_tier.tier_index}`]}`}
                                                                onClick={() => {
                                                                    const newQuantity = item.quantity + item.items_to_next_tier!;
                                                                    handleQuantityChange(item.cart_key, newQuantity);
                                                                }}
                                                                style={{ cursor: 'pointer' }}
                                                                title={t('Click to apply quantity for next tier')}
                                                            >
                                                                <span className={styles.nextTierText}>
                                                                    +{item.items_to_next_tier} {t('buc')} → <PriceDisplay price={formatPrice(nextTierPrice)} />
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className={styles.tableCell} data-label={t('Total')}>
                                                    <PriceDisplay price={formatPrice(totalPrice)} />
                                                </div>

                                                <div className={`${styles.tableCell} ${styles.removeButtonCell}`} data-label="">
                                                    <button
                                                        className={styles.removeButton}
                                                        onClick={() => handleRemove(item.cart_key)}
                                                        disabled={removingItems.has(item.cart_key)}
                                                        title={t('Remove from cart')}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className={styles.summarySection}>
                            <div className={styles.summaryCard}>
                                <h2 className={styles.summaryTitle}>{t('Order Summary')}</h2>

                                <div className={styles.summaryContent}>
                                    <div className={styles.summaryRow}>
                                        <span>{t('Subtotal (excl. VAT)')}:</span>
                                        <span>
                                            <PriceDisplay price={formatPrice(cart.summary.total_excl_vat)} />
                                        </span>
                                    </div>

                                    <div className={styles.summaryRow}>
                                        <span>{t('VAT')} ({cart.summary.vat_rate}%):</span>
                                        <span>
                                            <PriceDisplay price={formatPrice(cart.summary.total_incl_vat - cart.summary.total_excl_vat)} />
                                        </span>
                                    </div>

                                    <div className={styles.summaryDivider}></div>

                                    <div className={styles.summaryRowTotal}>
                                        <span>{t('Total (incl. VAT)')}:</span>
                                        <span>
                                            <PriceDisplay price={formatPrice(cart.summary.total_incl_vat)} />
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.summaryInfo}>
                                    <p>
                                        {cart.summary.total_items} {cart.summary.total_items === 1 ? t('item') : t('items')}
                                    </p>
                                </div>

                                <div className={styles.summaryActions}>
                                    <Button
                                        variant="secondary"
                                        onClick={() => router.get('/products')}
                                        className={styles.continueShoppingButton}
                                    >
                                        <ArrowLeft size={16} />
                                        {t('Continue shopping')}
                                    </Button>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        className={styles.checkoutButton}
                                        onClick={() => {
                                            router.get('/checkout/order-details');
                                        }}
                                    >
                                        {t('Proceed to checkout')}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

