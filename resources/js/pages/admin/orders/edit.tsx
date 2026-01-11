import { router } from '@inertiajs/react';
import { ArrowLeft, Package, Truck, MapPin, CreditCard, Calendar, User, Receipt, Euro, Calculator, FileText, MoreVertical, ChevronDown, Wallet, Banknote, Phone, Mail, Plus, Trash2, Edit2, Save, X, Search, ChevronRight } from 'lucide-react';
import { AdminLayout } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { formatPrice } from '../../../utils/formatPrice';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../contexts/ToastContext';
import { useEdit } from '../../../contexts/EditContext';
import styles from './edit.module.css';

interface OrderEditPageProps {
    order: {
        id: number;
        order_number: string;
        invoice_series: string | null;
        invoice_number: string | null;
        created_at: string;
        created_at_formatted: string;
        status: {
            value: string;
            name: string;
            color: string;
        };
        customer: {
            id: number;
            email: string | null;
            name: string;
            customer_group_id: number | null;
            customer_group_code: string | null;
            is_b2c: boolean;
        } | null;
        shipping_address: {
            id: number;
            first_name: string;
            last_name: string;
            company_name: string | null;
            phone: string;
            email: string;
            address_line_1: string;
            address_line_2: string | null;
            city: string;
            county_name: string | null;
            county_code: string | null;
            zip_code: string;
            country_id: number | null;
            country_name: string | null;
        } | null;
        billing_address: {
            id: number;
            first_name: string;
            last_name: string;
            company_name: string | null;
            fiscal_code: string | null;
            reg_number: string | null;
            phone: string;
            email: string;
            address_line_1: string;
            address_line_2: string | null;
            city: string;
            county_name: string | null;
            county_code: string | null;
            zip_code: string;
            country_id: number | null;
            country_name: string | null;
        } | null;
        payment: {
            method: string;
            method_code: string | null;
            is_paid: boolean;
            paid_at: string | null;
            paid_at_formatted: string | null;
        };
        shipping: {
            method_name: string;
            method_type: string | null;
            tracking_number: string | null;
            title: string | null;
            shipping_cost_excl_vat: string;
            shipping_cost_incl_vat: string;
            shipping_cost_ron_excl_vat: string;
            shipping_cost_ron_incl_vat: string;
            is_pickup: boolean;
            courier_data: {
                point_id?: string | null;
                point_name?: string | null;
                provider?: string | null;
                locker_details?: {
                    address?: string | null;
                    city?: string | null;
                    county_name?: string | null;
                    county_code?: string | null;
                    zip_code?: string | null;
                    country_id?: number | null;
                    lat?: number | null;
                    long?: number | null;
                } | null;
            } | null;
        };
        products: Array<{
            id: number;
            product_id: number;
            name: string;
            sku: string;
            ean: string;
            quantity: number;
            image_url: string | null;
            unit_price_currency: string;
            unit_price_ron: string;
            total_currency_excl_vat: string;
            total_currency_incl_vat: string;
            total_ron_excl_vat: string;
            total_ron_incl_vat: string;
            vat_percent: number;
        }>;
        totals: {
            subtotal_excl_vat: string;
            subtotal_incl_vat: string;
            total_ron_excl_vat: string;
            total_ron_incl_vat: string;
            vat_rate: number;
            currency: string;
            exchange_rate: number;
        };
        history: Array<{
            id: number;
            action: string;
            description: string | null;
            old_value: any;
            new_value: any;
            created_at: string;
            created_at_formatted: string;
            user: {
                id: number;
                name: string;
                email: string;
            } | null;
        }>;
    };
    products: Array<{
        id: number;
        name: string;
        sku: string;
        ean: string;
        price_ron: number;
        stock_quantity: number;
        image_url: string | null;
    }>;
    countries: Array<{
        id: number;
        name: string;
    }>;
    orderStatuses: Array<{
        value: string;
        label: string;
        color_code: string;
    }>;
}

type PendingChange =
    | { type: 'add_product'; productId: number; quantity: number }
    | { type: 'update_quantity'; orderProductId: number; quantity: number }
    | { type: 'remove_product'; orderProductId: number }
    | { type: 'update_address'; addressType: 'shipping' | 'billing'; addressData: any }
    | { type: 'update_status'; status: string }
    | { type: 'update_payment_status'; isPaid: boolean };

