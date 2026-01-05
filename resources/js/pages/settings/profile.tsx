import { usePage, router } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { useSettingsModal } from '../../contexts/SettingsModalContext';
import type { SharedData } from '../../types';
import { Edit, FolderOpen, Heart, Star, Building2, MapPin, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './profile.module.css';

interface Address {
    id: number;
    address_type?: string;
    first_name: string;
    last_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    county_name?: string | null;
    zip_code: string;
    is_preferred?: boolean;
}

interface Country {
    id: number;
    name: string;
    iso_code_2: string;
}

interface State {
    id: number;
    name: string;
    code: string | null;
}

interface City {
    id: number;
    name: string;
}

interface HeadquartersAddress {
    id: number;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    county_name?: string | null;
    zip_code: string;
}

interface ProfilePageProps {
    mustVerifyEmail?: boolean;
    status?: string;
    customer?: {
        phone?: string;
        customer_type?: string;
        company_name?: string | null;
        fiscal_code?: string | null;
        reg_number?: string | null;
    } | null;
    addresses?: Address[];
    preferredAddress?: Address | null;
    headquartersAddress?: HeadquartersAddress | null;
    countries?: Country[];
    activityStats?: {
        orders_count?: number;
        favorites_count?: number;
        favorite_lists_count?: number;
        reviews_count?: number;
        useful_reviews_count?: number;
    };
    errors?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        fiscal_code?: string;
        reg_number?: string;
        company_name?: string;
        [key: string]: string | undefined;
    };
}

function ManageDataButton() {
    const { t } = useTranslations();
    const { openModal } = useSettingsModal();

    return (
        <button
            type="button"
            onClick={() => openModal()}
            className={styles.manageAccountDataLink}
        >
            {t('manage your data')}
        </button>
    );
}

