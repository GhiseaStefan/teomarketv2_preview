import { usePage, router } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import type { SharedData } from '../../types';
import { MapPin, Plus, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import styles from './addresses.module.css';

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
    country_id?: number;
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

interface AddressesPageProps {
    customer_type?: string;
    addresses?: Address[];
    countries?: Country[];
    errors?: {
        [key: string]: string | undefined;
    };
}

function AddressesContent({ customer_type, addresses, countries, errors: pageErrors }: AddressesPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData & { errors?: AddressesPageProps['errors']; customer_type?: string; addresses?: Address[]; countries?: Country[] }>();
    const errors = pageErrors || page.props.errors || {};
    const customerType = customer_type || page.props.customer_type || 'individual';
    const addressesData = addresses || (page.props.addresses as Address[]) || [];
    const countriesData = countries || (page.props.countries as Country[]) || [];

    // Modal state
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [addressFormData, setAddressFormData] = useState({
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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    // Fetch states when country changes
    useEffect(() => {
        if (addressFormData.country_id && (isAddModalOpen || isEditModalOpen)) {
            setLoadingStates(true);
            fetch(`/settings/states/${addressFormData.country_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setStates(data);
                    if (!isEditModalOpen) {
                        setAddressFormData((prev) => ({
                            ...prev,
                            state_id: '',
                            city_id: '',
                            county_name: '',
                            county_code: '',
                            city: '',
                        }));
                        setCities([]);
                    }
                })
                .catch((err) => {
                    console.error('Error fetching states:', err);
                    setStates([]);
                })
                .finally(() => {
                    setLoadingStates(false);
                });
        } else {
            if (!isEditModalOpen) {
                setStates([]);
                setCities([]);
            }
        }
    }, [addressFormData.country_id, isAddModalOpen, isEditModalOpen]);

    // Fetch cities when state changes
    useEffect(() => {
        if (addressFormData.state_id && (isAddModalOpen || isEditModalOpen)) {
            setLoadingCities(true);
            fetch(`/settings/cities/${addressFormData.state_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setCities(data);
                    if (!isEditModalOpen) {
                        setAddressFormData((prev) => ({
                            ...prev,
                            city_id: '',
                            city: '',
                        }));
                    }
                })
                .catch((err) => {
                    console.error('Error fetching cities:', err);
                    setCities([]);
                })
                .finally(() => {
                    setLoadingCities(false);
                });
        } else {
            if (!isEditModalOpen) {
                setCities([]);
            }
        }
    }, [addressFormData.state_id, isAddModalOpen, isEditModalOpen]);

    const resetForm = () => {
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
    };

    const handleAddClick = async () => {
        resetForm();
        setIsAddModalOpen(true);
        
        // Fetch detected country from IP geolocation
        try {
            const response = await fetch('/settings/detected-country');
            if (response.ok) {
                const data = await response.json();
                if (data.country_id) {
                    // Verify the detected country exists in the countries list
                    const detectedCountry = countriesData.find((c) => c.id === data.country_id);
                    if (detectedCountry) {
                        setAddressFormData((prev) => ({
                            ...prev,
                            country_id: data.country_id,
                        }));
                    }
                }
            }
        } catch (err) {
            // Silently fail - will use default country (first in list)
            console.error('Error fetching detected country:', err);
        }
    };

    const handleEditClick = async (address: Address) => {
        const countryId = address.country_id || (countriesData.length > 0 ? countriesData[0].id : '');

        setAddressFormData({
            first_name: address.first_name,
            last_name: address.last_name,
            phone: address.phone,
            address_line_1: address.address_line_1,
            address_line_2: address.address_line_2 || '',
            city: address.city,
            county_name: address.county_name || '',
            county_code: '',
            country_id: countryId,
            state_id: '',
            city_id: '',
            zip_code: address.zip_code,
        });
        setEditingAddressId(address.id);
        setIsEditModalOpen(true);

        // Load states for the country
        if (countryId) {
            setLoadingStates(true);
            try {
                const statesRes = await fetch(`/settings/states/${countryId}`);
                const statesData = await statesRes.json();
                setStates(statesData);

                // Find state by name
                const state = statesData.find((s: State) => s.name === address.county_name);
                if (state) {
                    setAddressFormData((prev) => ({
                        ...prev,
                        state_id: state.id,
                        county_code: state.code || '',
                    }));

                    // Load cities for the state
                    setLoadingCities(true);
                    try {
                        const citiesRes = await fetch(`/settings/cities/${state.id}`);
                        const citiesData = await citiesRes.json();
                        setCities(citiesData);

                        // Find city by name
                        const city = citiesData.find((c: City) => c.name === address.city);
                        if (city) {
                            setAddressFormData((prev) => ({
                                ...prev,
                                city_id: city.id,
                            }));
                        }
                    } catch (err) {
                        console.error('Error fetching cities:', err);
                    } finally {
                        setLoadingCities(false);
                    }
                }
            } catch (err) {
                console.error('Error fetching states:', err);
            } finally {
                setLoadingStates(false);
            }
        }
    };

    const handleDeleteClick = (addressId: number) => {
        if (confirm(t('Are you sure you want to delete this address?'))) {
            router.delete(`/settings/addresses/${addressId}`, {
                onSuccess: () => {
                    // Address will be refreshed automatically
                },
            });
        }
    };

    const handleSetPreferred = (addressId: number) => {
        router.post(`/settings/addresses/${addressId}/set-preferred`, {}, {
            onSuccess: () => {
                // Address will be refreshed automatically
            },
        });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

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

        if (isEditModalOpen && editingAddressId) {
            router.put(`/settings/addresses/${editingAddressId}`, submitData, {
                onFinish: () => {
                    setIsSubmitting(false);
                    setIsEditModalOpen(false);
                    setEditingAddressId(null);
                    resetForm();
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            });
        } else {
            router.post('/settings/addresses', submitData, {
                onFinish: () => {
                    setIsSubmitting(false);
                    setIsAddModalOpen(false);
                    resetForm();
                },
                onError: () => {
                    setIsSubmitting(false);
                },
            });
        }
    };

    const formatAddress = (address: Address): string => {
        const parts: string[] = [];
        if (address.address_line_1) parts.push(address.address_line_1);
        if (address.address_line_2) parts.push(address.address_line_2);
        if (address.city) {
            let cityPart = address.city;
            if (address.county_name) {
                cityPart += `, ${address.county_name}`;
            }
            parts.push(cityPart);
        }
        return parts.join(', ');
    };

    return (
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                <div className={styles.addressesPage}>
                    <div className={styles.addressesCard}>
                        <div className={styles.pageHeader}>
                            <h1 className={styles.pageTitle}>{t('My Addresses')}</h1>
                            <button
                                type="button"
                                onClick={handleAddClick}
                                className={styles.addButton}
                            >
                                <Plus size={20} />
                                {t('Add Address')}
                            </button>
                        </div>

                        <div className={styles.addressesGrid}>
                            {addressesData.map((address) => {
                                return (
                                    <div key={address.id} className={styles.addressCard}>
                                        <div className={styles.addressIcon}>
                                            <MapPin size={24} />
                                        </div>
                                        <div className={styles.addressContent}>
                                            <div className={styles.addressHeader}>
                                                <div className={styles.addressName}>
                                                    {address.first_name} {address.last_name} - {address.phone}
                                                </div>
                                                {address.is_preferred === true && (
                                                    <div className={styles.preferredBadge}>
                                                        <Star size={16} fill="currentColor" />
                                                        {t('Preferred')}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={styles.addressText}>
                                                {formatAddress(address)}
                                            </div>
                                            <div className={styles.addressActions}>
                                                {address.is_preferred !== true && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSetPreferred(address.id)}
                                                        className={styles.actionLink}
                                                    >
                                                        {t('Set as preferred')}
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditClick(address)}
                                                    className={styles.actionLink}
                                                >
                                                    {t('edit')}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteClick(address.id)}
                                                    className={styles.actionLink}
                                                >
                                                    {t('delete')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Add Address Modal */}
                    <Modal
                        isOpen={isAddModalOpen}
                        onClose={() => {
                            setIsAddModalOpen(false);
                            resetForm();
                        }}
                        title={t('Add New Address')}
                    >
                        <form onSubmit={handleSubmit} className={styles.addressForm}>
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
                                            const selectedState = states.find((s) => s.id === stateId);
                                            setAddressFormData({
                                                ...addressFormData,
                                                state_id: stateId,
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
                                            const selectedCity = cities.find((c) => c.id === cityId);
                                            setAddressFormData({
                                                ...addressFormData,
                                                city_id: cityId,
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
                                    onClick={() => {
                                        setIsAddModalOpen(false);
                                        resetForm();
                                    }}
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

                    {/* Edit Address Modal */}
                    <Modal
                        isOpen={isEditModalOpen}
                        onClose={() => {
                            setIsEditModalOpen(false);
                            setEditingAddressId(null);
                            resetForm();
                        }}
                        title={t('Edit Address')}
                    >
                        <form onSubmit={handleSubmit} className={styles.addressForm}>
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
                                            const selectedState = states.find((s) => s.id === stateId);
                                            setAddressFormData({
                                                ...addressFormData,
                                                state_id: stateId,
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
                                            const selectedCity = cities.find((c) => c.id === cityId);
                                            setAddressFormData({
                                                ...addressFormData,
                                                city_id: cityId,
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
                                    onClick={() => {
                                        setIsEditModalOpen(false);
                                        setEditingAddressId(null);
                                        resetForm();
                                    }}
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
                </div>
            </SettingsLayout>
        </Layout>
    );
}

export default AddressesContent;
