import { Head, router, usePage } from '@inertiajs/react';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { SettingsModalProvider } from '../../contexts/SettingsModalContext';
import { useTranslations } from '../../utils/translations';
import { Star, ThumbsUp } from 'lucide-react';
import type { SharedData } from '../../types';
import styles from './index.module.css';

interface Review {
    id: number;
    rating: number;
    comment: string | null;
    is_verified_purchase: boolean;
    useful_count: number;
    created_at: string;
    product: {
        id: number;
        name: string;
        slug: string;
        main_image_url: string | null;
    } | null;
}

interface ReviewsPageProps {
    reviews: Review[];
}

export default function ReviewsIndex({ reviews }: ReviewsPageProps) {
    const { t } = useTranslations();
    const page = usePage<SharedData>();

    const handleMarkUseful = async (reviewId: number) => {
        try {
            const response = await fetch(`/reviews/${reviewId}/useful`, {
                method: 'POST',
                headers: {
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                    'Accept': 'application/json',
                },
                credentials: 'same-origin',
            });
            if (response.ok) {
                router.reload();
            }
        } catch (error) {
            console.error('Error marking review as useful:', error);
        }
    };

    return (
        <Layout activeSidebarItem="me">
            <Head title={t('My Reviews')} />
            <SettingsModalProvider>
                <SettingsLayout>
                    <div className={styles.reviewsPage}>
                        <div className={styles.reviewsCard}>
                            <div className={styles.pageHeader}>
                                <h1 className={styles.pageTitle}>{t('My Reviews')}</h1>
                            </div>

                            {reviews.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>{t('You have not written any reviews yet')}</p>
                                    <a href="/products" className={styles.browseLink}>
                                        {t('Browse Products')}
                                    </a>
                                </div>
                            ) : (
                                <div className={styles.reviewsGrid}>
                                    {reviews.map((review) => (
                                        <div key={review.id} className={styles.reviewCard}>
                                            {review.product && (
                                                <div className={styles.productInfo}>
                                                    {review.product.main_image_url && (
                                                        <img
                                                            src={review.product.main_image_url}
                                                            alt={review.product.name}
                                                            className={styles.productImage}
                                                        />
                                                    )}
                                                    <div className={styles.productDetails}>
                                                        <h3
                                                            className={styles.productName}
                                                            onClick={() => router.get(`/products/${review.product!.id}`)}
                                                        >
                                                            {review.product.name}
                                                        </h3>
                                                    </div>
                                                </div>
                                            )}
                                            <div className={styles.reviewContent}>
                                                <div className={styles.reviewHeader}>
                                                    <div className={styles.reviewRating}>
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star
                                                                key={star}
                                                                size={18}
                                                                className={styles.star}
                                                                fill={star <= review.rating ? 'currentColor' : 'none'}
                                                            />
                                                        ))}
                                                    </div>
                                                    {review.is_verified_purchase && (
                                                        <span className={styles.verifiedBadge}>{t('Verified Purchase')}</span>
                                                    )}
                                                </div>
                                                {review.comment && (
                                                    <div className={styles.reviewComment}>{review.comment}</div>
                                                )}
                                                <div className={styles.reviewFooter}>
                                                    <span className={styles.reviewDate}>
                                                        {new Date(review.created_at).toLocaleDateString()}
                                                    </span>
                                                    <button
                                                        className={styles.usefulButton}
                                                        onClick={() => handleMarkUseful(review.id)}
                                                    >
                                                        <ThumbsUp size={14} />
                                                        {t('Useful')} ({review.useful_count})
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </SettingsLayout>
            </SettingsModalProvider>
        </Layout>
    );
}

