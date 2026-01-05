import { usePage, router } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { useToast } from '../../contexts/ToastContext';
import type { SharedData } from '../../types';
import { useState, useEffect } from 'react';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Plus, MapPin } from 'lucide-react';
import styles from './billing.module.css';

interface Address {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    county_name?: string | null;
    zip_code: string;
    country_id?: number;
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

interface BillingPageProps {
    customer?: {
        customer_type?: string;
        company_name?: string | null;
        fiscal_code?: string | null;
        reg_number?: string | null;
        bank_name?: string | null;
        iban?: string | null;
    } | null;
    headquartersAddress?: Address | null;
    billingAddresses?: Address[];
    countries?: Country[];
    errors?: {
        fiscal_code?: string;
        reg_number?: string;
        company_name?: string;
        bank_name?: string;
        iban?: string;
        [key: string]: string | undefined;
    };
}

function BillingContent({ customer, headquartersAddress, billingAddresses, countries, errors: pageErrors }: BillingPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData & { errors?: BillingPageProps['errors']; customer?: BillingPageProps['customer']; headquartersAddress?: Address; billingAddresses?: Address[]; countries?: Country[] }>();
    const errors = pageErrors || page.props.errors || {};
    const customerData = customer || (page.props.customer as BillingPageProps['customer']);
    const headquartersAddr = headquartersAddress || page.props.headquartersAddress || null;
    const billingAddrs = billingAddresses || page.props.billingAddresses || [];
    const countriesData = countries || page.props.countries || [];
    const { showToast } = useToast();

    // Modal state for billing address
    const [isAddBillingAddressModalOpen, setIsAddBillingAddressModalOpen] = useState(false);
    const [isEditBillingAddressModalOpen, setIsEditBillingAddressModalOpen] = useState(false);
    const [editingBillingAddressId, setEditingBillingAddressId] = useState<number | null>(null);
    const [editingHeadquartersAddress, setEditingHeadquartersAddress] = useState(false);
    const [billingAddressFormData, setBillingAddressFormData] = useState<{
        first_name: string;
        last_name: string;
        phone: string;
        address_line_1: string;
        address_line_2: string;
        city: string;
        county_name: string;
        county_code: string;
        country_id: number | string;
        state_id: number | string;
        city_id: number | string;
        zip_code: string;
    }>({
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
    const [isSubmittingBillingAddress, setIsSubmittingBillingAddress] = useState(false);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

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

    // Company information form state
    const [companyFormData, setCompanyFormData] = useState({
        fiscal_code: customerData?.fiscal_code || '',
        reg_number: customerData?.reg_number || '',
        company_name: customerData?.company_name || '',
        bank_name: customerData?.bank_name || '',
        iban: customerData?.iban || '',
    });
    const [cuiValidating, setCuiValidating] = useState(false);
    const [isSubmittingCompany, setIsSubmittingCompany] = useState(false);
    const [cuiValid, setCuiValid] = useState<boolean | null>(null);
    const [cuiError, setCuiError] = useState<string | null>(null);

    // CUI validation function (reusable)
    const validateCui = async (cui: string): Promise<{ valid: boolean; message?: string }> => {
        if (!cui || cui.trim().length === 0) {
            return { valid: false, message: t('CUI is required') };
        }

        // Clean CUI (remove spaces, RO prefix if present)
        const cleanCui = cui.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (cleanCui.length < 2) {
            return { valid: false, message: t('CUI is too short') };
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const countryCode = 'RO';

            // Validate CUI via VIES first (for all countries)
            const validateResponse = await fetch('/auth/validate-cui', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    cui: cleanCui,
                    country_code: countryCode,
                }),
            });

            const validateData = await validateResponse.json();

            if (!validateData.valid) {
                return { valid: false, message: validateData.message || t('CUI is invalid or not found in VIES system') };
            }

            return { valid: true };
        } catch (error) {
            console.error('Error validating CUI:', error);
            return { valid: false, message: t('Error validating CUI. Please try again.') };
        }
    };

