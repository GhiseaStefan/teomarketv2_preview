import { router, usePage } from '@inertiajs/react';
import { useState, FormEvent, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { useTranslations } from '../../utils/translations';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useToast } from '../../contexts/ToastContext';
import { ArrowLeft, Search, Package } from 'lucide-react';
import type { SharedData } from '../../types';
import styles from './create.module.css';

interface CreateReturnPageProps {
    errors?: {
        [key: string]: string;
    };
    order?: OrderData;
}

interface OrderProduct {
    id: number;
    product_id: number;
    name: string;
    sku: string;
    quantity: number;
    image_url: string | null;
}

interface OrderData {
    id: number;
    order_number: string;
    order_date: string;
    payment_method_code?: string;
    is_ramburs?: boolean;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    products: OrderProduct[];
}

export default function CreateReturn({ order: orderFromProps }: CreateReturnPageProps) {
    const { t } = useTranslations();
    const { showToast } = useToast();
    const page = usePage<SharedData & CreateReturnPageProps>();
    const errors = page.props.errors || {};
    const user = page.props.auth?.user;
    const isAuthenticated = !!user;
    
    const [step, setStep] = useState<'search' | 'form'>('search');
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [orderData, setOrderData] = useState<OrderData | null>(null);
    
    const [searchData, setSearchData] = useState({
        order_number: '',
        email: '',
        phone: '',
    });
    
    const [formData, setFormData] = useState({
        order_id: '',
        order_product_id: '',
        product_name: '',
        product_sku: '',
        quantity: '',
        return_reason: '',
        return_reason_details: '',
        is_product_opened: '',
        iban: '',
    });

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSearchData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSearchOrder = async (e: FormEvent) => {
        e.preventDefault();
        
        // Pentru utilizatorii autentificați, nu mai este nevoie de email/phone
        if (!isAuthenticated && (!searchData.order_number || (!searchData.email && !searchData.phone))) {
            showToast(t('Please enter order number and email or phone'), 'error');
            return;
        }
        
        if (!searchData.order_number) {
            showToast(t('Please enter order number'), 'error');
            return;
        }
        
        setIsSearching(true);
        
        // Prepare data - only include email or phone if user is not authenticated and they have values
        const searchPayload: any = {
            order_number: searchData.order_number,
        };
        
        if (!isAuthenticated) {
            if (searchData.email && searchData.email.trim()) {
                searchPayload.email = searchData.email.trim();
            }
            
            if (searchData.phone && searchData.phone.trim()) {
                searchPayload.phone = searchData.phone.trim();
            }
        }
        
        router.post('/returns/search-order', searchPayload, {
            preserveScroll: true,
            onSuccess: () => {
                // Data will be in props after redirect, handled by useEffect
            },
            onError: (errors) => {
                const errorMessage = errors?.message || errors?.error || t('Error searching order');
                showToast(typeof errorMessage === 'string' ? errorMessage : errorMessage[0], 'error');
            },
            onFinish: () => {
                setIsSearching(false);
            },
        });
    };

    const handleProductSelect = (product: OrderProduct) => {
        setFormData(prev => ({
            ...prev,
            order_product_id: product.id.toString(),
            product_name: product.name,
            product_sku: product.sku,
            quantity: '1',
        }));
    };

    useEffect(() => {
        if (errors && Object.keys(errors).length > 0) {
            const firstError = Object.values(errors)[0];
            if (firstError) {
                showToast(typeof firstError === 'string' ? firstError : firstError[0], 'error');
            }
        }
    }, [errors, showToast]);

    // Handle order data from props (after search)
    useEffect(() => {
        if (orderFromProps) {
            setOrderData(orderFromProps);
            setFormData(prev => ({
                ...prev,
                order_id: orderFromProps.id.toString(),
            }));
            setStep('form');
            showToast(t('Order found successfully'), 'success');
        }
    }, [orderFromProps, showToast, t]);


    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        
        if (!formData.order_product_id) {
            showToast(t('Please select a product'), 'error');
            return;
        }
        
        setIsSubmitting(true);

        const submitData = {
            ...formData,
            ...(orderData ? {
                first_name: orderData.first_name,
                last_name: orderData.last_name,
                email: orderData.email,
                phone: orderData.phone,
                order_number: orderData.order_number,
                order_date: orderData.order_date,
            } : {}),
        };

        router.post('/returns', submitData, {
            onSuccess: () => {
                // Redirect happens automatically to confirmation page
            },
            onError: () => {
                setIsSubmitting(false);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    if (step === 'search') {
        return (
            <Layout>
                <div className={styles.container}>
                    <div className={styles.header}>
                        <Button
                            variant="text"
                            onClick={() => router.visit('/')}
                            className={styles.backButton}
                        >
                            <ArrowLeft size={20} />
                        </Button>
                        <h1 className={styles.title}>{t('Create Return')}</h1>
                    </div>

                    <div className={styles.searchSection}>
                        <h2 className={styles.searchTitle}>{t('Find Your Order')}</h2>
                        <p className={styles.searchDescription}>
                            {t('Enter your order number and email or phone to find your order')}
                        </p>
                        
                        <form onSubmit={handleSearchOrder} className={styles.searchForm}>
                            {/* Honeypot field - should be empty */}
                            <input
                                type="text"
                                name="website"
                                className={styles.honeypot}
                                tabIndex={-1}
                                autoComplete="off"
                                aria-hidden="true"
                            />
                            <div className={styles.searchFormGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="search_order_number" className={styles.label}>
                                        {t('Order Number')} *
                                    </label>
                                    <Input
                                        id="search_order_number"
                                        name="order_number"
                                        type="text"
                                        value={searchData.order_number}
                                        onChange={handleSearchChange}
                                        required
                                        placeholder={t('Enter order number')}
                                    />
                                </div>

                                {!isAuthenticated && (
                                    <>
                                        <div className={styles.formGroup}>
                                            <label htmlFor="search_email" className={styles.label}>
                                                {t('Email')}
                                            </label>
                                            <Input
                                                id="search_email"
                                                name="email"
                                                type="email"
                                                value={searchData.email}
                                                onChange={handleSearchChange}
                                                placeholder={t('Enter email')}
                                            />
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label htmlFor="search_phone" className={styles.label}>
                                                {t('Phone Number')}
                                            </label>
                                            <Input
                                                id="search_phone"
                                                name="phone"
                                                type="tel"
                                                value={searchData.phone}
                                                onChange={handleSearchChange}
                                                placeholder={t('Enter phone number')}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>

                            {!page.props.auth?.user && (
                                <div className={styles.searchFormNote}>
                                    <p>{t('Please enter either email or phone number')}</p>
                                </div>
                            )}

                            <div className={styles.searchFormActions}>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    disabled={isSearching}
                                >
                                    <Search size={20} />
                                    {isSearching ? t('Searching...') : t('Search Order')}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className={styles.container}>
                <div className={styles.header}>
                    <Button
                        variant="text"
                        onClick={() => setStep('search')}
                        className={styles.backButton}
                    >
                        <ArrowLeft size={20} />
                    </Button>
                    <h1 className={styles.title}>{t('Create Return')}</h1>
                </div>

                {orderData && (
                    <div className={styles.orderInfo}>
                        <p><strong>{t('Order Number')}:</strong> {orderData.order_number}</p>
                        <p><strong>{t('Order Date')}:</strong> {orderData.order_date}</p>
                        <p><strong>{t('Customer')}:</strong> {orderData.first_name} {orderData.last_name}</p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className={styles.form}>
                    {/* Honeypot field - should be empty */}
                    <input
                        type="text"
                        name="website"
                        className={styles.honeypot}
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                    />
                    {/* Selectare produs */}
                    {orderData && orderData.products.length > 0 && (
                        <section className={styles.section}>
                            <h2 className={styles.sectionTitle}>{t('Select Product to Return')}</h2>
                            <div className={styles.productsList}>
                                {orderData.products.map((product) => (
                                    <div
                                        key={product.id}
                                        className={`${styles.productCard} ${
                                            formData.order_product_id === product.id.toString() ? styles.productCardSelected : ''
                                        }`}
                                        onClick={() => handleProductSelect(product)}
                                    >
                                        {product.image_url && (
                                            <img
                                                src={product.image_url}
                                                alt={product.name}
                                                className={styles.productImage}
                                            />
                                        )}
                                        {!product.image_url && (
                                            <div className={styles.productImagePlaceholder}>
                                                <Package size={24} />
                                            </div>
                                        )}
                                        <div className={styles.productInfo}>
                                            <h3 className={styles.productName}>{product.name}</h3>
                                            <p className={styles.productSku}>{t('SKU')}: {product.sku}</p>
                                            <p className={styles.productQuantity}>
                                                {t('Quantity')}: {product.quantity}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Informații despre produs și motivul de returnare */}
                    {formData.order_product_id && (
                        <>
                            <section className={styles.section}>
                                <h2 className={styles.sectionTitle}>{t('Return Details')}</h2>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="quantity" className={styles.label}>
                                            {t('Quantity to Return')} *
                                        </label>
                                        <Input
                                            id="quantity"
                                            name="quantity"
                                            type="number"
                                            min="1"
                                            max={orderData?.products.find(p => p.id.toString() === formData.order_product_id)?.quantity || 1}
                                            value={formData.quantity}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label htmlFor="return_reason" className={styles.label}>
                                            {t('Return Reason')} *
                                        </label>
                                        <select
                                            id="return_reason"
                                            name="return_reason"
                                            value={formData.return_reason}
                                            onChange={handleInputChange}
                                            className={styles.select}
                                            required
                                        >
                                            <option value="">{t('Select a reason')}</option>
                                            <option value="other">{t('Other, please provide details')}</option>
                                            <option value="wrong_product">{t('I received the wrong product')}</option>
                                            <option value="defect">{t('Defect, please provide details')}</option>
                                            <option value="order_error">{t('Order error')}</option>
                                            <option value="sealed_return">{t('I want to return a sealed product')}</option>
                                        </select>
                                    </div>

                                    {(formData.return_reason === 'other' || formData.return_reason === 'defect') && (
                                        <div className={styles.formGroup}>
                                            <label htmlFor="return_reason_details" className={styles.label}>
                                                {t('Details')} *
                                            </label>
                                            <textarea
                                                id="return_reason_details"
                                                name="return_reason_details"
                                                value={formData.return_reason_details}
                                                onChange={handleInputChange}
                                                className={styles.textarea}
                                                rows={4}
                                                required
                                            />
                                        </div>
                                    )}

                                    <div className={styles.formGroup}>
                                        <label className={styles.label}>{t('Product is opened')}</label>
                                        <div className={styles.toggleWrapper}>
                                            <label className={styles.toggleSwitch}>
                                                <input
                                                    type="checkbox"
                                                    name="is_product_opened"
                                                    checked={formData.is_product_opened === 'yes'}
                                                    onChange={(e) => {
                                                        handleInputChange({
                                                            target: {
                                                                name: 'is_product_opened',
                                                                value: e.target.checked ? 'yes' : ''
                                                            }
                                                        } as React.ChangeEvent<HTMLInputElement>);
                                                    }}
                                                />
                                                <span className={styles.toggleSlider}></span>
                                            </label>
                                            <span>{formData.is_product_opened === 'yes' ? t('Yes') : ''}</span>
                                        </div>
                                    </div>

                                    {orderData?.is_ramburs && (
                                        <div className={styles.formGroup}>
                                            <label htmlFor="iban" className={styles.label}>
                                                {t('IBAN')} *
                                            </label>
                                            <Input
                                                id="iban"
                                                name="iban"
                                                type="text"
                                                value={formData.iban}
                                                onChange={handleInputChange}
                                                required
                                                placeholder="RO49 AAAA 1B31 0075 9384 0000"
                                            />
                                        </div>
                                    )}
                                </div>
                            </section>
                        </>
                    )}

                    <div className={styles.formActions}>
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setStep('search')}
                        >
                            {t('Back')}
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            disabled={isSubmitting || !formData.order_product_id}
                        >
                            {isSubmitting ? t('Submitting...') : t('Submit Return')}
                        </Button>
                    </div>
                </form>
            </div>
        </Layout>
    );
}
