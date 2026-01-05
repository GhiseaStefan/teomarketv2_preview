import { useState, useEffect, useRef } from 'react';
import { Link, usePage, router } from '@inertiajs/react';
import { Package, ShoppingCart, User, ClipboardList, ChevronRight, ChevronLeft, Flame, Zap, Gift, Ticket, Clock, Star, Store, History, Sparkles, Info, Truck, Globe, Award, TrendingUp, Palette, Building, CheckCircle, Laptop, Camera, Headphones, Gamepad2, Book, Shirt, Home, Dumbbell, UtensilsCrossed, Activity, BookOpen, Heart } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { ProductCard, type PriceTier } from '../../components/ProductCard';
import { BannerCarousel } from '../../components/BannerCarousel';
import { TeomarketAnimation } from '../../components/TeomarketAnimation';
import { useTranslations } from '../../utils/translations';
import type { SharedData, CustomerGroup, Currency } from '../../types';
import { Button } from '../../components/ui/Button';
import { PriceDisplay } from '../../components/PriceDisplay/PriceDisplay';
import { formatPriceWithCurrency } from '../../utils/priceFormatter';
import styles from './index.module.css';

interface SubSubCategory {
    id: number;
    name: string;
    slug: string;
}

interface SubCategory {
    id: number;
    name: string;
    slug: string;
    subSubCategories: SubSubCategory[];
}

interface Category {
    id: number;
    name: string;
    slug: string;
    subCategories?: SubCategory[];
}

interface Product {
    id: number;
    name: string;
    price_raw?: number;
    vat_included?: boolean;
    image: string | null;
    stock_quantity?: number;
    sku?: string;
    short_description?: string;
    price_tiers?: PriceTier[];
}

interface CategoryWithProducts {
    id: number;
    name: string;
    slug: string;
    products: Product[];
}

interface CategoryTab {
    id: number;
    label: string;
    slug: string;
    active: boolean;
    products?: Product[];
}

interface PromotionBanner {
    id: string;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
}

interface ServiceBenefit {
    id: string;
    text: string;
    icon: React.ReactNode;
}

interface HomePageProps {
    categories: Category[];
    categoriesWithProducts: CategoryWithProducts[];
    categoryTabs: CategoryTab[];
}