function OrderEditContent({ order, products, countries, orderStatuses }: OrderEditPageProps) {
    const { t } = useTranslations();
    const { showToast } = useToast();
    const { setHasUnsavedChanges, setSaveHandler, setDiscardHandler } = useEdit();

    // Original data (from server)
    const [originalProducts, setOriginalProducts] = useState(order.products);
    const [originalTotals, setOriginalTotals] = useState(order.totals);
    const [originalShippingAddress, setOriginalShippingAddress] = useState(order.shipping_address);
    const [originalBillingAddress, setOriginalBillingAddress] = useState(order.billing_address);
    const [originalStatus, setOriginalStatus] = useState(order.status);
    const [originalPaymentStatus, setOriginalPaymentStatus] = useState(order.payment.is_paid);
    const [originalUpdatedAt, setOriginalUpdatedAt] = useState<string>(order.updated_at || '');

    // Local state (with pending changes applied)
    const [localProducts, setLocalProducts] = useState(order.products);
    const [localTotals, setLocalTotals] = useState(order.totals);
    const [localShippingAddress, setLocalShippingAddress] = useState(order.shipping_address);
    const [localBillingAddress, setLocalBillingAddress] = useState(order.billing_address);
    const [localStatus, setLocalStatus] = useState(order.status);
    const [localPaymentStatus, setLocalPaymentStatus] = useState(order.payment.is_paid);

    // Pending changes queue
    const [pendingChanges, setPendingChanges] = useState<PendingChange[]>([]);

    // Update original data when order changes from server
    useEffect(() => {
        setOriginalProducts(order.products);
        setOriginalTotals(order.totals);
        setOriginalShippingAddress(order.shipping_address);
        setOriginalBillingAddress(order.billing_address);
        setOriginalStatus(order.status);
        setOriginalUpdatedAt(order.updated_at || '');
        setLocalProducts(order.products);
        setLocalTotals(order.totals);
        setLocalShippingAddress(order.shipping_address);
        setLocalBillingAddress(order.billing_address);
        setLocalStatus(order.status);
        setPendingChanges([]);
        setHasUnsavedChanges(false);
    }, [order.products, order.totals, order.shipping_address, order.billing_address, order.status, order.payment.is_paid, order.updated_at, setHasUnsavedChanges]);

    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<typeof products[0] | null>(null);
    const [productQuantity, setProductQuantity] = useState(1);
    const [productSearch, setProductSearch] = useState<string>('');
    const [searchResults, setSearchResults] = useState<typeof products>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const searchContainerRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedProductPrice, setSelectedProductPrice] = useState<number | null>(null);
    const [isLoadingPrice, setIsLoadingPrice] = useState(false);
    const [editingAddress, setEditingAddress] = useState<'shipping' | 'billing' | null>(null);
    const [addressForm, setAddressForm] = useState<any>(null);

    // States and cities for address form
    const [states, setStates] = useState<Array<{ id: number; name: string; code: string | null }>>([]);
    const [cities, setCities] = useState<Array<{ id: number; name: string }>>([]);
    const [loadingStates, setLoadingStates] = useState(false);
    const [loadingCities, setLoadingCities] = useState(false);

    // Search products with debounce
    useEffect(() => {
        // Clear previous timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        // If search is empty, clear results
        if (!productSearch.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            setIsSearching(false);
            return;
        }

        // Set searching state
        setIsSearching(true);
        setShowSearchResults(true);

        // Debounce search
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                const queryParams = new URLSearchParams({ q: productSearch.trim() });

                // Get customer group ID from order if available (for price calculation specific to this order's customer)
                if (order.customer?.customer_group_id) {
                    queryParams.append('customer_group_id', order.customer.customer_group_id.toString());
                }

                const response = await fetch(`/products/autocomplete?${queryParams}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                    credentials: 'include', // Include cookies for session-based customer_group_id
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.products) {
                        // Map products to match the expected format
                        // formatProductsForDisplay returns: id, name, price_raw, price_ron, image, image_url, main_image_url, stock_quantity, sku, ean
                        const mappedProducts = data.products.map((product: any) => ({
                            id: product.id,
                            name: product.name,
                            sku: product.sku || '',
                            ean: product.ean || '',
                            // Use price_ron for admin (raw RON price), or price_raw as fallback
                            price_ron: parseFloat(product.price_ron || product.price_raw || '0'),
                            stock_quantity: product.stock_quantity || 0,
                            // Try multiple image fields for compatibility
                            image_url: product.image_url || product.image || product.main_image_url || null,
                        }));
                        setSearchResults(mappedProducts);
                    } else {
                        setSearchResults([]);
                    }
                } else {
                    setSearchResults([]);
                }
            } catch (error) {
                console.error('Search error:', error);
                setSearchResults([]);
            } finally {
                setIsSearching(false);
            }
        }, 500); // 500ms debounce

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [productSearch]);

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setShowSearchResults(false);
            }
        };

        if (showSearchResults) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
            };
        }
    }, [showSearchResults]);

    // Recalculate price when quantity changes for selected product
    useEffect(() => {
        if (selectedProduct && productQuantity > 0) {
            fetchProductPrice(selectedProduct.id, productQuantity);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [productQuantity, selectedProduct?.id]);

    // Fetch price for selected product and quantity
    const fetchProductPrice = async (productId: number, quantity: number) => {
        if (!productId || quantity < 1) return;

        setIsLoadingPrice(true);
        try {
            const queryParams = new URLSearchParams({
                quantity: quantity.toString(),
            });

            // Add customer_group_id if available
            if (order.customer?.customer_group_id) {
                queryParams.append('customer_group_id', order.customer.customer_group_id.toString());
            }

            const response = await fetch(`/products/${productId}/price?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const data = await response.json();
                setSelectedProductPrice(data.price_ron || null);
            } else {
                console.error('Failed to fetch product price');
            }
        } catch (error) {
            console.error('Error fetching product price:', error);
        } finally {
            setIsLoadingPrice(false);
        }
    };

    // Handle product selection from search
    const handleSelectProduct = (product: typeof products[0]) => {
        setSelectedProduct(product);
        setProductSearch('');
        setShowSearchResults(false);
        setSearchResults([]);
        setProductQuantity(1);
        // Fetch initial price for quantity 1
        fetchProductPrice(product.id, 1);
    };

    // Calculate local totals based on current products
    const calculateLocalTotals = (products: typeof order.products) => {
        let subtotalExclVat = 0;
        let subtotalInclVat = 0;
        let subtotalRonExclVat = 0;
        let subtotalRonInclVat = 0;

        products.forEach(product => {
            subtotalExclVat += parseFloat(product.total_currency_excl_vat);
            subtotalInclVat += parseFloat(product.total_currency_incl_vat);
            subtotalRonExclVat += parseFloat(product.total_ron_excl_vat);
            subtotalRonInclVat += parseFloat(product.total_ron_incl_vat);
        });

        // Add shipping
        const shippingExclVat = parseFloat(order.shipping.shipping_cost_excl_vat);
        const shippingInclVat = parseFloat(order.shipping.shipping_cost_incl_vat);
        const shippingRonExclVat = parseFloat(order.shipping.shipping_cost_ron_excl_vat);
        const shippingRonInclVat = parseFloat(order.shipping.shipping_cost_ron_incl_vat);

        return {
            subtotal_excl_vat: subtotalExclVat.toFixed(2),
            subtotal_incl_vat: subtotalInclVat.toFixed(2),
            total_ron_excl_vat: (subtotalRonExclVat + shippingRonExclVat).toFixed(2),
            total_ron_incl_vat: (subtotalRonInclVat + shippingRonInclVat).toFixed(2),
            vat_rate: order.totals.vat_rate,
            currency: order.totals.currency,
            exchange_rate: order.totals.exchange_rate,
        };
    };

    const handleAddProduct = () => {
        if (!selectedProduct) return;

        if (productQuantity <= 0) {
            showToast(t('Quantity must be greater than 0', 'Cantitatea trebuie sa fie mai mare decat 0'), 'error');
            return;
        }

        if (selectedProduct.stock_quantity < productQuantity) {
            showToast(t('Insufficient stock', 'Stoc insuficient'), 'error');
            return;
        }

        // Add to pending changes
        const change: PendingChange = {
            type: 'add_product',
            productId: selectedProduct.id,
            quantity: productQuantity,
        };

        setPendingChanges(prev => [...prev, change]);

        // Use calculated price if available, otherwise fallback to base price
        const priceToUse = selectedProductPrice ?? selectedProduct.price_ron ?? 0;

        // Create temporary product entry for local display
        // Note: Price calculation should be done on backend, but we use calculated price here
        const tempProduct = {
            id: Date.now(), // Temporary ID
            product_id: selectedProduct.id,
            name: selectedProduct.name,
            sku: selectedProduct.sku,
            ean: selectedProduct.ean,
            quantity: productQuantity,
            image_url: selectedProduct.image_url,
            unit_price_currency: (priceToUse / order.totals.exchange_rate).toFixed(2),
            unit_price_ron: priceToUse.toFixed(2),
            total_currency_excl_vat: ((priceToUse / order.totals.exchange_rate) * productQuantity).toFixed(2),
            total_currency_incl_vat: ((priceToUse / order.totals.exchange_rate) * productQuantity).toFixed(2),
            total_ron_excl_vat: (priceToUse * productQuantity).toFixed(2),
            total_ron_incl_vat: (priceToUse * productQuantity).toFixed(2),
            vat_percent: order.totals.vat_rate,
        };

        const newProducts = [...localProducts, tempProduct];
        setLocalProducts(newProducts);
        setLocalTotals(calculateLocalTotals(newProducts));
        setHasUnsavedChanges(true);

        setIsAddingProduct(false);
        setSelectedProduct(null);
        setProductQuantity(1);
        setProductSearch('');
        setSelectedProductPrice(null);
    };

    const handleUpdateQuantity = async (orderProductId: number, newQuantity: number) => {
        if (newQuantity <= 0) {
            showToast(t('Quantity must be greater than 0', 'Cantitatea trebuie sa fie mai mare decat 0'), 'error');
            return;
        }

        // Find the product in local products
        const productToUpdate = localProducts.find(p => p.id === orderProductId);
        if (!productToUpdate) {
            return;
        }

        // Check if this product already has a pending update
        const existingChangeIndex = pendingChanges.findIndex(
            change => change.type === 'update_quantity' && change.orderProductId === orderProductId
        );

        const change: PendingChange = {
            type: 'update_quantity',
            orderProductId: orderProductId,
            quantity: newQuantity,
        };

        if (existingChangeIndex >= 0) {
            // Update existing change
            setPendingChanges(prev => {
                const newChanges = [...prev];
                newChanges[existingChangeIndex] = change;
                return newChanges;
            });
        } else {
            // Add new change
            setPendingChanges(prev => [...prev, change]);
        }

        // Fetch updated price for the new quantity (with group prices)
        try {
            const queryParams = new URLSearchParams({
                quantity: newQuantity.toString(),
            });

            // Add customer_group_id if available
            if (order.customer?.customer_group_id) {
                queryParams.append('customer_group_id', order.customer.customer_group_id.toString());
            }

            const response = await fetch(`/products/${productToUpdate.product_id}/price?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'include',
            });

            if (response.ok) {
                const priceData = await response.json();
                const newUnitPriceRon = priceData.price_ron || parseFloat(productToUpdate.unit_price_ron) || 0;
                const newTotalPriceRon = priceData.total_price_ron || (newUnitPriceRon * newQuantity);

                // Update local products with recalculated prices
                const newProducts = localProducts.map(product => {
                    if (product.id === orderProductId) {
                        return {
                            ...product,
                            quantity: newQuantity,
                            unit_price_ron: newUnitPriceRon.toFixed(2),
                            unit_price_currency: (newUnitPriceRon / order.totals.exchange_rate).toFixed(2),
                            total_ron_excl_vat: (newTotalPriceRon * (1 - (order.totals.vat_rate / 100))).toFixed(2),
                            total_ron_incl_vat: newTotalPriceRon.toFixed(2),
                            total_currency_excl_vat: ((newTotalPriceRon * (1 - (order.totals.vat_rate / 100))) / order.totals.exchange_rate).toFixed(2),
                            total_currency_incl_vat: (newTotalPriceRon / order.totals.exchange_rate).toFixed(2),
                        };
                    }
                    return product;
                });

                setLocalProducts(newProducts);
                setLocalTotals(calculateLocalTotals(newProducts));
            } else {
                // Fallback to simple multiplication if price fetch fails
                const newProducts = localProducts.map(product => {
                    if (product.id === orderProductId) {
                        const quantityMultiplier = newQuantity / product.quantity;
                        return {
                            ...product,
                            quantity: newQuantity,
                            total_currency_excl_vat: (parseFloat(product.total_currency_excl_vat) * quantityMultiplier).toFixed(2),
                            total_currency_incl_vat: (parseFloat(product.total_currency_incl_vat) * quantityMultiplier).toFixed(2),
                            total_ron_excl_vat: (parseFloat(product.total_ron_excl_vat) * quantityMultiplier).toFixed(2),
                            total_ron_incl_vat: (parseFloat(product.total_ron_incl_vat) * quantityMultiplier).toFixed(2),
                        };
                    }
                    return product;
                });

                setLocalProducts(newProducts);
                setLocalTotals(calculateLocalTotals(newProducts));
            }
        } catch (error) {
            console.error('Error fetching updated price:', error);
            // Fallback to simple multiplication if request fails
            const newProducts = localProducts.map(product => {
                if (product.id === orderProductId) {
                    const quantityMultiplier = newQuantity / product.quantity;
                    return {
                        ...product,
                        quantity: newQuantity,
                        total_currency_excl_vat: (parseFloat(product.total_currency_excl_vat) * quantityMultiplier).toFixed(2),
                        total_currency_incl_vat: (parseFloat(product.total_currency_incl_vat) * quantityMultiplier).toFixed(2),
                        total_ron_excl_vat: (parseFloat(product.total_ron_excl_vat) * quantityMultiplier).toFixed(2),
                        total_ron_incl_vat: (parseFloat(product.total_ron_incl_vat) * quantityMultiplier).toFixed(2),
                    };
                }
                return product;
            });

            setLocalProducts(newProducts);
            setLocalTotals(calculateLocalTotals(newProducts));
        }

        setHasUnsavedChanges(true);
    };

    const handleRemoveProduct = (orderProductId: number, productName: string) => {
        // Check if this is a temporary product (from pending add)
        const isTemporary = orderProductId > 1000000000; // Temporary IDs are timestamps

        // Remove any pending changes for this product
        setPendingChanges(prev => prev.filter(change => {
            if (change.type === 'add_product' && isTemporary) {
                // Check if this is the product we're removing
                const product = localProducts.find(p => p.id === orderProductId);
                return product?.product_id !== change.productId;
            }
            if (change.type === 'update_quantity' || change.type === 'remove_product') {
                return change.orderProductId !== orderProductId;
            }
            return true;
        }));

        // Add remove change if it's not a temporary product
        if (!isTemporary) {
            const change: PendingChange = {
                type: 'remove_product',
                orderProductId: orderProductId,
            };
            setPendingChanges(prev => [...prev, change]);
        }

        // Update local products
        const newProducts = localProducts.filter(product => product.id !== orderProductId);
        setLocalProducts(newProducts);
        setLocalTotals(calculateLocalTotals(newProducts));
        setHasUnsavedChanges(true);
    };

    const handleSaveAddress = (type: 'shipping' | 'billing') => {
        // Get selected state and city names
        const selectedState = states.find(s => s.id.toString() === addressForm.state_id);
        const selectedCity = cities.find(c => c.id.toString() === addressForm.city_id);

        // Prepare address data for backend (convert state_id/city_id to names)
        const addressDataForBackend = {
            ...addressForm,
            county_name: selectedState?.name || addressForm.county_name || '',
            county_code: selectedState?.code || addressForm.county_code || '',
            city: selectedCity?.name || addressForm.city || '',
        };

        // Remove state_id and city_id as backend doesn't need them
        delete addressDataForBackend.state_id;
        delete addressDataForBackend.city_id;

        // Remove any existing address change for this type
        setPendingChanges(prev => prev.filter(change =>
            !(change.type === 'update_address' && change.addressType === type)
        ));

        // Add new address change
        const change: PendingChange = {
            type: 'update_address',
            addressType: type,
            addressData: addressDataForBackend,
        };

        setPendingChanges(prev => [...prev, change]);

        // Update local address with country name
        const country = countries.find(c => c.id === addressForm.country_id);
        const updatedAddress = {
            ...(type === 'shipping' ? order.shipping_address! : order.billing_address!),
            ...addressDataForBackend,
            country_name: country?.name || null,
        };

        if (type === 'shipping') {
            setLocalShippingAddress(updatedAddress);
        } else {
            setLocalBillingAddress(updatedAddress);
        }

        setHasUnsavedChanges(true);
        setEditingAddress(null);
        setAddressForm(null);
        setStates([]);
        setCities([]);
    };

    // Save handler - applies all pending changes to backend
    const handleSave = useCallback(async () => {
        if (pendingChanges.length === 0) {
            return;
        }

        setIsSaving(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            // Transform pending changes to backend format
            const changes = pendingChanges.map(change => {
                switch (change.type) {
                    case 'add_product':
                        return {
                            type: 'add_product',
                            product_id: change.productId,
                            quantity: change.quantity,
                        };
                    case 'update_quantity':
                        return {
                            type: 'update_quantity',
                            order_product_id: change.orderProductId,
                            quantity: change.quantity,
                        };
                    case 'remove_product':
                        return {
                            type: 'remove_product',
                            order_product_id: change.orderProductId,
                        };
                    case 'update_address':
                        return {
                            type: 'update_address',
                            address_type: change.addressType,
                            ...change.addressData,
                        };
                    case 'update_status':
                        return {
                            type: 'update_status',
                            status: change.status,
                        };
                    case 'update_payment_status':
                        return {
                            type: 'update_payment_status',
                            is_paid: change.isPaid,
                        };
                    default:
                        throw new Error(`Unknown change type: ${(change as any).type}`);
                }
            });

            // Send all changes in a single batch request (atomic transaction)
            // Include originalUpdatedAt for optimistic locking
            const response = await fetch(`/admin/orders/${order.order_number}/batch-update`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    changes,
                    originalUpdatedAt: originalUpdatedAt,
                }),
            });

            if (!response.ok) {
                const data = await response.json();

                // Handle conflict (409) - order was modified by another user
                if (response.status === 409 && data.conflict) {
                    showToast(
                        t('Order was modified by another user. Please refresh the page.',
                            'Comanda a fost modificata de alt utilizator. Va rugam sa reincarcati pagina.'),
                        'error'
                    );
                    // Reload the page to get latest data
                    setTimeout(() => {
                        router.reload({ only: ['order'] });
                    }, 2000);
                    return;
                }

                throw new Error(data.message || 'Error applying changes');
            }

            const result = await response.json();

            showToast(t('Changes saved successfully', 'Modificarile au fost salvate cu succes'), 'success');
            router.reload({ only: ['order'] });
        } catch (error: any) {
            console.error('Error saving changes:', error);
            showToast(error.message || t('Error saving changes', 'Eroare la salvarea modificărilor'), 'error');
        } finally {
            setIsSaving(false);
        }
    }, [pendingChanges, order.order_number, originalUpdatedAt, t, showToast, router]);

    // Discard handler - resets all changes
    const handleDiscard = useCallback(() => {
        setLocalProducts(originalProducts);
        setLocalTotals(originalTotals);
        setLocalShippingAddress(originalShippingAddress);
        setLocalBillingAddress(originalBillingAddress);
        setLocalStatus(originalStatus);
        setLocalPaymentStatus(originalPaymentStatus);
        setPendingChanges([]);
        setHasUnsavedChanges(false);
        setEditingAddress(null);
        setAddressForm(null);
    }, [originalProducts, originalTotals, originalShippingAddress, originalBillingAddress, originalStatus, originalPaymentStatus, setHasUnsavedChanges]);

    // Handle status change
    const handleStatusChange = (newStatus: string) => {
        // Remove any existing status change
        setPendingChanges(prev => prev.filter(change => change.type !== 'update_status'));

        // Add new status change
        const change: PendingChange = {
            type: 'update_status',
            status: newStatus,
        };

        setPendingChanges(prev => [...prev, change]);

        // Update local status
        const statusInfo = orderStatuses.find(s => s.value === newStatus);
        if (statusInfo) {
            setLocalStatus({
                value: statusInfo.value,
                name: statusInfo.label,
                color: statusInfo.color_code,
            });
        }

        setHasUnsavedChanges(true);
    };

    // Handle payment status change
    const handlePaymentStatusChange = (isPaid: boolean) => {
        // Remove any existing payment status change
        setPendingChanges(prev => prev.filter(change => change.type !== 'update_payment_status'));

        // Add new payment status change
        const change: PendingChange = {
            type: 'update_payment_status',
            isPaid: isPaid,
        };

        setPendingChanges(prev => [...prev, change]);

        // Update local payment status
        setLocalPaymentStatus(isPaid);

        setHasUnsavedChanges(true);
    };

    // Set up save/discard handlers in EditContext
    useEffect(() => {
        setSaveHandler(() => handleSave);
        setDiscardHandler(() => handleDiscard);

        return () => {
            setSaveHandler(null);
            setDiscardHandler(null);
        };
    }, [handleSave, handleDiscard, setSaveHandler, setDiscardHandler]);

    const startEditingAddress = async (type: 'shipping' | 'billing') => {
        const address = type === 'shipping' ? localShippingAddress : localBillingAddress;
        if (address) {
            setAddressForm({
                first_name: address.first_name,
                last_name: address.last_name,
                company_name: address.company_name || '',
                fiscal_code: address.fiscal_code || '',
                reg_number: address.reg_number || '',
                phone: address.phone,
                email: address.email || '',
                address_line_1: address.address_line_1,
                address_line_2: address.address_line_2 || '',
                city: address.city,
                county_name: address.county_name || '',
                county_code: address.county_code || '',
                zip_code: address.zip_code,
                country_id: address.country_id || (countries.length > 0 ? countries[0].id : null),
                state_id: '',
                city_id: '',
            });
            setEditingAddress(type);

            // Load states and cities for the country
            const countryId = address.country_id || (countries.length > 0 ? countries[0].id : null);
            if (countryId) {
                setLoadingStates(true);
                try {
                    const statesResponse = await fetch(`/settings/states/${countryId}`);
                    if (statesResponse.ok) {
                        const statesData = await statesResponse.json();
                        setStates(statesData);

                        // Find and set the state_id if county_code matches
                        if (address.county_code) {
                            const matchingState = statesData.find((s: { code: string | null }) => s.code === address.county_code);
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
                                        const matchingCity = citiesData.find((c: { name: string }) => c.name === address.city);
                                        const cityIdStr = matchingCity ? matchingCity.id.toString() : '';

                                        // Set both state_id and city_id
                                        setAddressForm((prev: any) => ({
                                            ...prev,
                                            state_id: stateIdStr,
                                            city_id: cityIdStr,
                                        }));
                                    }
                                } catch (err) {
                                    console.error('Error fetching cities:', err);
                                    setAddressForm((prev: any) => ({
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
            }
        }
    };

    const getStatusBadgeStyle = (color: string) => {
        return {
            backgroundColor: `${color}20`,
            color: color,
            borderColor: color,
        };
    };

    const getPaymentStatusBadgeStyle = (isPaid: boolean) => {
        if (isPaid) {
            return {
                backgroundColor: '#10b98120',
                color: '#10b981',
                borderColor: '#10b981',
            };
        } else {
            return {
                backgroundColor: '#ef444420',
                color: '#ef4444',
                borderColor: '#ef4444',
            };
        }
    };

    // Check if order can be edited
    const canEdit = !order.invoice_number;

    return (
        <div className={styles.orderEditPage}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    {/* Breadcrumb */}
                    <nav className={styles.breadcrumb}>
                        <a
                            href="/admin/orders"
                            onClick={(e) => {
                                e.preventDefault();
                                router.get('/admin/orders');
                            }}
                            className={styles.breadcrumbLink}
                        >
                            {t('Orders', 'Comenzi')}
                        </a>
                        <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                        <a
                            href={`/admin/orders/${order.order_number}`}
                            onClick={(e) => {
                                e.preventDefault();
                                router.get(`/admin/orders/${order.order_number}`);
                            }}
                            className={styles.breadcrumbLink}
                        >
                            #{order.order_number}
                        </a>
                        <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                        <span className={styles.breadcrumbCurrent}>
                            {t('Edit', 'Editare')}
                        </span>
                    </nav>
                    <div className={styles.orderTitle}>
                        <h1 className={styles.orderNumber}>#{order.order_number}</h1>
                        {canEdit ? (
                            <>
                                <select
                                    value={localStatus.value}
                                    onChange={(e) => handleStatusChange(e.target.value)}
                                    className={styles.statusSelect}
                                    style={getStatusBadgeStyle(localStatus.color)}
                                >
                                    {orderStatuses.map((status) => (
                                        <option key={status.value} value={status.value}>
                                            {t(status.label, status.label)}
                                        </option>
                                    ))}
                                </select>
                                <select
                                    value={localPaymentStatus ? 'paid' : 'unpaid'}
                                    onChange={(e) => handlePaymentStatusChange(e.target.value === 'paid')}
                                    className={styles.statusSelect}
                                    style={getPaymentStatusBadgeStyle(localPaymentStatus)}
                                >
                                    <option value="unpaid">{t('Unpaid', 'Neplatit')}</option>
                                    <option value="paid">{t('Paid', 'Platit')}</option>
                                </select>
                            </>
                        ) : (
                            <>
                                <span
                                    className={styles.statusBadge}
                                    style={getStatusBadgeStyle(order.status.color)}
                                >
                                    {t(order.status.name, order.status.name)}
                                </span>
                                <span
                                    className={styles.paymentStatusBadge}
                                    style={getPaymentStatusBadgeStyle(order.payment.is_paid)}
                                >
                                    {order.payment.is_paid ? t('Paid', 'Platit') : t('Unpaid', 'Neplatit')}
                                </span>
                            </>
                        )}
                        {!canEdit && (
                            <span className={styles.warningBadge}>
                                {t('Cannot edit - Invoice exists', 'Nu se poate edita - Factura exista')}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {!canEdit && (
                <div className={styles.warningMessage}>
                    {t('This order has an invoice number and cannot be modified', 'Aceasta comanda are un numar de factura si nu poate fi modificata')}
                </div>
            )}

            {/* Main Content */}
            <div className={styles.mainContent}>
                {/* Left Column */}
                <div className={styles.leftColumn}>
                    {/* Order Products */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                <Package size={18} />
                                {t('Order Products', 'Produse Comanda')}
                            </h2>
                            {canEdit && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => setIsAddingProduct(true)}
                                    className={styles.blueButton}
                                >
                                    <Plus size={16} />
                                    {t('Add Product', 'Adauga Produs')}
                                </Button>
                            )}
                        </div>
                        <div className={styles.productsTable}>
                            <table>
                                <thead>
                                    <tr>
                                        <th className={styles.imageHeader}></th>
                                        <th>{t('Product', 'Produs')}</th>
                                        <th>{t('SKU', 'SKU')}</th>
                                        <th className={styles.quantityHeader}>{t('Quantity', 'Cantitate')}</th>
                                        <th>{t('Unit Price', 'Pret unitar')}</th>
                                        <th>{t('Total', 'Total')}</th>
                                        {canEdit && <th className={styles.actionsHeader}>{t('Actions', 'Actiuni')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {localProducts.map((product) => (
                                        <tr key={product.id}>
                                            <td className={styles.productImageCell}>
                                                {product.image_url ? (
                                                    <img
                                                        src={product.image_url}
                                                        alt={product.name}
                                                        className={styles.productThumbnail}
                                                        loading="lazy"
                                                    />
                                                ) : (
                                                    <div className={styles.productThumbnailPlaceholder}>
                                                        <Package size={16} />
                                                    </div>
                                                )}
                                            </td>
                                            <td className={styles.productName}>{product.name}</td>
                                            <td className={styles.productSku}>{product.sku || '-'}</td>
                                            <td className={styles.productQuantity}>
                                                {canEdit ? (
                                                    <Input
                                                        type="number"
                                                        value={product.quantity}
                                                        onChange={(e) => {
                                                            const newQuantity = parseInt(e.target.value) || 0;
                                                            if (newQuantity > 0) {
                                                                handleUpdateQuantity(product.id, newQuantity);
                                                            }
                                                        }}
                                                        onBlur={(e) => {
                                                            const newQuantity = parseInt(e.target.value) || 0;
                                                            if (newQuantity <= 0) {
                                                                // Reset to original quantity if invalid
                                                                const originalProduct = originalProducts.find(p => p.id === product.id);
                                                                if (originalProduct) {
                                                                    handleUpdateQuantity(product.id, originalProduct.quantity);
                                                                }
                                                            }
                                                        }}
                                                        min="1"
                                                        style={{ width: '80px', textAlign: 'center' }}
                                                        disabled={isSaving}
                                                    />
                                                ) : (
                                                    <span>{product.quantity}</span>
                                                )}
                                            </td>
                                            <td className={styles.productPrice}>
                                                <div className={styles.pricePrimary}>
                                                    {formatPrice(product.unit_price_currency)} {order.totals.currency}
                                                </div>
                                                {order.totals.currency !== 'RON' && (
                                                    <div className={styles.priceSecondary}>
                                                        {formatPrice(product.unit_price_ron)} RON
                                                    </div>
                                                )}
                                            </td>
                                            <td className={styles.productTotal}>
                                                <div className={styles.pricePrimary}>
                                                    {formatPrice(product.total_currency_incl_vat)} {order.totals.currency}
                                                </div>
                                                {order.totals.currency !== 'RON' && (
                                                    <div className={styles.priceSecondary}>
                                                        {formatPrice(product.total_ron_incl_vat)} RON
                                                    </div>
                                                )}
                                            </td>
                                            {canEdit && (
                                                <td className={styles.productActionsCell}>
                                                    <div className={styles.productActions}>
                                                        <Button
                                                            variant="icon"
                                                            size="sm"
                                                            onClick={() => handleRemoveProduct(product.id, product.name)}
                                                            disabled={isSaving}
                                                            className={styles.deleteButton}
                                                        >
                                                            <Trash2 size={16} />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className={styles.section}>
                        <h2 className={styles.sectionTitle}>
                            <Calculator size={18} />
                            {t('Order Summary', 'Sumar Comanda')}
                        </h2>
                        <div className={styles.summary}>
                            <div className={styles.summaryDetails}>
                                <div className={styles.summaryRow}>
                                    <div className={styles.summaryLabel}>
                                        <span className={styles.summaryLabelText}>
                                            {t('Subtotal', 'Subtotal')}
                                            <span className={styles.summaryNote}>({t('without VAT', 'fara TVA')})</span>
                                        </span>
                                    </div>
                                    <div className={styles.summaryValue}>
                                        <span className={styles.pricePrimary}>
                                            {formatPrice(localTotals.subtotal_excl_vat)} {localTotals.currency}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.summaryRowDivider}></div>
                                <div className={styles.summaryRow}>
                                    <div className={styles.summaryLabel}>
                                        <span className={styles.summaryLabelText}>
                                            {t('Shipping', 'Livrare')} <span className={styles.summaryNote}>(fara TVA)</span>
                                        </span>
                                    </div>
                                    <div className={styles.summaryValue}>
                                        <span className={styles.pricePrimary}>
                                            {formatPrice(order.shipping.shipping_cost_excl_vat)} {localTotals.currency}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.summaryRowDivider}></div>
                                <div className={styles.summaryRow}>
                                    <div className={styles.summaryLabel}>
                                        <span className={styles.summaryLabelText}>
                                            {t('VAT', 'TVA')}
                                            <span className={styles.summaryNote}>({localTotals.vat_rate}%)</span>
                                        </span>
                                    </div>
                                    <div className={styles.summaryValue}>
                                        <span className={styles.pricePrimary}>
                                            {formatPrice(
                                                (parseFloat(localTotals.subtotal_incl_vat) - parseFloat(localTotals.subtotal_excl_vat)) +
                                                (parseFloat(order.shipping.shipping_cost_incl_vat) - parseFloat(order.shipping.shipping_cost_excl_vat))
                                            )} {localTotals.currency}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.summaryDivider}></div>

                            <div className={styles.summaryTotal}>
                                <div className={styles.summaryTotalLabel}>
                                    {t('Total Payment', 'Total de Plata')}
                                    <span className={styles.summaryTotalNote}>({t('with VAT', 'cu TVA')})</span>
                                </div>
                                <div className={styles.summaryTotalValue}>
                                    {formatPrice(
                                        parseFloat(localTotals.subtotal_incl_vat) + parseFloat(order.shipping.shipping_cost_incl_vat)
                                    )} {localTotals.currency}
                                </div>
                            </div>

                            {localTotals.currency !== 'RON' && (
                                <>
                                    <div className={styles.summaryDividerLight}></div>
                                    <div className={styles.summaryAccounting}>
                                        <div className={styles.summaryAccountingLabel}>
                                            <FileText size={14} className={styles.summaryAccountingIcon} />
                                            <span>{t('Accounting Equivalent', 'Echivalent Contabil')}</span>
                                        </div>
                                        <div className={styles.summaryAccountingValue}>
                                            {formatPrice(localTotals.total_ron_incl_vat)} RON
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className={styles.rightColumn}>
                    {/* Shipping Address */}
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <h2 className={styles.sectionTitle}>
                                <MapPin size={18} />
                                {t('Shipping Address', 'Adresa de Livrare')}
                            </h2>
                            {canEdit && order.shipping_address && (
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => startEditingAddress('shipping')}
                                    className={styles.editAddressButton}
                                >
                                    <Edit2 size={14} />
                                    {t('Edit', 'Editeaza')}
                                </Button>
                            )}
                        </div>
                        {localShippingAddress && (() => {
                            const address = localShippingAddress;
                            const addressParts: string[] = [];
                            if (address.address_line_1) addressParts.push(address.address_line_1);
                            if (address.address_line_2) addressParts.push(address.address_line_2);

                            const locationParts: string[] = [];
                            if (address.city) locationParts.push(address.city);
                            if (address.county_name) {
                                const county = `Jud. ${address.county_name}${address.county_code ? ` (${address.county_code})` : ''}`;
                                locationParts.push(county);
                            }
                            if (address.country_name) locationParts.push(address.country_name);
                            if (address.zip_code) locationParts.push(address.zip_code);

                            return (
                                <div className={styles.addressInfoCompact}>
                                    <div className={styles.addressNameCompact}>
                                        {address.first_name} {address.last_name}
                                    </div>
                                    {address.company_name && (
                                        <div className={styles.addressCompanyCompact}>
                                            {address.company_name}
                                        </div>
                                    )}
                                    {addressParts.length > 0 && (
                                        <div className={styles.addressLineCompact}>
                                            {addressParts.join(', ')}
                                        </div>
                                    )}
                                    {locationParts.length > 0 && (
                                        <div className={styles.addressLocationCompact}>
                                            {locationParts.join(', ')}
                                        </div>
                                    )}
                                    {(address.phone || address.email) && (
                                        <div className={styles.addressContactCompact}>
                                            {address.phone && (
                                                <div className={styles.addressContactItem}>
                                                    <Phone size={14} className={styles.addressContactIcon} />
                                                    <span>{address.phone}</span>
                                                </div>
                                            )}
                                            {address.email && (
                                                <div className={styles.addressContactItem}>
                                                    <Mail size={14} className={styles.addressContactIcon} />
                                                    <span>{address.email}</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>

                    {/* Billing Address */}
                    {localBillingAddress && (
                        <div className={styles.section}>
                            <div className={styles.sectionHeader}>
                                <h2 className={styles.sectionTitle}>
                                    <CreditCard size={18} />
                                    {t('Billing Address', 'Adresa de Facturare')}
                                </h2>
                                {canEdit && (
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => startEditingAddress('billing')}
                                        className={styles.editAddressButton}
                                    >
                                        <Edit2 size={14} />
                                        {t('Edit', 'Editeaza')}
                                    </Button>
                                )}
                            </div>
                            {(() => {
                                const address = localBillingAddress;
                                const addressParts: string[] = [];
                                if (address.address_line_1) addressParts.push(address.address_line_1);
                                if (address.address_line_2) addressParts.push(address.address_line_2);

                                const locationParts: string[] = [];
                                if (address.city) locationParts.push(address.city);
                                if (address.county_name) {
                                    const county = `Jud. ${address.county_name}${address.county_code ? ` (${address.county_code})` : ''}`;
                                    locationParts.push(county);
                                }
                                if (address.country_name) locationParts.push(address.country_name);
                                if (address.zip_code) locationParts.push(address.zip_code);

                                const fiscalInfo: string[] = [];
                                if (address.fiscal_code) fiscalInfo.push(`CUI: ${address.fiscal_code}`);
                                if (address.reg_number) fiscalInfo.push(`Nr. Reg. Com.: ${address.reg_number}`);

                                return (
                                    <div className={styles.addressInfoCompact}>
                                        <div className={styles.addressNameCompact}>
                                            {address.first_name} {address.last_name}
                                        </div>
                                        {address.company_name && (
                                            <div className={styles.addressCompanyCompact}>
                                                {address.company_name}
                                            </div>
                                        )}
                                        {fiscalInfo.length > 0 && (
                                            <div className={styles.addressFiscalCompact}>
                                                {fiscalInfo.join(' | ')}
                                            </div>
                                        )}
                                        {addressParts.length > 0 && (
                                            <div className={styles.addressLineCompact}>
                                                {addressParts.join(', ')}
                                            </div>
                                        )}
                                        {locationParts.length > 0 && (
                                            <div className={styles.addressLocationCompact}>
                                                {locationParts.join(', ')}
                                            </div>
                                        )}
                                        {(address.phone || address.email) && (
                                            <div className={styles.addressContactCompact}>
                                                {address.phone && (
                                                    <div className={styles.addressContactItem}>
                                                        <Phone size={14} className={styles.addressContactIcon} />
                                                        <span>{address.phone}</span>
                                                    </div>
                                                )}
                                                {address.email && (
                                                    <div className={styles.addressContactItem}>
                                                        <Mail size={14} className={styles.addressContactIcon} />
                                                        <span>{address.email}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </div>
            </div>

            {/* Add Product Modal */}
            <Modal
                isOpen={isAddingProduct}
                onClose={() => {
                    setIsAddingProduct(false);
                    setSelectedProduct(null);
                    setProductQuantity(1);
                    setProductSearch('');
                    setSearchResults([]);
                    setShowSearchResults(false);
                    setSelectedProductPrice(null);
                    if (searchTimeoutRef.current) {
                        clearTimeout(searchTimeoutRef.current);
                    }
                }}
                title={t('Add Product', 'Adauga Produs')}
            >
                <div className={styles.addProductModal}>
                    {!selectedProduct ? (
                        <div className={styles.searchSection}>
                            <div className={styles.searchWrapper} ref={searchContainerRef}>
                                <Search size={20} className={styles.searchIcon} />
                                <Input
                                    type="text"
                                    value={productSearch}
                                    onChange={(e) => {
                                        setProductSearch(e.target.value);
                                        setSelectedProduct(null);
                                        setShowSearchResults(true);
                                    }}
                                    onFocus={() => {
                                        if (productSearch.trim() && searchResults.length > 0) {
                                            setShowSearchResults(true);
                                        }
                                    }}
                                    placeholder={t('Search products by name, SKU or EAN...', 'Cauta produse dupa nume, SKU sau EAN...')}
                                    className={styles.searchInput}
                                />
                                {showSearchResults && (
                                    <div className={styles.searchResults}>
                                        {isSearching ? (
                                            <div className={styles.searchLoading}>
                                                {t('Searching...', 'Cautare...')}
                                            </div>
                                        ) : searchResults.length > 0 ? (
                                            searchResults.map((product) => (
                                                <div
                                                    key={product.id}
                                                    className={`${styles.searchResultItem} ${selectedProduct?.id === product.id ? styles.searchResultItemSelected : ''}`}
                                                    onClick={() => handleSelectProduct(product)}
                                                >
                                                    {product.image_url && (
                                                        <img
                                                            src={product.image_url}
                                                            alt={product.name}
                                                            className={styles.searchResultImage}
                                                        />
                                                    )}
                                                    <div className={styles.searchResultInfo}>
                                                        <div className={styles.searchResultName}>{product.name}</div>
                                                        <div className={styles.searchResultMeta}>
                                                            {product.sku && product.sku.trim() && <span>SKU: {product.sku}</span>}
                                                            {product.ean && product.ean.trim() && <span>EAN: {product.ean}</span>}
                                                            <span>{formatPrice(product.price_ron || 0)} RON</span>
                                                            <span className={product.stock_quantity > 0 ? styles.inStock : styles.outOfStock}>
                                                                {product.stock_quantity > 0
                                                                    ? t('In stock', 'In stoc') + ': ' + product.stock_quantity
                                                                    : t('Out of stock', 'Stoc epuizat')}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : productSearch.trim() ? (
                                            <div className={styles.searchNoResults}>
                                                {t('No products found', 'Nu s-au gasit produse')}
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className={styles.selectedProductWrapper}>
                            <div className={styles.selectedProductContainer}>
                                {selectedProduct.image_url ? (
                                    <img
                                        src={selectedProduct.image_url}
                                        alt={selectedProduct.name}
                                        className={styles.selectedProductImageLarge}
                                    />
                                ) : (
                                    <div className={styles.selectedProductImagePlaceholderLarge}>
                                        <Package size={40} />
                                    </div>
                                )}
                                <div className={styles.selectedProductContent}>
                                    <div className={styles.selectedProductTitle}>{selectedProduct.name}</div>
                                    <div className={styles.selectedProductDetailsRow}>
                                        {selectedProduct.sku && selectedProduct.sku.trim() && (
                                            <span className={styles.selectedProductDetail}>SKU: {selectedProduct.sku}</span>
                                        )}
                                        {selectedProduct.ean && selectedProduct.ean.trim() && (
                                            <span className={styles.selectedProductDetail}>EAN: {selectedProduct.ean}</span>
                                        )}
                                        <span className={`${styles.selectedProductDetail} ${selectedProduct.stock_quantity > 0 ? styles.inStock : styles.outOfStock}`}>
                                            {selectedProduct.stock_quantity > 0
                                                ? t('In stock', 'In stoc') + ': ' + selectedProduct.stock_quantity
                                                : t('Out of stock', 'Stoc epuizat')}
                                        </span>
                                    </div>
                                    <div className={styles.selectedProductPriceRow}>
                                        <div className={styles.selectedProductUnitPrice}>
                                            {isLoadingPrice ? (
                                                <span>{t('Loading...', 'Se incarca...')}</span>
                                            ) : (
                                                <>
                                                    <span className={styles.selectedProductPriceValue}>
                                                        {formatPrice(selectedProductPrice ?? selectedProduct.price_ron ?? 0)} RON
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                        {productQuantity > 1 && selectedProductPrice && (
                                            <div className={styles.selectedProductTotal}>
                                                <span className={styles.selectedProductTotalLabel}>{t('Total', 'Total')}:</span>
                                                <span className={styles.selectedProductTotalValue}>
                                                    {formatPrice((selectedProductPrice ?? selectedProduct.price_ron ?? 0) * productQuantity)} RON
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div className={styles.productForm}>
                        <div className={styles.formRow}>
                            <label>{t('Quantity', 'Cantitate')}</label>
                            <Input
                                type="number"
                                value={productQuantity}
                                onChange={(e) => setProductQuantity(parseInt(e.target.value) || 1)}
                                min="1"
                                max={selectedProduct?.stock_quantity || undefined}
                                disabled={!selectedProduct}
                            />
                            {selectedProduct && (
                                <span className={styles.stockInfo}>
                                    {t('Available', 'Disponibil')}: {selectedProduct.stock_quantity}
                                </span>
                            )}
                        </div>
                        <div className={styles.formActions}>
                            <Button
                                variant="primary"
                                onClick={handleAddProduct}
                                disabled={isSaving || !selectedProduct}
                                className={styles.blueButton}
                            >
                                {t('Add Product', 'Adauga Produs')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setIsAddingProduct(false);
                                    setSelectedProduct(null);
                                    setProductQuantity(1);
                                    setProductSearch('');
                                    setSearchResults([]);
                                    setShowSearchResults(false);
                                }}
                            >
                                {t('Cancel', 'Anuleaza')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Edit Address Modal */}
            {editingAddress && addressForm && (
                <Modal
                    isOpen={true}
                    onClose={() => {
                        setEditingAddress(null);
                        setAddressForm(null);
                        setStates([]);
                        setCities([]);
                    }}
                    title={t(`Edit ${editingAddress === 'shipping' ? 'Shipping' : 'Billing'} Address`, `Editeaza Adresa de ${editingAddress === 'shipping' ? 'Livrare' : 'Facturare'}`)}
                >
                    <div className={styles.addressForm}>
                        {/* Name fields - 2 columns */}
                        <div className={styles.formRowTwoCol}>
                            <div className={styles.formRow}>
                                <label>{t('First Name', 'Prenume')} *</label>
                                <Input
                                    value={addressForm.first_name}
                                    onChange={(e) => setAddressForm({ ...addressForm, first_name: e.target.value })}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>{t('Last Name', 'Nume')} *</label>
                                <Input
                                    value={addressForm.last_name}
                                    onChange={(e) => setAddressForm({ ...addressForm, last_name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Company */}
                        {(editingAddress === 'billing' || addressForm.company_name) && (
                            <div className={styles.formRow}>
                                <label>{t('Company Name', 'Nume Companie')}</label>
                                <Input
                                    value={addressForm.company_name}
                                    onChange={(e) => setAddressForm({ ...addressForm, company_name: e.target.value })}
                                    disabled={order.customer?.is_b2c === true}
                                />
                            </div>
                        )}

                        {/* Fiscal info for billing - 2 columns */}
                        {editingAddress === 'billing' && (
                            <div className={styles.formRowTwoCol}>
                                <div className={styles.formRow}>
                                    <label>{t('Fiscal Code', 'CUI')}</label>
                                    <Input
                                        value={addressForm.fiscal_code}
                                        onChange={(e) => setAddressForm({ ...addressForm, fiscal_code: e.target.value })}
                                        disabled={order.customer?.is_b2c === true}
                                    />
                                </div>
                                <div className={styles.formRow}>
                                    <label>{t('Registration Number', 'Nr. Reg. Com.')}</label>
                                    <Input
                                        value={addressForm.reg_number}
                                        onChange={(e) => setAddressForm({ ...addressForm, reg_number: e.target.value })}
                                        disabled={order.customer?.is_b2c === true}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Contact - 2 columns */}
                        <div className={styles.formRowTwoCol}>
                            <div className={styles.formRow}>
                                <label>{t('Phone', 'Telefon')} *</label>
                                <Input
                                    value={addressForm.phone}
                                    onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>{t('Email', 'Email')}</label>
                                <Input
                                    type="email"
                                    value={addressForm.email}
                                    onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Address */}
                        <div className={styles.formRow}>
                            <label>{t('Address Line 1', 'Adresa Linia 1')} *</label>
                            <Input
                                value={addressForm.address_line_1}
                                onChange={(e) => setAddressForm({ ...addressForm, address_line_1: e.target.value })}
                            />
                        </div>
                        <div className={styles.formRow}>
                            <label>{t('Address Line 2', 'Adresa Linia 2')}</label>
                            <Input
                                value={addressForm.address_line_2}
                                onChange={(e) => setAddressForm({ ...addressForm, address_line_2: e.target.value })}
                            />
                        </div>

                        {/* Location - 2 columns */}
                        <div className={styles.formRowTwoCol}>
                            <div className={styles.formRow}>
                                <label>{t('County', 'Judet')} *</label>
                                <select
                                    value={addressForm.state_id}
                                    onChange={async (e) => {
                                        const stateId = e.target.value ? Number(e.target.value) : '';
                                        const selectedState = states.find((s) => s.id === (typeof stateId === 'number' ? stateId : 0));
                                        setAddressForm({
                                            ...addressForm,
                                            state_id: typeof stateId === 'number' ? stateId.toString() : stateId,
                                            county_name: selectedState?.name || '',
                                            county_code: selectedState?.code || '',
                                            city_id: '',
                                            city: '',
                                        });

                                        // Load cities for selected state
                                        if (stateId) {
                                            setLoadingCities(true);
                                            try {
                                                const citiesResponse = await fetch(`/settings/cities/${stateId}`);
                                                if (citiesResponse.ok) {
                                                    const citiesData = await citiesResponse.json();
                                                    setCities(citiesData);
                                                }
                                            } catch (err) {
                                                console.error('Error fetching cities:', err);
                                            } finally {
                                                setLoadingCities(false);
                                            }
                                        } else {
                                            setCities([]);
                                        }
                                    }}
                                    disabled={loadingStates || !addressForm.country_id}
                                    className={styles.select}
                                >
                                    <option value="">{loadingStates ? t('Loading...', 'Se incarca...') : t('Select County', 'Selecteaza Judet')}</option>
                                    {states.map((state) => (
                                        <option key={state.id} value={state.id}>
                                            {state.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className={styles.formRow}>
                                <label>{t('City', 'Oras')} *</label>
                                <select
                                    value={addressForm.city_id}
                                    onChange={(e) => {
                                        const cityId = e.target.value ? Number(e.target.value) : '';
                                        const selectedCity = cities.find((c) => c.id === (typeof cityId === 'number' ? cityId : 0));
                                        setAddressForm({
                                            ...addressForm,
                                            city_id: typeof cityId === 'number' ? cityId.toString() : cityId,
                                            city: selectedCity?.name || '',
                                        });
                                    }}
                                    disabled={loadingCities || !addressForm.state_id}
                                    className={styles.select}
                                >
                                    <option value="">{loadingCities ? t('Loading...', 'Se incarca...') : t('Select City', 'Selecteaza Oras')}</option>
                                    {cities.map((city) => (
                                        <option key={city.id} value={city.id}>
                                            {city.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* ZIP and Country - 2 columns */}
                        <div className={styles.formRowTwoCol}>
                            <div className={styles.formRow}>
                                <label>{t('ZIP Code', 'Cod Postal')} *</label>
                                <Input
                                    value={addressForm.zip_code}
                                    onChange={(e) => setAddressForm({ ...addressForm, zip_code: e.target.value })}
                                />
                            </div>
                            <div className={styles.formRow}>
                                <label>{t('Country', 'Tara')} *</label>
                                <select
                                    value={addressForm.country_id}
                                    onChange={async (e) => {
                                        const countryId = parseInt(e.target.value);
                                        setAddressForm({
                                            ...addressForm,
                                            country_id: countryId,
                                            state_id: '',
                                            city_id: '',
                                            city: '',
                                            county_name: '',
                                            county_code: '',
                                        });
                                        setStates([]);
                                        setCities([]);

                                        // Load states for selected country
                                        if (countryId) {
                                            setLoadingStates(true);
                                            try {
                                                const statesResponse = await fetch(`/settings/states/${countryId}`);
                                                if (statesResponse.ok) {
                                                    const statesData = await statesResponse.json();
                                                    setStates(statesData);
                                                }
                                            } catch (err) {
                                                console.error('Error fetching states:', err);
                                            } finally {
                                                setLoadingStates(false);
                                            }
                                        }
                                    }}
                                    className={styles.select}
                                >
                                    {countries.map((country) => (
                                        <option key={country.id} value={country.id}>
                                            {country.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className={styles.formActions}>
                            <Button
                                variant="primary"
                                onClick={() => handleSaveAddress(editingAddress)}
                                disabled={isSaving}
                                className={styles.blueButton}
                            >
                                {t('Save', 'Salveaza')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => {
                                    setEditingAddress(null);
                                    setAddressForm(null);
                                }}
                            >
                                {t('Cancel', 'Anuleaza')}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}

export default function OrderEdit({ order, products, countries, orderStatuses }: OrderEditPageProps) {
    return (
        <AdminLayout activeSidebarItem="orders">
            <OrderEditContent order={order} products={products} countries={countries} orderStatuses={orderStatuses} />
        </AdminLayout>
    );
}
