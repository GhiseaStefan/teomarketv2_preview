import React from 'react';
import { Head, router } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { useTranslations } from '../../utils/translations';
import styles from './confirmation.module.css';

interface ReturnData {
    id: number;
    return_number: string;
    order_number: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    created_at: string;
}

interface ConfirmationPageProps {
    return: ReturnData;
}

export default function ReturnConfirmation({ return: returnData }: ConfirmationPageProps) {
    const { t } = useTranslations();

    if (!returnData) {
        return (
            <Layout>
                <Head title={t('Return Confirmation')} />
                <div className={styles.container}>
                    <div className={styles.content}>
                        <div className={styles.errorMessage}>
                            <p>{t('Return not found')}</p>
                            <Button variant="primary" onClick={() => router.get('/returns/create')}>
                                {t('Back to Return Form')}
                            </Button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <Head title={t('Return Submitted')} />
            <div className={styles.container}>
                <div className={styles.content}>
                    <div className={styles.successCard}>
                        <div className={styles.successIcon}>
                            <svg
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                <path
                                    d="M8 12l2 2 4-4"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                />
                            </svg>
                        </div>
                        <h1 className={styles.title}>{t('Thank You!')}</h1>
                        <p className={styles.message}>{t('Your return request has been submitted successfully')}</p>
                        <p className={styles.description}>
                            {t('We have received your return request and will process it as soon as possible. You will receive a confirmation email shortly.')}
                        </p>

                        {/* Return Details */}
                        <div className={styles.detailsCard}>
                            <h2 className={styles.detailsTitle}>{t('Return Details')}</h2>
                            <div className={styles.detailsList}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('Return Number')}:</span>
                                    <span className={styles.detailValue}>{returnData.return_number}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('Order Number')}:</span>
                                    <span className={styles.detailValue}>{returnData.order_number}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('Product')}:</span>
                                    <span className={styles.detailValue}>{returnData.product_name}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('SKU')}:</span>
                                    <span className={styles.detailValue}>{returnData.product_sku}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('Quantity')}:</span>
                                    <span className={styles.detailValue}>{returnData.quantity}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>{t('Submitted At')}:</span>
                                    <span className={styles.detailValue}>{new Date(returnData.created_at).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className={styles.actions}>
                            <Button
                                variant="primary"
                                onClick={() => router.get('/')}
                            >
                                {t('Go to Homepage')}
                            </Button>
                            <Button
                                variant="secondary"
                                onClick={() => router.get('/returns/create')}
                            >
                                {t('Submit Another Return')}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