function HomePageContent({ categories = [], categoriesWithProducts = [], categoryTabs = [] }: HomePageProps) {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const user = props.auth?.user;
    const isAuthenticated = !!user;
    const customerGroup = (props.customerGroup as CustomerGroup | null) || null;
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];

    // State to track the selected category tab
    // Initialize with the first category tab's ID if available
    const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
        categoryTabs.length > 0 ? categoryTabs[0].id : null
    );

    // State for hovered category
    const [hoveredCategoryId, setHoveredCategoryId] = useState<number | null>(null);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const subMenuRef = useRef<HTMLDivElement | null>(null);
    const subCategoryScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    // State for category tabs scroll
    const categoryTabsScrollRef = useRef<HTMLDivElement | null>(null);
    const [canScrollTabsLeft, setCanScrollTabsLeft] = useState(false);
    const [canScrollTabsRight, setCanScrollTabsRight] = useState(false);

    // State for mobile categories expansion
    const [showAllCategories, setShowAllCategories] = useState(false);
    const [isMobile, setIsMobile] = useState(false);

    // State for promotion banners carousel
    const [promotionBannerIndex, setPromotionBannerIndex] = useState(0);

    // Check if mobile on mount and resize
    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // Get the selected category tab and its products
    const selectedCategory = categoryTabs.find(tab => tab.id === selectedCategoryId) || categoryTabs[0];
    const selectedProducts = selectedCategory?.products || [];

    // Helper function to handle category tab click
    const handleCategoryTabClick = (categoryId: number) => {
        setSelectedCategoryId(categoryId);
    };

    // Handle category hover with delay
    const handleCategoryMouseEnter = (categoryId: number) => {
        // Clear any existing timeout
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
        setHoveredCategoryId(categoryId);
    };

    const handleCategoryMouseLeave = () => {
        // Add delay before hiding
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredCategoryId(null);
        }, 200); // 200ms delay
    };

    const handleSubMenuMouseEnter = () => {
        // Clear timeout when entering sub-menu
        if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
        }
    };

    const handleSubMenuMouseLeave = () => {
        // Add delay before hiding
        hoverTimeoutRef.current = setTimeout(() => {
            setHoveredCategoryId(null);
        }, 200); // 200ms delay
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    // Check scroll buttons for subcategories
    const checkScrollButtons = () => {
        const container = subCategoryScrollContainerRef.current;
        if (!container) return;

        setCanScrollLeft(container.scrollLeft > 0);
        setCanScrollRight(
            container.scrollLeft < container.scrollWidth - container.clientWidth - 1
        );
    };

    // Reset and check scroll when category changes
    useEffect(() => {
        // Reset scroll position
        if (subCategoryScrollContainerRef.current) {
            subCategoryScrollContainerRef.current.scrollLeft = 0;
        }

        // Check scroll buttons after a short delay to allow DOM to update
        setTimeout(checkScrollButtons, 100);

        // Add scroll listener
        const container = subCategoryScrollContainerRef.current;
        if (container) {
            container.addEventListener('scroll', checkScrollButtons);
            return () => container.removeEventListener('scroll', checkScrollButtons);
        }
    }, [hoveredCategoryId]);

    // Handle scroll subcategories
    const handleScrollSubCategories = (direction: 'left' | 'right') => {
        const container = subCategoryScrollContainerRef.current;
        if (!container) return;

        const scrollAmount = 300; // pixels to scroll
        if (direction === 'left') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Check scroll buttons for category tabs
    const checkCategoryTabsScrollButtons = () => {
        const container = categoryTabsScrollRef.current;
        if (!container) return;

        setCanScrollTabsLeft(container.scrollLeft > 0);
        setCanScrollTabsRight(
            container.scrollLeft < container.scrollWidth - container.clientWidth - 1
        );
    };

    // Handle scroll category tabs
    const handleScrollCategoryTabs = (direction: 'left' | 'right') => {
        const container = categoryTabsScrollRef.current;
        if (!container) return;

        const scrollAmount = 200; // pixels to scroll
        if (direction === 'left') {
            container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        } else {
            container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };

    // Check category tabs scroll on mount and when tabs change
    useEffect(() => {
        // Check scroll buttons after a short delay to allow DOM to update
        setTimeout(checkCategoryTabsScrollButtons, 100);

        // Add scroll listener
        const container = categoryTabsScrollRef.current;
        if (container) {
            container.addEventListener('scroll', checkCategoryTabsScrollButtons);
            // Also check on resize
            window.addEventListener('resize', checkCategoryTabsScrollButtons);
            return () => {
                container.removeEventListener('scroll', checkCategoryTabsScrollButtons);
                window.removeEventListener('resize', checkCategoryTabsScrollButtons);
            };
        }
    }, [categoryTabs]);

    // Helper function to get background color for category card (mobile)
    const getCategoryColor = (index: number): string => {
        const colors = [
            '#FFD700', // Yellow
            '#87CEEB', // Sky Blue
            '#98FB98', // Pale Green
            '#FFB6C1', // Light Pink
            '#DDA0DD', // Plum
            '#F0E68C', // Khaki
            '#FFA07A', // Light Salmon
            '#20B2AA', // Light Sea Green
            '#FFDAB9', // Peach Puff
            '#B0E0E6', // Powder Blue
            '#FFE4B5', // Moccasin
            '#AFEEEE', // Pale Turquoise
        ];
        return colors[index % colors.length];
    };

    // Helper function to get icon for category based on category name
    const getCategoryIcon = (categoryName: string, isMobile: boolean = false) => {
        const name = categoryName.toLowerCase();
        const iconSize = isMobile ? 32 : 14;
        const iconClass = isMobile ? styles.categoryIconMobile : styles.categoryIcon;

        // Map category names to appropriate icons
        if (name.includes('alergare') || name.includes('running') || name.includes('sport')) {
            return <Activity size={iconSize} key="running" className={iconClass} />;
        }
        if (name.includes('bucatarie') || name.includes('bucatarie') || name.includes('kitchen')) {
            return <UtensilsCrossed size={iconSize} key="kitchen" className={iconClass} />;
        }
        if (name.includes('barbati') || name.includes('barbati') || name.includes('men')) {
            return <Shirt size={iconSize} key="men" className={iconClass} />;
        }
        if (name.includes('femei') || name.includes('women')) {
            return <Shirt size={iconSize} key="women" className={iconClass} />;
        }
        if (name.includes('camere') || name.includes('foto') || name.includes('camera')) {
            return <Camera size={iconSize} key="camera" className={iconClass} />;
        }
        if (name.includes('casti') || name.includes('casti') || name.includes('audio') || name.includes('headphone')) {
            return <Headphones size={iconSize} key="headphones" className={iconClass} />;
        }
        if (name.includes('consola') || name.includes('console') || name.includes('jocuri') || name.includes('game')) {
            return <Gamepad2 size={iconSize} key="gamepad" className={iconClass} />;
        }
        if (name.includes('carti') || name.includes('carti') || name.includes('book')) {
            return <BookOpen size={iconSize} key="book" className={iconClass} />;
        }
        if (name.includes('casa') || name.includes('gradina') || name.includes('gradina') || name.includes('home')) {
            return <Home size={iconSize} key="home" className={iconClass} />;
        }
        if (name.includes('electronice') || name.includes('laptop') || name.includes('electronic')) {
            return <Laptop size={iconSize} key="laptop" className={iconClass} />;
        }
        if (name.includes('fitness') || name.includes('sport')) {
            return <Dumbbell size={iconSize} key="fitness" className={iconClass} />;
        }
        if (name.includes('imbracaminte') || name.includes('imbracaminte') || name.includes('clothing')) {
            return <Shirt size={iconSize} key="clothing" className={iconClass} />;
        }

        // Default icon if no match
        return <Package size={iconSize} key="package" className={iconClass} />;
    };

    // Helper function to get display price for a product
    // Uses the same logic as product detail page for quantity 1 (default quantity on homepage)
    const getDisplayPrice = (product: Product): string => {
        const defaultQuantity = 1; // Default quantity for homepage display

        if (currentCurrency) {
            let displayPrice: number | null = null;

            // Check price tiers in reverse order (same as product detail page)
            // Find the first tier where quantity >= min_quantity
            if (product.price_tiers && product.price_tiers.length > 0) {
                for (let i = product.price_tiers.length - 1; i >= 0; i--) {
                    const tier = product.price_tiers[i];
                    if (defaultQuantity >= tier.min_quantity) {
                        // Use price_display if available (already calculated by backend), otherwise fallback to price_raw
                        displayPrice = tier.price_display ?? tier.price_raw ?? null;
                        if (displayPrice !== null) {
                            break;
                        }
                    }
                }
            }

            // If no tier price found, use base price (already calculated by backend for display)
            if (displayPrice === null && product.price_raw !== undefined && product.price_raw !== null) {
                displayPrice = product.price_raw;
            }

            if (displayPrice !== null) {
                return formatPriceWithCurrency(displayPrice, currentCurrency);
            }
        }
        // Fallback if no price available
        return 'N/A';
    };
    // Promotion banners (can be moved to database later)
    const promotionBanners: PromotionBanner[] = [
        { id: 'dropshipping', title: t('Dropshipping'), subtitle: t('Bestselling Items'), icon: <Truck size={24} /> },
        { id: 'cross-border', title: t('Cross-Border'), subtitle: t('Fest Hot Buy'), icon: <Globe size={24} /> },
        { id: 'store-select', title: t('Store Select'), subtitle: t('Certified Flash'), icon: <Store size={24} /> },
        { id: 'daily-specials', title: t('Daily Specials'), subtitle: t('50% Off Rush'), icon: <Flame size={24} /> },
        { id: 'flash-sample', title: t('Flash Sample'), subtitle: t('50% off bestseller'), icon: <Zap size={24} /> },
        { id: 'pro-select', title: t('Pro Select'), subtitle: t('Worry-Free Shop'), icon: <Award size={24} /> },
        { id: 'top-sellers', title: t('Top Sellers'), subtitle: t('Trusted Pick'), icon: <TrendingUp size={24} /> },
        { id: 'wow-custom', title: t('Wow Custom'), subtitle: t('Minimum 1 Item'), icon: <Palette size={24} /> },
        { id: 'b2b-purchase', title: t('B2B Purchase'), subtitle: t('One-Stop Procurement'), icon: <Building size={24} /> },
        { id: 'expert-choice', title: t('Expert Choice'), subtitle: t('On-Time Promise'), icon: <CheckCircle size={24} /> },
    ];

    // Carousel logic - show 4 banners on desktop, 3 on mobile
    const [bannersPerView, setBannersPerView] = useState(4);
    const promotionBannersContainerRef = useRef<HTMLDivElement | null>(null);
    const promotionBannersWrapperRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const updateBannersPerView = () => {
            if (window.innerWidth <= 480) {
                setBannersPerView(3);
            } else if (window.innerWidth <= 768) {
                setBannersPerView(3);
            } else {
                setBannersPerView(4);
            }
        };

        updateBannersPerView();
        window.addEventListener('resize', updateBannersPerView);
        return () => window.removeEventListener('resize', updateBannersPerView);
    }, []);

    const totalBanners = promotionBanners.length;
    const maxIndex = Math.max(0, totalBanners - bannersPerView);

    // Clamp index to valid range
    const currentIndex = Math.max(0, Math.min(promotionBannerIndex, maxIndex));

    // Show navigation arrows
    const canGoNext = currentIndex < maxIndex;
    const canGoPrev = currentIndex > 0;

    // Navigation handlers - move by 1 banner at a time
    const handleNextBanners = () => {
        if (currentIndex < maxIndex) {
            setPromotionBannerIndex(currentIndex + 1);
        }
    };

    const handlePrevBanners = () => {
        if (currentIndex > 0) {
            setPromotionBannerIndex(currentIndex - 1);
        }
    };

    // Service benefits
    const serviceBenefits: ServiceBenefit[] = [
        { id: 'recommend', text: t('Recommend similar products'), icon: <Sparkles size={16} /> },
        { id: 'faster', text: t('Faster Order Updates'), icon: <ClipboardList size={16} /> },
        { id: 'richer', text: t('Richer Product Information'), icon: <Info size={16} /> },
        { id: 'participate', text: t('Faster Participation in Promotions'), icon: <Zap size={16} /> },
    ];

    return (
        <>
            <TeomarketAnimation />
            {/* Main Content Container */}
            <div className={styles.mainContainer}>
                {/* Top Row: Three Main Sections */}
                <div className={styles.topRow}>
                    {/* Left: Categories */}
                    <aside className={styles.categoriesSection}>
                        <h2 className={styles.categoriesTitle}>{t('All Categories')}</h2>
                        <div className={styles.categoriesWrapper}>
                            <ul className={styles.categoriesList}>
                                {((isMobile && !showAllCategories) ? categories.slice(0, 6) : categories).map((category, index) => (
                                    <li
                                        key={category.id}
                                        className={`${styles.categoryItem} ${hoveredCategoryId === category.id ? styles.categoryItemHovered : ''}`}
                                        onMouseEnter={() => handleCategoryMouseEnter(category.id)}
                                        onMouseLeave={handleCategoryMouseLeave}
                                        style={isMobile ? { backgroundColor: getCategoryColor(index) } : undefined}
                                    >
                                        <Link
                                            href={`/categories/${category.slug}`}
                                            className={styles.categoryLink}
                                        >
                                            {isMobile ? (
                                                <>
                                                    <span className={styles.categoryIconMobile}>
                                                        {getCategoryIcon(category.name, true)}
                                                    </span>
                                                    <span className={styles.categoryName}>{category.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className={styles.categoryIcon}>{getCategoryIcon(category.name, false)}</span>
                                                    <span className={styles.categoryName}>{category.name}</span>
                                                </>
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                            {isMobile && categories.length > 6 && (
                                <button
                                    className={styles.viewAllCategoriesButton}
                                    onClick={() => setShowAllCategories(!showAllCategories)}
                                >
                                    {showAllCategories ? t('Show Less') : t('View All')}
                                </button>
                            )}

                            {/* Sub-menu Panel */}
                            {hoveredCategoryId !== null && (() => {
                                const hoveredCategory = categories.find(cat => cat.id === hoveredCategoryId);
                                if (!hoveredCategory || !hoveredCategory.subCategories || hoveredCategory.subCategories.length === 0) {
                                    return null;
                                }

                                return (
                                    <div
                                        ref={subMenuRef}
                                        className={styles.subMenuPanel}
                                        onMouseEnter={handleSubMenuMouseEnter}
                                        onMouseLeave={handleSubMenuMouseLeave}
                                    >
                                        <div className={styles.subMenuContent}>
                                            {canScrollLeft && (
                                                <Button
                                                    variant="icon"
                                                    className={styles.subCategoryScroll}
                                                    onClick={() => handleScrollSubCategories('left')}
                                                    aria-label="Scroll left"
                                                >
                                                    <ChevronLeft size={20} />
                                                </Button>
                                            )}
                                            <div
                                                ref={subCategoryScrollContainerRef}
                                                className={styles.subCategoriesWrapper}
                                                onScroll={checkScrollButtons}
                                            >
                                                {hoveredCategory.subCategories.map((subCategory) => (
                                                    <div key={subCategory.id} className={styles.subCategoryGroup}>
                                                        <Link
                                                            href={`/categories/${subCategory.slug}`}
                                                            className={styles.subCategoryTitleLink}
                                                        >
                                                            <h3 className={styles.subCategoryTitle}>{subCategory.name}</h3>
                                                        </Link>
                                                        <div className={styles.subCategoryProducts}>
                                                            {subCategory.subSubCategories && subCategory.subSubCategories.length > 0 ? (
                                                                subCategory.subSubCategories.map((subSubCategory) => (
                                                                    <Link
                                                                        key={subSubCategory.id}
                                                                        href={`/categories/${subSubCategory.slug}`}
                                                                        className={styles.subCategoryProduct}
                                                                    >
                                                                        {subSubCategory.name}
                                                                    </Link>
                                                                ))
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {canScrollRight && (
                                                <Button
                                                    variant="icon"
                                                    className={styles.subCategoryScroll}
                                                    onClick={() => handleScrollSubCategories('right')}
                                                    aria-label="Scroll right"
                                                >
                                                    <ChevronRight size={20} />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </aside>

                    {/* Center: Banner Carousel */}
                    <main className={styles.productsSection}>
                        <BannerCarousel className={styles.bannerCarousel} />
                    </main>

                    {/* Right: User Panel */}
                    <aside className={styles.userPanel}>
                        <div className={styles.userGreeting}>
                            <p className={styles.greetingText}>
                                {t('Good afternoon')}, <span className={styles.userName}>
                                    {isAuthenticated && user ?
                                        [user.first_name, user.last_name].filter(Boolean).join(' ') || t('Valued Customer')
                                        : t('Valued Customer')}
                                </span>
                            </p>
                        </div>

                        <div className={styles.userActions}>
                            <Button className={styles.actionButton}>
                                <Gift size={16} className={styles.actionIcon} />
                                <span>{t('Bonus')}</span>
                            </Button>
                            <Button className={styles.actionButton}>
                                <Ticket size={16} className={styles.actionIcon} />
                                <span>{t('Vouchers')}</span>
                            </Button>
                            <Button className={styles.actionButton}>
                                <Clock size={16} className={styles.actionIcon} />
                                <span>{t('Pay Later')}</span>
                            </Button>
                        </div>

                        <div className={styles.userUtilities}>
                            <a
                                href="/cart"
                                className={styles.userUtility}
                                onClick={(e) => {
                                    e.preventDefault();
                                    router.get('/cart');
                                }}
                            >
                                <ShoppingCart size={20} strokeWidth={1.5} />
                                <span>{t('Cart')}</span>
                            </a>
                            <a href="#" className={styles.userUtility}>
                                <Heart size={20} strokeWidth={1.5} />
                                <span>{t('Wishlist')}</span>
                            </a>
                            <a href="#" className={styles.userUtility}>
                                <Store size={20} strokeWidth={1.5} />
                                <span>{t('Follow')}</span>
                            </a>
                            <a href="#" className={styles.userUtility}>
                                <History size={20} strokeWidth={1.5} />
                                <span>{t('History')}</span>
                            </a>
                        </div>

                        {!isAuthenticated && (
                            <div className={styles.loginSection}>
                                <h3 className={styles.loginTitle}>{t('Login for More Service')}</h3>
                                <div className={styles.serviceBenefits}>
                                    {serviceBenefits.map((benefit) => (
                                        <div key={benefit.id} className={styles.serviceBenefit}>
                                            <span className={styles.benefitIcon}>{benefit.icon}</span>
                                            <span className={styles.benefitText}>{benefit.text}</span>
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    variant="primary"
                                    className={styles.loginNowButton}
                                    onClick={() => router.get('/register')}
                                >
                                    {t('New Account')}
                                </Button>
                            </div>
                        )}
                    </aside>
                </div>

                {/* Bottom Row: Promotion Banners & Category Tabs */}
                <div className={styles.bottomRow}>
                    {/* Promotion Banners */}
                    <section className={styles.promotionSection}>
                        <div className={styles.promotionCard}>
                            <div className={styles.promotionBanners}>
                                {canGoPrev && (
                                    <Button
                                        variant="icon"
                                        className={styles.promotionScroll}
                                        onClick={handlePrevBanners}
                                        aria-label="Previous banners"
                                    >
                                        <ChevronLeft size={20} />
                                    </Button>
                                )}
                                <div
                                    ref={promotionBannersContainerRef}
                                    className={styles.promotionBannersContainer}
                                >
                                    <div
                                        ref={promotionBannersWrapperRef}
                                        className={styles.promotionBannersWrapper}
                                        style={{
                                            transform: `translateX(-${(currentIndex * 100) / bannersPerView}%)`,
                                            transition: 'transform 0.3s ease-in-out'
                                        }}
                                    >
                                        {promotionBanners.map((banner) => (
                                            <div
                                                key={banner.id}
                                                className={styles.promotionBanner}
                                            >
                                                <div className={styles.promotionIcon}>{banner.icon}</div>
                                                <h4 className={styles.promotionTitle}>{banner.title}</h4>
                                                <p className={styles.promotionSubtitle}>{banner.subtitle}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {canGoNext && (
                                    <Button
                                        variant="icon"
                                        className={styles.promotionScroll}
                                        onClick={handleNextBanners}
                                        aria-label="Next banners"
                                    >
                                        <ChevronRight size={20} />
                                    </Button>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Category Tabs */}
                    <section className={styles.categoryTabsSection}>
                        <div className={styles.categoryTabsCard}>
                            <div className={styles.categoryTabsWrapper}>
                                {canScrollTabsLeft && (
                                    <Button
                                        variant="icon"
                                        className={styles.categoryTabsScrollButton}
                                        onClick={() => handleScrollCategoryTabs('left')}
                                        aria-label="Scroll left"
                                    >
                                        <ChevronLeft size={16} />
                                    </Button>
                                )}
                                <div
                                    ref={categoryTabsScrollRef}
                                    className={styles.categoryTabs}
                                    onScroll={checkCategoryTabsScrollButtons}
                                >
                                    {categoryTabs.length > 0 ? (
                                        categoryTabs.map((tab) => (
                                            <Button
                                                key={tab.id}
                                                variant="text"
                                                active={selectedCategoryId === tab.id}
                                                onClick={() => handleCategoryTabClick(tab.id)}
                                                className={styles.categoryTab}
                                            >
                                                {tab.label}
                                            </Button>
                                        ))
                                    ) : (
                                        <div className={styles.noCategoryTabs}>{t('No categories available')}</div>
                                    )}
                                </div>
                                {canScrollTabsRight && (
                                    <Button
                                        variant="icon"
                                        className={styles.categoryTabsScrollButton}
                                        onClick={() => handleScrollCategoryTabs('right')}
                                        aria-label="Scroll right"
                                    >
                                        <ChevronRight size={16} />
                                    </Button>
                                )}
                            </div>

                            {/* Products Grid Below Category Tabs */}
                            {selectedProducts.length > 0 && (
                                <div className={styles.categoryTabsProductsGrid}>
                                    {selectedProducts.map((product) => (
                                        <ProductCard
                                            key={product.id}
                                            id={product.id}
                                            name={product.name}
                                            image={product.image}
                                            stock_quantity={product.stock_quantity}
                                            sku={product.sku}
                                            short_description={product.short_description}
                                            price_tiers={product.price_tiers}
                                            customerGroup={customerGroup}
                                            price_raw={product.price_raw}
                                            vat_included={product.vat_included}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </>
    );
}

export default function HomePage(props: HomePageProps) {
    return (
        <Layout activeSidebarItem="home">
            <HomePageContent {...props} />
        </Layout>
    );
}
