import { useState, FormEvent, useEffect, useRef } from 'react';
import { router, usePage } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import styles from './register.module.css';

interface Country {
    id: number;
    name: string;
    iso_code_2: string;
}

interface State {
    id: number;
    name: string;
    code: string;
}

interface City {
    id: number;
    name: string;
}

interface RegisterPageProps {
    countries?: Country[];
    errors?: {
        first_name?: string;
        last_name?: string;
        email?: string;
        password?: string;
        phone?: string;
        company_name?: string;
        fiscal_code?: string;
        reg_number?: string;
        bank_name?: string;
        iban?: string;
        address_line_1?: string;
        address_line_2?: string;
        city?: string;
        county_name?: string;
        county_code?: string;
        country_id?: string;
        zip_code?: string;
        [key: string]: string | undefined;
    };
}

export default function Register({ }: RegisterPageProps) {
    const { t } = useTranslations();
    const { showToast } = useToast();
    const page = usePage<{ errors?: RegisterPageProps['errors']; countries?: Country[]; defaultCountryId?: number }>();
    const errors = page.props.errors || {};
    const countries = page.props.countries || [];
    const defaultCountryId = page.props.defaultCountryId;

    const [customerType, setCustomerType] = useState<'individual' | 'company'>('company');

    // Email check debounce
    const emailCheckTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [emailChecking, setEmailChecking] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

    // CUI validation
    const [cuiValidating, setCuiValidating] = useState(false);
    const anafAutofillRef = useRef(false);

    const handleCustomerTypeChange = (type: 'individual' | 'company') => {
        setCustomerType(type);
        // Reset B2B fields when switching to individual
        if (type === 'individual') {
            setCompanyName('');
            setFiscalCode('');
            setRegNumber('');
            setBankName('');
            setIban('');
            setAddressLine1('');
            setAddressLine2('');
            setCity('');
            setCountyName('');
            setCountyCode('');
            setStateId('');
            setCityId('');
            setZipCode('');
            setStates([]);
            setCities([]);
        }
    };
    const [first_name, setFirstName] = useState('');
    const [last_name, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [password_confirmation, setPasswordConfirmation] = useState('');
    const [phone, setPhone] = useState('');

    // B2B fields
    const [company_name, setCompanyName] = useState('');
    const [fiscal_code, setFiscalCode] = useState('');
    const [reg_number, setRegNumber] = useState('');
    const [bank_name, setBankName] = useState('');
    const [iban, setIban] = useState('');

    // Company headquarters address fields
    const [address_line_1, setAddressLine1] = useState('');
    const [address_line_2, setAddressLine2] = useState('');
    const [city, setCity] = useState('');
    const [county_name, setCountyName] = useState('');
    const [county_code, setCountyCode] = useState('');
    const [country_id, setCountryId] = useState<string>(
        defaultCountryId
            ? String(defaultCountryId)
            : (countries.length > 0 ? String(countries[0].id) : '')
    );
    const [state_id, setStateId] = useState<string>('');
    const [city_id, setCityId] = useState<string>('');
    const [zip_code, setZipCode] = useState('');

    // States and cities for address
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    const [processing, setProcessing] = useState(false);

    // Validation functions
    const validateCompanyName = (value: string): boolean => {
        if (customerType !== 'company') return true;
        if (!value || value.trim().length < 3) {
            showToast(t('Please enter the full company name.'), 'error');
            return false;
        }
        // Allow letters, numbers, and common special characters: ., -, &, @, quotes
        const companyNameRegex = /^[a-zA-Z0-9\s\.,\-\&@"]+$/;
        if (!companyNameRegex.test(value)) {
            showToast(t('Please enter the full company name.'), 'error');
            return false;
        }
        return true;
    };

    const validateAddressLine1 = (value: string): boolean => {
        if (customerType !== 'company') return true;
        if (!value || value.trim().length < 5) {
            showToast(t('Address Line 1 must be at least 5 characters.'), 'error');
            return false;
        }
        return true;
    };

    const validateAddressLine2 = (value: string): boolean => {
        if (customerType !== 'company' || !value) return true;
        if (value.trim().length > 0 && value.trim().length < 5) {
            showToast(t('Address Line 2 must be at least 5 characters if provided.'), 'error');
            return false;
        }
        return true;
    };

    const validateName = (value: string, fieldName: string): boolean => {
        if (!value || value.trim().length === 0) {
            return false;
        }
        // Only letters, hyphen, and space
        const nameRegex = /^[a-zA-Z\s\-]+$/;
        if (!nameRegex.test(value)) {
            showToast(t('Name cannot contain numbers or symbols.'), 'error');
            return false;
        }
        return true;
    };

    const validateEmail = (value: string): boolean => {
        if (!value) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            showToast(t('Invalid email address'), 'error');
            return false;
        }
        return true;
    };

    const validatePassword = (value: string): boolean => {
        if (!value || value.length < 8) {
            showToast(t('Password must be at least 8 characters.'), 'error');
            return false;
        }
        return true;
    };

    const validatePasswordConfirmation = (password: string, confirmation: string): boolean => {
        if (password !== confirmation) {
            showToast(t('Passwords do not match.'), 'error');
            return false;
        }
        return true;
    };

    // Helper function to get CSRF token and refresh it if needed
    const getCsrfToken = (): string => {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        if (!metaTag) {
            // If meta tag doesn't exist, try to reload the page to get a fresh token
            console.warn('CSRF token meta tag not found, reloading page...');
            window.location.reload();
            return '';
        }
        return metaTag.getAttribute('content') || '';
    };

    // Real-time email uniqueness check
    useEffect(() => {
        if (emailCheckTimeoutRef.current) {
            clearTimeout(emailCheckTimeoutRef.current);
        }

        if (!email) {
            setEmailAvailable(null);
            return;
        }

        // Check if email format is valid before checking uniqueness
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setEmailAvailable(null);
            return;
        }

        emailCheckTimeoutRef.current = setTimeout(async () => {
            setEmailChecking(true);
            try {
                let csrfToken = getCsrfToken();
                if (!csrfToken) {
                    setEmailChecking(false);
                    return;
                }

                let response = await fetch('/auth/check-email', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ email }),
                });

                // If CSRF token expired, refresh it and retry once
                if (response.status === 419) {
                    // Refresh CSRF token from meta tag
                    csrfToken = getCsrfToken();
                    if (!csrfToken) {
                        setEmailChecking(false);
                        return;
                    }

                    // Retry the request with fresh token
                    response = await fetch('/auth/check-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ email }),
                    });
                }

                const data = await response.json();
                setEmailAvailable(data.available);

                if (!data.available) {
                    showToast(t('An account with this email already exists.'), 'error');
                }
            } catch (error) {
                console.error('Error checking email:', error);
            } finally {
                setEmailChecking(false);
            }
        }, 500); // 500ms debounce

        return () => {
            if (emailCheckTimeoutRef.current) {
                clearTimeout(emailCheckTimeoutRef.current);
            }
        };
    }, [email, showToast, t]);

    // CUI validation and autofill handler
    const handleCuiBlur = async () => {
        if (!fiscal_code || fiscal_code.trim().length === 0) {
            return;
        }

        // Clean CUI (remove spaces, RO prefix if present)
        const cleanCui = fiscal_code.trim().replace(/[^A-Z0-9]/gi, '').toUpperCase();
        if (cleanCui.length < 2) {
            return;
        }

        setCuiValidating(true);
        try {
            let csrfToken = getCsrfToken();
            if (!csrfToken) {
                setCuiValidating(false);
                return;
            }

            // Determine country code from selected country
            const selectedCountry = countries.find(c => String(c.id) === country_id);
            const countryCode = selectedCountry?.iso_code_2 || 'RO';
            const isRomania = countryCode === 'RO';

            // Validate CUI via VIES first (for all countries)
            let validateResponse = await fetch('/auth/validate-cui', {
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

            // If CSRF token expired, refresh it and retry once
            if (validateResponse.status === 419) {
                // Refresh CSRF token from meta tag
                csrfToken = getCsrfToken();
                if (!csrfToken) {
                    setCuiValidating(false);
                    showToast(t('Session expired. Please refresh the page.'), 'error');
                    return;
                }

                // Retry the request with fresh token
                validateResponse = await fetch('/auth/validate-cui', {
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
            }

            const validateData = await validateResponse.json();

            if (!validateData.valid) {
                showToast(validateData.message || t('CUI is invalid or not found in VIES system'), 'error');
                return;
            }

            // If Romania, get company data from ANAF for autofill
            if (isRomania) {
                let companyResponse = await fetch('/auth/get-company-data', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                        'Accept': 'application/json',
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ cui: cleanCui }),
                });

                // If CSRF token expired, refresh it and retry once
                if (companyResponse.status === 419) {
                    // Refresh CSRF token from meta tag
                    csrfToken = getCsrfToken();
                    if (!csrfToken) {
                        setCuiValidating(false);
                        showToast(t('Session expired. Please refresh the page.'), 'error');
                        return;
                    }

                    // Retry the request with fresh token
                    companyResponse = await fetch('/auth/get-company-data', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': csrfToken,
                            'Accept': 'application/json',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({ cui: cleanCui }),
                    });
                }

                const companyData = await companyResponse.json();

                if (companyData.success && companyData.data) {
                    // Autofill company name if empty
                    if (!company_name && companyData.data.name) {
                        setCompanyName(companyData.data.name);
                    }

                    // Autofill address if empty
                    if (!address_line_1 && companyData.data.address) {
                        setAddressLine1(companyData.data.address);
                    }

                    // Autofill registration number if empty
                    if (!reg_number && companyData.data.reg_number) {
                        setRegNumber(companyData.data.reg_number);
                    }

                    // Autofill ZIP code if empty
                    if (!zip_code && companyData.data.zip_code) {
                        setZipCode(companyData.data.zip_code);
                    }

                    // Autofill county (state) and city if available
                    if (companyData.data.county_code || companyData.data.county) {
                        // Helper function to find and set state and city
                        const findAndSetStateAndCity = (statesList: State[], data: any) => {
                            // Try to find state by code first (e.g., "DJ")
                            let matchedState = statesList.find((s: State) =>
                                data.county_code && s.code.toUpperCase() === data.county_code.toUpperCase()
                            );

                            // If not found by code, try by name (e.g., "DOLJ")
                            if (!matchedState && data.county) {
                                matchedState = statesList.find((s: State) =>
                                    s.name.toUpperCase() === data.county.toUpperCase()
                                );
                            }

                            if (matchedState) {
                                // Mark that this is from ANAF autofill to prevent useEffect from resetting city
                                anafAutofillRef.current = true;

                                setStateId(String(matchedState.id));
                                setCountyName(matchedState.name);
                                setCountyCode(matchedState.code);

                                // Store city name to set after cities are loaded
                                const cityNameToSet = data.city;

                                // Fetch cities and set city
                                if (cityNameToSet) {
                                    fetch(`/settings/cities/${matchedState.id}`)
                                        .then((res) => res.json())
                                        .then((citiesData) => {
                                            setCities(citiesData);

                                            // Try to find city by name (case-insensitive, try exact and partial match)
                                            const cityNameLower = cityNameToSet.toLowerCase().trim();
                                            let matchedCity = citiesData.find((c: City) =>
                                                c.name.toLowerCase().trim() === cityNameLower
                                            );

                                            // If exact match not found, try partial match
                                            if (!matchedCity) {
                                                matchedCity = citiesData.find((c: City) => {
                                                    const cName = c.name.toLowerCase().trim();
                                                    // Try if city name contains the ANAF city name or vice versa
                                                    return cName.includes(cityNameLower) ||
                                                        cityNameLower.includes(cName) ||
                                                        // Try matching key words (e.g., "Dobridor" from "Sat Dobridor Com. Moei")
                                                        cityNameLower.split(/\s+/).some(word =>
                                                            word.length > 3 && cName.includes(word)
                                                        );
                                                });
                                            }

                                            if (matchedCity) {
                                                setCityId(String(matchedCity.id));
                                                setCity(matchedCity.name);
                                                console.log('City matched and set:', matchedCity.name, 'from ANAF:', cityNameToSet);
                                            } else {
                                                // If city not found in dropdown, set as text
                                                console.log('City not found in dropdown. ANAF city:', cityNameToSet, 'Available:', citiesData.slice(0, 5).map((c: City) => c.name));
                                                setCity(cityNameToSet);
                                            }
                                        })
                                        .catch((err) => {
                                            console.error('Error fetching cities:', err);
                                            // Fallback: set city as text if fetch fails
                                            if (cityNameToSet) {
                                                setCity(cityNameToSet);
                                            }
                                        });
                                }
                            } else if (data.city) {
                                // If state not found, still set city as text
                                setCity(data.city);
                            }
                        };

                        // Ensure states are loaded first
                        if (states.length === 0 && country_id) {
                            // Fetch states if not already loaded
                            fetch(`/settings/states/${country_id}`)
                                .then((res) => res.json())
                                .then((statesData) => {
                                    setStates(statesData);
                                    findAndSetStateAndCity(statesData, companyData.data);
                                })
                                .catch((err) => {
                                    console.error('Error fetching states:', err);
                                    // Fallback: set city as text if state fetch fails
                                    if (companyData.data.city) {
                                        setCity(companyData.data.city);
                                    }
                                });
                        } else {
                            // States are already loaded, proceed with finding and setting
                            findAndSetStateAndCity(states, companyData.data);
                        }
                    } else if (companyData.data.city) {
                        // If no county code but we have city, set city as text
                        setCity(companyData.data.city);
                    }

                    showToast(t('Company data loaded successfully'), 'success');
                } else {
                    // CUI is valid but no data found (shouldn't happen often)
                    showToast(t('CUI is valid but company data could not be loaded'), 'warning');
                }
            } else {
                // For non-Romanian companies, only validate (no autofill)
                showToast(t('CUI is valid'), 'success');
            }
        } catch (error) {
            console.error('Error validating CUI:', error);
            showToast(t('Error validating CUI. Please try again.'), 'error');
        } finally {
            setCuiValidating(false);
        }
    };

    // Fetch states when country changes (only when company type is selected)
    useEffect(() => {
        if (customerType === 'company' && country_id) {
            setLoadingStates(true);
            fetch(`/settings/states/${country_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setStates(data);
                    // Only reset if we're changing country, not on initial load
                    if (state_id) {
                        setStateId('');
                        setCityId('');
                        setCountyName('');
                        setCountyCode('');
                        setCity('');
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
            setStates([]);
            setCities([]);
        }
    }, [country_id, customerType]);

    // Fetch cities when state changes (only when company type is selected)
    // Use ref to track if this is from ANAF autofill to avoid resetting city
    useEffect(() => {
        if (customerType === 'company' && state_id) {
            // Skip reset if this is from ANAF autofill
            if (anafAutofillRef.current) {
                anafAutofillRef.current = false; // Reset flag after skipping
                return;
            }

            setLoadingCities(true);
            fetch(`/settings/cities/${state_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setCities(data);
                    setCityId('');
                    setCity('');
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
    }, [state_id, customerType]);

    const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Frontend validation
        let isValid = true;

        // Validate names
        if (!validateName(first_name, 'first_name')) {
            isValid = false;
        }
        if (!validateName(last_name, 'last_name')) {
            isValid = false;
        }

        // Validate email
        if (!validateEmail(email)) {
            isValid = false;
        }

        // Check email availability
        if (emailAvailable === false) {
            showToast(t('An account with this email already exists.'), 'error');
            isValid = false;
        }

        // Validate password
        if (!validatePassword(password)) {
            isValid = false;
        }

        // Validate password confirmation
        if (!validatePasswordConfirmation(password, password_confirmation)) {
            isValid = false;
        }

        // Company-specific validations
        if (customerType === 'company') {
            if (!validateCompanyName(company_name)) {
                isValid = false;
            }
            if (!validateAddressLine1(address_line_1)) {
                isValid = false;
            }
            if (!validateAddressLine2(address_line_2)) {
                isValid = false;
            }
        }

        if (!isValid) {
            return;
        }

        setProcessing(true);

        const formData: any = {
            first_name,
            last_name,
            email,
            password,
            password_confirmation,
            phone,
            customer_type: customerType,
        };

        // Add B2B fields if company type
        if (customerType === 'company') {
            formData.company_name = company_name;
            formData.fiscal_code = fiscal_code;
            formData.reg_number = reg_number;
            if (bank_name) {
                formData.bank_name = bank_name;
            }
            if (iban) {
                formData.iban = iban;
            }
            // Company headquarters address
            formData.address_line_1 = address_line_1;
            if (address_line_2) {
                formData.address_line_2 = address_line_2;
            }
            formData.city = city;
            if (county_name) {
                formData.county_name = county_name;
            }
            if (county_code) {
                formData.county_code = county_code;
            }
            formData.country_id = country_id;
            formData.zip_code = zip_code;
        }

        router.post('/register', formData, {
            onFinish: () => {
                setProcessing(false);
            },
            onError: (errors) => {
                setProcessing(false);
                // Show backend validation errors as toasts
                Object.values(errors).forEach((error) => {
                    const errorMessage = Array.isArray(error) ? error[0] : error;
                    if (errorMessage) {
                        showToast(errorMessage, 'error');
                    }
                });
            },
        });
    };

    const handleLogoClick = (e: React.MouseEvent) => {
        e.preventDefault();
        router.get('/');
    };

    return (
        <div className={styles.registerContainer}>
            <div className={styles.registerCard}>
                <div className={styles.registerHeader}>
                    <a href="/" onClick={handleLogoClick} className={styles.logoLink}>
                        <img src="/logo.png" alt="Logo" className={styles.logo} />
                    </a>
                    <h1 className={styles.title}>{t('Register')}</h1>
                    <p className={styles.subtitle}>{t('Create a new account')}</p>
                </div>

                <form onSubmit={handleSubmit} className={styles.registerForm}>
                    {/* Customer Type Toggle */}
                    <div className={styles.customerTypeToggle}>
                        <button
                            type="button"
                            className={`${styles.toggleButton} ${customerType === 'company' ? styles.toggleButtonActive : ''}`}
                            onClick={() => handleCustomerTypeChange('company')}
                        >
                            {t('Legal Entity')}
                        </button>
                        <button
                            type="button"
                            className={`${styles.toggleButton} ${customerType === 'individual' ? styles.toggleButtonActive : ''}`}
                            onClick={() => handleCustomerTypeChange('individual')}
                        >
                            {t('Individual')}
                        </button>
                    </div>

                    {/* Two Column Layout for Company Type */}
                    <div className={customerType === 'company' ? styles.twoColumnLayout : styles.singleColumnLayout}>
                        {/* Left Column - Company Information (only when company type) */}
                        {customerType === 'company' && (
                            <div className={styles.leftColumn}>
                                <div className={styles.b2bFields}>
                                    {/* VAT Number / Tax ID - First */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor="fiscal_code" className={styles.label}>
                                            {t('CUI/CIF')}
                                        </label>
                                        <Input
                                            id="fiscal_code"
                                            type="text"
                                            value={fiscal_code}
                                            onChange={(e) => setFiscalCode(e.target.value)}
                                            onBlur={handleCuiBlur}
                                            required
                                            className={errors.fiscal_code ? styles.inputError : ''}
                                            disabled={cuiValidating}
                                        />
                                        {cuiValidating && (
                                            <span className={styles.checkingMessage}>{t('Validating CUI...')}</span>
                                        )}
                                        {errors.fiscal_code && (
                                            <span className={styles.errorMessage}>{errors.fiscal_code}</span>
                                        )}
                                    </div>

                                    {/* Company Registration Number - Second */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor="reg_number" className={styles.label}>
                                            {t('Registration Number')}
                                        </label>
                                        <Input
                                            id="reg_number"
                                            type="text"
                                            value={reg_number}
                                            onChange={(e) => setRegNumber(e.target.value)}
                                            required
                                            className={errors.reg_number ? styles.inputError : ''}
                                        />
                                        {errors.reg_number && (
                                            <span className={styles.errorMessage}>{errors.reg_number}</span>
                                        )}
                                    </div>

                                    {/* Company Name - Third */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor="company_name" className={styles.label}>
                                            {t('Company Name')}
                                        </label>
                                        <Input
                                            id="company_name"
                                            type="text"
                                            value={company_name}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            required
                                            className={errors.company_name ? styles.inputError : ''}
                                        />
                                        {errors.company_name && (
                                            <span className={styles.errorMessage}>{errors.company_name}</span>
                                        )}
                                    </div>

                                    {/* Bank Name - Fourth */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor="bank_name" className={styles.label}>
                                            {t('Bank')} ({t('optional')})
                                        </label>
                                        <Input
                                            id="bank_name"
                                            type="text"
                                            value={bank_name}
                                            onChange={(e) => setBankName(e.target.value)}
                                            className={errors.bank_name ? styles.inputError : ''}
                                        />
                                        {errors.bank_name && (
                                            <span className={styles.errorMessage}>{errors.bank_name}</span>
                                        )}
                                    </div>

                                    {/* IBAN Account - Fifth */}
                                    <div className={styles.formGroup}>
                                        <label htmlFor="iban" className={styles.label}>
                                            {t('IBAN Account')} ({t('optional')})
                                        </label>
                                        <Input
                                            id="iban"
                                            type="text"
                                            value={iban}
                                            onChange={(e) => setIban(e.target.value.toUpperCase().replace(/\s/g, ''))}
                                            placeholder="RO49AAAA1B31007593840000"
                                            maxLength={34}
                                            className={errors.iban ? styles.inputError : ''}
                                        />
                                        {errors.iban && (
                                            <span className={styles.errorMessage}>{errors.iban}</span>
                                        )}
                                    </div>

                                    {/* Company Headquarters Address */}
                                    <div className={styles.addressSection}>
                                        <h3 className={styles.addressSectionTitle}>{t('Company Headquarters Address')}</h3>

                                        <div className={styles.formGroup}>
                                            <label htmlFor="address_line_1" className={styles.label}>
                                                {t('Address Line 1')}
                                            </label>
                                            <Input
                                                id="address_line_1"
                                                type="text"
                                                value={address_line_1}
                                                onChange={(e) => setAddressLine1(e.target.value)}
                                                required
                                                className={errors.address_line_1 ? styles.inputError : ''}
                                            />
                                            {errors.address_line_1 && (
                                                <span className={styles.errorMessage}>{errors.address_line_1}</span>
                                            )}
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label htmlFor="address_line_2" className={styles.label}>
                                                {t('Address Line 2')} <span className={styles.optionalLabel}>({t('Optional')})</span>
                                            </label>
                                            <Input
                                                id="address_line_2"
                                                type="text"
                                                value={address_line_2}
                                                onChange={(e) => setAddressLine2(e.target.value)}
                                                className={errors.address_line_2 ? styles.inputError : ''}
                                            />
                                            {errors.address_line_2 && (
                                                <span className={styles.errorMessage}>{errors.address_line_2}</span>
                                            )}
                                        </div>

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor="country_id" className={styles.label}>
                                                    {t('Country')}
                                                </label>
                                                <select
                                                    id="country_id"
                                                    value={country_id}
                                                    onChange={(e) => setCountryId(e.target.value)}
                                                    required
                                                    className={`${styles.select} ${errors.country_id ? styles.inputError : ''}`}
                                                >
                                                    {countries.map((country) => (
                                                        <option key={country.id} value={country.id}>
                                                            {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.country_id && (
                                                    <span className={styles.errorMessage}>{errors.country_id}</span>
                                                )}
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label htmlFor="state_id" className={styles.label}>
                                                    {t('County')}
                                                </label>
                                                <select
                                                    id="state_id"
                                                    value={state_id}
                                                    onChange={(e) => {
                                                        const selectedStateId = e.target.value;
                                                        const selectedState = states.find((s) => s.id === parseInt(selectedStateId));
                                                        setStateId(selectedStateId);
                                                        setCountyName(selectedState?.name || '');
                                                        setCountyCode(selectedState?.code || '');
                                                        setCityId('');
                                                        setCity('');
                                                    }}
                                                    required
                                                    disabled={loadingStates || !country_id}
                                                    className={`${styles.select} ${errors.county_name ? styles.inputError : ''}`}
                                                >
                                                    <option value="">{loadingStates ? t('Loading...') : t('Select County')}</option>
                                                    {states.map((state) => (
                                                        <option key={state.id} value={state.id}>
                                                            {state.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.county_name && (
                                                    <span className={styles.errorMessage}>{errors.county_name}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.formRow}>
                                            <div className={styles.formGroup}>
                                                <label htmlFor="city_id" className={styles.label}>
                                                    {t('City')}
                                                </label>
                                                <select
                                                    id="city_id"
                                                    value={city_id}
                                                    onChange={(e) => {
                                                        const selectedCityId = e.target.value;
                                                        const selectedCity = cities.find((c) => c.id === parseInt(selectedCityId));
                                                        setCityId(selectedCityId);
                                                        setCity(selectedCity?.name || '');
                                                    }}
                                                    required
                                                    disabled={loadingCities || !state_id}
                                                    className={`${styles.select} ${errors.city ? styles.inputError : ''}`}
                                                >
                                                    <option value="">{loadingCities ? t('Loading...') : t('Select City')}</option>
                                                    {cities.map((cityItem) => (
                                                        <option key={cityItem.id} value={cityItem.id}>
                                                            {cityItem.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.city && (
                                                    <span className={styles.errorMessage}>{errors.city}</span>
                                                )}
                                            </div>

                                            <div className={styles.formGroup}>
                                                <label htmlFor="zip_code" className={styles.label}>
                                                    {t('ZIP Code')}
                                                </label>
                                                <Input
                                                    id="zip_code"
                                                    type="text"
                                                    value={zip_code}
                                                    onChange={(e) => setZipCode(e.target.value)}
                                                    required
                                                    className={errors.zip_code ? styles.inputError : ''}
                                                />
                                                {errors.zip_code && (
                                                    <span className={styles.errorMessage}>{errors.zip_code}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Right Column - Personal Information */}
                        <div className={styles.rightColumn}>
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="first_name" className={styles.label}>
                                        {t('First Name')}
                                    </label>
                                    <Input
                                        id="first_name"
                                        type="text"
                                        value={first_name}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        required
                                        autoFocus
                                        autoComplete="given-name"
                                        className={errors.first_name ? styles.inputError : ''}
                                    />
                                    {errors.first_name && (
                                        <span className={styles.errorMessage}>{errors.first_name}</span>
                                    )}
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="last_name" className={styles.label}>
                                        {t('Last Name')}
                                    </label>
                                    <Input
                                        id="last_name"
                                        type="text"
                                        value={last_name}
                                        onChange={(e) => setLastName(e.target.value)}
                                        required
                                        autoComplete="family-name"
                                        className={errors.last_name ? styles.inputError : ''}
                                    />
                                    {errors.last_name && (
                                        <span className={styles.errorMessage}>{errors.last_name}</span>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="email" className={styles.label}>
                                    {t('Email')}
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    className={`${errors.email ? styles.inputError : ''} ${emailAvailable === false ? styles.inputError : ''} ${emailAvailable === true ? styles.inputSuccess : ''}`}
                                />
                                {emailChecking && (
                                    <span className={styles.checkingMessage}>{t('Checking...')}</span>
                                )}
                                {emailAvailable === false && !emailChecking && (
                                    <span className={styles.errorMessage}>{t('An account with this email already exists.')}</span>
                                )}
                                {errors.email && (
                                    <span className={styles.errorMessage}>{errors.email}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="phone" className={styles.label}>
                                    {t('Phone')}
                                </label>
                                <Input
                                    id="phone"
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    required
                                    autoComplete="tel"
                                    className={errors.phone ? styles.inputError : ''}
                                />
                                {errors.phone && (
                                    <span className={styles.errorMessage}>{errors.phone}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="password" className={styles.label}>
                                    {t('Password')}
                                </label>
                                <Input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                    className={errors.password ? styles.inputError : ''}
                                />
                                {errors.password && (
                                    <span className={styles.errorMessage}>{errors.password}</span>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="password_confirmation" className={styles.label}>
                                    {t('Confirm Password')}
                                </label>
                                <Input
                                    id="password_confirmation"
                                    type="password"
                                    value={password_confirmation}
                                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                                    required
                                    autoComplete="new-password"
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        variant="primary"
                        size="lg"
                        className={styles.submitButton}
                        disabled={processing}
                    >
                        {processing ? t('Registering...') : t('Register')}
                    </Button>
                </form>

                <div className={styles.loginLink}>
                    <span>{t('Already have an account?')}</span>
                    <a href="/login" className={styles.loginLinkAnchor}>
                        {t('Login')}
                    </a>
                </div>
            </div>
        </div>
    );
}