    // Fetch company data from ANAF for autofill (only for Romanian companies)
    const fetchCompanyDataForAutofill = async (cui: string) => {
        const cleanCui = cui.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
        const countryCode = 'RO';

        // Only autofill for Romanian companies
        if (countryCode !== 'RO') {
            return;
        }

        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
            const companyResponse = await fetch('/auth/get-company-data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ cui: cleanCui }),
            });

            const companyData = await companyResponse.json();

            if (companyData.success && companyData.data) {
                setCompanyFormData(prev => {
                    const updates: { company_name?: string; reg_number?: string } = {};

                    // Autofill company name if empty
                    if (!prev.company_name && companyData.data.name) {
                        updates.company_name = companyData.data.name;
                    }

                    // Autofill registration number if empty
                    if (!prev.reg_number && companyData.data.reg_number) {
                        updates.reg_number = companyData.data.reg_number;
                    }

                    return { ...prev, ...updates };
                });
            }
        } catch (error) {
            // Silently fail autofill, validation already passed
            console.error('Error fetching company data:', error);
        }
    };

    // CUI validation handler (same logic as registration)
    const handleCuiBlur = async () => {
        if (!companyFormData.fiscal_code || companyFormData.fiscal_code.trim().length === 0) {
            setCuiValid(null);
            setCuiError(null);
            return;
        }

        setCuiValidating(true);
        setCuiError(null);

        const result = await validateCui(companyFormData.fiscal_code);

        if (!result.valid) {
            setCuiValid(false);
            setCuiError(result.message || t('CUI is invalid'));
            showToast(result.message || t('CUI is invalid or not found in VIES system'), 'error');
        } else {
            setCuiValid(true);
            setCuiError(null);

            // Fetch company data for autofill (only for Romanian companies)
            await fetchCompanyDataForAutofill(companyFormData.fiscal_code);
        }

        setCuiValidating(false);
    };

    // Update company form data when customer data changes
    useEffect(() => {
        if (customerData) {
            setCompanyFormData({
                fiscal_code: customerData.fiscal_code || '',
                reg_number: customerData.reg_number || '',
                company_name: customerData.company_name || '',
                bank_name: customerData.bank_name || '',
                iban: customerData.iban || '',
            });
        }
    }, [customerData]);

    // Fetch states when country changes for billing address form
    useEffect(() => {
        if (billingAddressFormData.country_id && (isAddBillingAddressModalOpen || isEditBillingAddressModalOpen)) {
            setLoadingStates(true);
            fetch(`/settings/states/${billingAddressFormData.country_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setStates(data);
                    if (!isEditBillingAddressModalOpen) {
                        setBillingAddressFormData((prev) => ({
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
            if (!isAddBillingAddressModalOpen && !isEditBillingAddressModalOpen) {
                setStates([]);
                setCities([]);
            }
        }
    }, [billingAddressFormData.country_id, isAddBillingAddressModalOpen, isEditBillingAddressModalOpen]);

    // Fetch cities when state changes for billing address form
    useEffect(() => {
        if (billingAddressFormData.state_id && (isAddBillingAddressModalOpen || isEditBillingAddressModalOpen)) {
            setLoadingCities(true);
            fetch(`/settings/cities/${billingAddressFormData.state_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setCities(data);
                    if (!isEditBillingAddressModalOpen) {
                        setBillingAddressFormData((prev) => ({
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
            if (!isAddBillingAddressModalOpen && !isEditBillingAddressModalOpen) {
                setCities([]);
            }
        }
    }, [billingAddressFormData.state_id, isAddBillingAddressModalOpen, isEditBillingAddressModalOpen]);

    const resetBillingAddressForm = () => {
        setBillingAddressFormData({
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

    const handleAddBillingAddressClick = async () => {
        resetBillingAddressForm();
        setIsAddBillingAddressModalOpen(true);
        setIsEditBillingAddressModalOpen(false);
        setEditingBillingAddressId(null);

        // Fetch detected country from IP geolocation
        try {
            const response = await fetch('/settings/detected-country');
            if (response.ok) {
                const data = await response.json();
                if (data.country_id) {
                    const detectedCountry = countriesData.find((c) => c.id === data.country_id);
                    if (detectedCountry) {
                        setBillingAddressFormData((prev) => ({
                            ...prev,
                            country_id: data.country_id,
                        }));
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching detected country:', err);
        }
    };

    const handleEditBillingAddressClick = async (address: Address) => {
        const countryId = address.country_id || (countriesData.length > 0 ? countriesData[0].id : '');

        setBillingAddressFormData({
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
        setEditingBillingAddressId(address.id);
        setIsEditBillingAddressModalOpen(true);
        setIsAddBillingAddressModalOpen(false);

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
                    setBillingAddressFormData((prev) => ({
                        ...prev,
                        state_id: typeof state.id === 'number' ? state.id.toString() : state.id,
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
                            setBillingAddressFormData((prev) => ({
                                ...prev,
                                city_id: typeof city.id === 'number' ? city.id.toString() : city.id,
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

    const handleDeleteBillingAddressClick = (addressId: number) => {
        if (confirm(t('Are you sure you want to delete this address?'))) {
            router.delete(`/settings/billing/addresses/${addressId}`, {
                onSuccess: () => {
                    // Address will be refreshed automatically
                },
            });
        }
    };

    const handleEditHeadquartersClick = async (address: Address) => {
        const countryId = address.country_id || (countriesData.length > 0 ? countriesData[0].id : '');

        setBillingAddressFormData({
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
        setEditingBillingAddressId(address.id);
        setIsEditBillingAddressModalOpen(true);
        setIsAddBillingAddressModalOpen(false);

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
                    setBillingAddressFormData((prev) => ({
                        ...prev,
                        state_id: typeof state.id === 'number' ? state.id.toString() : state.id,
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
                            setBillingAddressFormData((prev) => ({
                                ...prev,
                                city_id: typeof city.id === 'number' ? city.id.toString() : city.id,
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

    const handleBillingAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmittingBillingAddress(true);

        const submitData = {
            first_name: billingAddressFormData.first_name,
            last_name: billingAddressFormData.last_name,
            phone: billingAddressFormData.phone,
            address_line_1: billingAddressFormData.address_line_1,
            address_line_2: billingAddressFormData.address_line_2,
            city: billingAddressFormData.city,
            county_name: billingAddressFormData.county_name,
            county_code: billingAddressFormData.county_code,
            country_id: billingAddressFormData.country_id,
            zip_code: billingAddressFormData.zip_code,
        };

        if (isEditBillingAddressModalOpen && editingBillingAddressId) {
            router.put(`/settings/billing/addresses/${editingBillingAddressId}`, submitData, {
                onFinish: () => {
                    setIsSubmittingBillingAddress(false);
                    setIsEditBillingAddressModalOpen(false);
                    setEditingBillingAddressId(null);
                    resetBillingAddressForm();
                },
                onError: () => {
                    setIsSubmittingBillingAddress(false);
                },
            });
        } else {
            router.post('/settings/billing/addresses', submitData, {
                onFinish: () => {
                    setIsSubmittingBillingAddress(false);
                    setIsAddBillingAddressModalOpen(false);
                    resetBillingAddressForm();
                },
                onError: () => {
                    setIsSubmittingBillingAddress(false);
                },
            });
        }
    };

    // Only show form for company type customers
    if (customerData?.customer_type !== 'company') {
        return (
            <Layout activeSidebarItem="me">
                <SettingsLayout>
                    <div className={styles.billingPage}>
                        <div className={styles.billingCard}>
                            <h1 className={styles.pageTitle}>{t('Billing Data')}</h1>
                            <p className={styles.infoMessage}>{t('Billing information is only available for company accounts.')}</p>
                        </div>
                    </div>
                </SettingsLayout>
            </Layout>
        );
    }

    return (
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                <div className={styles.billingPage}>
                    <div className={styles.billingCard}>
                        <div className={styles.billingLayout}>
                            <div className={styles.billingFormContainer}>
                                <h2 className={styles.sectionTitle}>{t('Billing Data')}</h2>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();

                                        // Validate CUI before submitting
                                        if (!companyFormData.fiscal_code || companyFormData.fiscal_code.trim().length === 0) {
                                            setCuiError(t('CUI is required'));
                                            showToast(t('CUI is required'), 'error');
                                            return;
                                        }

                                        // If CUI hasn't been validated or is invalid, validate it now
                                        if (cuiValid === null || cuiValid === false) {
                                            setIsSubmittingCompany(true);
                                            setCuiValidating(true);
                                            setCuiError(null);

                                            const result = await validateCui(companyFormData.fiscal_code);

                                            if (!result.valid) {
                                                setCuiValid(false);
                                                setCuiError(result.message || t('CUI is invalid'));
                                                showToast(result.message || t('CUI is invalid or not found in VIES system'), 'error');
                                                setIsSubmittingCompany(false);
                                                setCuiValidating(false);
                                                return;
                                            }

                                            setCuiValid(true);
                                            setCuiError(null);
                                            setCuiValidating(false);
                                        }

                                        // Submit the form
                                        setIsSubmittingCompany(true);
                                        router.patch('/settings/profile/company-info', companyFormData, {
                                            onFinish: () => {
                                                setIsSubmittingCompany(false);
                                            },
                                            onError: () => {
                                                setIsSubmittingCompany(false);
                                            },
                                        });
                                    }}
                                    className={styles.billingForm}
                                >
                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('CUI/CIF')}</label>
                                        <Input
                                            type="text"
                                            value={companyFormData.fiscal_code}
                                            onChange={(e) => {
                                                setCompanyFormData({ ...companyFormData, fiscal_code: e.target.value });
                                                // Reset validation state when user changes the CUI
                                                if (cuiValid !== null || cuiError) {
                                                    setCuiValid(null);
                                                    setCuiError(null);
                                                }
                                            }}
                                            onBlur={handleCuiBlur}
                                            required
                                            className={(errors.fiscal_code || cuiError) ? styles.inputError : ''}
                                            disabled={cuiValidating}
                                        />
                                        {cuiValidating && (
                                            <span className={styles.checkingMessage}>{t('Validating CUI...')}</span>
                                        )}
                                        {cuiError && <span className={styles.errorMessage}>{cuiError}</span>}
                                        {errors.fiscal_code && !cuiError && <span className={styles.errorMessage}>{errors.fiscal_code}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('Registration Number')}</label>
                                        <Input
                                            type="text"
                                            value={companyFormData.reg_number}
                                            onChange={(e) => setCompanyFormData({ ...companyFormData, reg_number: e.target.value })}
                                            required
                                            className={errors.reg_number ? styles.inputError : ''}
                                        />
                                        {errors.reg_number && <span className={styles.errorMessage}>{errors.reg_number}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('Company Name')}</label>
                                        <Input
                                            type="text"
                                            value={companyFormData.company_name}
                                            onChange={(e) => setCompanyFormData({ ...companyFormData, company_name: e.target.value })}
                                            required
                                            className={errors.company_name ? styles.inputError : ''}
                                        />
                                        {errors.company_name && <span className={styles.errorMessage}>{errors.company_name}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('Bank')} ({t('optional')})</label>
                                        <Input
                                            type="text"
                                            value={companyFormData.bank_name}
                                            onChange={(e) => setCompanyFormData({ ...companyFormData, bank_name: e.target.value })}
                                            className={errors.bank_name ? styles.inputError : ''}
                                        />
                                        {errors.bank_name && <span className={styles.errorMessage}>{errors.bank_name}</span>}
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('IBAN Account')} ({t('optional')})</label>
                                        <Input
                                            type="text"
                                            value={companyFormData.iban}
                                            onChange={(e) => setCompanyFormData({ ...companyFormData, iban: e.target.value.toUpperCase().replace(/\s/g, '') })}
                                            placeholder="RO49AAAA1B31007593840000"
                                            maxLength={34}
                                            className={errors.iban ? styles.inputError : ''}
                                        />
                                        {errors.iban && <span className={styles.errorMessage}>{errors.iban}</span>}
                                    </div>

                                    <div className={styles.formActions}>
                                        <Button
                                            type="submit"
                                            variant="primary"
                                            disabled={isSubmittingCompany || cuiValidating}
                                        >
                                            {isSubmittingCompany ? t('Saving...') : t('Save Changes')}
                                        </Button>
                                    </div>
                                </form>
                            </div>
                            <div className={styles.addressesContainer}>
                                {/* Default Billing Address (Headquarters) Section */}
                                {headquartersAddr && (
                                    <div className={styles.addressSection}>
                                        <h2 className={styles.sectionTitle}>{t('Adresa sediu social')}</h2>
                                        <div className={styles.addressCard}>
                                            <div className={styles.addressIcon}>
                                                <MapPin size={24} />
                                            </div>
                                            <div className={styles.addressContent}>
                                                <div className={styles.addressHeader}>
                                                    <div className={styles.addressName}>
                                                        {headquartersAddr.first_name} {headquartersAddr.last_name} - {headquartersAddr.phone}
                                                    </div>
                                                </div>
                                                <div className={styles.addressText}>
                                                    {formatAddress(headquartersAddr)}
                                                </div>
                                                <div className={styles.addressActions}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditBillingAddressClick(headquartersAddr)}
                                                        className={styles.actionLink}
                                                    >
                                                        {t('edit')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Billing Addresses Section */}
                                <div className={styles.addressSection}>
                                    <div className={styles.sectionHeader}>
                                        <h2 className={styles.sectionTitle}>{t('Billing Addresses')}</h2>
                                        <button
                                            type="button"
                                            onClick={handleAddBillingAddressClick}
                                            className={styles.addButton}
                                        >
                                            <Plus size={16} />
                                            {t('Add Billing Address')}
                                        </button>
                                    </div>
                                    {billingAddrs.length > 0 ? (
                                        <div className={styles.addressesGrid}>
                                            {billingAddrs.map((address) => (
                                                <div key={address.id} className={styles.addressCard}>
                                                    <div className={styles.addressIcon}>
                                                        <MapPin size={24} />
                                                    </div>
                                                    <div className={styles.addressContent}>
                                                        <div className={styles.addressHeader}>
                                                            <div className={styles.addressName}>
                                                                {address.first_name} {address.last_name} - {address.phone}
                                                            </div>
                                                        </div>
                                                        <div className={styles.addressText}>
                                                            {formatAddress(address)}
                                                        </div>
                                                        <div className={styles.addressActions}>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEditBillingAddressClick(address)}
                                                                className={styles.actionLink}
                                                            >
                                                                {t('edit')}
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteBillingAddressClick(address.id)}
                                                                className={styles.actionLink}
                                                            >
                                                                {t('delete')}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className={styles.infoMessage}>{t('No billing addresses added yet.')}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Add/Edit Billing Address Modal */}
                <Modal
                    isOpen={isAddBillingAddressModalOpen || isEditBillingAddressModalOpen}
                    onClose={() => {
                        setIsAddBillingAddressModalOpen(false);
                        setIsEditBillingAddressModalOpen(false);
                        setEditingBillingAddressId(null);
                        resetBillingAddressForm();
                    }}
                    title={isEditBillingAddressModalOpen ? t('Edit Billing Address') : t('Add Billing Address')}
                >
                    <form onSubmit={handleBillingAddressSubmit} className={styles.addressForm}>
                        <div className={styles.formRow}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('First name')}</label>
                                <Input
                                    type="text"
                                    value={billingAddressFormData.first_name}
                                    onChange={(e) => setBillingAddressFormData({ ...billingAddressFormData, first_name: e.target.value })}
                                    required
                                    className={errors.first_name ? styles.inputError : ''}
                                />
                                {errors.first_name && <span className={styles.errorMessage}>{errors.first_name}</span>}
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>{t('Last name')}</label>
                                <Input
                                    type="text"
                                    value={billingAddressFormData.last_name}
                                    onChange={(e) => setBillingAddressFormData({ ...billingAddressFormData, last_name: e.target.value })}
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
                                value={billingAddressFormData.phone}
                                onChange={(e) => setBillingAddressFormData({ ...billingAddressFormData, phone: e.target.value })}
                                required
                                className={errors.phone ? styles.inputError : ''}
                            />
                            {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Address Line 1')}</label>
                            <Input
                                type="text"
                                value={billingAddressFormData.address_line_1}
                                onChange={(e) => setBillingAddressFormData({ ...billingAddressFormData, address_line_1: e.target.value })}
                                required
                                className={errors.address_line_1 ? styles.inputError : ''}
                            />
                            {errors.address_line_1 && <span className={styles.errorMessage}>{errors.address_line_1}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Address Line 2')} ({t('optional')})</label>
                            <Input
                                type="text"
                                value={billingAddressFormData.address_line_2}
                                onChange={(e) => setBillingAddressFormData({ ...billingAddressFormData, address_line_2: e.target.value })}
                                className={errors.address_line_2 ? styles.inputError : ''}
                            />
                            {errors.address_line_2 && <span className={styles.errorMessage}>{errors.address_line_2}</span>}
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>{t('Country')}</label>
                            <select
                                value={billingAddressFormData.country_id}
                                onChange={(e) => {
                                    setBillingAddressFormData({
                                        ...billingAddressFormData,
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
                                    value={billingAddressFormData.state_id}
                                    onChange={(e) => {
                                        const stateId = e.target.value ? parseInt(e.target.value) : '';
                                        const selectedState = states.find((s) => s.id === (typeof stateId === 'number' ? stateId : 0));
                                        setBillingAddressFormData({
                                            ...billingAddressFormData,
                                            state_id: typeof stateId === 'number' ? stateId.toString() : stateId,
                                            county_name: selectedState?.name || '',
                                            county_code: selectedState?.code || '',
                                            city_id: '',
                                            city: '',
                                        });
                                    }}
                                    required
                                    disabled={loadingStates || !billingAddressFormData.country_id}
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
                                    value={billingAddressFormData.city_id}
                                    onChange={(e) => {
                                        const cityId = e.target.value ? parseInt(e.target.value) : '';
                                        const selectedCity = cities.find((c) => c.id === (typeof cityId === 'number' ? cityId : 0));
                                        setBillingAddressFormData({
                                            ...billingAddressFormData,
                                            city_id: typeof cityId === 'number' ? cityId.toString() : cityId,
                                            city: selectedCity?.name || '',
                                        });
                                    }}
                                    required
                                    disabled={loadingCities || !billingAddressFormData.state_id}
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
                                value={billingAddressFormData.zip_code}
                                onChange={(e) => setBillingAddressFormData({ ...billingAddressFormData, zip_code: e.target.value })}
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
                                    setIsAddBillingAddressModalOpen(false);
                                    setIsEditBillingAddressModalOpen(false);
                                    setEditingBillingAddressId(null);
                                    resetBillingAddressForm();
                                }}
                                disabled={isSubmittingBillingAddress}
                            >
                                {t('Cancel')}
                            </Button>
                            <Button
                                type="submit"
                                variant="primary"
                                disabled={isSubmittingBillingAddress}
                            >
                                {isSubmittingBillingAddress ? t('Saving...') : t('Save Address')}
                            </Button>
                        </div>
                    </form>
                </Modal>
            </SettingsLayout>
        </Layout>
    );
}

export default BillingContent;


