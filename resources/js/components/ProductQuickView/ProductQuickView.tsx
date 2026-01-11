import React, { useState, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Star, Heart, ShoppingCart, Package, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '../ui/Button';
import { useTranslations } from '../../utils/translations';
import { useToast } from '../../contexts/ToastContext';
import { PriceDisplay } from '../PriceDisplay/PriceDisplay';
import type { Currency, SharedData, CustomerGroup } from '../../types';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import styles from './ProductQuickView.module.css';

interface ProductImage {
    id: number;
    url: string;
    sort_order: number;
}

interface PriceTier {
    min_quantity: number;
    max_quantity: number | null;
    quantity_range: string;
    price_raw: number;
    price_display?: number;
}

interface ProductAttribute {
    id: number;
    name: string;
    code: string;
    type: 'select' | 'text' | 'color_swatch';
    is_filterable: boolean;
    values: AttributeValue[];
}

interface AttributeValue {
    id: number;
    value: string;
    meta_value?: string;
}

interface VariantAttribute {
    attribute_id: number;
    attribute_code: string;
    attribute_name: string;
    value_id: number;
    value: string;
    meta_value?: string;
}

interface Variant {
    id: number;
    name: string;
    price_raw: number;
    price_tiers: PriceTier[];
    stock_quantity: number;
    attributes: VariantAttribute[];
    images: ProductImage[];
}

interface Product {
    id: number;
    name: string;
    type?: 'simple' | 'configurable' | 'variant';
    price_raw: number;
    price_tiers: PriceTier[];
    images: ProductImage[];
    stock_quantity: number;
    sku: string | null;
    ean: string | null;
}

interface ProductQuickViewProps {
    product: Product;
    variants?: Variant[];
    availableAttributes?: ProductAttribute[];
}

export function ProductQuickView({ product, variants = [], availableAttributes = [] }: ProductQuickViewProps) {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const { showToast } = useToast();
    const customerGroup = (props.customerGroup as CustomerGroup | null) || null;
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [quantity, setQuantity] = useState(1);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);
    const thumbnailsRef = useRef<HTMLDivElement>(null);

    // Variant selection state
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, number>>({});
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    
    const isConfigurable = product.type === 'configurable' && variants.length > 0 && availableAttributes.length > 0;

    // Auto-select first available color if no color is selected
    useEffect(() => {
        if (!isConfigurable || !availableAttributes.length || !variants.length) {
            return;
        }

        // Check if color attribute exists
        const colorAttribute = availableAttributes.find(attr => 
            attr.code.toLowerCase() === 'color' || 
            attr.name.toLowerCase().includes('culoare') ||
            attr.type === 'color_swatch'
        );

        if (!colorAttribute) {
            return;
        }

        // Check if color should be auto-selected using callback to avoid dependency on selectedAttributes
        setSelectedAttributes(prev => {
            // Check if color is already selected in current state
            const hasColorSelected = prev[colorAttribute.code] !== undefined;

            if (hasColorSelected) {
                return prev; // Don't change state if already selected
            }

            // Find first available color value (check if it exists in any variant with stock > 0)
            const availableColorValues = colorAttribute.values.filter(val => {
                const variantsWithAttribute = variants.filter(variant => 
                    variant.attributes.some(attr => 
                        attr.attribute_code === colorAttribute.code && attr.value_id === val.id
                    )
                );
                
                return variantsWithAttribute.some(variant => variant.stock_quantity > 0);
            });

            if (availableColorValues.length > 0) {
                const firstColorValue = availableColorValues[0];
                return {
                    ...prev,
                    [colorAttribute.code]: firstColorValue.id,
                };
            }

            return prev; // No available colors, don't change state
        });
    }, [isConfigurable, availableAttributes, variants]);

    // Find variant based on selected attributes
    useEffect(() => {
        if (!isConfigurable) {
            setSelectedVariant(null);
            return;
        }

        const allSelected = availableAttributes.every(attr => 
            selectedAttributes[attr.code] !== undefined
        );

        if (allSelected) {
            const matchingVariant = variants.find(variant => {
                return availableAttributes.every(attr => {
                    const selectedValueId = selectedAttributes[attr.code];
                    return variant.attributes.some(vAttr => 
                        vAttr.attribute_code === attr.code && vAttr.value_id === selectedValueId
                    );
                });
            });

            if (matchingVariant) {
                setSelectedVariant(matchingVariant);
                if (matchingVariant.images && matchingVariant.images.length > 0) {
                    setSelectedImageIndex(0);
                }
            } else {
                setSelectedVariant(null);
            }
        } else {
            setSelectedVariant(null);
        }
    }, [selectedAttributes, variants, availableAttributes, isConfigurable]);

    // Determine which images to display
    let displayImages = product.images;
    if (isConfigurable && variants.length > 0) {
        if (selectedVariant && selectedVariant.images.length > 0) {
            displayImages = selectedVariant.images;
        } else if (selectedAttributes && Object.keys(selectedAttributes).length > 0) {
            const partiallyMatchingVariant = variants.find(variant => {
                return availableAttributes.every(attr => {
                    const selectedValueId = selectedAttributes[attr.code];
                    if (selectedValueId === undefined) return true;
                    return variant.attributes.some(vAttr => 
                        vAttr.attribute_code === attr.code && vAttr.value_id === selectedValueId
                    );
                });
            });
            
            if (partiallyMatchingVariant && partiallyMatchingVariant.images.length > 0) {
                displayImages = partiallyMatchingVariant.images;
            }
        }
    }

    // Determine which product data to use for display
    const displayProduct = (isConfigurable && selectedVariant) 
        ? { ...product, ...selectedVariant }
        : product;

    const mainImage = displayImages[selectedImageIndex] || displayImages[0];
    
    const hasVariantsInStock = isConfigurable 
        ? variants.some(v => v.stock_quantity > 0)
        : true;
    
    const isInStock = isConfigurable && !selectedVariant
        ? (hasVariantsInStock ? null : false)
        : displayProduct.stock_quantity > 0;

    const user = props.auth?.user;
    const isAuthenticated = !!user;
    type WishlistItem = { product_id?: number; id?: number };
    const wishlistItems = (props.wishlistItems as WishlistItem[] | undefined) || [];
    const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
    // For configurable products, always check the configurable product ID (parent), not variants
    const wishlistProductId = product.id;
    const isInWishlist = wishlistItems.some((item) => (item.product_id || item.id) === wishlistProductId);

    const checkScroll = () => {
        if (thumbnailsRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = thumbnailsRef.current;
            setCanScrollUp(scrollTop > 0);
            setCanScrollDown(scrollTop + clientHeight < scrollHeight - 5);
        }
    };

    const handleQuantityChange = (delta: number) => {
        const newQuantity = Math.max(1, quantity + delta);
        setQuantity(newQuantity);
    };

    const handleQuantityInput = (value: string) => {
        const numValue = parseInt(value, 10);
        if (!isNaN(numValue) && numValue >= 1) {
            setQuantity(numValue);
        }
    };

    const getPriceForQuantity = (qty: number): string => {
        if (currentCurrency) {
            const priceTiers = displayProduct.price_tiers || [];
            if (priceTiers.length > 0) {
                for (let i = priceTiers.length - 1; i >= 0; i--) {
                    const tier = priceTiers[i];
                    if (qty >= tier.min_quantity) {
                        const displayPrice = tier.price_display ?? tier.price_raw;
                        return formatPriceWithCurrency(displayPrice, currentCurrency);
                    }
                }
            }
            return formatPriceWithCurrency(displayProduct.price_raw, currentCurrency);
        }
        return displayProduct.price_raw.toFixed(2);
    };

    const getActiveTierForQuantity = (qty: number): number | null => {
        const priceTiers = displayProduct.price_tiers || [];
        if (priceTiers.length > 0) {
            for (let i = priceTiers.length - 1; i >= 0; i--) {
                const tier = priceTiers[i];
                if (qty >= tier.min_quantity) {
                    return tier.min_quantity;
                }
            }
        }
        return null;
    };

    const handleAttributeSelect = (attributeCode: string, valueId: number) => {
        setSelectedAttributes(prev => ({
            ...prev,
            [attributeCode]: valueId,
        }));
    };

    const isValueAvailable = (attributeCode: string, valueId: number): boolean => {
        if (!isConfigurable) return true;
        
        // Check if there are variants with this attribute value
        const variantsWithAttribute = variants.filter(variant => 
            variant.attributes.some(attr => 
                attr.attribute_code === attributeCode && attr.value_id === valueId
            )
        );
        
        if (variantsWithAttribute.length === 0) {
            return false; // No variant has this attribute value
        }
        
        // Check if any variant with this attribute value has stock > 0
        // Also consider already selected attributes to ensure valid combinations
        const hasStockAvailable = variantsWithAttribute.some(variant => {
            // Check if variant matches currently selected attributes (except the one being checked)
            const matchesSelectedAttributes = availableAttributes.every(attr => {
                if (attr.code === attributeCode) {
                    return true; // Skip current attribute being checked
                }
                const selectedValueId = selectedAttributes[attr.code];
                if (selectedValueId === undefined) {
                    return true; // No selection for this attribute yet, allow any
                }
                return variant.attributes.some(vAttr => 
                    vAttr.attribute_code === attr.code && vAttr.value_id === selectedValueId
                );
            });
            
            return matchesSelectedAttributes && variant.stock_quantity > 0;
        });
        
        return hasStockAvailable;
    };

    const getValueStockStatus = (attributeCode: string, valueId: number): { hasStock: boolean; hasVariants: boolean } => {
        if (!isConfigurable) return { hasStock: true, hasVariants: true };
        
        // Check if there are variants with this attribute value
        const variantsWithAttribute = variants.filter(variant => 
            variant.attributes.some(attr => 
                attr.attribute_code === attributeCode && attr.value_id === valueId
            )
        );
        
        if (variantsWithAttribute.length === 0) {
            return { hasStock: false, hasVariants: false };
        }
        
        // Check if any variant with this attribute value has stock > 0
        // Also consider already selected attributes to ensure valid combinations
        const hasStockAvailable = variantsWithAttribute.some(variant => {
            // Check if variant matches currently selected attributes (except the one being checked)
            const matchesSelectedAttributes = availableAttributes.every(attr => {
                if (attr.code === attributeCode) {
                    return true;
                }
                const selectedValueId = selectedAttributes[attr.code];
                if (selectedValueId === undefined) {
                    return true;
                }
                return variant.attributes.some(vAttr => 
                    vAttr.attribute_code === attr.code && vAttr.value_id === selectedValueId
                );
            });
            
            return matchesSelectedAttributes && variant.stock_quantity > 0;
        });
        
        return { hasStock: hasStockAvailable, hasVariants: true };
    };

    const scrollThumbnails = (direction: 'up' | 'down') => {
        if (thumbnailsRef.current) {
            const scrollAmount = 80;
            const currentScroll = thumbnailsRef.current.scrollTop;
            const newScroll = direction === 'up'
                ? currentScroll - scrollAmount
                : currentScroll + scrollAmount;
            thumbnailsRef.current.scrollTo({ top: newScroll, behavior: 'smooth' });
            setTimeout(checkScroll, 300);
        }
    };

    useEffect(() => {
        checkScroll();
        const handleResize = () => {
            setTimeout(checkScroll, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const currentPrice = getPriceForQuantity(quantity);
    const activeTierMinQuantity = getActiveTierForQuantity(quantity);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const handleAddToCart = async () => {
        if (isConfigurable && !selectedVariant) {
            showToast(t('Please select all product options'), 'error');
            return;
        }

        if (isInStock === false || isAddingToCart) {
            return;
        }

        setIsAddingToCart(true);

        try {
            const productIdToAdd = (isConfigurable && selectedVariant) 
                ? selectedVariant.id 
                : product.id;

            router.post('/cart/add', {
                product_id: productIdToAdd,
                quantity: quantity,
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

    const handleToggleWishlist = async () => {
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
                const response = await fetch(`/wishlist/${product.id}`, {
                    method: 'DELETE',
                    headers: {
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    credentials: 'same-origin',
                });

                if (response.ok) {
                    router.reload({ only: ['wishlistItems', 'wishlistSummary'] });
                } else {
                    alert(t('Error removing from wishlist'));
                }
            } else {
                router.post('/wishlist/add', {
                    product_id: product.id,
                }, {
                    preserveScroll: true,
                    onSuccess: () => {
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
        <div className={styles.container}>
            {/* 1. Product Image */}
            <div className={styles.imageSection}>
                {displayImages.length > 1 && (
                    <div className={styles.thumbnailsWrapper}>
                        {canScrollUp && (
                            <button
                                className={styles.thumbnailScrollButton}
                                onClick={() => scrollThumbnails('up')}
                                aria-label="Scroll up"
                            >
                                <ChevronUp size={16} />
                            </button>
                        )}
                        <div
                            className={styles.thumbnails}
                            ref={thumbnailsRef}
                            onScroll={checkScroll}
                        >
                            {displayImages.map((image, index) => (
                                <button
                                    key={image.id}
                                    className={`${styles.thumbnail} ${selectedImageIndex === index ? styles.thumbnailActive : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <img src={image.url} alt={`${product.name} ${index + 1}`} />
                                </button>
                            ))}
                        </div>
                        {canScrollDown && (
                            <button
                                className={styles.thumbnailScrollButton}
                                onClick={() => scrollThumbnails('down')}
                                aria-label="Scroll down"
                            >
                                <ChevronDown size={16} />
                            </button>
                        )}
                    </div>
                )}
                <div className={styles.mainImageWrapper}>
                    {mainImage ? (
                        <img
                            src={mainImage.url}
                            alt={product.name}
                            className={styles.mainImage}
                        />
                    ) : (
                        <div className={styles.imagePlaceholder}>
                            {t('No image')}
                        </div>
                    )}
                    {isInStock === false && (
                        <div className={styles.outOfStockBadge}>
                            {t('Out of stock')}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Variant Selector (Color, Size) */}
            {isConfigurable && (
                <div className={styles.variantSelector}>
                    {availableAttributes && availableAttributes.length > 0 ? (
                        availableAttributes.map(attr => (
                            <div key={attr.id} className={styles.attributeGroup}>
                                <label className={styles.attributeLabel}>
                                    {attr.name}
                                </label>
                                {attr.type === 'color_swatch' ? (
                                    <div className={styles.colorSwatch}>
                                        {attr.values.map(val => {
                                            const isSelected = selectedAttributes[attr.code] === val.id;
                                            const stockStatus = getValueStockStatus(attr.code, val.id);
                                            const isAvailable = stockStatus.hasStock && stockStatus.hasVariants;
                                            const isOutOfStock = stockStatus.hasVariants && !stockStatus.hasStock;
                                            const title = isOutOfStock 
                                                ? `${val.value} - ${t('Out of stock', 'Stoc epuizat')}`
                                                : !stockStatus.hasVariants
                                                ? `${val.value} - ${t('Unavailable', 'Indisponibil')}`
                                                : val.value;
                                            
                                            return (
                                                <button
                                                    key={val.id}
                                                    type="button"
                                                    className={`${styles.colorOption} ${isSelected ? styles.selected : ''} ${!isAvailable ? styles.unavailable : ''} ${isOutOfStock ? styles.outOfStock : ''}`}
                                                    style={{ 
                                                        backgroundColor: val.meta_value || '#ccc'
                                                    }}
                                                    onClick={() => isAvailable && handleAttributeSelect(attr.code, val.id)}
                                                    title={title}
                                                    disabled={!isAvailable}
                                                    aria-label={`Select ${val.value}${isOutOfStock ? ' - Out of stock' : ''}`}
                                                />
                                            );
                                        })}
                                    </div>
                                ) : (attr.code.toLowerCase() === 'size' || attr.code.toLowerCase() === 'marime' || attr.name.toLowerCase().includes('mărime') || attr.name.toLowerCase().includes('size')) ? (
                                    <div className={styles.sizeOptions}>
                                        {attr.values.map(val => {
                                            const isSelected = selectedAttributes[attr.code] === val.id;
                                            const stockStatus = getValueStockStatus(attr.code, val.id);
                                            const isAvailable = stockStatus.hasStock && stockStatus.hasVariants;
                                            const isOutOfStock = stockStatus.hasVariants && !stockStatus.hasStock;
                                            const title = isOutOfStock 
                                                ? `${val.value} - ${t('Out of stock', 'Stoc epuizat')}`
                                                : !stockStatus.hasVariants
                                                ? `${val.value} - ${t('Unavailable', 'Indisponibil')}`
                                                : undefined;
                                            
                                            return (
                                                <button
                                                    key={val.id}
                                                    type="button"
                                                    className={`${styles.sizeOption} ${isSelected ? styles.selected : ''} ${!isAvailable ? styles.unavailable : ''} ${isOutOfStock ? styles.outOfStock : ''}`}
                                                    onClick={() => isAvailable && handleAttributeSelect(attr.code, val.id)}
                                                    disabled={!isAvailable}
                                                    title={title}
                                                    aria-label={`Select size ${val.value}${isOutOfStock ? ' - Out of stock' : ''}`}
                                                >
                                                    {val.value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <select
                                        className={styles.attributeSelect}
                                        value={selectedAttributes[attr.code] || ''}
                                        onChange={(e) => handleAttributeSelect(attr.code, parseInt(e.target.value))}
                                    >
                                        <option value="">{t('Select')} {attr.name}</option>
                                        {attr.values.map(val => {
                                            const stockStatus = getValueStockStatus(attr.code, val.id);
                                            const isAvailable = stockStatus.hasStock && stockStatus.hasVariants;
                                            const isOutOfStock = stockStatus.hasVariants && !stockStatus.hasStock;
                                            const label = isOutOfStock 
                                                ? `${val.value} (${t('Out of stock', 'Stoc epuizat')})`
                                                : !stockStatus.hasVariants
                                                ? `${val.value} (${t('Unavailable', 'Indisponibil')})`
                                                : val.value;
                                            
                                            return (
                                                <option 
                                                    key={val.id} 
                                                    value={val.id} 
                                                    disabled={!isAvailable}
                                                >
                                                    {label}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>
                                    ))
                    ) : variants && variants.length === 0 ? (
                        <p className={styles.noVariantsMessage}>
                            {t('This product has no variants available. Please contact us for more information.')}
                        </p>
                    ) : (
                        <p className={styles.noVariantsMessage}>
                            {t('Product variants are being set up. Please check back later.')}
                        </p>
                    )}
                </div>
            )}

            {/* 3. Price */}
            <div className={styles.priceSection}>
                <div className={styles.currentPrice}>
                    <PriceDisplay price={currentPrice} />
                </div>
                {displayProduct.price_tiers && displayProduct.price_tiers.length > 0 && (
                    <div className={styles.priceTiersTable}>
                        <div className={styles.priceTiersHeader}>
                            <div className={styles.priceTierHeader}>{t('Quantity')}</div>
                            <div className={`${styles.priceTierHeader} ${styles.priceTierHeaderRight}`}>{t('Price')}</div>
                        </div>
                        <div className={styles.priceTiersBody}>
                            {displayProduct.price_tiers.map((tier) => {
                                const isActive = activeTierMinQuantity === tier.min_quantity;
                                const displayPriceValue = tier.price_display ?? tier.price_raw;
                                const displayPrice = currentCurrency
                                    ? formatPriceWithCurrency(displayPriceValue, currentCurrency)
                                    : displayPriceValue.toFixed(2);
                                return (
                                    <div
                                        key={tier.min_quantity}
                                        className={`${styles.priceTierRow} ${isActive ? styles.priceTierRowActive : ''}`}
                                    >
                                        <div className={styles.priceTierQuantity}>{tier.quantity_range}</div>
                                        <div className={styles.priceTierPrice}>
                                            <PriceDisplay price={displayPrice} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* 4. Rest: Quantity, Stock, SKU, Buttons */}
            <div className={styles.actionsSection}>
                {/* Stock Information - Only show for simple products or when variant is selected */}
                {(!isConfigurable || selectedVariant) && displayProduct.stock_quantity !== undefined && (
                    <div className={styles.stockInfo}>
                        <Package size={14} />
                        <span>
                            {t('Stock')}: {displayProduct.stock_quantity} {t('units', 'unitati')}
                        </span>
                    </div>
                )}
                
                {displayProduct.sku && (
                    <div className={styles.skuInfo}>
                        <span className={styles.skuLabel}>SKU:</span>
                        <span className={styles.skuValue}>{displayProduct.sku}</span>
                    </div>
                )}

                {product.ean && (
                    <div className={styles.skuInfo}>
                        <span className={styles.skuLabel}>EAN:</span>
                        <span className={styles.skuValue}>{product.ean}</span>
                    </div>
                )}

                <div className={styles.quantitySection}>
                    <label className={styles.quantityLabel}>{t('Quantity')}:</label>
                    <div className={styles.quantityControls}>
                        <button
                            className={styles.quantityButton}
                            onClick={() => handleQuantityChange(-1)}
                            disabled={quantity <= 1}
                        >
                            -
                        </button>
                        <input
                            type="number"
                            className={styles.quantityInput}
                            value={quantity}
                            onChange={(e) => handleQuantityInput(e.target.value)}
                            min="1"
                        />
                        <button
                            className={styles.quantityButton}
                            onClick={() => handleQuantityChange(1)}
                        >
                            +
                        </button>
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        className={styles.wishlistButton}
                        onClick={handleToggleWishlist}
                        disabled={isTogglingWishlist}
                        title={isInWishlist ? t('Remove from wishlist') : t('Add to wishlist')}
                    >
                        <Heart
                            size={18}
                            fill={isInWishlist ? '#ef4444' : 'none'}
                            stroke={isInWishlist ? '#ef4444' : 'currentColor'}
                        />
                    </Button>
                </div>

                <div className={styles.actionButtons}>
                    <button
                        type="button"
                        className={styles.buyButton}
                        disabled={isInStock === false || isAddingToCart || (isConfigurable && !selectedVariant)}
                        onClick={handleAddToCart}
                    >
                        <span className={styles.buyButtonIcon}>
                            <ShoppingCart size={20} />
                        </span>
                        <span className={styles.buyButtonText}>
                            {isConfigurable && !selectedVariant 
                                ? t('Select options to add to cart')
                                : isAddingToCart 
                                ? t('Adding...') 
                                : t('Add to Cart')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
