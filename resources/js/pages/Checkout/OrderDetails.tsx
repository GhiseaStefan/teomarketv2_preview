import React, { useState, useEffect } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import { CheckoutProgress } from '../../components/CheckoutProgress';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { MapPin, Plus, Check, Truck, Edit } from 'lucide-react';
import { useTranslations } from '../../utils/translations';
import { PriceDisplay } from '../../components/PriceDisplay/PriceDisplay';
import type { SharedData, Currency, CustomerGroup } from '../../types';
import styles from './OrderDetails.module.css';

interface CartItem {
    cart_key: string;
    product_id: number;
    name: string;
    sku: string | null;
    image: string | null;
    quantity: number;
    unit_price_incl_vat?: number;
    total_price_incl_vat?: number;
    total_price_excl_vat?: number;
    total_price_raw: number;
    vat_rate: number;
}

interface CartSummary {
    total_items: number;
    total_excl_vat: number;
    total_incl_vat: number;
    vat_rate: number;
    vat_included: boolean;
}

interface Cart {
    items: CartItem[];
    summary: CartSummary;
}

interface Country {
    id: number;
    name: string;
    iso_code_2: string;
}

interface Address {
    id: number;
    first_name: string;
    last_name: string;
    phone: string;
    address_line_1: string;
    address_line_2?: string | null;
    city: string;
    county_name?: string | null;
    county_code?: string | null;
    country_id: number;
    zip_code: string;
    is_preferred?: boolean;
    address_type?: string;
    is_default?: boolean;
    is_headquarters?: boolean;
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

interface ShippingMethod {
    id: number;
    name: string;
    type: 'courier' | 'pickup';
    description?: string;
    cost: number;
    estimated_days?: number;
}

interface PaymentMethod {
    id: number;
    name: string;
    code: string;
}

interface OrderDetailsPageProps {
    cart: Cart;
    countries: Country[];
    addresses?: Address[];
    defaultBillingAddress?: Address | null;
    defaultShippingAddress?: Address | null;
    shippingAddresses?: Address[];
    detectedCountryId?: number | null;
    courierShippingMethods?: ShippingMethod[];
    pickupShippingMethods?: ShippingMethod[];
    paymentMethods?: PaymentMethod[];
    pickupDataFromSession?: {
        courier_data: {
            point_id?: string;
            point_name?: string;
            provider?: string;
            locker_details?: {
                address?: string;
                city?: string;
                county_name?: string;
                county_code?: string;
                zip_code?: string;
                country_id?: number;
                lat?: number;
                long?: number;
            };
        };
        shipping_address: Address;
    } | null;
}

export default function OrderDetails({ cart: initialCart, countries, addresses = [], defaultBillingAddress, defaultShippingAddress, shippingAddresses = [], detectedCountryId = null, courierShippingMethods = [], pickupShippingMethods = [], paymentMethods = [], pickupDataFromSession = null }: OrderDetailsPageProps) {
    const { t } = useTranslations();
    const { props } = usePage<SharedData>();
    const currentCurrency = (props.currentCurrency as Currency | undefined);
    const isAuthenticated = !!props.auth?.user;
    const customerGroup = (props.customerGroup as CustomerGroup | null) || null;
    const isB2B = customerGroup?.code === 'B2B_STANDARD' || customerGroup?.code?.startsWith('B2B') || false;

    // Use state for cart to allow updates without full page reload
    const [cart, setCart] = useState<Cart>(initialCart);

    // Update cart when initialCart changes (from server reload)
    useEffect(() => {
        setCart(initialCart);
    }, [initialCart]);

    // Generate idempotency key once when component mounts (prevents duplicate orders on double-click)
    const [idempotencyKey] = useState(() => {
        // Generate UUID v4
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    });

    const formatPriceWithCurrency = (price: number): string => {
        const formattedPrice = price.toFixed(2);
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

    // Current billing address (default to headquarters if available)
    const [currentBillingAddress, setCurrentBillingAddress] = useState<Address | null>(defaultBillingAddress || null);

    // Current shipping address (default to preferred if available)
    const [currentShippingAddress, setCurrentShippingAddress] = useState<Address | null>(defaultShippingAddress || null);

    // Option to use shipping address as billing address
    // Default: true for Guest/B2C, false for B2B
    const [useShippingAsBilling, setUseShippingAsBilling] = useState(() => {
        // If not authenticated (guest), default to true
        if (!isAuthenticated) return true;
        // If B2B, default to false, otherwise true (B2C)
        return !isB2B;
    });

    // Store the original billing address before it gets overwritten by "use shipping address"
    const [originalBillingAddress, setOriginalBillingAddress] = useState<Address | null>(null);

    // Update current addresses when props change (especially after reload)
    useEffect(() => {
        setCurrentBillingAddress(defaultBillingAddress || null);
        setCurrentShippingAddress(defaultShippingAddress || null);
    }, [defaultBillingAddress, defaultShippingAddress]);

    // When useShippingAsBilling is true and we have a shipping address, use it for billing
    useEffect(() => {
        if (useShippingAsBilling && currentShippingAddress) {
            // Only update if billing address is different from shipping address
            if (!currentBillingAddress || currentBillingAddress.id !== currentShippingAddress.id) {
                setOriginalBillingAddress(currentBillingAddress);
                setCurrentBillingAddress(currentShippingAddress);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [useShippingAsBilling, currentShippingAddress?.id]);

    // Update cart when shipping address is selected/changed (shipping address determines VAT)
    useEffect(() => {
        const addressToUse = currentShippingAddress || defaultShippingAddress;
        if (addressToUse && addressToUse.country_id) {
            fetch('/checkout/update-cart-for-shipping-country', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ country_id: addressToUse.country_id }),
            })
                .then((response) => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Failed to update cart');
                })
                .then((data) => {
                    if (data.cart) {
                        setCart(data.cart);
                    }
                })
                .catch(() => {
                    // Silent fail - cart will update on next page load
                });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentShippingAddress?.country_id, defaultShippingAddress?.country_id]); // Update when shipping address country changes

    // Guest contact data (email) - for abandoned cart emails
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');

    // Checkboxes for saving addresses when submitting order (for logged in users)
    const [saveShippingAddress, setSaveShippingAddress] = useState(true);
    const [saveBillingAddress, setSaveBillingAddress] = useState(true);

    // Shipping method state
    const [selectedShippingMethod, setSelectedShippingMethod] = useState<number | null>(null);
    const [shippingTab, setShippingTab] = useState<'courier' | 'pickup'>('courier');

    // Auto-select shipping method if only one option available
    useEffect(() => {
        if (shippingTab === 'courier' && courierShippingMethods.length === 1 && !selectedShippingMethod) {
            setSelectedShippingMethod(courierShippingMethods[0].id);
        } else if (shippingTab === 'pickup' && pickupShippingMethods.length === 1 && !selectedShippingMethod) {
            setSelectedShippingMethod(pickupShippingMethods[0].id);
        }
    }, [shippingTab, courierShippingMethods, pickupShippingMethods, selectedShippingMethod]);

    // Payment method state
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);

    // Pickup address state (for testing)
    const [pickupAddressData, setPickupAddressData] = useState<{
        courierData: {
            point_id?: string;
            point_name?: string;
            provider?: string;
            locker_details?: {
                address?: string;
                city?: string;
                county_name?: string;
                county_code?: string;
                zip_code?: string;
                country_id?: number;
                lat?: number;
                long?: number;
            };
        };
        shippingAddress: Address | null;
    } | null>(() => {
        // Restore pickup data from session if available
        if (pickupDataFromSession) {
            return {
                courierData: pickupDataFromSession.courier_data,
                shippingAddress: pickupDataFromSession.shipping_address
            };
        }
        return null;
    });

    // Billing address selection modal state
    const [isAddressSelectionModalOpen, setIsAddressSelectionModalOpen] = useState(false);
    const [selectedAddressIdForModal, setSelectedAddressIdForModal] = useState<number | null>(
        currentBillingAddress?.id || (addresses.length > 0 ? addresses[0].id : null)
    );

    // Shipping address selection modal state
    const [isShippingAddressSelectionModalOpen, setIsShippingAddressSelectionModalOpen] = useState(false);
    const [selectedShippingAddressIdForModal, setSelectedShippingAddressIdForModal] = useState<number | null>(
        currentShippingAddress?.id || (shippingAddresses.length > 0 ? shippingAddresses[0].id : null)
    );

    // Address add modal state (used for both billing and shipping)
    const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
    const [addressModalType, setAddressModalType] = useState<'billing' | 'shipping'>('billing');
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
        country_id: detectedCountryId && countries.find((c) => c.id === detectedCountryId)
            ? detectedCountryId
            : (countries.length > 0 ? countries[0].id : 0),
        state_id: '',
        city_id: '',
        zip_code: '',
    });
    const [billingFormData, setBillingFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        address_line_1: '',
        address_line_2: '',
        city: '',
        county_name: '',
        county_code: '',
        country_id: detectedCountryId && countries.find((c) => c.id === detectedCountryId)
            ? detectedCountryId
            : (countries.length > 0 ? countries[0].id : 0),
        state_id: '',
        city_id: '',
        zip_code: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [states, setStates] = useState<State[]>([]);
    const [cities, setCities] = useState<City[]>([]);
    const [billingStates, setBillingStates] = useState<State[]>([]);
    const [billingCities, setBillingCities] = useState<City[]>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);
    const [loadingBillingStates, setLoadingBillingStates] = useState(false);
    const [loadingBillingCities, setLoadingBillingCities] = useState(false);
    const page = usePage<SharedData & { errors?: Record<string, string> }>();
    const errors = page.props.errors || {};

    // For guests: initialize address form data when component mounts
    // Note: detectedCountryId is already set from backend, so we don't need to fetch it again
    // Use a ref to track if we've already initialized to prevent resetting user's manual selection
    const [hasInitializedShippingCountry, setHasInitializedShippingCountry] = useState(false);
    useEffect(() => {
        if (!isAuthenticated && !currentShippingAddress && countries.length > 0 && detectedCountryId && !hasInitializedShippingCountry) {
            const detectedCountry = countries.find((c) => c.id === detectedCountryId);
            if (detectedCountry) {
                setAddressFormData((prev) => ({
                    ...prev,
                    country_id: detectedCountryId,
                }));
                setHasInitializedShippingCountry(true);
            }
        }
    }, [isAuthenticated, currentShippingAddress, countries, detectedCountryId, hasInitializedShippingCountry]);

    // Initialize billing form data with detected country
    // Note: detectedCountryId is already set from backend, so we don't need to fetch it again
    // Use a ref to track if we've already initialized to prevent resetting user's manual selection
    const [hasInitializedBillingCountry, setHasInitializedBillingCountry] = useState(false);
    useEffect(() => {
        if (!useShippingAsBilling && !currentBillingAddress && countries.length > 0 && detectedCountryId && !hasInitializedBillingCountry) {
            const detectedCountry = countries.find((c) => c.id === detectedCountryId);
            if (detectedCountry) {
                setBillingFormData((prev) => ({
                    ...prev,
                    country_id: detectedCountryId,
                }));
                setHasInitializedBillingCountry(true);
            }
        }
    }, [useShippingAsBilling, currentBillingAddress, countries, detectedCountryId, hasInitializedBillingCountry]);

    // Update cart when guest user changes country in inline form (shipping address determines VAT)
    useEffect(() => {
        // Only update for guest users who are using the inline form (no saved shipping address)
        if (!isAuthenticated && !currentShippingAddress && addressFormData.country_id && addressFormData.country_id > 0) {
            fetch('/checkout/update-cart-for-shipping-country', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                body: JSON.stringify({ country_id: addressFormData.country_id }),
            })
                .then((response) => {
                    if (response.ok) {
                        return response.json();
                    }
                    throw new Error('Failed to update cart');
                })
                .then((data) => {
                    if (data.cart) {
                        setCart(data.cart);
                    }
                })
                .catch(() => {
                    // Silent fail - cart will update on next page load
                });
        }
    }, [addressFormData.country_id, isAuthenticated, currentShippingAddress]); // Update when guest user changes country in inline form

    // Load states on mount if country is already set (for inline form - guest or logged in user without address)
    useEffect(() => {
        const isInlineFormVisible = (!isAuthenticated && !currentShippingAddress) || (isAuthenticated && !currentShippingAddress);
        if (isInlineFormVisible && addressFormData.country_id && addressFormData.country_id > 0 && states.length === 0) {
            setLoadingStates(true);
            fetch(`/settings/states/${addressFormData.country_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setStates(data);
                })
                .catch((err) => {
                    console.error('Error fetching states on mount:', err);
                    setStates([]);
                })
                .finally(() => {
                    setLoadingStates(false);
                });
        }
    }, [isAuthenticated, currentShippingAddress, addressFormData.country_id, states.length]);

    // Fetch states when country changes (for both modal and inline form)
    useEffect(() => {
        // Ensure we have a valid country_id and form is visible
        // Form is visible if: modal is open OR (guest without address) OR (logged in user without address)
        const isFormVisible = isAddressModalOpen || (!isAuthenticated && !currentShippingAddress) || (isAuthenticated && !currentShippingAddress);

        if (addressFormData.country_id && addressFormData.country_id > 0 && isFormVisible) {
            // Don't reset if we're editing an address
            if (editingAddressId) {
                setLoadingStates(true);
                fetch(`/settings/states/${addressFormData.country_id}`)
                    .then((res) => res.json())
                    .then((data) => {
                        setStates(data);
                    })
                    .catch((err) => {
                        console.error('Error fetching states:', err);
                        setStates([]);
                    })
                    .finally(() => {
                        setLoadingStates(false);
                    });
            } else {
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
            }
        } else if (!isFormVisible && isAddressModalOpen === false) {
            // Only clear states if form is not visible and modal is closed
            // But keep states if user is logged in without address (inline form is visible)
            if ((isAuthenticated && currentShippingAddress) || (!isAuthenticated && currentShippingAddress)) {
                setStates([]);
                setCities([]);
            }
        }
    }, [addressFormData.country_id, isAddressModalOpen, editingAddressId, isAuthenticated, currentShippingAddress]);

    // Fetch cities when state changes (for both modal and inline form)
    useEffect(() => {
        const isFormVisible = isAddressModalOpen || (!isAuthenticated && !currentShippingAddress) || (isAuthenticated && !currentShippingAddress);
        if (addressFormData.state_id && isFormVisible) {
            setLoadingCities(true);
            fetch(`/settings/cities/${addressFormData.state_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setCities(data);
                    // Don't reset city_id and city if we're editing an address
                    if (!editingAddressId) {
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
        }
    }, [addressFormData.state_id, isAddressModalOpen, editingAddressId, isAuthenticated, currentShippingAddress]);

    // Fetch billing states when country changes
    useEffect(() => {
        if (billingFormData.country_id && !useShippingAsBilling && !currentBillingAddress) {
            setLoadingBillingStates(true);
            fetch(`/settings/states/${billingFormData.country_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setBillingStates(data);
                    setBillingFormData((prev) => ({
                        ...prev,
                        state_id: '',
                        county_name: '',
                        county_code: '',
                        city_id: '',
                        city: '',
                    }));
                })
                .catch((err) => {
                    console.error('Error fetching billing states:', err);
                    setBillingStates([]);
                })
                .finally(() => {
                    setLoadingBillingStates(false);
                });
        } else {
            if (!(!useShippingAsBilling && !currentBillingAddress)) {
                setBillingStates([]);
                setBillingCities([]);
            }
        }
    }, [billingFormData.country_id, useShippingAsBilling, currentBillingAddress]);

    // Fetch billing cities when state changes
    useEffect(() => {
        if (billingFormData.state_id && !useShippingAsBilling && !currentBillingAddress) {
            setLoadingBillingCities(true);
            fetch(`/settings/cities/${billingFormData.state_id}`)
                .then((res) => res.json())
                .then((data) => {
                    setBillingCities(data);
                    if (!editingAddressId) {
                        setBillingFormData((prev) => ({
                            ...prev,
                            city_id: '',
                            city: '',
                        }));
                    }
                })
                .catch((err) => {
                    console.error('Error fetching billing cities:', err);
                    setBillingCities([]);
                })
                .finally(() => {
                    setLoadingBillingCities(false);
                });
        } else {
            if (!(!useShippingAsBilling && !currentBillingAddress)) {
                setBillingCities([]);
            }
        }
    }, [billingFormData.state_id, useShippingAsBilling, currentBillingAddress, editingAddressId]);

    const handleModifyAddress = () => {
        // If no addresses exist, directly open the add address modal
        if (addresses.length === 0 && !defaultBillingAddress) {
            handleAddNewAddress();
            return;
        }
        setIsAddressSelectionModalOpen(true);
        setSelectedAddressIdForModal(currentBillingAddress?.id || null);
    };

    const handleModifyShippingAddress = () => {
        // If no addresses exist, directly open the add address modal
        if (shippingAddresses.length === 0 && !defaultShippingAddress) {
            handleAddNewShippingAddress();
            return;
        }
        setIsShippingAddressSelectionModalOpen(true);
        setSelectedShippingAddressIdForModal(currentShippingAddress?.id || null);
    };

    const handleAddressSelectInModal = (addressId: number | null) => {
        setSelectedAddressIdForModal(addressId);
    };

    const handleShippingAddressSelectInModal = (addressId: number | null) => {
        setSelectedShippingAddressIdForModal(addressId);
    };

    const handleConfirmAddressSelection = async () => {
        if (selectedAddressIdForModal) {
            // Check if it's the default billing address (headquarters)
            if (defaultBillingAddress && selectedAddressIdForModal === defaultBillingAddress.id) {
                setCurrentBillingAddress(defaultBillingAddress);
            } else {
                // Find the selected address from the addresses list
                const foundAddress = addresses.find(a => a.id === selectedAddressIdForModal);
                if (foundAddress) {
                    setCurrentBillingAddress(foundAddress);
                }
            }

        }
        setIsAddressSelectionModalOpen(false);
    };

    const handleConfirmShippingAddressSelection = async () => {
        if (selectedShippingAddressIdForModal) {
            let selectedAddress: Address | null = null;
            // Check if it's the default shipping address
            if (defaultShippingAddress && selectedShippingAddressIdForModal === defaultShippingAddress.id) {
                selectedAddress = defaultShippingAddress;
            } else {
                // Find the selected address from the shipping addresses list
                selectedAddress = shippingAddresses.find(a => a.id === selectedShippingAddressIdForModal) || null;
            }

            if (selectedAddress) {
                setCurrentShippingAddress(selectedAddress);

                // Update cart prices based on shipping country (shipping address determines VAT)
                if (selectedAddress.country_id) {
                    try {
                        const response = await fetch('/checkout/update-cart-for-shipping-country', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                            },
                            body: JSON.stringify({ country_id: selectedAddress.country_id }),
                        });

                        if (response.ok) {
                            const data = await response.json();
                            if (data.cart) {
                                setCart(data.cart);
                            } else {
                                router.reload({ only: ['cart'] });
                            }
                        }
                    } catch {
                        // Silent fail - cart will update on next page load
                    }
                }
            }
        }
        setIsShippingAddressSelectionModalOpen(false);
    };

    const handleAddNewAddress = async () => {
        setAddressModalType('billing');
        setEditingAddressId(null);
        setIsAddressModalOpen(true);
        setIsAddressSelectionModalOpen(false);

        // Reset form with detected country
        const defaultCountryId = detectedCountryId && countries.find((c) => c.id === detectedCountryId)
            ? detectedCountryId
            : (countries.length > 0 ? countries[0].id : 0);

        setAddressFormData({
            first_name: '',
            last_name: '',
            phone: '',
            address_line_1: '',
            address_line_2: '',
            city: '',
            county_name: '',
            county_code: '',
            country_id: defaultCountryId,
            state_id: '',
            city_id: '',
            zip_code: '',
        });
        setStates([]);
        setCities([]);
    };

    const handleAddNewShippingAddress = async () => {
        setAddressModalType('shipping');
        setEditingAddressId(null);
        setIsAddressModalOpen(true);
        setIsShippingAddressSelectionModalOpen(false);

        // Reset form with detected country
        const defaultCountryId = detectedCountryId && countries.find((c) => c.id === detectedCountryId)
            ? detectedCountryId
            : (countries.length > 0 ? countries[0].id : 0);

        setAddressFormData({
            first_name: '',
            last_name: '',
            phone: '',
            address_line_1: '',
            address_line_2: '',
            city: '',
            county_name: '',
            county_code: '',
            country_id: defaultCountryId,
            state_id: '',
            city_id: '',
            zip_code: '',
        });
        setStates([]);
        setCities([]);
    };

    const handleEditAddress = async (addressId: number) => {
        // Find the address in the appropriate list
        const addressToEdit = defaultBillingAddress?.id === addressId
            ? defaultBillingAddress
            : addresses.find(a => a.id === addressId);

        if (!addressToEdit) return;

        // Set editing mode first
        setAddressModalType('billing');
        setEditingAddressId(addressId);
        setIsAddressSelectionModalOpen(false);

        // Pre-fill form with basic address data first
        setAddressFormData({
            first_name: addressToEdit.first_name,
            last_name: addressToEdit.last_name || '',
            phone: addressToEdit.phone,
            address_line_1: addressToEdit.address_line_1,
            address_line_2: addressToEdit.address_line_2 || '',
            city: addressToEdit.city,
            county_name: addressToEdit.county_name || '',
            county_code: addressToEdit.county_code || '',
            country_id: addressToEdit.country_id,
            state_id: '',
            city_id: '',
            zip_code: addressToEdit.zip_code,
        });

        // Open modal
        setIsAddressModalOpen(true);

        // Fetch states for the country and set state_id/city_id after loading
        setLoadingStates(true);
        try {
            const statesResponse = await fetch(`/settings/states/${addressToEdit.country_id}`);
            if (statesResponse.ok) {
                const statesData = await statesResponse.json();
                setStates(statesData);

                // Find and set the state_id if county_code matches
                if (addressToEdit.county_code) {
                    const matchingState = statesData.find((s: State) => s.code === addressToEdit.county_code);
                    if (matchingState) {
                        const stateIdStr = matchingState.id.toString();

                        // Fetch cities for the state
                        setLoadingCities(true);
                        try {
                            const citiesResponse = await fetch(`/settings/cities/${matchingState.id}`);
                            if (citiesResponse.ok) {
                                const citiesData = await citiesResponse.json();
                                setCities(citiesData);

                                // Find the city_id if city name matches
                                const matchingCity = citiesData.find((c: City) => c.name === addressToEdit.city);
                                const cityIdStr = matchingCity ? matchingCity.id.toString() : '';

                                // Set both state_id and city_id together to avoid race conditions
                                setAddressFormData((prev) => ({
                                    ...prev,
                                    state_id: stateIdStr,
                                    city_id: cityIdStr,
                                }));
                            }
                        } catch (err) {
                            console.error('Error fetching cities:', err);
                            // Still set state_id even if cities fail
                            setAddressFormData((prev) => ({
                                ...prev,
                                state_id: stateIdStr,
                            }));
                        } finally {
                            setLoadingCities(false);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching states:', err);
        } finally {
            setLoadingStates(false);
        }
    };

    const handleEditShippingAddress = async (addressId: number) => {
        // Find the address in the appropriate list
        const addressToEdit = defaultShippingAddress?.id === addressId
            ? defaultShippingAddress
            : shippingAddresses.find(a => a.id === addressId);

        if (!addressToEdit) return;

        // Set editing mode first
        setAddressModalType('shipping');
        setEditingAddressId(addressId);
        setIsShippingAddressSelectionModalOpen(false);

        // Pre-fill form with basic address data first
        setAddressFormData({
            first_name: addressToEdit.first_name,
            last_name: addressToEdit.last_name || '',
            phone: addressToEdit.phone,
            address_line_1: addressToEdit.address_line_1,
            address_line_2: addressToEdit.address_line_2 || '',
            city: addressToEdit.city,
            county_name: addressToEdit.county_name || '',
            county_code: addressToEdit.county_code || '',
            country_id: addressToEdit.country_id,
            state_id: '',
            city_id: '',
            zip_code: addressToEdit.zip_code,
        });

        // Open modal
        setIsAddressModalOpen(true);

        // Fetch states for the country and set state_id/city_id after loading
        setLoadingStates(true);
        try {
            const statesResponse = await fetch(`/settings/states/${addressToEdit.country_id}`);
            if (statesResponse.ok) {
                const statesData = await statesResponse.json();
                setStates(statesData);

                // Find and set the state_id if county_code matches
                if (addressToEdit.county_code) {
                    const matchingState = statesData.find((s: State) => s.code === addressToEdit.county_code);
                    if (matchingState) {
                        const stateIdStr = matchingState.id.toString();

                        // Fetch cities for the state
                        setLoadingCities(true);
                        try {
                            const citiesResponse = await fetch(`/settings/cities/${matchingState.id}`);
                            if (citiesResponse.ok) {
                                const citiesData = await citiesResponse.json();
                                setCities(citiesData);

                                // Find the city_id if city name matches
                                const matchingCity = citiesData.find((c: City) => c.name === addressToEdit.city);
                                const cityIdStr = matchingCity ? matchingCity.id.toString() : '';

                                // Set both state_id and city_id together to avoid race conditions
                                setAddressFormData((prev) => ({
                                    ...prev,
                                    state_id: stateIdStr,
                                    city_id: cityIdStr,
                                }));
                            }
                        } catch (err) {
                            console.error('Error fetching cities:', err);
                            // Still set state_id even if cities fail
                            setAddressFormData((prev) => ({
                                ...prev,
                                state_id: stateIdStr,
                            }));
                        } finally {
                            setLoadingCities(false);
                        }
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching states:', err);
        } finally {
            setLoadingStates(false);
        }
    };

    const formatAddressString = (address: Address): string => {
        const parts = [
            address.address_line_1,
            address.address_line_2,
            address.city,
            address.county_name ? `(${address.county_name})` : null,
        ].filter(Boolean);
        return parts.join(', ');
    };

    const handleAddressSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        const submitData = {
            type: addressModalType,
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

        if (isAuthenticated) {
            // Authenticated: save to database
            if (editingAddressId) {
                // Update existing address
                const updateRoute = addressModalType === 'billing'
                    ? `/settings/billing/addresses/${editingAddressId}`
                    : `/settings/addresses/${editingAddressId}`;

                router.put(updateRoute, submitData, {
                    onSuccess: async () => {
                        setIsSubmitting(false);
                        setIsAddressModalOpen(false);
                        setEditingAddressId(null);
                        setAddressFormData({
                            first_name: '',
                            last_name: '',
                            phone: '',
                            address_line_1: '',
                            address_line_2: '',
                            city: '',
                            county_name: '',
                            county_code: '',
                            country_id: countries.length > 0 ? countries[0].id : 0,
                            state_id: '',
                            city_id: '',
                            zip_code: '',
                        });
                        setStates([]);
                        setCities([]);
                        // Reload the page to get updated addresses
                        const reloadProps = addressModalType === 'billing'
                            ? ['addresses', 'defaultBillingAddress']
                            : ['shippingAddresses', 'defaultShippingAddress'];
                        await router.reload({ only: reloadProps });

                        // If shipping address was updated, update cart with new country (shipping address determines VAT)
                        if (addressModalType === 'shipping' && submitData.country_id) {
                            try {
                                const response = await fetch('/checkout/update-cart-for-shipping-country', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                    },
                                    body: JSON.stringify({ country_id: submitData.country_id }),
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    if (data.cart) {
                                        setCart(data.cart);
                                    } else {
                                        router.reload({ only: ['cart'] });
                                    }
                                }
                            } catch {
                                // Silent fail - cart will update on next page load
                            }
                        }
                    },
                    onError: () => {
                        setIsSubmitting(false);
                    },
                });
            } else {
                // Create new address
                const route = addressModalType === 'billing'
                    ? '/settings/billing/addresses'
                    : '/settings/addresses';

                router.post(route, submitData, {
                    onSuccess: async () => {
                        setIsSubmitting(false);
                        setIsAddressModalOpen(false);
                        setEditingAddressId(null);
                        setAddressFormData({
                            first_name: '',
                            last_name: '',
                            phone: '',
                            address_line_1: '',
                            address_line_2: '',
                            city: '',
                            county_name: '',
                            county_code: '',
                            country_id: countries.length > 0 ? countries[0].id : 0,
                            state_id: '',
                            city_id: '',
                            zip_code: '',
                        });
                        setStates([]);
                        setCities([]);
                        // Reload the page to get updated addresses
                        const reloadProps = addressModalType === 'billing'
                            ? ['addresses', 'defaultBillingAddress']
                            : ['shippingAddresses', 'defaultShippingAddress'];
                        await router.reload({ only: reloadProps });

                        // If shipping address was added/updated, update cart with new country (shipping address determines VAT)
                        if (addressModalType === 'shipping' && submitData.country_id) {
                            try {
                                const response = await fetch('/checkout/update-cart-for-shipping-country', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                    },
                                    body: JSON.stringify({ country_id: submitData.country_id }),
                                });

                                if (response.ok) {
                                    const data = await response.json();
                                    if (data.cart) {
                                        setCart(data.cart);
                                    } else {
                                        router.reload({ only: ['cart'] });
                                    }
                                }
                            } catch {
                                // Silent fail - cart will update on next page load
                            }
                        }
                    },
                    onError: () => {
                        setIsSubmitting(false);
                    },
                });
            }
        } else {
            // Guest: don't save addresses, just close modal
            setIsSubmitting(false);
            setIsAddressModalOpen(false);
            setEditingAddressId(null);
        }
    };

    // Helper function to check if guest address form is valid
    const isGuestAddressFormValid = (formData: typeof addressFormData): boolean => {
        return !!(
            formData.first_name &&
            formData.last_name &&
            formData.phone &&
            formData.address_line_1 &&
            formData.city &&
            formData.country_id &&
            formData.zip_code
        );
    };

    const canSubmitOrder = (): boolean => {
        // Check if shipping method is selected
        if (!selectedShippingMethod) {
            return false;
        }

        // Check if shipping address is selected (for courier)
        if (shippingTab === 'courier') {
            if (isAuthenticated) {
                // For authenticated users: check if address exists OR if inline form is filled
                if (!currentShippingAddress && !isGuestAddressFormValid(addressFormData)) {
                    return false;
                }
            } else {
                // For guests, check if form is filled
                if (!isGuestAddressFormValid(addressFormData)) {
                    return false;
                }
            }
        }

        // Check if pickup address is selected (for pickup)
        if (shippingTab === 'pickup' && !pickupAddressData) {
            return false;
        }

        // Check billing address: if useShippingAsBilling is true, we don't need a separate billing address
        if (!useShippingAsBilling) {
            if (isAuthenticated) {
                // For authenticated users: check if address exists OR if inline form is filled
                if (!currentBillingAddress && !isGuestAddressFormValid(billingFormData)) {
                    return false;
                }
            } else {
                // For guests, check if billing form is filled
                if (!isGuestAddressFormValid(billingFormData)) {
                    return false;
                }
            }
        }

        // Check if payment method is selected
        if (!selectedPaymentMethod) {
            return false;
        }

        return true;
    };

    const handleSubmitOrder = () => {
        if (!canSubmitOrder()) {
            return;
        }

        setIsSubmitting(true);

        if (isAuthenticated) {
            // Authenticated: save addresses first if using inline forms, then send address IDs
            const needsShippingAddress = shippingTab === 'courier' && !currentShippingAddress;
            const needsBillingAddress = !useShippingAsBilling && !currentBillingAddress;

            if (needsShippingAddress || needsBillingAddress) {
                // Save addresses first (always needed for backend), then submit order
                // is_preferred is set based on checkbox
                // Use fetch to avoid Inertia reload which can cause timeout
                const savePromises: Promise<{ type: 'shipping' | 'billing', id: number } | null>[] = [];

                // Save shipping address if needed (always save, but set is_preferred based on checkbox)
                if (needsShippingAddress) {
                    savePromises.push(
                        fetch('/settings/addresses', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                            },
                            body: JSON.stringify({
                                first_name: addressFormData.first_name,
                                last_name: addressFormData.last_name,
                                phone: addressFormData.phone,
                                address_line_1: addressFormData.address_line_1,
                                address_line_2: addressFormData.address_line_2,
                                city: addressFormData.city,
                                county_name: addressFormData.county_name,
                                county_code: addressFormData.county_code,
                                country_id: addressFormData.country_id,
                                state_id: addressFormData.state_id,
                                city_id: addressFormData.city_id,
                                zip_code: addressFormData.zip_code,
                                address_type: 'shipping',
                                is_preferred: saveShippingAddress,
                            }),
                        })
                            .then(async (res) => {
                                if (res.ok) {
                                    // Try to parse JSON response first
                                    try {
                                        const data = await res.json();
                                        if (data.id) {
                                            return { type: 'shipping' as const, id: data.id };
                                        }
                                    } catch {
                                        // If not JSON, fetch latest address
                                    }
                                    // Fallback: fetch addresses and get the latest one
                                    const addressesRes = await fetch('/settings/addresses', {
                                        headers: {
                                            'X-Requested-With': 'XMLHttpRequest',
                                            'Accept': 'application/json',
                                        },
                                    });
                                    if (addressesRes.ok) {
                                        try {
                                            const data = await addressesRes.json();
                                            if (data.addresses && data.addresses.length > 0) {
                                                // Get the most recent shipping address matching our data
                                                const matching = data.addresses
                                                    .filter((a: Address) => a.address_type === 'shipping')
                                                    .sort((a: Address, b: Address) => (b.id || 0) - (a.id || 0));
                                                if (matching.length > 0) {
                                                    return { type: 'shipping' as const, id: matching[0].id };
                                                }
                                            }
                                        } catch {
                                            // Ignore JSON parse errors
                                        }
                                    }
                                    // If we can't get ID, return null and we'll handle it
                                    return null;
                                }
                                throw new Error('Failed to save shipping address');
                            })
                            .catch(() => null)
                    );
                }

                // Save billing address if needed (always save, but set is_preferred based on checkbox)
                if (needsBillingAddress) {
                    savePromises.push(
                        fetch('/settings/billing/addresses', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                'X-Requested-With': 'XMLHttpRequest',
                                'Accept': 'application/json',
                            },
                            body: JSON.stringify({
                                first_name: billingFormData.first_name,
                                last_name: billingFormData.last_name,
                                phone: billingFormData.phone,
                                address_line_1: billingFormData.address_line_1,
                                address_line_2: billingFormData.address_line_2,
                                city: billingFormData.city,
                                county_name: billingFormData.county_name,
                                county_code: billingFormData.county_code,
                                country_id: billingFormData.country_id,
                                state_id: billingFormData.state_id,
                                city_id: billingFormData.city_id,
                                zip_code: billingFormData.zip_code,
                            }),
                        })
                            .then(async (res) => {
                                if (res.ok) {
                                    // Parse JSON response
                                    const data = await res.json();
                                    if (data.id) {
                                        return { type: 'billing' as const, id: data.id };
                                    }
                                    throw new Error('No address ID in response');
                                }
                                throw new Error('Failed to save billing address');
                            })
                            .catch(() => null)
                    );
                }

                // Wait for all addresses to be saved, then submit order with IDs
                Promise.all(savePromises).then((results) => {
                    let shippingAddressId: number | undefined;
                    let billingAddressId: number | undefined;

                    // Extract IDs from results
                    for (const result of results) {
                        if (result) {
                            if (result.type === 'shipping') {
                                shippingAddressId = result.id;
                            } else if (result.type === 'billing') {
                                billingAddressId = result.id;
                            }
                        }
                    }

                    // Update current addresses with saved IDs for submitAuthenticatedOrder
                    if (shippingAddressId && needsShippingAddress) {
                        setCurrentShippingAddress({
                            id: shippingAddressId,
                            first_name: addressFormData.first_name,
                            last_name: addressFormData.last_name,
                            phone: addressFormData.phone,
                            address_line_1: addressFormData.address_line_1,
                            address_line_2: addressFormData.address_line_2 || null,
                            city: addressFormData.city,
                            county_name: addressFormData.county_name || null,
                            county_code: addressFormData.county_code || null,
                            country_id: addressFormData.country_id,
                            zip_code: addressFormData.zip_code,
                        } as Address);
                    }

                    if (billingAddressId && needsBillingAddress) {
                        setCurrentBillingAddress({
                            id: billingAddressId,
                            first_name: billingFormData.first_name,
                            last_name: billingFormData.last_name,
                            phone: billingFormData.phone,
                            address_line_1: billingFormData.address_line_1,
                            address_line_2: billingFormData.address_line_2 || null,
                            city: billingFormData.city,
                            county_name: billingFormData.county_name || null,
                            county_code: billingFormData.county_code || null,
                            country_id: billingFormData.country_id,
                            zip_code: billingFormData.zip_code,
                        } as Address);
                    }

                    // Submit order with the saved address IDs
                    submitAuthenticatedOrder();
                }).catch(() => {
                    setIsSubmitting(false);
                });
            } else {
                // No addresses to save, submit order directly
                submitAuthenticatedOrder();
            }

            function submitAuthenticatedOrder() {
                const submitData: {
                    idempotency_key: string;
                    billing_address_id?: number;
                    shipping_method_id: number;
                    payment_method_id: number;
                    shipping_address_id?: number;
                } = {
                    idempotency_key: idempotencyKey,
                    shipping_method_id: selectedShippingMethod!,
                    payment_method_id: selectedPaymentMethod!,
                };

                // Add billing address ID only if not using shipping as billing
                if (!useShippingAsBilling && currentBillingAddress) {
                    submitData.billing_address_id = currentBillingAddress.id;
                } else if (useShippingAsBilling && currentShippingAddress) {
                    // If using shipping as billing, use shipping address for billing
                    submitData.billing_address_id = currentShippingAddress.id;
                }

                // Add shipping address ID only for courier delivery
                if (shippingTab === 'courier' && currentShippingAddress) {
                    submitData.shipping_address_id = currentShippingAddress.id;
                }

                router.post('/checkout/submit-order', submitData, {
                    onSuccess: () => {
                        // Redirect happens automatically via backend
                    },
                    onError: () => {
                        setIsSubmitting(false);
                        // Errors are handled by Inertia's error handling
                    },
                });
            }
        } else {
            // Guest: save addresses to session first, then submit order
            const savePromises: Promise<Response>[] = [];

            // Save shipping address if courier delivery
            if (shippingTab === 'courier') {
                savePromises.push(
                    fetch('/checkout/save-guest-address', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        },
                        body: JSON.stringify({
                            type: 'shipping',
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
                        }),
                    })
                );
            }

            // Save billing address if not using shipping as billing
            if (!useShippingAsBilling) {
                savePromises.push(
                    fetch('/checkout/save-guest-address', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        },
                        body: JSON.stringify({
                            type: 'billing',
                            first_name: billingFormData.first_name,
                            last_name: billingFormData.last_name,
                            phone: billingFormData.phone,
                            address_line_1: billingFormData.address_line_1,
                            address_line_2: billingFormData.address_line_2,
                            city: billingFormData.city,
                            county_name: billingFormData.county_name,
                            county_code: billingFormData.county_code,
                            country_id: billingFormData.country_id,
                            zip_code: billingFormData.zip_code,
                        }),
                    })
                );
            }

            // Save addresses first, then submit order
            Promise.all(savePromises).then(() => {
                const submitData: {
                    idempotency_key: string;
                    shipping_method_id: number;
                    payment_method_id: number;
                    use_shipping_as_billing?: boolean;
                } = {
                    idempotency_key: idempotencyKey,
                    shipping_method_id: selectedShippingMethod!,
                    payment_method_id: selectedPaymentMethod!,
                };

                // If using shipping as billing, tell backend to use shipping address for billing
                if (useShippingAsBilling) {
                    submitData.use_shipping_as_billing = true;
                }

                router.post('/checkout/submit-order', submitData, {
                    onSuccess: () => {
                        // Redirect happens automatically via backend
                    },
                    onError: () => {
                        setIsSubmitting(false);
                        // Errors are handled by Inertia's error handling
                    },
                });
            }).catch(() => {
                setIsSubmitting(false);
            });
        }
    };

    return (
        <Layout>
            <Head title={t('Order Details')} />
            <div className={styles.progressWrapper}>
                <CheckoutProgress currentStep={2} />
            </div>
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.cardsGrid}>
                        {/* Contact Data Card - For all users */}
                        <div className={styles.card}>
                            <div className={styles.cardTitleWrapper}>
                                <div className={styles.cardNumberBadge}>1</div>
                                <h2 className={styles.cardTitle}>{t('Contact Data')}</h2>
                            </div>
                            <div className={styles.cardContent}>
                                {/* Show address if authenticated and has address, otherwise show form */}
                                {isAuthenticated && currentShippingAddress ? (
                                    <>
                                        <div className={styles.billingAddressCard}>
                                            <div className={styles.locationIcon}>
                                                <MapPin size={24} />
                                            </div>
                                            <div className={styles.billingAddressInfo}>
                                                <div className={styles.billingAddressName}>
                                                    {currentShippingAddress.first_name} {currentShippingAddress.last_name && currentShippingAddress.last_name.trim() !== '' ? currentShippingAddress.last_name : ''}
                                                    <span className={styles.namePhoneSeparator}> - </span>
                                                    {currentShippingAddress.phone}
                                                </div>
                                                <div className={styles.billingAddressText}>
                                                    {formatAddressString(currentShippingAddress)}
                                                </div>
                                                <div className={styles.billingAddressActions}>
                                                    <button
                                                        type="button"
                                                        onClick={handleModifyShippingAddress}
                                                        className={styles.modifyLink}
                                                    >
                                                        {t('modifica')}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            type="button"
                                            variant="primary"
                                            onClick={handleModifyShippingAddress}
                                            className={styles.addAddressButton}
                                        >
                                            {t('Add New Address')}
                                        </Button>
                                    </>
                                ) : (
                                    /* Guest: show inline form */
                                    <div className={styles.inlineAddressForm}>
                                        <div className={styles.addressForm}>
                                            <div className={styles.formGroup}>
                                                <label className={styles.label}>{t('Country')}</label>
                                                <select
                                                    value={addressFormData.country_id}
                                                    onChange={(e) => {
                                                        setAddressFormData({
                                                            ...addressFormData,
                                                            country_id: Number(e.target.value),
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
                                                    {countries.map((country) => (
                                                        <option key={country.id} value={country.id}>
                                                            {country.name}
                                                        </option>
                                                    ))}
                                                </select>
                                                {errors.country_id && <span className={styles.errorMessage}>{errors.country_id}</span>}
                                            </div>

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

                                            {!isAuthenticated && (
                                                <div className={styles.formRow}>
                                                    <div className={styles.formGroup}>
                                                        <label className={styles.label}>{t('Email Address')}</label>
                                                        <Input
                                                            type="email"
                                                            value={guestEmail}
                                                            onChange={(e) => {
                                                                setGuestEmail(e.target.value);
                                                                // Save to session on change
                                                                fetch('/checkout/save-guest-contact', {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                                                    },
                                                                    body: JSON.stringify({
                                                                        email: e.target.value,
                                                                        phone: guestPhone,
                                                                    }),
                                                                }).catch(() => {
                                                                    // Silent fail
                                                                });
                                                            }}
                                                            onBlur={(e) => {
                                                                // Save to session on blur
                                                                fetch('/checkout/save-guest-contact', {
                                                                    method: 'POST',
                                                                    headers: {
                                                                        'Content-Type': 'application/json',
                                                                        'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                                                    },
                                                                    body: JSON.stringify({
                                                                        email: e.target.value,
                                                                        phone: guestPhone,
                                                                    }),
                                                                }).catch(() => {
                                                                    // Silent fail
                                                                });
                                                            }}
                                                            placeholder={t('Email Address')}
                                                            required
                                                        />
                                                    </div>
                                                    <div className={styles.formGroup}>
                                                        <label className={styles.label}>{t('Phone')}</label>
                                                        <Input
                                                            type="tel"
                                                            value={addressFormData.phone}
                                                            onChange={(e) => {
                                                                setAddressFormData({ ...addressFormData, phone: e.target.value });
                                                                setGuestPhone(e.target.value);
                                                            }}
                                                            required
                                                            className={errors.phone ? styles.inputError : ''}
                                                        />
                                                        {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                                                    </div>
                                                </div>
                                            )}
                                            {isAuthenticated && (
                                                <div className={styles.formRow}>
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
                                                </div>
                                            )}

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

                                            <div className={styles.formRow}>
                                                <div className={styles.formGroup}>
                                                    <label className={styles.label}>{t('County')}</label>
                                                    <select
                                                        value={addressFormData.state_id}
                                                        onChange={(e) => {
                                                            const stateId = e.target.value ? Number(e.target.value) : '';
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
                                                            const cityId = e.target.value ? Number(e.target.value) : '';
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

                                            {/* Save address checkbox - only for logged in users without address */}
                                            {isAuthenticated && !currentShippingAddress && (
                                                <div className={styles.formGroup} style={{ width: 'auto', maxWidth: 'fit-content' }}>
                                                    <label className={`${styles.checkboxLabel} ${saveShippingAddress ? styles.checkboxLabelChecked : ''}`}>
                                                        <input
                                                            type="checkbox"
                                                            checked={saveShippingAddress}
                                                            onChange={(e) => setSaveShippingAddress(e.target.checked)}
                                                            className={styles.checkboxInput}
                                                        />
                                                        <span>{t('Save this address for future orders')}</span>
                                                    </label>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Billing Address Card */}
                        <div className={styles.card}>
                            <div className={styles.cardTitleWrapper}>
                                <div className={styles.cardNumberBadge}>2</div>
                                <h2 className={styles.cardTitle}>{t('Billing Address')}</h2>
                            </div>
                            <div className={styles.cardContent}>
                                {/* Billing Address Section */}
                                <div className={styles.addressSection}>
                                    <div className={styles.useBillingCheckbox}>
                                        <label className={`${styles.checkboxLabel} ${useShippingAsBilling ? styles.checkboxLabelChecked : ''}`}>
                                            <input
                                                type="checkbox"
                                                checked={useShippingAsBilling}
                                                onChange={async (e) => {
                                                    const checked = e.target.checked;
                                                    setUseShippingAsBilling(checked);
                                                    if (checked) {
                                                        setOriginalBillingAddress(currentBillingAddress);
                                                        setCurrentBillingAddress(currentShippingAddress);
                                                    } else {
                                                        setCurrentBillingAddress(originalBillingAddress);
                                                        setOriginalBillingAddress(null);
                                                    }
                                                }}
                                                className={styles.checkboxInput}
                                            />
                                            <span>{t('Billing data is the same as shipping data')}</span>
                                        </label>
                                    </div>

                                    {!useShippingAsBilling && (
                                        <>
                                            <h3 className={styles.addressSectionTitle}>{t('Billing Address')}</h3>
                                            {currentBillingAddress ? (
                                                <>
                                                    <div className={styles.billingAddressCard}>
                                                        <div className={styles.locationIcon}>
                                                            <MapPin size={24} />
                                                        </div>
                                                        <div className={styles.billingAddressInfo}>
                                                            <div className={styles.billingAddressName}>
                                                                {currentBillingAddress.first_name} {currentBillingAddress.last_name && currentBillingAddress.last_name.trim() !== '' ? currentBillingAddress.last_name : ''}
                                                                <span className={styles.namePhoneSeparator}> - </span>
                                                                {currentBillingAddress.phone}
                                                            </div>
                                                            <div className={styles.billingAddressText}>
                                                                {formatAddressString(currentBillingAddress)}
                                                            </div>
                                                            <div className={styles.billingAddressActions}>
                                                                <button
                                                                    type="button"
                                                                    onClick={handleModifyAddress}
                                                                    className={styles.modifyLink}
                                                                >
                                                                    {t('modifica')}
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isAuthenticated && (
                                                        <Button
                                                            type="button"
                                                            variant="primary"
                                                            onClick={handleModifyAddress}
                                                            className={styles.addAddressButton}
                                                        >
                                                            {t('Add New Address')}
                                                        </Button>
                                                    )}
                                                </>
                                            ) : (
                                                <div className={styles.inlineAddressForm}>
                                                    <div className={styles.addressForm}>
                                                        <div className={styles.formGroup}>
                                                            <label className={styles.label}>{t('Country')}</label>
                                                            <select
                                                                value={billingFormData.country_id}
                                                                onChange={(e) => {
                                                                    setBillingFormData({
                                                                        ...billingFormData,
                                                                        country_id: Number(e.target.value),
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
                                                                {countries.map((country) => (
                                                                    <option key={country.id} value={country.id}>
                                                                        {country.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {errors.country_id && <span className={styles.errorMessage}>{errors.country_id}</span>}
                                                        </div>

                                                        <div className={styles.formRow}>
                                                            <div className={styles.formGroup}>
                                                                <label className={styles.label}>{t('First name')}</label>
                                                                <Input
                                                                    type="text"
                                                                    value={billingFormData.first_name}
                                                                    onChange={(e) => setBillingFormData({ ...billingFormData, first_name: e.target.value })}
                                                                    required
                                                                    className={errors.first_name ? styles.inputError : ''}
                                                                />
                                                                {errors.first_name && <span className={styles.errorMessage}>{errors.first_name}</span>}
                                                            </div>
                                                            <div className={styles.formGroup}>
                                                                <label className={styles.label}>{t('Last name')}</label>
                                                                <Input
                                                                    type="text"
                                                                    value={billingFormData.last_name}
                                                                    onChange={(e) => setBillingFormData({ ...billingFormData, last_name: e.target.value })}
                                                                    required
                                                                    className={errors.last_name ? styles.inputError : ''}
                                                                />
                                                                {errors.last_name && <span className={styles.errorMessage}>{errors.last_name}</span>}
                                                            </div>
                                                        </div>

                                                        {!isAuthenticated && (
                                                            <div className={styles.formRow}>
                                                                <div className={styles.formGroup}>
                                                                    <label className={styles.label}>{t('Email Address')}</label>
                                                                    <Input
                                                                        type="email"
                                                                        value={guestEmail}
                                                                        onChange={(e) => {
                                                                            setGuestEmail(e.target.value);
                                                                            fetch('/checkout/save-guest-contact', {
                                                                                method: 'POST',
                                                                                headers: {
                                                                                    'Content-Type': 'application/json',
                                                                                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                                                                                },
                                                                                body: JSON.stringify({
                                                                                    email: e.target.value,
                                                                                    phone: guestPhone,
                                                                                }),
                                                                            }).catch(() => { });
                                                                        }}
                                                                        placeholder={t('Email Address')}
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className={styles.formGroup}>
                                                                    <label className={styles.label}>{t('Phone')}</label>
                                                                    <Input
                                                                        type="tel"
                                                                        value={billingFormData.phone}
                                                                        onChange={(e) => setBillingFormData({ ...billingFormData, phone: e.target.value })}
                                                                        required
                                                                        className={errors.phone ? styles.inputError : ''}
                                                                    />
                                                                    {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {isAuthenticated && (
                                                            <div className={styles.formRow}>
                                                                <div className={styles.formGroup}>
                                                                    <label className={styles.label}>{t('Phone')}</label>
                                                                    <Input
                                                                        type="tel"
                                                                        value={billingFormData.phone}
                                                                        onChange={(e) => setBillingFormData({ ...billingFormData, phone: e.target.value })}
                                                                        required
                                                                        className={errors.phone ? styles.inputError : ''}
                                                                    />
                                                                    {errors.phone && <span className={styles.errorMessage}>{errors.phone}</span>}
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className={styles.formGroup}>
                                                            <label className={styles.label}>{t('Address Line 1')}</label>
                                                            <Input
                                                                type="text"
                                                                value={billingFormData.address_line_1}
                                                                onChange={(e) => setBillingFormData({ ...billingFormData, address_line_1: e.target.value })}
                                                                required
                                                                className={errors.address_line_1 ? styles.inputError : ''}
                                                            />
                                                            {errors.address_line_1 && <span className={styles.errorMessage}>{errors.address_line_1}</span>}
                                                        </div>

                                                        <div className={styles.formGroup}>
                                                            <label className={styles.label}>{t('Address Line 2')} ({t('optional')})</label>
                                                            <Input
                                                                type="text"
                                                                value={billingFormData.address_line_2}
                                                                onChange={(e) => setBillingFormData({ ...billingFormData, address_line_2: e.target.value })}
                                                                className={errors.address_line_2 ? styles.inputError : ''}
                                                            />
                                                            {errors.address_line_2 && <span className={styles.errorMessage}>{errors.address_line_2}</span>}
                                                        </div>

                                                        <div className={styles.formRow}>
                                                            <div className={styles.formGroup}>
                                                                <label className={styles.label}>{t('County')}</label>
                                                                <select
                                                                    value={billingFormData.state_id}
                                                                    onChange={(e) => {
                                                                        const stateId = e.target.value ? Number(e.target.value) : '';
                                                                        const selectedState = billingStates.find((s) => s.id === (typeof stateId === 'number' ? stateId : 0));
                                                                        setBillingFormData({
                                                                            ...billingFormData,
                                                                            state_id: typeof stateId === 'number' ? stateId.toString() : stateId,
                                                                            county_name: selectedState?.name || '',
                                                                            county_code: selectedState?.code || '',
                                                                            city_id: '',
                                                                            city: '',
                                                                        });
                                                                    }}
                                                                    required
                                                                    disabled={loadingBillingStates || !billingFormData.country_id}
                                                                    className={`${styles.select} ${errors.county_name ? styles.inputError : ''}`}
                                                                >
                                                                    <option value="">{loadingBillingStates ? t('Loading...') : t('Select County')}</option>
                                                                    {billingStates.map((state) => (
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
                                                                    value={billingFormData.city_id}
                                                                    onChange={(e) => {
                                                                        const cityId = e.target.value ? Number(e.target.value) : '';
                                                                        const selectedCity = billingCities.find((c) => c.id === (typeof cityId === 'number' ? cityId : 0));
                                                                        setBillingFormData({
                                                                            ...billingFormData,
                                                                            city_id: typeof cityId === 'number' ? cityId.toString() : cityId,
                                                                            city: selectedCity?.name || '',
                                                                        });
                                                                    }}
                                                                    required
                                                                    disabled={loadingBillingCities || !billingFormData.state_id}
                                                                    className={`${styles.select} ${errors.city ? styles.inputError : ''}`}
                                                                >
                                                                    <option value="">{loadingBillingCities ? t('Loading...') : t('Select City')}</option>
                                                                    {billingCities.map((city) => (
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
                                                                value={billingFormData.zip_code}
                                                                onChange={(e) => setBillingFormData({ ...billingFormData, zip_code: e.target.value })}
                                                                required
                                                                className={errors.zip_code ? styles.inputError : ''}
                                                            />
                                                            {errors.zip_code && <span className={styles.errorMessage}>{errors.zip_code}</span>}
                                                        </div>

                                                        {/* Save address checkbox - only for logged in users without billing address */}
                                                        {isAuthenticated && !currentBillingAddress && (
                                                            <div className={styles.formGroup} style={{ width: 'auto', maxWidth: 'fit-content' }}>
                                                                <label className={`${styles.checkboxLabel} ${saveBillingAddress ? styles.checkboxLabelChecked : ''}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={saveBillingAddress}
                                                                        onChange={(e) => setSaveBillingAddress(e.target.checked)}
                                                                        className={styles.checkboxInput}
                                                                    />
                                                                    <span>{t('Save this address for future orders')}</span>
                                                                </label>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Shipping Method Card */}
                        <div className={styles.card}>
                            <div className={styles.cardTitleWrapper}>
                                <div className={styles.cardNumberBadge}>3</div>
                                <h2 className={styles.cardTitle}>{t('Shipping Method')}</h2>
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.shippingMethodSelection}>
                                    <div className={styles.shippingMethodTabs}>
                                        <div
                                            className={`${styles.shippingMethodTab} ${shippingTab === 'courier' ? styles.shippingMethodTabSelected : ''}`}
                                            onClick={() => {
                                                setShippingTab('courier');
                                                setSelectedShippingMethod(null);
                                                // Reset pickup data when switching to courier
                                                setPickupAddressData(null);
                                                // Don't reset currentShippingAddress - it's used for Contact Data card
                                            }}
                                        >
                                            <div className={styles.shippingMethodTabRadio}>
                                                {shippingTab === 'courier' && (
                                                    <Check size={16} />
                                                )}
                                            </div>
                                            <span className={styles.shippingMethodTabLabel}>{t('Delivery by courier')}</span>
                                        </div>
                                        <div
                                            className={`${styles.shippingMethodTab} ${shippingTab === 'pickup' ? styles.shippingMethodTabSelected : ''}`}
                                            onClick={() => {
                                                setShippingTab('pickup');
                                                setSelectedShippingMethod(null);
                                                // Don't reset currentShippingAddress - it's used for Contact Data card
                                            }}
                                        >
                                            <div className={styles.shippingMethodTabRadio}>
                                                {shippingTab === 'pickup' && (
                                                    <Check size={16} />
                                                )}
                                            </div>
                                            <span className={styles.shippingMethodTabLabel}>{t('Personal pickup')}</span>
                                        </div>
                                    </div>

                                    {shippingTab === 'courier' && courierShippingMethods.length > 0 && (
                                        <>
                                            {courierShippingMethods.length === 1 ? (
                                                // Single option: display directly
                                                <div className={styles.shippingMethodSingle}>
                                                    <div className={styles.shippingMethodRadio}>
                                                        <input
                                                            type="radio"
                                                            id={`shipping-method-${courierShippingMethods[0].id}`}
                                                            name="shipping-method"
                                                            checked={selectedShippingMethod === courierShippingMethods[0].id}
                                                            onChange={() => {
                                                                setSelectedShippingMethod(courierShippingMethods[0].id);
                                                                if (pickupAddressData) {
                                                                    setPickupAddressData(null);
                                                                }
                                                            }}
                                                            className={styles.radioInput}
                                                        />
                                                        <label htmlFor={`shipping-method-${courierShippingMethods[0].id}`} className={styles.radioLabel}>
                                                            <div className={styles.shippingMethodInfo}>
                                                                <Truck size={16} className={styles.shippingCostIcon} />
                                                                <div className={styles.shippingMethodName}>{courierShippingMethods[0].name}</div>
                                                                <span className={styles.shippingMethodSeparator}>-</span>
                                                                <div className={styles.shippingMethodPrice}>
                                                                    {formatPriceWithCurrency(courierShippingMethods[0].cost)}
                                                                </div>
                                                                <span className={styles.shippingMethodSeparator}>-</span>
                                                                <div className={styles.shippingMethodEstimate}>
                                                                    <span className={styles.shippingMethodEstimateLabel}>{t('Estimated delivery')}:</span>
                                                                    <span>
                                                                        {courierShippingMethods[0].estimated_days && courierShippingMethods[0].estimated_days > 0 && courierShippingMethods[0].estimated_days < 999
                                                                            ? `${courierShippingMethods[0].estimated_days} ${courierShippingMethods[0].estimated_days === 1 ? t('day') : t('days')}`
                                                                            : `2-3 ${t('days')}`
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                </div>
                                            ) : (
                                                // Multiple options: use radio buttons
                                                <div className={styles.shippingMethodOptions}>
                                                    {courierShippingMethods.map((method) => (
                                                        <div key={method.id} className={styles.shippingMethodRadio}>
                                                            <input
                                                                type="radio"
                                                                id={`shipping-method-${method.id}`}
                                                                name="shipping-method"
                                                                checked={selectedShippingMethod === method.id}
                                                                onChange={() => {
                                                                    setSelectedShippingMethod(method.id);
                                                                    if (pickupAddressData) {
                                                                        setPickupAddressData(null);
                                                                    }
                                                                }}
                                                                className={styles.radioInput}
                                                            />
                                                            <label htmlFor={`shipping-method-${method.id}`} className={styles.radioLabel}>
                                                                <div className={styles.shippingMethodInfo}>
                                                                    <Truck size={16} className={styles.shippingCostIcon} />
                                                                    <div className={styles.shippingMethodName}>{method.name}</div>
                                                                    <span className={styles.shippingMethodSeparator}>-</span>
                                                                    <div className={styles.shippingMethodPrice}>
                                                                        {formatPriceWithCurrency(method.cost)}
                                                                    </div>
                                                                    <span className={styles.shippingMethodSeparator}>-</span>
                                                                    <div className={styles.shippingMethodEstimate}>
                                                                        <span className={styles.shippingMethodEstimateLabel}>{t('Estimated delivery')}:</span>
                                                                        <span>
                                                                            {method.estimated_days && method.estimated_days > 0 && method.estimated_days < 999
                                                                                ? `${method.estimated_days} ${method.estimated_days === 1 ? t('day') : t('days')}`
                                                                                : `2-3 ${t('days')}`
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {shippingTab === 'pickup' && pickupShippingMethods.length > 0 && (
                                        <>
                                            {pickupShippingMethods.length === 1 ? (
                                                // Single option: display directly
                                                <div className={styles.shippingMethodSingle}>
                                                    <div className={styles.shippingMethodRadio}>
                                                        <input
                                                            type="radio"
                                                            id={`pickup-method-${pickupShippingMethods[0].id}`}
                                                            name="pickup-method"
                                                            checked={selectedShippingMethod === pickupShippingMethods[0].id}
                                                            onChange={() => {
                                                                setSelectedShippingMethod(pickupShippingMethods[0].id);
                                                                // Keep pickup address data when switching between pickup methods
                                                            }}
                                                            className={styles.radioInput}
                                                        />
                                                        <label htmlFor={`pickup-method-${pickupShippingMethods[0].id}`} className={styles.radioLabel}>
                                                            <div className={styles.shippingMethodInfo}>
                                                                <Truck size={16} className={styles.shippingCostIcon} />
                                                                <div className={styles.shippingMethodName}>{pickupShippingMethods[0].name}</div>
                                                                <span className={styles.shippingMethodSeparator}>-</span>
                                                                <div className={styles.shippingMethodPrice}>
                                                                    {formatPriceWithCurrency(pickupShippingMethods[0].cost)}
                                                                </div>
                                                                <span className={styles.shippingMethodSeparator}>-</span>
                                                                <div className={styles.shippingMethodEstimate}>
                                                                    <span className={styles.shippingMethodEstimateLabel}>{t('Estimated delivery')}:</span>
                                                                    <span>
                                                                        {pickupShippingMethods[0].estimated_days && pickupShippingMethods[0].estimated_days > 0 && pickupShippingMethods[0].estimated_days < 999
                                                                            ? `${pickupShippingMethods[0].estimated_days} ${pickupShippingMethods[0].estimated_days === 1 ? t('day') : t('days')}`
                                                                            : `2-3 ${t('days')}`
                                                                        }
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </label>
                                                    </div>
                                                    <div className={styles.pickupAddressActions}>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => { }}
                                                            className={styles.pickupAddressButton}
                                                            disabled
                                                        >
                                                            <MapPin size={16} />
                                                            {t('Select pickup address')} <span className={styles.comingSoonBadge}>({t('Coming soon')})</span>
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                // Mock data for testing pickup - realistic Easybox location
                                                                const mockCourierData = {
                                                                    point_id: 'EASYBOX_BUC_GRN_042',
                                                                    point_name: 'Easybox Gara de Nord',
                                                                    provider: 'sameday',
                                                                    locker_details: {
                                                                        address: 'Bulevardul Gara de Nord nr. 15-17',
                                                                        city: 'Bucuresti',
                                                                        county_name: 'Bucuresti',
                                                                        county_code: 'B',
                                                                        zip_code: '010011',
                                                                        country_id: countries.find(c => c.iso_code_2 === 'RO')?.id || 1,
                                                                        lat: 44.4464,
                                                                        long: 26.0769
                                                                    }
                                                                };

                                                                const mockShippingAddress: Address = {
                                                                    id: 0,
                                                                    first_name: defaultShippingAddress?.first_name || '',
                                                                    last_name: defaultShippingAddress?.last_name || '',
                                                                    phone: defaultShippingAddress?.phone || '',
                                                                    address_line_1: `${mockCourierData.point_name} - ${mockCourierData.locker_details.address}`,
                                                                    address_line_2: null,
                                                                    city: mockCourierData.locker_details.city,
                                                                    county_name: mockCourierData.locker_details.county_name,
                                                                    county_code: mockCourierData.locker_details.county_code,
                                                                    country_id: mockCourierData.locker_details.country_id,
                                                                    zip_code: mockCourierData.locker_details.zip_code,
                                                                    is_preferred: false,
                                                                    address_type: 'shipping'
                                                                };

                                                                setPickupAddressData({
                                                                    courierData: mockCourierData,
                                                                    shippingAddress: mockShippingAddress
                                                                });

                                                                // Save mock pickup data to session for order creation
                                                                router.post('/checkout/save-pickup-data', {
                                                                    courier_data: mockCourierData,
                                                                    shipping_address: {
                                                                        first_name: mockShippingAddress.first_name,
                                                                        last_name: mockShippingAddress.last_name,
                                                                        phone: mockShippingAddress.phone,
                                                                        address_line_1: mockShippingAddress.address_line_1,
                                                                        address_line_2: mockShippingAddress.address_line_2,
                                                                        city: mockShippingAddress.city,
                                                                        county_name: mockShippingAddress.county_name,
                                                                        county_code: mockShippingAddress.county_code,
                                                                        country_id: mockShippingAddress.country_id,
                                                                        zip_code: mockShippingAddress.zip_code,
                                                                    }
                                                                }, {
                                                                    preserveScroll: true,
                                                                    only: []
                                                                });
                                                            }}
                                                            className={styles.testPickupButton}
                                                        >
                                                            <MapPin size={16} />
                                                            {t('Test Pickup Address')}
                                                        </Button>
                                                    </div>
                                                    {pickupAddressData && pickupAddressData.shippingAddress && (
                                                        <div className={styles.pickupAddressDisplay}>
                                                            <div className={styles.locationIcon}>
                                                                <MapPin size={20} />
                                                            </div>
                                                            <div className={styles.pickupAddressInfo}>
                                                                <div className={styles.pickupAddressTitle}>
                                                                    {t('Personal pickup from')}
                                                                </div>
                                                                <div className={styles.pickupAddressText}>
                                                                    {pickupAddressData.courierData.point_name && (
                                                                        <div className={styles.pickupPointName}>
                                                                            {pickupAddressData.courierData.point_name}
                                                                        </div>
                                                                    )}
                                                                    {formatAddressString(pickupAddressData.shippingAddress)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                // Multiple options: use radio buttons
                                                <div className={styles.shippingMethodOptions}>
                                                    {pickupShippingMethods.map((method) => (
                                                        <div key={method.id} className={styles.shippingMethodRadio}>
                                                            <input
                                                                type="radio"
                                                                id={`pickup-method-${method.id}`}
                                                                name="pickup-method"
                                                                checked={selectedShippingMethod === method.id}
                                                                onChange={() => {
                                                                    setSelectedShippingMethod(method.id);
                                                                    // Keep pickup address data when switching between pickup methods
                                                                }}
                                                                className={styles.radioInput}
                                                            />
                                                            <label htmlFor={`pickup-method-${method.id}`} className={styles.radioLabel}>
                                                                <div className={styles.shippingMethodInfo}>
                                                                    <Truck size={16} className={styles.shippingCostIcon} />
                                                                    <div className={styles.shippingMethodName}>{method.name}</div>
                                                                    <span className={styles.shippingMethodSeparator}>-</span>
                                                                    <div className={styles.shippingMethodPrice}>
                                                                        {formatPriceWithCurrency(method.cost)}
                                                                    </div>
                                                                    <span className={styles.shippingMethodSeparator}>-</span>
                                                                    <div className={styles.shippingMethodEstimate}>
                                                                        <span className={styles.shippingMethodEstimateLabel}>{t('Estimated delivery')}:</span>
                                                                        <span>
                                                                            {method.estimated_days && method.estimated_days > 0 && method.estimated_days < 999
                                                                                ? `${method.estimated_days} ${method.estimated_days === 1 ? t('day') : t('days')}`
                                                                                : `2-3 ${t('days')}`
                                                                            }
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            {selectedShippingMethod && pickupShippingMethods.some(method => method.id === selectedShippingMethod) && (
                                                <>
                                                    <div className={styles.pickupAddressActions}>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => { }}
                                                            className={styles.pickupAddressButton}
                                                            disabled
                                                        >
                                                            <MapPin size={16} />
                                                            {t('Select pickup address')} <span className={styles.comingSoonBadge}>({t('Coming soon')})</span>
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            onClick={() => {
                                                                if (!selectedShippingMethod) return;

                                                                // Mock data for testing pickup - realistic Easybox location
                                                                const mockCourierData = {
                                                                    point_id: 'EASYBOX_BUC_GRN_042',
                                                                    point_name: 'Easybox Gara de Nord',
                                                                    provider: 'sameday',
                                                                    locker_details: {
                                                                        address: 'Bulevardul Gara de Nord nr. 15-17',
                                                                        city: 'Bucuresti',
                                                                        county_name: 'Bucuresti',
                                                                        county_code: 'B',
                                                                        zip_code: '010011',
                                                                        country_id: countries.find(c => c.iso_code_2 === 'RO')?.id || 1,
                                                                        lat: 44.4464,
                                                                        long: 26.0769
                                                                    }
                                                                };

                                                                const mockShippingAddress: Address = {
                                                                    id: 0,
                                                                    first_name: defaultShippingAddress?.first_name || '',
                                                                    last_name: defaultShippingAddress?.last_name || '',
                                                                    phone: defaultShippingAddress?.phone || '',
                                                                    address_line_1: `${mockCourierData.point_name} - ${mockCourierData.locker_details.address}`,
                                                                    address_line_2: null,
                                                                    city: mockCourierData.locker_details.city,
                                                                    county_name: mockCourierData.locker_details.county_name,
                                                                    county_code: mockCourierData.locker_details.county_code,
                                                                    country_id: mockCourierData.locker_details.country_id,
                                                                    zip_code: mockCourierData.locker_details.zip_code,
                                                                    is_preferred: false,
                                                                    address_type: 'shipping'
                                                                };

                                                                setPickupAddressData({
                                                                    courierData: mockCourierData,
                                                                    shippingAddress: mockShippingAddress
                                                                });

                                                                // Save mock pickup data to session for order creation
                                                                router.post('/checkout/save-pickup-data', {
                                                                    courier_data: mockCourierData,
                                                                    shipping_address: {
                                                                        first_name: mockShippingAddress.first_name,
                                                                        last_name: mockShippingAddress.last_name,
                                                                        phone: mockShippingAddress.phone,
                                                                        address_line_1: mockShippingAddress.address_line_1,
                                                                        address_line_2: mockShippingAddress.address_line_2,
                                                                        city: mockShippingAddress.city,
                                                                        county_name: mockShippingAddress.county_name,
                                                                        county_code: mockShippingAddress.county_code,
                                                                        country_id: mockShippingAddress.country_id,
                                                                        zip_code: mockShippingAddress.zip_code,
                                                                    }
                                                                }, {
                                                                    preserveScroll: true,
                                                                    only: []
                                                                });
                                                            }}
                                                            className={styles.testPickupButton}
                                                        >
                                                            <MapPin size={16} />
                                                            {t('Test Pickup Address')}
                                                        </Button>
                                                    </div>
                                                    {pickupAddressData && pickupAddressData.shippingAddress && (
                                                        <div className={styles.pickupAddressDisplay}>
                                                            <div className={styles.locationIcon}>
                                                                <MapPin size={20} />
                                                            </div>
                                                            <div className={styles.pickupAddressInfo}>
                                                                <div className={styles.pickupAddressTitle}>
                                                                    {t('Personal pickup from')}
                                                                </div>
                                                                <div className={styles.pickupAddressText}>
                                                                    {pickupAddressData.courierData.point_name && (
                                                                        <div className={styles.pickupPointName}>
                                                                            {pickupAddressData.courierData.point_name}
                                                                        </div>
                                                                    )}
                                                                    {formatAddressString(pickupAddressData.shippingAddress)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Payment Method Card */}
                        <div className={styles.card}>
                            <div className={styles.cardTitleWrapper}>
                                <div className={styles.cardNumberBadge}>4</div>
                                <h2 className={styles.cardTitle}>{t('Payment Method')}</h2>
                            </div>
                            <div className={styles.cardContent}>
                                {paymentMethods.length > 0 ? (
                                    <div className={styles.paymentMethodList}>
                                        {paymentMethods.map((method) => (
                                            <div
                                                key={method.id}
                                                className={`${styles.paymentMethodItem} ${selectedPaymentMethod === method.id ? styles.paymentMethodItemSelected : ''}`}
                                                onClick={() => setSelectedPaymentMethod(method.id)}
                                            >
                                                <div className={styles.paymentMethodCheckbox}>
                                                    {selectedPaymentMethod === method.id && (
                                                        <Check size={16} />
                                                    )}
                                                </div>
                                                <span className={styles.paymentMethodLabel}>{method.name}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className={styles.placeholderText}>{t('Soon')}</p>
                                )}
                            </div>
                        </div>

                        {/* Order Summary Card */}
                        <div className={styles.card}>
                            <div className={styles.cardTitleWrapper}>
                                <div className={styles.cardNumberBadge}>5</div>
                                <h2 className={styles.cardTitle}>{t('Order Summary')}</h2>
                            </div>
                            <div className={styles.summaryWrapper}>
                                <div className={styles.summaryLeft}>
                                    <div className={styles.summaryDetails}>
                                        <div className={styles.summaryDetailRow}>
                                            <span className={styles.summaryDetailLabel}>{t('Subtotal (excl. VAT)')}:</span>
                                            <span className={styles.summaryDetailValue}>
                                                <PriceDisplay price={formatPriceWithCurrency(cart.summary.total_excl_vat)} />
                                            </span>
                                        </div>
                                        <div className={styles.summaryDetailRow}>
                                            <span className={styles.summaryDetailLabel}>{t('VAT')} ({cart.summary.vat_rate}%):</span>
                                            <span className={styles.summaryDetailValue}>
                                                <PriceDisplay price={formatPriceWithCurrency(cart.summary.total_incl_vat - cart.summary.total_excl_vat)} />
                                            </span>
                                        </div>
                                        {selectedShippingMethod && (
                                            <div className={styles.summaryDetailRow}>
                                                <span className={styles.summaryDetailLabel}>{t('Shipping Cost')}:</span>
                                                <span className={styles.summaryDetailValue}>
                                                    {(() => {
                                                        const selectedMethod = [...courierShippingMethods, ...pickupShippingMethods].find(m => m.id === selectedShippingMethod);
                                                        if (selectedMethod && selectedMethod.cost > 0) {
                                                            return <PriceDisplay price={formatPriceWithCurrency(selectedMethod.cost)} />;
                                                        }
                                                        return <span className={styles.freeText}>{t('Free')}</span>;
                                                    })()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={styles.summaryRight}>
                                    <div className={styles.summaryTotal}>
                                        <div className={styles.summaryTotalLabel}>{t('Total (incl. VAT)')}:</div>
                                        <div className={styles.summaryTotalValue}>
                                            <PriceDisplay price={formatPriceWithCurrency(cart.summary.total_incl_vat + (selectedShippingMethod ? (() => {
                                                const selectedMethod = [...courierShippingMethods, ...pickupShippingMethods].find(m => m.id === selectedShippingMethod);
                                                return selectedMethod ? selectedMethod.cost : 0;
                                            })() : 0))} />
                                        </div>
                                    </div>
                                    <Button
                                        variant="primary"
                                        size="lg"
                                        onClick={handleSubmitOrder}
                                        disabled={!canSubmitOrder() || isSubmitting}
                                        className={styles.submitOrderButton}
                                    >
                                        {isSubmitting ? t('Submitting...') : t('Submit order')}
                                    </Button>
                                </div>
                            </div>
                            <div className={styles.summaryDisclaimer}>
                                <p className={styles.disclaimerText}>
                                    {t('By placing the order, you agree with')}{' '}
                                    <a href="/termeni-si-conditii" className={styles.disclaimerLink}>{t('Terms and Conditions')}</a>
                                    {', '}
                                    <a href="/politica-confidentialitate" className={styles.disclaimerLink}>{t('Privacy Policy')}</a>.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Shipping Address Selection Modal */}
            <Modal
                isOpen={isShippingAddressSelectionModalOpen}
                onClose={() => setIsShippingAddressSelectionModalOpen(false)}
                title={t('Select an address from the list below or add a new one.')}
            >
                <div className={styles.addressSelectionModal}>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={async () => {
                            setIsShippingAddressSelectionModalOpen(false);
                            await handleAddNewShippingAddress();
                        }}
                        className={styles.addNewAddressButton}
                    >
                        <Plus size={20} />
                        {t('Add new address')}
                    </Button>

                    <div className={styles.addressList}>
                        {defaultShippingAddress && (
                            <div
                                className={`${styles.addressItem} ${selectedShippingAddressIdForModal === defaultShippingAddress.id ? styles.addressItemSelected : ''}`}
                                onClick={() => handleShippingAddressSelectInModal(defaultShippingAddress.id)}
                            >
                                <div className={styles.addressItemRadio}>
                                    {selectedShippingAddressIdForModal === defaultShippingAddress.id && (
                                        <Check size={16} />
                                    )}
                                </div>
                                <div className={styles.addressItemContent}>
                                    <div className={styles.addressItemName}>
                                        {defaultShippingAddress.first_name} {defaultShippingAddress.last_name && defaultShippingAddress.last_name.trim() !== '' ? `${defaultShippingAddress.last_name} - ` : ''}{defaultShippingAddress.phone}
                                    </div>
                                    <div className={styles.addressItemAddress}>
                                        {formatAddressString(defaultShippingAddress)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditShippingAddress(defaultShippingAddress.id);
                                    }}
                                    className={styles.addressItemModifyButton}
                                    title={t('modifica')}
                                >
                                    <Edit size={16} />
                                </button>
                            </div>
                        )}
                        {shippingAddresses.filter(addr => !defaultShippingAddress || addr.id !== defaultShippingAddress.id).map((address) => (
                            <div
                                key={address.id}
                                className={`${styles.addressItem} ${selectedShippingAddressIdForModal === address.id ? styles.addressItemSelected : ''}`}
                                onClick={() => handleShippingAddressSelectInModal(address.id)}
                            >
                                <div className={styles.addressItemRadio}>
                                    {selectedShippingAddressIdForModal === address.id && (
                                        <Check size={16} />
                                    )}
                                </div>
                                <div className={styles.addressItemContent}>
                                    <div className={styles.addressItemName}>
                                        {address.first_name} {address.last_name} - {address.phone}
                                    </div>
                                    <div className={styles.addressItemAddress}>
                                        {formatAddressString(address)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditShippingAddress(address.id);
                                    }}
                                    className={styles.addressItemModifyButton}
                                    title={t('modifica')}
                                >
                                    <Edit size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.modalFormActions}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsShippingAddressSelectionModalOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleConfirmShippingAddressSelection}
                        >
                            {t('Confirm')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Billing Address Selection Modal */}
            <Modal
                isOpen={isAddressSelectionModalOpen}
                onClose={() => setIsAddressSelectionModalOpen(false)}
                title={t('Select an address from the list below or add a new one.')}
            >
                <div className={styles.addressSelectionModal}>
                    <Button
                        type="button"
                        variant="primary"
                        onClick={handleAddNewAddress}
                        className={styles.addNewAddressButton}
                    >
                        <Plus size={20} />
                        {t('Add new address')}
                    </Button>

                    <div className={styles.addressList}>
                        {defaultBillingAddress && (
                            <div
                                className={`${styles.addressItem} ${selectedAddressIdForModal === defaultBillingAddress.id ? styles.addressItemSelected : ''}`}
                                onClick={() => handleAddressSelectInModal(defaultBillingAddress.id)}
                            >
                                <div className={styles.addressItemRadio}>
                                    {selectedAddressIdForModal === defaultBillingAddress.id && (
                                        <Check size={16} />
                                    )}
                                </div>
                                <div className={styles.addressItemContent}>
                                    <div className={styles.addressItemName}>
                                        {defaultBillingAddress.first_name} {defaultBillingAddress.last_name && defaultBillingAddress.last_name.trim() !== '' ? `- ${defaultBillingAddress.phone}` : `- ${defaultBillingAddress.phone}`}
                                    </div>
                                    <div className={styles.addressItemAddress}>
                                        {formatAddressString(defaultBillingAddress)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAddress(defaultBillingAddress.id);
                                    }}
                                    className={styles.addressItemModifyButton}
                                    title={t('modifica')}
                                >
                                    <Edit size={16} />
                                </button>
                            </div>
                        )}
                        {addresses.filter(addr => !defaultBillingAddress || addr.id !== defaultBillingAddress.id).map((address) => (
                            <div
                                key={address.id}
                                className={`${styles.addressItem} ${selectedAddressIdForModal === address.id ? styles.addressItemSelected : ''}`}
                                onClick={() => handleAddressSelectInModal(address.id)}
                            >
                                <div className={styles.addressItemRadio}>
                                    {selectedAddressIdForModal === address.id && (
                                        <Check size={16} />
                                    )}
                                </div>
                                <div className={styles.addressItemContent}>
                                    <div className={styles.addressItemName}>
                                        {address.first_name} {address.last_name} - {address.phone}
                                    </div>
                                    <div className={styles.addressItemAddress}>
                                        {formatAddressString(address)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditAddress(address.id);
                                    }}
                                    className={styles.addressItemModifyButton}
                                    title={t('modifica')}
                                >
                                    <Edit size={16} />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className={styles.modalFormActions}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setIsAddressSelectionModalOpen(false)}
                        >
                            {t('Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant="primary"
                            onClick={handleConfirmAddressSelection}
                        >
                            {t('Confirm')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Address Add Modal */}
            <Modal
                isOpen={isAddressModalOpen}
                onClose={() => {
                    setIsAddressModalOpen(false);
                    setEditingAddressId(null);
                    setAddressFormData({
                        first_name: '',
                        last_name: '',
                        phone: '',
                        address_line_1: '',
                        address_line_2: '',
                        city: '',
                        county_name: '',
                        county_code: '',
                        country_id: countries.length > 0 ? countries[0].id : 0,
                        state_id: '',
                        city_id: '',
                        zip_code: '',
                    });
                    setStates([]);
                    setCities([]);
                }}
                title={editingAddressId
                    ? (addressModalType === 'billing' ? t('Edit Billing Address') : t('Edit Address'))
                    : (addressModalType === 'billing' ? t('Add Billing Address') : t('Add Address'))
                }
            >
                <form onSubmit={handleAddressSubmit} className={styles.addressForm}>
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
                                    country_id: Number(e.target.value),
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
                            {countries.map((country) => (
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
                                    const stateId = e.target.value ? Number(e.target.value) : '';
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
                                    const cityId = e.target.value ? Number(e.target.value) : '';
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
                            {isSubmitting
                                ? t('Saving...')
                                : (editingAddressId ? t('Update Address') : t('Save Address'))
                            }
                        </Button>
                    </div>
                </form>
            </Modal>
        </Layout >
    );
}
