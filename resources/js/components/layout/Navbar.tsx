import { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Search, Menu, LogIn, LogOut, X, ChevronRight, Heart, User, ShoppingBag, CreditCard, RotateCcw, MapPin, FileText } from 'lucide-react';
import { usePage, router } from '@inertiajs/react';
import type { SharedData } from '../../types';
import { useTranslations } from '../../utils/translations';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PriceDisplay } from '../PriceDisplay/PriceDisplay';
import styles from './Navbar.module.css';

interface UtilityLink {
    id: string;
    label: string;
    icon: React.ReactNode;
}

interface NavbarProps {
    utilityLinks?: UtilityLink[];
    onMenuClick?: () => void;
}

export default function Navbar({ utilityLinks, onMenuClick }: NavbarProps) {
    const { props, url } = usePage<SharedData>();
    const { t } = useTranslations();
    const user = props.auth?.user;
    const isAuthenticated = !!user;
    const currencies = (props.currencies as any[]) || [];
    const currentCurrency = (props.currentCurrency as any) || currencies[0];

    const [isScrolled, setIsScrolled] = useState(false);
    const [isCartHovered, setIsCartHovered] = useState(false);
    const [isWishlistHovered, setIsWishlistHovered] = useState(false);
    const [isUserAccountHovered, setIsUserAccountHovered] = useState(false);
    const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
    const [removingWishlistItems, setRemovingWishlistItems] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [searchTotal, setSearchTotal] = useState(0);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const lastSearchedQueryRef = useRef<string>('');
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchDropdownRef = useRef<HTMLDivElement>(null);
    const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const cartHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const wishlistHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const userAccountHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Format price with currency
    const formatPriceWithCurrency = (price: number | string | null | undefined): string => {
        // Convert to number if it's a string or handle null/undefined
        const numPrice = typeof price === 'string' ? parseFloat(price) : (price ?? 0);
        // Ensure it's a valid number
        const validPrice = isNaN(numPrice) ? 0 : numPrice;
        const formattedPrice = validPrice.toFixed(2);
        if (currentCurrency) {
            if (currentCurrency.symbol_left) {
                return `${currentCurrency.symbol_left}${formattedPrice}`;
            } else if (currentCurrency.symbol_right) {
                return `${formattedPrice}${currentCurrency.symbol_right}`;
            } else {
                return `${formattedPrice} ${currentCurrency.code}`;
            }
        }
        return formattedPrice;
    };

    // Check if we're on products page
    const isProductsPage = url.startsWith('/products');
    const cartDropdownRef = useRef<HTMLDivElement>(null);
    const wishlistDropdownRef = useRef<HTMLDivElement>(null);

    // Handle cart hover with delay
    const handleCartMouseEnter = () => {
        if (cartHoverTimeoutRef.current) {
            clearTimeout(cartHoverTimeoutRef.current);
            cartHoverTimeoutRef.current = null;
        }
        setIsCartHovered(true);
    };

    const handleCartMouseLeave = () => {
        cartHoverTimeoutRef.current = setTimeout(() => {
            setIsCartHovered(false);
        }, 200); // 200ms delay before hiding
    };

    // Handle wishlist hover with delay
    const handleWishlistMouseEnter = () => {
        if (wishlistHoverTimeoutRef.current) {
            clearTimeout(wishlistHoverTimeoutRef.current);
            wishlistHoverTimeoutRef.current = null;
        }
        setIsWishlistHovered(true);
    };

    const handleWishlistMouseLeave = () => {
        wishlistHoverTimeoutRef.current = setTimeout(() => {
            setIsWishlistHovered(false);
        }, 200); // 200ms delay before hiding
    };

    // Handle user account hover with delay
    const handleUserAccountMouseEnter = () => {
        if (userAccountHoverTimeoutRef.current) {
            clearTimeout(userAccountHoverTimeoutRef.current);
            userAccountHoverTimeoutRef.current = null;
        }
        setIsUserAccountHovered(true);
    };

    const handleUserAccountMouseLeave = () => {
        userAccountHoverTimeoutRef.current = setTimeout(() => {
            setIsUserAccountHovered(false);
        }, 200); // 200ms delay before hiding
    };

    // Cleanup timeouts on unmount
    useEffect(() => {
        return () => {
            if (cartHoverTimeoutRef.current) {
                clearTimeout(cartHoverTimeoutRef.current);
            }
            if (wishlistHoverTimeoutRef.current) {
                clearTimeout(wishlistHoverTimeoutRef.current);
            }
            if (userAccountHoverTimeoutRef.current) {
                clearTimeout(userAccountHoverTimeoutRef.current);
            }
        };
    }, []);

    // Handle remove item from cart
    const handleRemoveFromCart = async (cartKey: string, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (removingItems.has(cartKey)) {
            return;
        }

        setRemovingItems(prev => new Set(prev).add(cartKey));

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/cart/${encodeURIComponent(cartKey)}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                // Reload cart data
                router.reload({ only: ['cartSummary', 'cartItems'] });
            } else {
                alert(t('Error removing item'));
            }
        } catch (error) {
            console.error('Error removing item from cart:', error);
            alert(t('Error removing item'));
        } finally {
            setRemovingItems(prev => {
                const next = new Set(prev);
                next.delete(cartKey);
                return next;
            });
        }
    };

    // Handle remove item from wishlist
    const handleRemoveFromWishlist = async (productId: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (removingWishlistItems.has(productId)) {
            return;
        }

        setRemovingWishlistItems(prev => new Set(prev).add(productId));

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/wishlist/${productId}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                // Reload wishlist data
                router.reload({ only: ['wishlistItems', 'wishlistSummary'] });
            } else {
                alert(t('Error removing item'));
            }
        } catch (error) {
            console.error('Error removing item from wishlist:', error);
            alert(t('Error removing item'));
        } finally {
            setRemovingWishlistItems(prev => {
                const next = new Set(prev);
                next.delete(productId);
                return next;
            });
        }
    };

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const defaultUtilityLinks: UtilityLink[] = [
        { id: 'wishlist', label: t('Wishlist'), icon: <Heart size={16} /> },
        { id: 'cart', label: t('Cart'), icon: <ShoppingCart size={16} /> },
    ];

    const links = utilityLinks || defaultUtilityLinks;

    // Helper function to get user initials
    const getUserInitials = (user: any): string => {
        if (!user) return 'U';
        const firstName = user.first_name || '';
        const lastName = user.last_name || '';
        const firstInitial = firstName.charAt(0).toUpperCase() || '';
        const lastInitial = lastName.charAt(0).toUpperCase() || '';
        if (firstInitial && lastInitial) {
            return firstInitial + lastInitial;
        }
        if (firstInitial) {
            return firstInitial;
        }
        if (lastInitial) {
            return lastInitial;
        }
        return 'U';
    };

    // Handle product search autocomplete
    const fetchSearchResults = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setSearchTotal(0);
            return;
        }

        setIsSearching(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const response = await fetch(`/products/autocomplete?q=${encodeURIComponent(query)}`, {
                method: 'GET',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                },
                credentials: 'same-origin',
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Search results:', data); // Debug log
                console.log('Products count:', data.products?.length || 0);
                console.log('Total:', data.total || 0);
                
                const products = Array.isArray(data.products) ? data.products : [];
                setSearchResults(products);
                setSearchTotal(data.total || 0);
                lastSearchedQueryRef.current = query; // Remember the last searched query
            } else {
                console.error('Search response not ok:', response.status, response.statusText);
                try {
                    const errorData = await response.json();
                    console.error('Error data:', errorData);
                } catch (e) {
                    const errorText = await response.text();
                    console.error('Error text:', errorText);
                }
                setSearchResults([]);
                setSearchTotal(0);
            }
        } catch (error) {
            console.error('Error fetching search results:', error);
            setSearchResults([]);
            setSearchTotal(0);
        } finally {
            setIsSearching(false);
        }
    };

    // Debounced search
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        const trimmedQuery = searchQuery.trim();
        
        if (trimmedQuery && (isSearchFocused || isSearchDropdownOpen)) {
            // Only search if query changed or if we don't have results for this query
            if (trimmedQuery !== lastSearchedQueryRef.current || searchResults.length === 0) {
                searchTimeoutRef.current = setTimeout(() => {
                    fetchSearchResults(trimmedQuery);
                }, 500); // 500ms debounce - wait for user to stop typing
            }
        } else if (!trimmedQuery) {
            setSearchResults([]);
            setSearchTotal(0);
            lastSearchedQueryRef.current = '';
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, isSearchFocused, isSearchDropdownOpen]);

    // Handle product search submit
    const handleSearch = (e?: React.FormEvent) => {
        if (e) {
            e.preventDefault();
        }
        const trimmedQuery = searchQuery.trim();
        if (trimmedQuery) {
            router.get('/products', {
                search: trimmedQuery,
            });
        } else {
            // If search is empty, just go to products page
            router.get('/products');
        }
        setIsSearchFocused(false);
        setIsSearchDropdownOpen(false);
        setSearchResults([]);
    };

    // Handle click on search result
    const handleSearchResultClick = (productId: number) => {
        router.get(`/products/${productId}`);
        setIsSearchFocused(false);
        setIsSearchDropdownOpen(false);
        setSearchResults([]);
        setSearchQuery('');
    };

    // Handle "View more" button
    const handleViewMore = () => {
        handleSearch();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchDropdownRef.current && !searchDropdownRef.current.contains(event.target as Node)) {
                setIsSearchFocused(false);
                setIsSearchDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Handle search input focus
    const handleSearchFocus = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setIsSearchFocused(true);
        if (searchQuery.trim()) {
            setIsSearchDropdownOpen(true);
        }
    };

    // Handle search input blur with delay to allow clicks
    const handleSearchBlur = () => {
        blurTimeoutRef.current = setTimeout(() => {
            setIsSearchFocused(false);
        }, 150);
    };

    // Handle mouse enter on dropdown
    const handleDropdownMouseEnter = () => {
        if (blurTimeoutRef.current) {
            clearTimeout(blurTimeoutRef.current);
            blurTimeoutRef.current = null;
        }
        setIsSearchDropdownOpen(true);
        setIsSearchFocused(true);
    };

    // Handle mouse leave on dropdown
    const handleDropdownMouseLeave = () => {
        // Don't close immediately, let blur handle it
    };


    return (
        <>
            {/* Top Navbar */}
            <header className={`${styles.navbar} ${isScrolled ? styles.navbarScrolled : ''}`}>
                <div className={styles.navbarTop}>
                    {onMenuClick && (
                        <button
                            className={styles.menuButton}
                            onClick={onMenuClick}
                            aria-label="Toggle menu"
                        >
                            <Menu size={24} />
                        </button>
                    )}
                    <div className={styles.navbarRight}>
                        <div className={styles.navbarSearch} ref={searchDropdownRef}>
                            <form onSubmit={handleSearch} className={styles.searchBarInline}>
                                <Input
                                    type="text"
                                    placeholder={t('Trend New Arrivals')}
                                    variant="search"
                                    className={styles.searchInput}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onFocus={handleSearchFocus}
                                    onBlur={handleSearchBlur}
                                />
                                <Button 
                                    type="submit"
                                    variant="searchInline" 
                                    className={styles.searchButtonInline}
                                >
                                    <Search size={18} />
                                </Button>
                            </form>
                            {(isSearchFocused || isSearchDropdownOpen) && searchQuery.trim() && (
                                <div 
                                    className={styles.searchDropdown}
                                    onMouseEnter={handleDropdownMouseEnter}
                                    onMouseLeave={handleDropdownMouseLeave}
                                >
                                    {isSearching ? (
                                        <div className={styles.searchDropdownLoading}>
                                            <p>{t('Searching...')}</p>
                                        </div>
                                    ) : searchResults.length > 0 ? (
                                        <>
                                            <div className={styles.searchDropdownResults}>
                                                {searchResults.map((product: any) => (
                                                    <div
                                                        key={product.id}
                                                        className={styles.searchDropdownItem}
                                                        onClick={() => handleSearchResultClick(product.id)}
                                                    >
                                                        <div className={styles.searchDropdownItemImage}>
                                                            {product.image ? (
                                                                <img
                                                                    src={product.image}
                                                                    alt={product.name}
                                                                    className={styles.searchDropdownItemImageImg}
                                                                />
                                                            ) : (
                                                                <div className={styles.searchDropdownItemImagePlaceholder}>
                                                                    {t('No image')}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={styles.searchDropdownItemDetails}>
                                                            <p className={styles.searchDropdownItemName} title={product.name}>
                                                                {product.name}
                                                            </p>
                                                            <div className={styles.searchDropdownItemPrice}>
                                                                {currentCurrency?.symbol_left && (
                                                                    <span>{currentCurrency.symbol_left}</span>
                                                                )}
                                                                <PriceDisplay price={product.price_raw} />
                                                                {currentCurrency?.symbol_right && (
                                                                    <span>{currentCurrency.symbol_right}</span>
                                                                )}
                                                                {!currentCurrency?.symbol_left && !currentCurrency?.symbol_right && currentCurrency?.code && (
                                                                    <span> {currentCurrency.code}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            {searchTotal > searchResults.length && (
                                                <div className={styles.searchDropdownFooter}>
                                                    <button
                                                        className={styles.searchDropdownViewMore}
                                                        onClick={handleViewMore}
                                                    >
                                                        {t('View more results')} ({searchTotal})
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className={styles.searchDropdownLoading}>
                                            <p>{t('No results found')}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div
                            className={styles.userAccount}
                            onMouseEnter={handleUserAccountMouseEnter}
                            onMouseLeave={handleUserAccountMouseLeave}
                        >
                            {isAuthenticated ? (
                                <>
                                    <button
                                        onClick={() => router.get('/settings/profile')}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--spacing-xs)',
                                            background: 'none',
                                            border: 'none',
                                            cursor: 'pointer',
                                            padding: 0
                                        }}
                                    >
                                        <div
                                            className={styles.userAvatar}
                                            style={{ backgroundColor: '#10b981' }}
                                        >
                                            {getUserInitials(user)}
                                        </div>
                                        <span className={styles.userAccountLabel}>{t('My Account')}</span>
                                    </button>
                                    {isUserAccountHovered && (
                                        <div className={`${styles.userAccountDropdown} ${styles.userAccountDropdownVertical}`}>
                                            <div className={styles.userAccountDropdownHeader}>
                                                {t('Hello')}, {[user?.first_name, user?.last_name].filter(Boolean).join(' ') || t('Valued Customer')}
                                            </div>
                                            <div className={styles.userAccountDropdownSeparator}></div>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => {
                                                    if (isAuthenticated) {
                                                        router.get('/settings/history/orders');
                                                    } else {
                                                        router.get('/login');
                                                    }
                                                }}
                                            >
                                                <ShoppingBag size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('My Orders')}</span>
                                            </button>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/settings/profile')}
                                            >
                                                <User size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('My Account')}</span>
                                            </button>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/settings/cards')}
                                            >
                                                <CreditCard size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('My Cards')}</span>
                                            </button>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/settings/returns')}
                                            >
                                                <RotateCcw size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('My Returns')}</span>
                                            </button>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/settings/addresses')}
                                            >
                                                <MapPin size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('Delivery Addresses')}</span>
                                            </button>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/settings/billing')}
                                            >
                                                <FileText size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('Billing Data')}</span>
                                            </button>
                                            <div className={styles.userAccountDropdownSeparator}></div>
                                            <button
                                                className={`${styles.userAccountDropdownItem} ${styles.userAccountDropdownItemLogout}`}
                                                onClick={() => router.post('/logout')}
                                            >
                                                <LogOut size={18} className={styles.userAccountDropdownIcon} />
                                                <span>{t('Logout')}</span>
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className={styles.userAccountIcon}>
                                        <User size={16} />
                                    </div>
                                    <span className={styles.userAccountLabel}>{t('My Account')}</span>
                                    {isUserAccountHovered && (
                                        <div className={`${styles.userAccountDropdown} ${styles.userAccountDropdownHorizontal}`}>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/register')}
                                            >
                                                <span>{t('New Account')}</span>
                                            </button>
                                            <button
                                                className={styles.userAccountDropdownItem}
                                                onClick={() => router.get('/login')}
                                            >
                                                <span>{t('Login')}</span>
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        <div className={styles.utilityLinks}>
                            {links.map((link) => {
                                if (link.id === 'cart') {
                                    const cartCount = (props.cartSummary as { total_items?: number })?.total_items || 0;
                                    const cartItems = (props.cartItems as any[]) || [];
                                    const cartSummary = props.cartSummary as { total_incl_vat?: number } || {};

                                    return (
                                        <div
                                            key={link.id}
                                            className={styles.cartWrapper}
                                            onMouseEnter={handleCartMouseEnter}
                                            onMouseLeave={handleCartMouseLeave}
                                            ref={cartDropdownRef}
                                        >
                                            <a
                                                href="/cart"
                                                className={styles.utilityLink}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    router.get('/cart');
                                                }}
                                            >
                                                <span className={`${styles.utilityIcon} ${styles.cartIcon}`}>
                                                    {link.icon}
                                                    {cartCount > 0 && (
                                                        <span className={styles.cartBadge}>{cartCount}</span>
                                                    )}
                                                </span>
                                                <span className={styles.utilityLabel}>{link.label}</span>
                                            </a>
                                            {isCartHovered && (
                                                <div className={styles.cartDropdown}>
                                                    {cartCount > 0 ? (
                                                        <>
                                                            <div className={styles.cartDropdownHeader}>
                                                                <h3 className={styles.cartDropdownTitle}>{t('Latest Added')}</h3>
                                                            </div>
                                                            <div className={styles.cartDropdownItems}>
                                                                {cartItems.length > 0 ? (
                                                                    cartItems.map((item: any) => (
                                                                        <div
                                                                            key={item.cart_key}
                                                                            className={styles.cartDropdownItem}
                                                                            onClick={(e) => {
                                                                                if (item.product_id) {
                                                                                    e.preventDefault();
                                                                                    router.get(`/products/${item.product_id}`);
                                                                                }
                                                                            }}
                                                                            style={{ cursor: item.product_id ? 'pointer' : 'default' }}
                                                                        >
                                                                            <div className={styles.cartDropdownItemImageWrapper}>
                                                                                {item.image ? (
                                                                                    <img
                                                                                        src={item.image}
                                                                                        alt={item.name}
                                                                                        className={styles.cartDropdownItemImage}
                                                                                    />
                                                                                ) : (
                                                                                    <div className={styles.cartDropdownItemImagePlaceholder}>
                                                                                        {t('No image')}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className={styles.cartDropdownItemDetails}>
                                                                                <p className={styles.cartDropdownItemName} title={item.name}>
                                                                                    {item.name}
                                                                                </p>
                                                                                <div className={styles.cartDropdownItemMeta}>
                                                                                    <span className={styles.cartDropdownItemPriceQuantity}>
                                                                                        <PriceDisplay price={formatPriceWithCurrency(item.unit_price_raw)} /> x {item.quantity}
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className={styles.cartDropdownItemRight}>
                                                                                <div className={styles.cartDropdownItemTotal}>
                                                                                    <PriceDisplay price={formatPriceWithCurrency(item.total_price_raw)} />
                                                                                </div>
                                                                                <button
                                                                                    className={styles.cartDropdownItemRemove}
                                                                                    onClick={(e) => handleRemoveFromCart(item.cart_key, e)}
                                                                                    disabled={removingItems.has(item.cart_key)}
                                                                                    title={t('Remove from cart')}
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className={styles.cartDropdownEmpty}>
                                                                        <p>{t('Your cart is empty')}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {cartItems.length > 0 && (
                                                                <div className={styles.cartDropdownFooter}>
                                                                    <div className={styles.cartDropdownTotal}>
                                                                        <span className={styles.cartDropdownTotalLabel}>
                                                                            {t('Total')}: {cartCount} {t('products')}
                                                                        </span>
                                                                        <span className={styles.cartDropdownTotalAmount}>
                                                                            <PriceDisplay price={formatPriceWithCurrency(cartSummary.total_incl_vat || 0)} />
                                                                        </span>
                                                                    </div>
                                                                    <button
                                                                        className={styles.cartDropdownButton}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            router.get('/cart');
                                                                        }}
                                                                    >
                                                                        {t('View cart details')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className={styles.cartDropdownEmptyState}>
                                                            <p className={styles.cartDropdownEmptyMessage}>{t('You have no products in cart')}</p>
                                                            <button
                                                                className={styles.cartDropdownEmptyButton}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    router.get('/cart');
                                                                }}
                                                            >
                                                                {t('View cart details')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                if (link.id === 'wishlist') {
                                    const allWishlistItems = (props.wishlistItems as any[]) || [];
                                    // Limit to latest 10 for dropdown display
                                    const wishlistItems = allWishlistItems.slice(0, 10);
                                    const wishlistCount = allWishlistItems.length;

                                    return (
                                        <div
                                            key={link.id}
                                            className={styles.wishlistWrapper}
                                            onMouseEnter={handleWishlistMouseEnter}
                                            onMouseLeave={handleWishlistMouseLeave}
                                            ref={wishlistDropdownRef}
                                        >
                                            <a
                                                href="/wishlist"
                                                className={styles.utilityLink}
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    router.get('/wishlist');
                                                }}
                                            >
                                                <span className={`${styles.utilityIcon} ${styles.wishlistIcon}`}>
                                                    {link.icon}
                                                    {wishlistCount > 0 && (
                                                        <span className={styles.wishlistBadge}>{wishlistCount}</span>
                                                    )}
                                                </span>
                                                <span className={styles.utilityLabel}>{link.label}</span>
                                            </a>
                                            {isWishlistHovered && (
                                                <div className={styles.wishlistDropdown}>
                                                    {wishlistCount > 0 ? (
                                                        <>
                                                            <div className={styles.wishlistDropdownHeader}>
                                                                <h3 className={styles.wishlistDropdownTitle}>{t('My Favorites')}</h3>
                                                            </div>
                                                            <div className={styles.wishlistDropdownItems}>
                                                                {wishlistItems.length > 0 ? (
                                                                    wishlistItems.map((item: any) => (
                                                                        <div
                                                                            key={item.product_id || item.id}
                                                                            className={styles.wishlistDropdownItem}
                                                                            onClick={(e) => {
                                                                                if (item.product_id || item.id) {
                                                                                    e.preventDefault();
                                                                                    router.get(`/products/${item.product_id || item.id}`);
                                                                                }
                                                                            }}
                                                                            style={{ cursor: (item.product_id || item.id) ? 'pointer' : 'default' }}
                                                                        >
                                                                            <div className={styles.wishlistDropdownItemImageWrapper}>
                                                                                {item.image ? (
                                                                                    <img
                                                                                        src={item.image}
                                                                                        alt={item.name}
                                                                                        className={styles.wishlistDropdownItemImage}
                                                                                    />
                                                                                ) : (
                                                                                    <div className={styles.wishlistDropdownItemImagePlaceholder}>
                                                                                        {t('No image')}
                                                                                    </div>
                                                                                )}
                                                                            </div>
                                                                            <div className={styles.wishlistDropdownItemDetails}>
                                                                                <p className={styles.wishlistDropdownItemName} title={item.name}>
                                                                                    {item.name}
                                                                                </p>
                                                                                <div className={styles.wishlistDropdownItemMeta}>
                                                                                    <span className={styles.wishlistDropdownItemPrice}>
                                                                                        <PriceDisplay price={formatPriceWithCurrency(item.price_raw ?? item.price ?? 0)} />
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                            <div className={styles.wishlistDropdownItemRight}>
                                                                                <button
                                                                                    className={styles.wishlistDropdownItemRemove}
                                                                                    onClick={(e) => handleRemoveFromWishlist(item.product_id || item.id, e)}
                                                                                    disabled={removingWishlistItems.has(item.product_id || item.id)}
                                                                                    title={t('Remove from wishlist')}
                                                                                >
                                                                                    <X size={16} />
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    ))
                                                                ) : (
                                                                    <div className={styles.wishlistDropdownEmpty}>
                                                                        <p>{t('Your wishlist is empty')}</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {wishlistItems.length > 0 && (
                                                                <div className={styles.wishlistDropdownFooter}>
                                                                    <button
                                                                        className={styles.wishlistDropdownButton}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            router.get('/wishlist');
                                                                        }}
                                                                    >
                                                                        {t('View all favorites')}
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <div className={styles.wishlistDropdownEmptyState}>
                                                            <p className={styles.wishlistDropdownEmptyMessage}>{t('You have no products in wishlist')}</p>
                                                            <button
                                                                className={styles.wishlistDropdownEmptyButton}
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    router.get('/wishlist');
                                                                }}
                                                            >
                                                                {t('View wishlist')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }
                                return (
                                    <a key={link.id} href="#" className={styles.utilityLink}>
                                        <span className={`${styles.utilityIcon} ${link.id === 'wishlist' ? styles.wishlistIcon : ''}`}>
                                            {link.icon}
                                        </span>
                                        <span className={styles.utilityLabel}>{link.label}</span>
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </header>
        </>
    );
}
