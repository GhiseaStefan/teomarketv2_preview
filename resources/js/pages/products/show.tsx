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

interface Product {
    id: number;
    name: string;
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
    reviewStats?: ReviewStats;
    canReview?: boolean;
    hasReviewed?: boolean;
}

function ProductShowContent({ product, reviewStats, canReview = false, hasReviewed = false }: ProductShowProps) {
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

    const mainImage = product.images[selectedImageIndex] || product.images[0];
    const isInStock = product.stock_quantity > 0;
    const isB2CDefault = !customerGroup || customerGroup.code === 'B2C';
    const showTechnicalInfo = true;
    const user = props.auth?.user;
    const isAuthenticated = !!user;
    const wishlistItems = (props.wishlistItems as any[]) || [];
    const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);

    // Check if product is in wishlist from props (reacts to changes automatically)
    const isInWishlist = wishlistItems.some((item: any) => (item.product_id || item.id) === product.id);

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
            if (product.price_tiers && product.price_tiers.length > 0) {
                for (let i = product.price_tiers.length - 1; i >= 0; i--) {
                    const tier = product.price_tiers[i];
                    if (qty >= tier.min_quantity) {
                        // Use price_display if available (already calculated by backend), otherwise fallback to price_raw
                        const displayPrice = tier.price_display ?? tier.price_raw;
                        return formatPriceWithCurrency(displayPrice, currentCurrency);
                    }
                }
            }
            // For base price, price_raw from backend is already the display price (calculated by backend)
            return formatPriceWithCurrency(product.price_raw, currentCurrency);
        }

        // Fallback if no currency available
        return product.price_raw.toFixed(2);
    };

    const getActiveTierForQuantity = (qty: number): number | null => {
        if (product.price_tiers && product.price_tiers.length > 0) {
            for (let i = product.price_tiers.length - 1; i >= 0; i--) {
                const tier = product.price_tiers[i];
                if (qty >= tier.min_quantity) {
                    return tier.min_quantity;
                }
            }
        }
        return null;
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

    // Scroll to selected image in carousel (only when not user scrolling)
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

    // Handle scroll to update selected image
    const handleCarouselScroll = () => {
        if (imageCarouselRef.current && !isScrollingRef.current) {
            // Clear existing timeout
            if (scrollTimeoutRef.current) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Debounce scroll handling
            scrollTimeoutRef.current = setTimeout(() => {
                if (imageCarouselRef.current && !isScrollingRef.current) {
                    const scrollLeft = imageCarouselRef.current.scrollLeft;
                    const imageWidth = imageCarouselRef.current.clientWidth;
                    const newIndex = Math.round(scrollLeft / imageWidth);
                    if (newIndex !== selectedImageIndex && newIndex >= 0 && newIndex < product.images.length) {
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

    // Check scroll on mount and resize
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
        if (!isInStock || isAddingToCart) {
            return;
        }

        setIsAddingToCart(true);

        try {
            router.post('/cart/add', {
                product_id: product.id,
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
                        {product.images.length > 1 && (
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
                                    {product.images.map((image, index) => (
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

                        {/* Main Image - Desktop */}
                        <div
                            className={styles.mainImageWrapper}
                            ref={mainImageRef}
                        >
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
                            {!isInStock && (
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
                            {product.images.map((image, index) => (
                                <div key={image.id} className={styles.carouselImageWrapper}>
                                    <img
                                        src={image.url}
                                        alt={`${product.name} ${index + 1}`}
                                        className={styles.carouselImage}
                                    />
                                    {!isInStock && index === 0 && (
                                        <div className={styles.outOfStockBadge}>
                                            {t('Out of stock')}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Thumbnails Horizontal - Mobile only */}
                    {product.images.length > 1 && (
                        <div className={styles.thumbnailsHorizontal}>
                            {product.images.map((image, index) => (
                                <button
                                    key={image.id}
                                    className={`${styles.thumbnailHorizontal} ${selectedImageIndex === index ? styles.thumbnailHorizontalActive : ''}`}
                                    onClick={() => setSelectedImageIndex(index)}
                                >
                                    <img src={image.url} alt={`${product.name} ${index + 1}`} />
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
                            {product.model && (
                                <div className={styles.specificationRow}>
                                    <span className={styles.specificationLabel}>{t('Model')}:</span>
                                    <span className={styles.specificationValue}>{product.model}</span>
                                </div>
                            )}
                            {product.weight && (
                                <div className={styles.specificationRow}>
                                    <span className={styles.specificationLabel}>{t('Weight')}:</span>
                                    <span className={styles.specificationValue}>{product.weight} kg</span>
                                </div>
                            )}
                            {(product.length || product.width || product.height) && (
                                <div className={styles.specificationRow}>
                                    <span className={styles.specificationLabel}>{t('Dimensions')}:</span>
                                    <span className={styles.specificationValue}>
                                        {product.length && `${product.length} cm`}
                                        {product.length && (product.width || product.height) && ' × '}
                                        {product.width && `${product.width} cm`}
                                        {product.width && product.height && ' × '}
                                        {product.height && `${product.height} cm`}
                                    </span>
                                </div>
                            )}
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
                            {product.price_tiers && product.price_tiers.length > 0 ? (
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
                                            {product.price_tiers.map((tier) => {
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

                        {/* Stock Information */}
                        {showTechnicalInfo && (
                            <div className={styles.stockInfo}>
                                <Package size={16} />
                                <span>
                                    {t('Stock')}: {product.stock_quantity} {t('units')}
                                </span>
                            </div>
                        )}

                        {/* SKU */}
                        {showTechnicalInfo && product.sku && (
                            <div className={styles.skuInfo}>
                                <span className={styles.skuLabel}>SKU:</span>
                                <span className={styles.skuValue}>{product.sku}</span>
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
                            <Button
                                variant="primary"
                                size="lg"
                                className={styles.buyButton}
                                disabled={!isInStock || isAddingToCart}
                                onClick={handleAddToCart}
                            >
                                <ShoppingCart size={20} />
                                {isAddingToCart ? t('Adding...') : t('Add to Cart')}
                            </Button>
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

export default function ProductShow({ product, reviewStats, canReview, hasReviewed }: ProductShowProps) {
    return (
        <Layout activeSidebarItem="products">
            <Head title={product.name} />
            <ProductShowContent product={product} reviewStats={reviewStats} canReview={canReview} hasReviewed={hasReviewed} />
        </Layout>
    );
}
