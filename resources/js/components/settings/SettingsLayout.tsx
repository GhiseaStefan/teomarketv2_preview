import { ReactNode, useState, FormEvent, useEffect } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import type { SharedData } from '../../types';
import { Edit, ClipboardList, Ticket, Wallet, Headphones, ShoppingBag, User, CreditCard, RotateCcw, MapPin, FileText, LogOut, ChevronRight, Shield, Trophy } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { SettingsModalProvider, useSettingsModal } from '../../contexts/SettingsModalContext';
import styles from './SettingsLayout.module.css';

interface SettingsLayoutProps {
    children: ReactNode;
}

function SettingsLayoutContent({ children }: SettingsLayoutProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData>();
    const user = page.props.auth?.user;
    const { isModalOpen, openModal, closeModal } = useSettingsModal();

    const [first_name, setFirstName] = useState(user?.first_name || '');
    const [last_name, setLastName] = useState(user?.last_name || '');
    const [salutation, setSalutation] = useState<'Dl.' | 'Dna.'>('Dl.');
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        if (user) {
            setFirstName(user.first_name || '');
            setLastName(user.last_name || '');
        }
    }, [user]);


    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setProcessing(true);

        router.patch('/settings/profile', {
            first_name,
            last_name,
            email: user?.email, // Include email for validation
        }, {
            preserveState: true,
            preserveScroll: true,
            onFinish: () => {
                setProcessing(false);
                closeModal();
            },
            onError: () => {
                setProcessing(false);
            },
        });
    };

    const getClientYears = () => {
        if (!user?.created_at) return 0;
        const createdDate = new Date(user.created_at);
        const now = new Date();
        const years = now.getFullYear() - createdDate.getFullYear();
        const monthDiff = now.getMonth() - createdDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < createdDate.getDate())) {
            return years - 1;
        }
        return years;
    };

    const clientYears = getClientYears();
    const userInitials = `${user?.first_name?.[0]?.toUpperCase() || 'U'}${user?.last_name?.[0]?.toUpperCase() || ''}`;

    return (
        <div className={styles.settingsContainer}>
            {/* Box 1: Profile Header - Permanent */}
            <div className={styles.box1}>
                {/* Profile Header with Gradient */}
                <div className={styles.profileHeader}>
                    <button
                        className={styles.editButton}
                        onClick={() => openModal()}
                        aria-label={t('Edit Profile')}
                    >
                        <Edit size={16} />
                    </button>
                    <div className={styles.profileHeaderContent}>
                        <div className={styles.avatar}>
                            <span className={styles.avatarInitials}>{userInitials}</span>
                        </div>
                        <h3 className={styles.profileName}>
                            {user?.first_name} {user?.last_name}
                        </h3>
                        <p className={styles.clientStatus}>
                            {t('Client Teomarket')} {clientYears} {clientYears === 1 ? t('year') : t('years')}
                        </p>
                    </div>
                </div>

                {/* Navigation Icons */}
                <div className={styles.navigationIcons}>
                    <a 
                        href="/settings/history/orders" 
                        className={`${styles.navIcon} ${styles.navIconPurple}`}
                        onClick={(e) => {
                            if (!user) {
                                e.preventDefault();
                                router.get('/login');
                            }
                        }}
                    >
                        <ClipboardList size={24} />
                        <span className={styles.navIconLabel}>{t('Orders')}</span>
                    </a>
                    <a href="/vouchers" className={`${styles.navIcon} ${styles.navIconGreen}`}>
                        <Ticket size={24} />
                        <span className={styles.navIconLabel}>{t('Vouchers')}</span>
                    </a>
                    <a href="/wallet" className={`${styles.navIcon} ${styles.navIconBlue}`}>
                        <Wallet size={24} />
                        <span className={styles.navIconLabel}>{t('My Wallet')}</span>
                    </a>
                    <a href="/support" className={`${styles.navIcon} ${styles.navIconOrange}`}>
                        <Headphones size={24} />
                        <span className={styles.navIconLabel}>{t('Support')}</span>
                    </a>
                </div>
            </div>

            {/* Content Area - Changes based on route */}
            <div className={styles.contentArea}>
                {children}
            </div>

            {/* Box 4: Menu - Permanent */}
            <div className={styles.box4}>
                <div className={styles.menuList}>
                    <a 
                        href="/settings/history/orders" 
                        className={styles.menuItem}
                        onClick={(e) => {
                            if (!user) {
                                e.preventDefault();
                                router.get('/login');
                            }
                        }}
                    >
                        <div className={`${styles.menuIcon} ${styles.menuIconBlue}`}>
                            <ShoppingBag size={20} />
                        </div>
                        <span className={styles.menuText}>{t('My Orders')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </a>

                    <a href="/settings/cards" className={styles.menuItem}>
                        <div className={`${styles.menuIcon} ${styles.menuIconCyan}`}>
                            <CreditCard size={20} />
                        </div>
                        <span className={styles.menuText}>{t('My Cards')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </a>

                    <a href="/settings/returns" className={styles.menuItem}>
                        <div className={`${styles.menuIcon} ${styles.menuIconPurple}`}>
                            <RotateCcw size={20} />
                        </div>
                        <span className={styles.menuText}>{t('My Returns')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </a>

                    <a href="/settings/addresses" className={styles.menuItem}>
                        <div className={`${styles.menuIcon} ${styles.menuIconOrange}`}>
                            <MapPin size={20} />
                        </div>
                        <span className={styles.menuText}>{t('Delivery Addresses')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </a>

                    <a href="/settings/billing" className={styles.menuItem}>
                        <div className={`${styles.menuIcon} ${styles.menuIconTeal}`}>
                            <FileText size={20} />
                        </div>
                        <span className={styles.menuText}>{t('Billing Data')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </a>

                    <a href="/settings/security" className={styles.menuItem}>
                        <div className={`${styles.menuIcon} ${styles.menuIconGreen}`}>
                            <Shield size={20} />
                        </div>
                        <span className={styles.menuText}>{t('Security Settings')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </a>

                    <div className={`${styles.menuItem} ${styles.menuItemDisabled}`}>
                        <div className={`${styles.menuIcon} ${styles.menuIconYellow}`}>
                            <Trophy size={20} />
                        </div>
                        <span className={styles.menuText}>{t('Gamification')} ({t('Soon')})</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </div>

                    <div className={styles.menuSeparator}></div>

                    <button
                        onClick={() => router.post('/logout')}
                        className={styles.menuItem}
                    >
                        <div className={`${styles.menuIcon} ${styles.menuIconRed}`}>
                            <LogOut size={20} />
                        </div>
                        <span className={styles.menuText}>{t('Logout')}</span>
                        <ChevronRight size={18} className={styles.menuChevron} />
                    </button>
                </div>
            </div>

            {/* Data Management Modal */}
            <Modal
                isOpen={isModalOpen}
                onClose={closeModal}
                title={t('Data Management')}
            >
                <form onSubmit={handleSubmit} className={styles.modalForm}>
                    <div className={styles.modalFormGroup}>
                        <label className={styles.modalLabel}>{t('Form of address')}:</label>
                        <div className={styles.radioGroup}>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="salutation"
                                    value="Dl."
                                    checked={salutation === 'Dl.'}
                                    onChange={(e) => setSalutation(e.target.value as 'Dl.' | 'Dna.')}
                                    className={styles.radioInput}
                                />
                                <span>{t('Mr.')}</span>
                            </label>
                            <label className={styles.radioLabel}>
                                <input
                                    type="radio"
                                    name="salutation"
                                    value="Dna."
                                    checked={salutation === 'Dna.'}
                                    onChange={(e) => setSalutation(e.target.value as 'Dl.' | 'Dna.')}
                                    className={styles.radioInput}
                                />
                                <span>{t('Ms.')}</span>
                            </label>
                        </div>
                    </div>

                    <div className={styles.modalFormGroup}>
                        <label className={styles.modalLabel}>{t('First and last name')}:</label>
                        <div className={styles.nameInputs}>
                            <Input
                                id="modal_first_name"
                                type="text"
                                value={first_name}
                                onChange={(e) => setFirstName(e.target.value)}
                                placeholder={t('First name')}
                                required
                                className={styles.modalInput}
                            />
                            <Input
                                id="modal_last_name"
                                type="text"
                                value={last_name}
                                onChange={(e) => setLastName(e.target.value)}
                                placeholder={t('Last name')}
                                required
                                className={styles.modalInput}
                            />
                        </div>
                    </div>

                    <div className={styles.modalFormActions}>
                        <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            disabled={processing}
                        >
                            {processing ? t('Saving...') : t('Save')}
                        </Button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default SettingsLayoutContent;
