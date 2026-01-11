import React, { useState, useRef, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import { Star, Heart, ShoppingCart, Package, Truck, Shield, CheckCircle, ChevronUp, ChevronDown, ChevronRight, ThumbsUp } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { useTranslations } from '../../utils/translations';
import { useToast } from '../../contexts/ToastContext';
import { PriceDisplay } from '../../components/PriceDisplay/PriceDisplay';
import type { Currency, SharedData, CustomerGroup } from '../../types';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import styles from './show.module.css';

interface ProductImage {
    id: number;
    url: string;
    sort_order: number;
}

interface BreadcrumbItem {
    name: string;
    slug: string;
}

interface ProductCategory {
    id: number;
    name: string;
    slug: string;
    breadcrumb?: BreadcrumbItem[];
}

interface PriceTier {
    min_quantity: number;
    max_quantity: number | null;
    quantity_range: string;
    price_raw: number; // For backward compatibility (includes VAT)
    price_display?: number; // Price already calculated for customer group display (preferred)
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
    model?: string | null;
    weight?: number | null;
    length?: number | null;
    width?: number | null;
    height?: number | null;
}

interface Product {
    id: number;
    name: string;
    type?: 'simple' | 'configurable' | 'variant';
    price_raw: number;
    price_tiers: PriceTier[];
    description: string | null;
    short_description: string | null;
    images: ProductImage[];
    categories: ProductCategory[];
    stock_quantity: number;
    sku: string | null;
    ean: string | null;
    model: string | null;
    weight: number | null;
    length: number | null;
    width: number | null;
    height: number | null;
    vat_included: boolean;
    attributes?: VariantAttribute[];
}

interface ReviewStats {
    total_reviews: number;
    average_rating: number;
    rating_distribution: {
        5: number;
        4: number;
        3: number;
        2: number;
        1: number;
    };
}

interface ProductShowProps {
    product: Product;
    variants?: Variant[];
    availableAttributes?: ProductAttribute[];
    preselectedAttributes?: Record<string, number>;
    reviewStats?: ReviewStats;
    canReview?: boolean;
    hasReviewed?: boolean;
}

export function ProductShowContent({ product, variants = [], availableAttributes = [], preselectedAttributes = {}, reviewStats, canReview = false, hasReviewed = false }: ProductShowProps) {
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
    const mainImageRef = useRef<HTMLDivElement>(null);
    const imageCarouselRef = useRef<HTMLDivElement>(null);
    const isScrollingRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const isConfigurable = product.type === 'configurable' && variants.length > 0 && availableAttributes.length > 0;
    
    const [selectedAttributes, setSelectedAttributes] = useState<Record<string, number>>(() => {
        if (preselectedAttributes && Object.keys(preselectedAttributes).length > 0 && isConfigurable) {
            return preselectedAttributes;
        }
        return {};
    });
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);

    useEffect(() => {
        if (preselectedAttributes && Object.keys(preselectedAttributes).length > 0 && isConfigurable) {
            setSelectedAttributes(preselectedAttributes);
        }
    }, [preselectedAttributes, isConfigurable]);

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
            // Check if color is already selected (either in preselectedAttributes or current state)
            const hasColorSelected = preselectedAttributes[colorAttribute.code] !== undefined ||
                                    prev[colorAttribute.code] !== undefined;

            if (hasColorSelected) {
                return prev; // Don't change state if already selected
            }

            // Find first available color value (check if it exists in any variant)
            const availableColorValues = colorAttribute.values.filter(val => 
                variants.some(variant => 
                    variant.attributes.some(attr => 
                        attr.attribute_code === colorAttribute.code && attr.value_id === val.id
                    )
                )
            );

            if (availableColorValues.length > 0) {
                const firstColorValue = availableColorValues[0];
                return {
                    ...prev,
                    [colorAttribute.code]: firstColorValue.id,
                };
            }

            return prev; // No available colors, don't change state
        });
    }, [isConfigurable, availableAttributes, variants, preselectedAttributes]);

    // Find variant based on selected attributes
    useEffect(() => {
        if (!isConfigurable) {
            setSelectedVariant(null);
            return;
        }

        // Check if all attributes are selected
        const allSelected = availableAttributes.every(attr => 
            selectedAttributes[attr.code] !== undefined
        );

        if (allSelected) {
            // Find matching variant
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
                // Update images when variant changes
                if (matchingVariant.images && matchingVariant.images.length > 0) {
                    setSelectedImageIndex(0);
                }
            } else {
                setSelectedVariant(null);
            }
        } else {
            const partiallyMatchingVariants = variants.filter(variant => {
                return availableAttributes.every(attr => {
                    const selectedValueId = selectedAttributes[attr.code];
                    if (selectedValueId === undefined) {
                        return true;
                    }
                    return variant.attributes.some(vAttr => 
                        vAttr.attribute_code === attr.code && vAttr.value_id === selectedValueId
                    );
                });
            });

            if (partiallyMatchingVariants.length > 0) {
                const previewVariant = partiallyMatchingVariants[0];
                if (previewVariant.images && previewVariant.images.length > 0) {
                    setSelectedImageIndex(0);
                }
                setSelectedVariant(null);
            } else {
                setSelectedVariant(null);
            }
        }
    }, [selectedAttributes, variants, availableAttributes, isConfigurable]);

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
    const displayProduct = (isConfigurable && selectedVariant) 
        ? { ...product, ...selectedVariant }
        : product;

    const mainImage = displayImages[selectedImageIndex] || displayImages[0];
    
    // Check if any variant has stock (for configurable products)
    const hasVariantsInStock = isConfigurable 
        ? variants.some(v => v.stock_quantity > 0)
        : true; // For simple products, assume true (we'll check the product stock)
    
    // For configurable products without a selected variant:
    // - If no variants have stock, show "out of stock"
    // - If some variants have stock, don't show stock status yet (wait for selection)
    // For configurable products with a selected variant, use the variant's stock
    // For simple products, use the product's stock
    const isInStock = isConfigurable && !selectedVariant
        ? (hasVariantsInStock ? null : false) // null = waiting for selection, false = all out of stock
        : displayProduct.stock_quantity > 0;
    const isB2CDefault = !customerGroup || customerGroup.code === 'B2C';
    const showTechnicalInfo = true;
    const user = props.auth?.user;
    const isAuthenticated = !!user;
    const wishlistItems = (props.wishlistItems as any[]) || [];
    const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

    // Check if product is in wishlist from props (reacts to changes automatically)
    // For configurable products, always check the configurable product ID (parent), not variants
    const wishlistProductId = product.id;
    const isInWishlist = wishlistItems.some((item: any) => (item.product_id || item.id) === wishlistProductId);

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
                        // Use price_display if available (already calculated by backend), otherwise fallback to price_raw
                        const displayPrice = tier.price_display ?? tier.price_raw;
                        return formatPriceWithCurrency(displayPrice, currentCurrency);
                    }
                }
            }
            // For base price, price_raw from backend is already the display price (calculated by backend)
            return formatPriceWithCurrency(displayProduct.price_raw, currentCurrency);
        }

        // Fallback if no currency available
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
        if (imageCarouselRef.current && !isScrollingRef.current) {
            const imageWidth = imageCarouselRef.current.clientWidth;
            const scrollPosition = selectedImageIndex * imageWidth;
            isScrollingRef.current = true;
            imageCarouselRef.current.scrollTo({
                left: scrollPosition,
                behavior: 'smooth'
            });
            setTimeout(() => {
                isScrollingRef.current = false;
            }, 300);
        }
    }, [selectedImageIndex]);

    const handleCarouselScroll = () => {
        if (imageCarouselRef.current && !isScrollingRef.current) {
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
            scrollTimeoutRef.current = setTimeout(() => {
                    if (imageCarouselRef.current && !isScrollingRef.current) {
                        const scrollLeft = imageCarouselRef.current.scrollLeft;
                        const imageWidth = imageCarouselRef.current.clientWidth;
                        const newIndex = Math.round(scrollLeft / imageWidth);
                        if (newIndex !== selectedImageIndex && newIndex >= 0 && newIndex < displayImages.length) {
                        isScrollingRef.current = true;
                        setSelectedImageIndex(newIndex);
                        setTimeout(() => {
                            isScrollingRef.current = false;
                        }, 100);
                    }
                }
            }, 100);
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
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, []);

    const currentPrice = getPriceForQuantity(quantity);
    const activeTierMinQuantity = getActiveTierForQuantity(quantity);
    const [isAddingToCart, setIsAddingToCart] = useState(false);

    const handleAddToCart = async () => {
        // For configurable products, require variant selection
        if (isConfigurable && !selectedVariant) {
            showToast(t('Please select all product options'), 'error');
            return;
        }

        if (isInStock === false || isAddingToCart) {
            return;
        }

        setIsAddingToCart(true);

        try {
            // Use variant ID if configurable product, otherwise use product ID
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
                    // Reload page to update cart summary and items in navbar
                    router.reload({ only: ['cartSummary', 'cartItems'] });
                },
                onError: (errors) => {
                    let errorMessage = t('Insufficient stock');

                    // Check for validation errors
                    if (errors.product_id) {
                        errorMessage = Array.isArray(errors.product_id) ? errors.product_id[0] : errors.product_id;
                    } else if (errors.quantity) {
                        errorMessage = Array.isArray(errors.quantity) ? errors.quantity[0] : errors.quantity;
                    } else if (errors.message) {
                        errorMessage = Array.isArray(errors.message) ? errors.message[0] : errors.message;
                    } else if (typeof errors === 'string') {
                        errorMessage = errors;
                    } else if (Object.keys(errors).length > 0) {
                        // Get first error message
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
                // Remove from wishlist
                const response = await fetch(`/wishlist/${product.id}`, {
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
                    product_id: product.id,
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

    // Get the first category for breadcrumb (or use the first available)
    const primaryCategory = product.categories && product.categories.length > 0 ? product.categories[0] : null;
    const breadcrumb = primaryCategory?.breadcrumb || [];

    return (
        <div className={styles.container}>
            {/* Breadcrumb */}
            {breadcrumb.length > 0 && (
                <nav className={styles.breadcrumb}>
                    <a href="/" onClick={(e) => { e.preventDefault(); router.get('/'); }}>
                        {t('Home')}
                    </a>
                    {breadcrumb.map((item) => (
                        <React.Fragment key={item.slug}>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <a
                                href={`/categories/${item.slug}`}
                                onClick={(e) => { e.preventDefault(); router.get(`/categories/${item.slug}`); }}
                            >
                                {item.name}
                            </a>
                        </React.Fragment>
                    ))}
                    <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                    <span className={styles.breadcrumbCurrent}>{product.name}</span>
                </nav>
            )}
            <div className={styles.productWrapper}>
                {/* Left Column - Product Images and Content */}
                <div className={styles.leftColumn}>
                    {/* Images Gallery */}
                    <div className={styles.imagesGallery}>
                        {/* Thumbnail Navigation - Desktop: Left side, Mobile: Hidden initially */}
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
                                            <img src={image.url} alt={`${displayProduct.name} ${index + 1}`} />
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

                        {/* Main Image - Desktop */}
                        <div
                            className={styles.mainImageWrapper}
                            ref={mainImageRef}
                        >
                            {mainImage ? (
                                <img
                                    src={mainImage.url}
                                    alt={displayProduct.name}
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

                        {/* Image Carousel - Mobile */}
                        <div
                            className={styles.imageCarousel}
                            ref={imageCarouselRef}
                            onScroll={handleCarouselScroll}
                        >
                            {displayImages.map((image, index) => (
                                <div key={image.id} className={styles.carouselImageWrapper}>
                                    <img
                                        src={image.url}
                                        alt={`${displayProduct.name} ${index + 1}`}
                                        className={styles.carouselImage}
                                    />
                                    {isInStock === false && index === 0 && (
                                        <div className={styles.outOfStockBadge}>
                                            {t('Out of stock')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Thumbnails Horizontal - Mobile only */}
                    {displayImages.length > 1 && (
                        <div className={styles.thumbnailsHorizontal}>
                            {displayImages.map((image, index) => (
                                <button
                                    key={image.id}
                                    className={`${styles.thumbnailHorizontal} ${selectedImageIndex === index ? styles.thumbnailHorizontalActive : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <img src={image.url} alt={`${displayProduct.name} ${index + 1}`} />
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Description Section */}
                    {product.description && (
                        <div className={styles.descriptionSection}>
                            <h2 className={styles.sectionTitle}>{t('Description')}</h2>
                            <div className={styles.descriptionContent}>
                                {product.description.split('\n').map((paragraph, index) => (
                                    <p key={index}>{paragraph}</p>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Specifications Section */}
                    <div className={styles.specificationsSection}>
                        <h2 className={styles.sectionTitle}>{t('Specifications')}</h2>
                        <div className={styles.specificationsContent}>
                            {(() => {
                                // For configurable products, use variant data if selected, otherwise use product data
                                const displayModel = (isConfigurable && selectedVariant) 
                                    ? (selectedVariant as any).model || product.model
                                    : product.model;
                                const displayWeight = (isConfigurable && selectedVariant) 
                                    ? (selectedVariant as any).weight || product.weight
                                    : product.weight;
                                const displayLength = (isConfigurable && selectedVariant) 
                                    ? (selectedVariant as any).length || product.length
                                    : product.length;
                                const displayWidth = (isConfigurable && selectedVariant) 
                                    ? (selectedVariant as any).width || product.width
                                    : product.width;
                                const displayHeight = (isConfigurable && selectedVariant) 
                                    ? (selectedVariant as any).height || product.height
                                    : product.height;
                                // Use variant attributes if selected, otherwise use product attributes
                                const displayAttributes = (isConfigurable && selectedVariant) 
                                    ? selectedVariant.attributes
                                    : (product.attributes || []);

                                return (
                                    <>
                                        {displayModel && (
                                            <div className={styles.specificationRow}>
                                                <span className={styles.specificationLabel}>{t('Model')}:</span>
                                                <span className={styles.specificationValue}>{displayModel}</span>
                                            </div>
                                        )}
                                        {displayWeight && (
                                            <div className={styles.specificationRow}>
                                                <span className={styles.specificationLabel}>{t('Weight')}:</span>
                                                <span className={styles.specificationValue}>{displayWeight} kg</span>
                                            </div>
                                        )}
                                        {(displayLength || displayWidth || displayHeight) && (
                                            <div className={styles.specificationRow}>
                                                <span className={styles.specificationLabel}>{t('Dimensions')}:</span>
                                                <span className={styles.specificationValue}>
                                                    {displayLength && `${displayLength} cm`}
                                                    {displayLength && (displayWidth || displayHeight) && ' × '}
                                                    {displayWidth && `${displayWidth} cm`}
                                                    {displayWidth && displayHeight && ' × '}
                                                    {displayHeight && `${displayHeight} cm`}
                                                </span>
                                            </div>
                                        )}
                                        {displayAttributes && displayAttributes.length > 0 && displayAttributes.map((attr) => (
                                            <div key={`${attr.attribute_id}-${attr.value_id}`} className={styles.specificationRow}>
                                                <span className={styles.specificationLabel}>{attr.attribute_name}:</span>
                                                <span className={styles.specificationValue}>{attr.value}</span>
                                            </div>
                                        ))}
                                    </>
                                );
                            })()}
                        </div>
                    </div>

                    {/* Reviews Section */}
                    <ReviewsSection
                        productId={product.id}
                        reviewStats={reviewStats}
                        canReview={canReview}
                        hasReviewed={hasReviewed}
                    />
                </div>

                {/* Right Column - Product Details Card (Sticky) */}
                <div className={styles.rightColumn}>
                    <div className={styles.detailsCard}>
                        {/* Product Title */}
                        <h1 className={styles.productTitle}>{product.name}</h1>

                        {/* Rating */}
                        {reviewStats && reviewStats.total_reviews > 0 && (
                            <div className={styles.rating}>
                                <div className={styles.ratingStars}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={18}
                                            className={styles.star}
                                            fill={star <= Math.round(reviewStats.average_rating) ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                </div>
                                <span className={styles.ratingText}>
                                    {reviewStats.average_rating.toFixed(1)} ({reviewStats.total_reviews} {reviewStats.total_reviews === 1 ? t('evaluation') : t('evaluations')})
                                </span>
                            </div>
                        )}

                        {/* Price */}
                        <div className={styles.priceSection}>
                            {displayProduct.price_tiers && displayProduct.price_tiers.length > 0 ? (
                                <div className={styles.priceTiers}>
                                    <div className={styles.currentPrice}>
                                        <PriceDisplay price={currentPrice} />
                                    </div>
                                    <div className={styles.priceNote}>
                                        {t('Price for quantity')} {quantity}
                                    </div>
                                    <div className={styles.priceTiersTable}>
                                        <div className={styles.priceTiersHeader}>
                                            <div className={styles.priceTierHeader}>{t('Quantity')}</div>
                                            <div className={`${styles.priceTierHeader} ${styles.priceTierHeaderRight}`}>{t('Price')}</div>
                                        </div>
                                        <div className={styles.priceTiersBody}>
                                            {displayProduct.price_tiers.map((tier) => {
                                                const isActive = activeTierMinQuantity === tier.min_quantity;
                                                // Use price_display if available (already calculated by backend), otherwise fallback to price_raw
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
                                </div>
                            ) : (
                                <div className={styles.currentPrice}>
                                    <PriceDisplay price={getPriceForQuantity(quantity)} />
                                </div>
                            )}
                        </div>

                        {/* Variant Selector */}
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

                        {/* Stock Information - Only show for simple products or when variant is selected */}
                        {showTechnicalInfo && (!isConfigurable || selectedVariant) && (
                            <div className={styles.stockInfo}>
                                <Package size={16} />
                                <span>
                                    {t('Stock')}: {displayProduct.stock_quantity} {t('units')}
                                </span>
                            </div>
                        )}

                        {/* SKU */}
                        {showTechnicalInfo && displayProduct.sku && (
                            <div className={styles.skuInfo}>
                                <span className={styles.skuLabel}>SKU:</span>
                                <span className={styles.skuValue}>{displayProduct.sku}</span>
                            </div>
                        )}

                        {/* EAN */}
                        {showTechnicalInfo && product.ean && (
                            <div className={styles.skuInfo}>
                                <span className={styles.skuLabel}>EAN:</span>
                                <span className={styles.skuValue}>{product.ean}</span>
                            </div>
                        )}

                        {/* Quantity Selector */}
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
                                size="lg"
                                className={styles.wishlistButton}
                                onClick={handleToggleWishlist}
                                disabled={isTogglingWishlist}
                                title={isInWishlist ? t('Remove from wishlist') : t('Add to wishlist')}
                            >
                                <Heart
                                    size={20}
                                    fill={isInWishlist ? '#ef4444' : 'none'}
                                    stroke={isInWishlist ? '#ef4444' : 'currentColor'}
                                />
                            </Button>
                        </div>

                        {/* Action Buttons */}
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

                        {/* Service Information */}
                        <div className={styles.serviceInfo}>
                            <div className={styles.serviceItem}>
                                <Truck size={16} />
                                <span>{t('Free shipping')}</span>
                            </div>
                            <div className={styles.serviceItem}>
                                <Shield size={16} />
                                <span>{t('Secure payment')}</span>
                            </div>
                            <div className={styles.serviceItem}>
                                <CheckCircle size={16} />
                                <span>{t('14 days return')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

interface ReviewsSectionProps {
    productId: number;
    reviewStats?: ReviewStats;
    canReview?: boolean;
    hasReviewed?: boolean;
}

function ReviewsSection({ productId, reviewStats, canReview, hasReviewed }: ReviewsSectionProps) {
    const { t } = useTranslations();
    const [reviews, setReviews] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
    const [reviewForm, setReviewForm] = useState({ rating: 0, comment: '' });
    const [submitting, setSubmitting] = useState(false);
    const user = usePage<SharedData>().props.auth?.user;
    const isAuthenticated = !!user;

    useEffect(() => {
        loadReviews();
    }, [productId]);

    const loadReviews = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/products/${productId}/reviews`);
            const data = await response.json();
            setReviews(data.reviews || []);
        } catch (error) {
            console.error('Error loading reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmitReview = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isAuthenticated) {
            router.get('/login');
            return;
        }

        if (reviewForm.rating === 0) {
            alert(t('Please select a rating'));
            return;
        }

        setSubmitting(true);
        router.post('/reviews', {
            product_id: productId,
            rating: reviewForm.rating,
            comment: reviewForm.comment,
        }, {
            preserveScroll: true,
            onSuccess: () => {
                setIsReviewModalOpen(false);
                setReviewForm({ rating: 0, comment: '' });
                loadReviews();
                router.reload({ only: ['reviewStats', 'canReview', 'hasReviewed'] });
            },
            onError: (errors) => {
                let errorMessage = t('Error submitting review');
                if (errors.error) {
                    errorMessage = Array.isArray(errors.error) ? errors.error[0] : errors.error;
                }
                alert(errorMessage);
            },
            onFinish: () => {
                setSubmitting(false);
            },
        });
    };

    const handleMarkUseful = async (reviewId: number) => {
        if (!isAuthenticated) {
            router.get('/login');
            return;
        }

        try {
            const response = await fetch(`/reviews/${reviewId}/useful`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                loadReviews();
            } else if (!data.success && data.message) {
                alert(data.message);
            }
        } catch (error) {
            console.error('Error marking review as useful:', error);
            alert(t('Error marking review as useful'));
        }
    };

    const averageRating = reviewStats?.average_rating || 0;
    const totalReviews = reviewStats?.total_reviews || 0;

    return (
        <div className={styles.reviewsSection}>
            <div className={styles.reviewsHeader}>
                <h2 className={styles.sectionTitle}>{t('Customer Reviews')}</h2>
                {totalReviews > 0 && (
                    <div className={styles.reviewsSummary}>
                        <div className={styles.ratingDisplay}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                    key={star}
                                    size={20}
                                    className={styles.star}
                                    fill={star <= Math.round(averageRating) ? 'currentColor' : 'none'}
                                />
                            ))}
                            <span className={styles.ratingText}>
                                {averageRating.toFixed(1)} ({totalReviews} {totalReviews === 1 ? t('evaluation') : t('evaluations')})
                            </span>
                        </div>
                    </div>
                )}
                {canReview && isAuthenticated && (
                    <Button
                        variant="primary"
                        size="md"
                        onClick={() => setIsReviewModalOpen(true)}
                        className={styles.addReviewButton}
                    >
                        {t('Write a Review')}
                    </Button>
                )}
                {!isAuthenticated && (
                    <Button
                        variant="secondary"
                        size="md"
                        onClick={() => router.get('/login')}
                        className={styles.addReviewButton}
                    >
                        {t('Login to Review')}
                    </Button>
                )}
            </div>

            {loading ? (
                <div className={styles.reviewsLoading}>{t('Loading reviews...')}</div>
            ) : reviews.length === 0 ? (
                <div className={styles.reviewsPlaceholder}>
                    <p>{t('No reviews yet')}</p>
                    {!isAuthenticated && (
                        <p className={styles.reviewsPrompt}>{t('Be the first to review this product')}</p>
                    )}
                </div>
            ) : (
                <div className={styles.reviewsList}>
                    {reviews.map((review) => (
                        <div key={review.id} className={styles.reviewItem}>
                            <div className={styles.reviewHeader}>
                                <div className={styles.reviewCustomer}>
                                    <strong>{review.customer_name}</strong>
                                    {review.is_verified_purchase && (
                                        <span className={styles.verifiedBadge}>{t('Verified Purchase')}</span>
                                    )}
                                </div>
                                <div className={styles.reviewRating}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                            key={star}
                                            size={16}
                                            className={styles.star}
                                            fill={star <= review.rating ? 'currentColor' : 'none'}
                                        />
                                    ))}
                                </div>
                            </div>
                            {review.comment && (
                                <div className={styles.reviewComment}>{review.comment}</div>
                            )}
                            <div className={styles.reviewFooter}>
                                <span className={styles.reviewDate}>
                                    {new Date(review.created_at).toLocaleDateString()}
                                </span>
                                <button
                                    className={`${styles.usefulButton} ${review.has_marked_useful ? styles.usefulButtonActive : ''}`}
                                    onClick={() => handleMarkUseful(review.id)}
                                    disabled={review.has_marked_useful || !isAuthenticated}
                                    title={review.has_marked_useful ? t('You have already marked this as useful') : (!isAuthenticated ? t('Login to mark as useful') : t('Mark as useful'))}
                                >
                                    <ThumbsUp size={14} fill={review.has_marked_useful ? 'currentColor' : 'none'} />
                                    {t('Useful')} ({review.useful_count})
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal
                isOpen={isReviewModalOpen}
                onClose={() => setIsReviewModalOpen(false)}
                title={t('Write a Review')}
            >
                <form onSubmit={handleSubmitReview} className={styles.reviewForm}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('Rating')}</label>
                        <div className={styles.ratingInput}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    type="button"
                                    className={`${styles.starButton} ${reviewForm.rating > 0 && reviewForm.rating >= star ? styles.starButtonActive : ''}`}
                                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                                >
                                    <Star size={24} fill={reviewForm.rating > 0 && reviewForm.rating >= star ? 'currentColor' : 'none'} />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>{t('Comment')} ({t('optional')})</label>
                        <textarea
                            className={styles.textarea}
                            value={reviewForm.comment}
                            onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                            rows={5}
                            maxLength={2000}
                            placeholder={t('Share your experience with this product...')}
                        />
                    </div>
                    <div className={styles.modalFormActions}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsReviewModalOpen(false)}
                            disabled={submitting}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={submitting}
                        >
                            {submitting ? t('Submitting...') : t('Submit Review')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default function ProductShow({ product, variants = [], availableAttributes = [], preselectedAttributes = {}, reviewStats, canReview, hasReviewed }: ProductShowProps) {
    return (
        <Layout activeSidebarItem="products">
            <Head title={product.name} />
            <ProductShowContent 
                product={product} 
                variants={variants}
                availableAttributes={availableAttributes}
                preselectedAttributes={preselectedAttributes}
                reviewStats={reviewStats} 
                canReview={canReview} 
                hasReviewed={hasReviewed} 
            />
        </Layout>
    );
}