function ProfileContent({ customer, addresses, preferredAddress, headquartersAddress, countries, activityStats }: ProfilePageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData & { errors?: ProfilePageProps['errors']; customer?: ProfilePageProps['customer']; addresses?: Address[]; preferredAddress?: Address | null; headquartersAddress?: HeadquartersAddress | null; countries?: Country[]; activityStats?: ProfilePageProps['activityStats']; defaultCountryId?: number }>();
    const errors = page.props.errors || {};
    const user = page.props.auth?.user;
    const customerData = customer || (page.props.customer as ProfilePageProps['customer']);
    const addressesData = addresses || (page.props.addresses as Address[]) || [];
    const preferredAddressData = preferredAddress || (page.props.preferredAddress as Address | null);
    const headquartersAddressData = headquartersAddress || (page.props.headquartersAddress as HeadquartersAddress | null);
    const countriesData = countries || (page.props.countries as Country[]) || [];
    const defaultCountryId = page.props.defaultCountryId;
    const stats = activityStats || (page.props.activityStats as ProfilePageProps['activityStats']) || {
        orders_count: 0,
        favorites_count: 0,
        favorite_lists_count: 0,
        reviews_count: 0,
        useful_reviews_count: 0,
    };

    // Address modal state
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [addressFormData, setAddressFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        county_name: '',
        county_code: '',
        country_id: defaultCountryId
            ? defaultCountryId
            : (countriesData.length > 0 ? countriesData[0].id : ''),
        state_id: '',
        city_id: '',
        zip_code: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    // Fetch states when country changes
    useEffect(() => {
        if (addressFormData.country_id && isAddressModalOpen) {
            setLoadingStates(true);
            fetch(`/settings/states/${addressFormData.country_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setStates(data);
                    setAddressFormData((prev) => ({
                        ...prev,
                        state_id: '',
                        city_id: '',
                        county_name: '',
                        county_code: '',
                        city: '',
                    }));
                    setCities([]);
                })
                .catch((err) => {
                    console.error('Error fetching states:', err);
                    setStates([]);
                })
                .finally(() => {
                    setLoadingStates(false);
                });
        } else {
            setStates([]);
            setCities([]);
        }
    }, [addressFormData.country_id, isAddressModalOpen]);

    // Fetch cities when state changes
    useEffect(() => {
        if (addressFormData.state_id && isAddressModalOpen) {
            setLoadingCities(true);
            fetch(`/settings/cities/${addressFormData.state_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setCities(data);
                    setAddressFormData((prev) => ({
                        ...prev,
                        city_id: '',
                        city: '',
                    }));
                })
                .catch((err) => {
                    console.error('Error fetching cities:', err);
                    setCities([]);
                })
                .finally(() => {
                    setLoadingCities(false);
                });
        } else {
            setCities([]);
        }
    }, [addressFormData.state_id, isAddressModalOpen]);

    return (
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                {/* Box 2: Top Middle */}
                <div className={styles.box2}>
                    <div className={styles.box2Content}>
                        <h2 className={styles.box2Title}>{t('Account Details')}</h2>

                        <div className={styles.accountDetails}>
                            <div className={styles.avatarSection}>
                                <div className={styles.avatarLarge}>
                                    {user?.first_name && typeof user.first_name === 'string' ? user.first_name[0].toUpperCase() : 'U'}
                                    {user?.last_name && typeof user.last_name === 'string' ? user.last_name[0].toUpperCase() : ''}
                                    <button className={styles.avatarEditButton}>
                                        <Edit size={14} />
                                    </button>
                                </div>
                            </div>

                            <div className={styles.detailsFields}>
                                <div className={styles.detailField}>
                                    <span className={styles.fieldLabel}>{t('Name')}:</span>
                                    <span className={styles.fieldValue}>
                                        {typeof user?.first_name === 'string' ? user.first_name : ''} {typeof user?.last_name === 'string' ? user.last_name : ''}
                                    </span>
                                </div>

                                <div className={styles.detailField}>
                                    <span className={styles.fieldLabel}>{t('Email')}</span>
                                    <span className={styles.fieldValue}>
                                        {user?.email}
                                    </span>
                                </div>

                                <div className={styles.detailField}>
                                    <span className={styles.fieldLabel}>{t('Phone')}</span>
                                    <span className={styles.fieldValueBold}>
                                        {customerData?.phone || 'N/A'}
                                    </span>
                                </div>

                                <button className={styles.modifyPhoneButton}>
                                    {t('modify number')}
                                </button>
                            </div>
                        </div>

                        <div className={styles.manageAccountData}>
                            <div className={styles.manageAccountDataSeparator}></div>
                            <ManageDataButton />
                        </div>
                    </div>
                </div>

                {/* Box 3: Top Right */}
                <div className={styles.box3}>
                    <div className={styles.box3Content}>
                        <h2 className={styles.box3Title}>{t('My Addresses')}</h2>
                        <p className={styles.box3Subtitle}>
                            {addressesData.filter(addr => !addr.address_type || addr.address_type === 'shipping').length} {addressesData.filter(addr => !addr.address_type || addr.address_type === 'shipping').length === 1 ? t('saved address') : t('saved addresses')}
                        </p>

                        {preferredAddressData && (
                            <div className={styles.addressCard}>
                                <div className={styles.preferredAddressLabel}>
                                    {t('PREFERRED ADDRESS')}
                                </div>
                                <div className={styles.addressName}>
                                    {preferredAddressData.first_name} {preferredAddressData.last_name}
                                </div>
                                <div className={styles.addressPhone}>
                                    {preferredAddressData.phone}
                                </div>
                                <div className={styles.addressLines}>
                                    <div>{preferredAddressData.address_line_1}</div>
                                    {preferredAddressData.address_line_2 && (
                                        <div>{preferredAddressData.address_line_2}</div>
                                    )}
                                    <div>
                                        {preferredAddressData.city}
                                        {preferredAddressData.county_name && `, ${preferredAddressData.county_name}`}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={styles.addressManageLink}>
                            <div className={styles.addressSeparator}></div>
                            <button
                                type="button"
                                onClick={() => setIsAddressModalOpen(true)}
                                className={styles.manageAddressesLink}
                            >
                                {t('manage delivery addresses')}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Box 5: Mid-Page Wide Section */}
                <div className={styles.box5}>
                    <h2 className={styles.activityTitle}>{t('My Activity')}</h2>

                    <div className={styles.activitySections}>
                        <div className={styles.activitySection}>
                            <div className={`${styles.activityIcon} ${styles.activityIconBlue}`}>
                                <FolderOpen size={32} />
                            </div>
                            <div className={styles.activityText}>
                                <div className={styles.activityTextLine}>
                                    {stats.orders_count} {stats.orders_count === 1 ? t('order placed') : t('orders placed')}
                                </div>
                            </div>
                            <a href="/settings/history/orders" className={styles.activityLink}>
                                {t('see order history')}
                            </a>
                        </div>

                        <div className={styles.activitySection}>
                            <div className={`${styles.activityIcon} ${styles.activityIconRed}`}>
                                <Heart size={32} />
                            </div>
                            <div className={styles.activityText}>
                                <div className={styles.activityTextLine}>
                                    {stats.favorites_count} {stats.favorites_count === 1 ? t('favorite product') : t('favorite products')}
                                </div>
                            </div>
                            <a href="/wishlist" className={styles.activityLink}>
                                {t('see favorite products')}
                            </a>
                        </div>

                        <div className={styles.activitySection}>
                            <div className={`${styles.activityIcon} ${styles.activityIconYellow}`}>
                                <Star size={32} />
                            </div>
                            <div className={styles.activityText}>
                                <div className={styles.activityTextLine}>
                                    {stats.reviews_count} {stats.reviews_count === 1 ? t('review added') : t('reviews added')}
                                </div>
                            </div>
                            <a href="/reviews" className={styles.activityLink}>
                                {t('see reviews')}
                            </a>
                        </div>
                    </div>
                </div>

                {/* Box 8: Gamification Card */}
                <div className={styles.box8}>
                    <div className={styles.gamificationCard}>
                        <div className={styles.gamificationIcon}>
                            <Trophy size={32} />
                        </div>
                        <h3 className={styles.gamificationTitle}>
                            {t('Gamification')} ({t('Soon')})
                        </h3>
                    </div>
                </div>

                {/* Box 7: Bottom Middle */}
                <div className={styles.box7}>
                    {customerData?.customer_type === 'company' && customerData.company_name && (
                        <div className={styles.companyCard}>
                            <div className={styles.companyCardHeader}>
                                <div className={styles.companyIcon}>
                                    <Building2 size={24} />
                                </div>
                                <h3 className={styles.companyCardTitle}>{customerData.company_name}</h3>
                            </div>
                            {headquartersAddressData && (
                                <div className={styles.companyAddressSection}>
                                    <div className={styles.companyAddressHeader}>
                                        <MapPin size={16} />
                                        <span className={styles.companyAddressLabel}>{t('Headquarters Address')}</span>
                                    </div>
                                    <div className={styles.companyAddressContent}>
                                        <div className={styles.companyAddressLine}>{headquartersAddressData.address_line_1}</div>
                                        {headquartersAddressData.address_line_2 && (
                                            <div className={styles.companyAddressLine}>{headquartersAddressData.address_line_2}</div>
                                        )}
                                        <div className={styles.companyAddressLine}>
                                            {headquartersAddressData.city}
                                            {headquartersAddressData.county_name && `, ${headquartersAddressData.county_name}`}
                                            {headquartersAddressData.zip_code && ` ${headquartersAddressData.zip_code}`}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Address Modal */}
                <Modal
                    isOpen={isAddressModalOpen}
                    onClose={() => {
                        setIsAddressModalOpen(false);
                        setAddressFormData({
                            first_name: '',
                            last_name: '',
                            phone: '',
                            address_line_1: '',
                            address_line_2: '',
                            city: '',
                            county_name: '',
                            county_code: '',
                            country_id: countriesData.length > 0 ? countriesData[0].id : '',
                            state_id: '',
                            city_id: '',
                            zip_code: '',
                        });
                        setStates([]);
                        setCities([]);
                    }}
                    title={t('Add New Address')}
                >
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            setIsSubmitting(true);
                            // Prepare data for submission (only send required fields, not state_id and city_id)
                            const submitData = {
                                first_name: addressFormData.first_name,
                                last_name: addressFormData.last_name,
                                phone: addressFormData.phone,
                                address_line_1: addressFormData.address_line_1,
                                address_line_2: addressFormData.address_line_2,
                                city: addressFormData.city,
                                county_name: addressFormData.county_name,
                                county_code: addressFormData.county_code,
                                country_id: addressFormData.country_id,
                                zip_code: addressFormData.zip_code,
                            };
                            router.post('/settings/addresses', submitData, {
                                onFinish: () => {
                                    setIsSubmitting(false);
                                    setIsAddressModalOpen(false);
                                    setAddressFormData({
                                        first_name: '',
                                        last_name: '',
                                        phone: '',
                                        address_line_1: '',
                                        address_line_2: '',
                                        city: '',
                                        county_name: '',
                                        county_code: '',
                                        country_id: countriesData.length > 0 ? countriesData[0].id : '',
                                        state_id: '',
                                        city_id: '',
                                        zip_code: '',
                                    });
                                    setStates([]);
                                    setCities([]);
                                },
                                onError: () => {
                                    setIsSubmitting(false);
                                },
                            });
                        }}
                        className={styles.addressForm}
                    >
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('First name')}</label>
                                <Input
                                    type="text"
                                    value={addressFormData.first_name}
                                    onChange={(e) => setAddressFormData({ ...addressFormData, first_name: e.target.value })}
                                    required
                                    className={errors.first_name ? styles.inputError : ''}
                                />
                                {errors.first_name && <span className={styles.errorMessage}>{errors.first_name}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('Last name')}</label>
                                <Input
                                    type="text"
                                    value={addressFormData.last_name}
                                    onChange={(e) => setAddressFormData({ ...addressFormData, last_name: e.target.value })}
                                    required
                                    className={errors.last_name ? styles.inputError : ''}
                                />
                                {errors.last_name && <span className={styles.errorMessage}>{errors.last_name}</span>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Phone')}</label>
                            <Input
                                type="tel"
                                value={addressFormData.phone}
                                onChange={(e) => setAddressFormData({ ...addressFormData, phone: e.target.value })}
                                required
                                className={errors.phone ? styles.inputError : ''}
                            />
                            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Address Line 1')}</label>
                            <Input
                                type="text"
                                value={addressFormData.address_line_1}
                                onChange={(e) => setAddressFormData({ ...addressFormData, address_line_1: e.target.value })}
                                required
                                className={errors.address_line_1 ? styles.inputError : ''}
                            />
                            {errors.address_line_1 && <span className={styles.errorMessage}>{errors.address_line_1}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Address Line 2')} ({t('optional')})</label>
                            <Input
                                type="text"
                                value={addressFormData.address_line_2}
                                onChange={(e) => setAddressFormData({ ...addressFormData, address_line_2: e.target.value })}
                                className={errors.address_line_2 ? styles.inputError : ''}
                            />
                            {errors.address_line_2 && <span className={styles.errorMessage}>{errors.address_line_2}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Country')}</label>
                            <select
                                value={addressFormData.country_id}
                                onChange={(e) => {
                                    setAddressFormData({
                                        ...addressFormData,
                                        country_id: parseInt(e.target.value),
                                        state_id: '',
                                        city_id: '',
                                        county_name: '',
                                        county_code: '',
                                        city: '',
                                    });
                                }}
                                required
                                className={styles.select}
                            >
                                {countriesData.map((country) => (
                                    <option key={country.id} value={country.id}>
                                        {country.name}
                                    </option>
                                ))}
                            </select>
                            {errors.country_id && <span className={styles.errorMessage}>{errors.country_id}</span>}
                        </div>

                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('County')}</label>
                                <select
                                    value={addressFormData.state_id}
                                    onChange={(e) => {
                                        const stateId = e.target.value ? parseInt(e.target.value) : '';
                                        const selectedState = states.find((s) => s.id === (typeof stateId === 'number' ? stateId : 0));
                                        setAddressFormData({
                                            ...addressFormData,
                                            state_id: typeof stateId === 'number' ? stateId.toString() : stateId,
                                            county_name: selectedState?.name || '',
                                            county_code: selectedState?.code || '',
                                            city_id: '',
                                            city: '',
                                        });
                                    }}
                                    required
                                    disabled={loadingStates || !addressFormData.country_id}
                                    className={`${styles.select} ${errors.county_name ? styles.inputError : ''}`}
                                >
                                    <option value="">{loadingStates ? t('Loading...') : t('Select County')}</option>
                                    {states.map((state) => (
                                        <option key={state.id} value={state.id}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.county_name && <span className={styles.errorMessage}>{errors.county_name}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('City')}</label>
                                <select
                                    value={addressFormData.city_id}
                                    onChange={(e) => {
                                        const cityId = e.target.value ? parseInt(e.target.value) : '';
                                        const selectedCity = cities.find((c) => c.id === (typeof cityId === 'number' ? cityId : 0));
                                        setAddressFormData({
                                            ...addressFormData,
                                            city_id: typeof cityId === 'number' ? cityId.toString() : cityId,
                                            city: selectedCity?.name || '',
                                        });
                                    }}
                                    required
                                    disabled={loadingCities || !addressFormData.state_id}
                                    className={`${styles.select} ${errors.city ? styles.inputError : ''}`}
                                >
                                    <option value="">{loadingCities ? t('Loading...') : t('Select City')}</option>
                                    {cities.map((city) => (
                                        <option key={city.id} value={city.id}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                                {errors.city && <span className={styles.errorMessage}>{errors.city}</span>}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('ZIP Code')}</label>
                            <Input
                                type="text"
                                value={addressFormData.zip_code}
                                onChange={(e) => setAddressFormData({ ...addressFormData, zip_code: e.target.value })}
                                required
                                className={errors.zip_code ? styles.inputError : ''}
                            />
                            {errors.zip_code && <span className={styles.errorMessage}>{errors.zip_code}</span>}
                        </div>

                        <div className={styles.modalFormActions}>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsAddressModalOpen(false)}
                                disabled={isSubmitting}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? t('Saving...') : t('Save Address')}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </SettingsLayout>
        </Layout>
    );
}

export default ProfileContent;

