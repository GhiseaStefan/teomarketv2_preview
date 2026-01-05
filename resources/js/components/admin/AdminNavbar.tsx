import { Search, LogOut, Languages, Save, X } from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import type { SharedData } from '../../types';
import { useTranslations } from '../../utils/translations';
import { useEdit } from '../../contexts/EditContext';
import { Button } from '../ui/Button';
import styles from './AdminNavbar.module.css';

export default function AdminNavbar() {
    const { props } = usePage<SharedData>();
    const { t } = useTranslations();
    const { hasUnsavedChanges, onSave, onDiscard } = useEdit();
    const user = props.auth?.user;
    const currentLocale = (props.locale as string | undefined) || 'ro';
    
    const [isLanguageDropdownOpen, setIsLanguageDropdownOpen] = useState(false);
    const languageDropdownRef = useRef<HTMLDivElement>(null);
    const [showButtons, setShowButtons] = useState(false);
    const buttonsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const languages = [
        { code: 'ro', label: t('Romanian', 'Romana') },
        { code: 'en', label: t('English', 'Engleza') },
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (languageDropdownRef.current && !languageDropdownRef.current.contains(event.target as Node)) {
                setIsLanguageDropdownOpen(false);
            }
        };

        if (isLanguageDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isLanguageDropdownOpen]);

    // Handle smooth animation for buttons appearance/disappearance
    useEffect(() => {
        if (hasUnsavedChanges) {
            // Clear any pending timeout
            if (buttonsTimeoutRef.current) {
                clearTimeout(buttonsTimeoutRef.current);
                buttonsTimeoutRef.current = null;
            }
            // Show buttons immediately
            setShowButtons(true);
        } else {
            // Start exit animation
            if (buttonsTimeoutRef.current) {
                clearTimeout(buttonsTimeoutRef.current);
            }
            // Wait for exit animation to complete before hiding
            buttonsTimeoutRef.current = setTimeout(() => {
                setShowButtons(false);
                buttonsTimeoutRef.current = null;
            }, 300); // Match animation duration
        }

        return () => {
            if (buttonsTimeoutRef.current) {
                clearTimeout(buttonsTimeoutRef.current);
            }
        };
    }, [hasUnsavedChanges]);

    const handleLogout = () => {
        router.post('/logout', {}, {
            onSuccess: () => {
                router.visit('/');
            },
        });
    };

    const handleLanguageChange = (locale: string) => {
        if (currentLocale !== locale) {
            router.post('/language/update', {
                locale: locale,
            });
            setIsLanguageDropdownOpen(false);
        }
    };

    if (!user) {
        return null;
    }

    return (
        <nav className={styles.navbar}>
            <div className={styles.navbarContent}>
                {/* Logo Section */}
                <div className={styles.logoSection}>
                    <img src="/logo-admin.png" alt="Teomarket Admin" className={styles.logo} />
                </div>

                {/* Search Section */}
                <div className={styles.searchSection}>
                    <div className={styles.searchWrapper}>
                        <Search size={20} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder={t('Search', 'Cauta')}
                            className={styles.searchInput}
                        />
                    </div>
                    {/* Save/Discard Buttons */}
                    {showButtons && (
                        <div className={`${styles.saveDiscardButtons} ${hasUnsavedChanges ? styles.buttonsVisible : styles.buttonsHidden}`}>
                            <Button
                                variant="secondary"
                                size="sm"
                                onClick={onDiscard || undefined}
                                className={styles.discardButton}
                            >
                                <X size={16} />
                                <span>{t('Discard', 'Renunta')}</span>
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={onSave || undefined}
                                className={styles.saveButton}
                            >
                                <Save size={16} />
                                <span>{t('Save Changes', 'Salveaza Modificarile')}</span>
                            </Button>
                        </div>
                    )}
                </div>

                {/* Right Section - Language & User */}
                <div className={styles.rightSection}>
                    {/* Language Selector */}
                    <div className={styles.languageSelectorWrapper} ref={languageDropdownRef}>
                        <button
                            className={styles.languageSelector}
                            onClick={() => setIsLanguageDropdownOpen(!isLanguageDropdownOpen)}
                        >
                            <Languages size={16} />
                            <span>{currentLocale.toUpperCase()}</span>
                        </button>
                        {isLanguageDropdownOpen && (
                            <div className={styles.languageDropdownMenu}>
                                {languages.map((language) => (
                                    <button
                                        key={language.code}
                                        className={`${styles.languageDropdownItem} ${currentLocale === language.code ? styles.languageDropdownItemActive : ''}`}
                                        onClick={() => handleLanguageChange(language.code)}
                                    >
                                        <span>{language.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* User Profile Section */}
                    <div className={styles.userSection}>
                        <div className={styles.userDropdown}>
                            <button className={styles.userButton}>
                                <span className={styles.userName}>
                                    {[user.first_name, user.last_name].filter(Boolean).join(' ') || user.email}
                                </span>
                            </button>
                            <div className={styles.dropdownMenu}>
                                <button 
                                    className={styles.dropdownItem}
                                    onClick={handleLogout}
                                >
                                    <LogOut size={16} />
                                    <span>{t('Logout', 'Deconectare')}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    );
}
