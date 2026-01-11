import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Home, Package, User, ClipboardList, Languages, DollarSign, Grid3x3 } from 'lucide-react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import type { SharedData, Currency } from '../../types';
import { Button } from '../ui/Button';
import styles from './Sidebar.module.css';

interface SidebarItem {
    id: string;
    label: string;
    icon: React.ReactNode;
    active?: boolean;
}

interface SidebarProps {
    activeItem?: string;
    isOpen?: boolean;
    onClose?: () => void;
}

export default function Sidebar({ activeItem = 'home', isOpen = false, onClose }: SidebarProps) {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const currencies = (props.currencies as Currency[] | undefined) || [];
    const currentCurrency = (props.currentCurrency as Currency | undefined) || currencies[0];
    const currentLocale = (props.locale as string | undefined) || 'ro';

    const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const currencyDropdownRef = useRef<HTMLDivElement>(null);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const currencyDropdownMenuRef = useRef<HTMLDivElement>(null);
    const languageDropdownMenuRef = useRef<HTMLDivElement>(null);

    const sidebarItems: SidebarItem[] = [
        { id: 'home', label: t('Home'), icon: <Home size={20} />, active: activeItem === 'home' },
        { id: 'categories', label: t('Categories'), icon: <Grid3x3 size={20} />, active: activeItem === 'categories' },
        { id: 'products', label: t('Products'), icon: <Package size={20} />, active: activeItem === 'products' },
        { id: 'orders', label: t('Orders'), icon: <ClipboardList size={20} />, active: activeItem === 'orders' },
        { id: 'me', label: t('Me'), icon: <User size={20} />, active: activeItem === 'me' },
    ];

    const languages = [
        { code: 'ro', label: t('Romanian') },
        { code: 'en', label: t('English') },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (currencyDropdownRef.current && !currencyDropdownRef.current.contains(event.target as Node)) {
                setIsCurrencyDropdownOpen(false);
            }
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
                setIsLanguageDropdownOpen(false);
            }
        };

        if (isCurrencyDropdownOpen || isLanguageDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isCurrencyDropdownOpen, isLanguageDropdownOpen]);

    // Use useLayoutEffect to set position before paint to avoid visible movement
    useLayoutEffect(() => {
        if (isLanguageDropdownOpen && languageDropdownMenuRef.current) {
            const dropdownElement = languageDropdownMenuRef.current;
            const sidebarWidth = 70;
            const dropdownMinWidth = 140;
            const padding = 8;
            const viewportWidth = window.innerWidth;

            // Calculate center position relative to sidebar
            const centerX = sidebarWidth / 2;
            const leftPosition = centerX - (dropdownMinWidth / 2);

            // Check if it would overflow
            const rightEdge = leftPosition + dropdownMinWidth;
            if (rightEdge > viewportWidth - padding) {
                dropdownElement.style.left = 'calc(100% + 8px)';
                dropdownElement.style.right = 'auto';
                dropdownElement.style.transform = 'translateX(0)';
                dropdownElement.setAttribute('data-position', 'right');
            } else if (leftPosition < padding) {
                dropdownElement.style.left = 'calc(100% + 8px)';
                dropdownElement.style.right = 'auto';
                dropdownElement.style.transform = 'translateX(0)';
                dropdownElement.setAttribute('data-position', 'right');
            } else {
                dropdownElement.style.left = '50%';
                dropdownElement.style.right = 'auto';
                dropdownElement.style.transform = 'translateX(-50%)';
                dropdownElement.setAttribute('data-position', 'centered');
            }
        }
    }, [isLanguageDropdownOpen]);

    useEffect(() => {
        const adjustCurrencyDropdownPosition = (dropdownElement: HTMLElement | null) => {
            if (!dropdownElement) return;

            requestAnimationFrame(() => {
                const rect = dropdownElement.getBoundingClientRect();
                const viewportWidth = window.innerWidth;
                const padding = 8;

                // Check if dropdown overflows on the right
                if (rect.right > viewportWidth - padding) {
                    // Move it to the left side instead
                    dropdownElement.style.left = 'auto';
                    dropdownElement.style.right = 'calc(100% + 8px)';
                } else {
                    // Keep it on the right side
                    dropdownElement.style.left = 'calc(100% + 8px)';
                    dropdownElement.style.right = 'auto';
                }
            });
        };

        const handleAdjust = () => {
            if (isCurrencyDropdownOpen && currencyDropdownMenuRef.current) {
                adjustCurrencyDropdownPosition(currencyDropdownMenuRef.current);
            }
        };

        handleAdjust();
        window.addEventListener('resize', handleAdjust);

        return () => {
            window.removeEventListener('resize', handleAdjust);
        };
    }, [isCurrencyDropdownOpen]);

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.get('/');
    };

    const handleItemClick = (e: React.MouseEvent, itemId: string) => {
        e.preventDefault();
        const user = props.auth?.user;
        const isAuthenticated = !!user;
        
        if (itemId === 'home') {
            router.get('/');
        } else if (itemId === 'categories') {
            router.get('/categories');
        } else if (itemId === 'products') {
            router.get('/products');
        } else if (itemId === 'me') {
            if (isAuthenticated) {
                router.get('/settings/profile');
            } else {
                router.get('/login');
            }
        } else if (itemId === 'orders') {
            if (isAuthenticated) {
                router.get('/settings/history/orders');
            } else {
                router.get('/login');
            }
        }
    };

    const handleItemClickWithClose = (e: React.MouseEvent, itemId: string) => {
        handleItemClick(e, itemId);
        if (onClose) {
            onClose();
        }
    };

    return (
        <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
            <div
                className={styles.logo}
                onClick={handleLogoClick}
            >
                <img src="/logo.png" alt="teomarket" className={styles.logoImage} />
            </div>
            <nav className={styles.sidebarNav}>
                {sidebarItems.map((item) => (
                    <a
                        key={item.id}
                        href="#"
                        onClick={(e) => handleItemClickWithClose(e, item.id)}
                        className={`${styles.sidebarItem} ${item.active ? styles.sidebarItemActive : ''}`}
                    >
                        <span className={styles.sidebarIcon}>{item.icon}</span>
                        <span className={styles.sidebarLabel}>{item.label}</span>
                    </a>
                ))}
            </nav>
            <div className={styles.sidebarFooter}>
                <div className={styles.languageSelectorWrapper} ref={languageDropdownRef}>
                    <Button
                        variant="secondary"
                        className={styles.languageSelector}
                        onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                    >
                        <Languages size={14} className={styles.selectorIcon} />
                        <span>{currentLocale.toUpperCase() || 'RO'}</span>
                    </Button>
                    {isLanguageDropdownOpen && (
                        <div ref={languageDropdownMenuRef} className={styles.languageDropdownMenu}>
                            {languages.map((language) => (
                                <Button
                                    key={language.code}
                                    variant="text"
                                    active={currentLocale === language.code}
                                    className={`${styles.languageDropdownItem} ${currentLocale === language.code ? styles.languageDropdownItemActive : ''}`}
                                    onClick={() => {
                                        if (currentLocale !== language.code) {
                                            router.post('/language/update', {
                                                locale: language.code,
                                            }, {
                                                preserveScroll: true,
                                                onSuccess: () => {
                                                    // Reload all shared data to update translations
                                                    router.reload();
                                                },
                                            });
                                        }
                                        setIsLanguageDropdownOpen(false);
                                    }}
                                >
                                    <span>{language.label}</span>
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                {currencies.length > 0 && (
                    <div className={styles.currencySelectorWrapper} ref={currencyDropdownRef}>
                        <Button
                            variant="secondary"
                            className={styles.currencySelector}
                            onClick={() => setIsCurrencyDropdownOpen(!isCurrencyDropdownOpen)}
                        >
                            {currentCurrency ? (
                                <span className={styles.currencySymbolIcon}>
                                    {currentCurrency.symbol_left || currentCurrency.symbol_right || currentCurrency.code}
                                </span>
                            ) : (
                                <DollarSign size={14} className={styles.currencySymbolIcon} />
                            )}
                            {currentCurrency ? (
                                <span>{currentCurrency.code}</span>
                            ) : (
                                <span>{t('Currency')}</span>
                            )}
                        </Button>
                        {isCurrencyDropdownOpen && (
                            <div ref={currencyDropdownMenuRef} className={styles.currencyDropdownMenu}>
                                {currencies.map((currency) => (
                                    <Button
                                        key={currency.id}
                                        variant="text"
                                        active={currentCurrency?.id === currency.id}
                                        className={`${styles.currencyDropdownItem} ${currentCurrency?.id === currency.id ? styles.currencyDropdownItemActive : ''}`}
                                        onClick={() => {
                                            if (currentCurrency?.code !== currency.code) {
                                                router.post('/currency/update', {
                                                    currency_code: currency.code,
                                                }, {
                                                    preserveScroll: true,
                                                    onSuccess: () => {
                                                        router.reload({ only: ['currentCurrency', 'currencies', 'cartSummary', 'cartItems'] });
                                                    },
                                                });
                                            }
                                            setIsCurrencyDropdownOpen(false);
                                        }}
                                    >
                                        <span>{currency.code}</span>
                                        {(currency.symbol_left || currency.symbol_right) && (
                                            <span className={styles.currencySymbol}>
                                                {currency.symbol_left || ''}{currency.symbol_right || ''}
                                            </span>
                                        )}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </aside>
    );
}
