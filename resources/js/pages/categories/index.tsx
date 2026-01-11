import React from 'react';
import { router } from '@inertiajs/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { Grid3x3, ChevronRight } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import { useTranslations } from '../../utils/translations';
import styles from './index.module.css';

interface Category {
    id: number;
    name: string;
    slug: string;
    image: string | null;
}

interface CategoriesPageProps {
    categories: Category[];
}

export default function CategoriesIndex({ categories }: CategoriesPageProps) {
    const { t } = useTranslations();

    const handleCategoryClick = (slug: string) => {
        router.get(`/categories/${slug}`);
    };

    // Render sidebar item for desktop
    const renderSidebarItem = (category: Category) => {
        return (
            <button
                key={category.id}
                className={styles.sidebarItem}
                onClick={() => handleCategoryClick(category.slug)}
            >
                <span className={styles.sidebarItemName}>{category.name}</span>
            </button>
        );
    };

    // Render carousel item for mobile
    const renderCarouselItem = (category: Category) => {
        return (
            <div
                className={styles.carouselSlide}
                onClick={() => handleCategoryClick(category.slug)}
            >
                <div className={styles.carouselImageWrapper}>
                    {category.image ? (
                        <img
                            src={category.image}
                            alt={category.name}
                            className={styles.carouselImage}
                        />
                    ) : (
                        <div className={styles.carouselImagePlaceholder}>
                            <Grid3x3 size={24} />
                        </div>
                    )}
                </div>
                <span className={styles.carouselLabel}>{category.name}</span>
            </div>
        );
    };

    return (
        <Layout activeSidebarItem="categories">
            <div className={styles.container}>
                {/* Breadcrumb */}
                <nav className={styles.breadcrumb}>
                    <span className={styles.breadcrumbCurrent}>{t('Categories')}</span>
                </nav>

                {/* Mobile Carousel - Categories */}
                {categories.length > 0 && (
                    <div className={styles.mobileCarousel}>
                        <Swiper
                            modules={[Navigation, Pagination]}
                            spaceBetween={8}
                            slidesPerView={3}
                            slidesPerGroup={1}
                            navigation={false}
                            pagination={false}
                            className={styles.swiperContainer}
                            breakpoints={{
                                320: {
                                    slidesPerView: 3,
                                    spaceBetween: 8,
                                },
                                375: {
                                    slidesPerView: 3.5,
                                    spaceBetween: 10,
                                },
                                480: {
                                    slidesPerView: 4,
                                    spaceBetween: 12,
                                },
                                640: {
                                    slidesPerView: 5,
                                    spaceBetween: 14,
                                },
                                768: {
                                    slidesPerView: 6,
                                    spaceBetween: 16,
                                },
                            }}
                            initialSlide={0}
                        >
                            {categories.map((category) => (
                                <SwiperSlide key={category.id} className={styles.swiperSlide}>
                                    {renderCarouselItem(category)}
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                <div className={styles.contentWrapper}>
                    {/* Sidebar - Categories (Desktop) */}
                    {categories.length > 0 && (
                        <aside className={styles.sidebar}>
                            <nav className={styles.sidebarNav}>
                                {categories.map((category) => renderSidebarItem(category))}
                            </nav>
                        </aside>
                    )}

                    {/* Main Content */}
                    <main className={styles.mainContent}>
                        {/* Header Section */}
                        <div className={styles.headerSection}>
                            <h1 className={styles.categoryTitle}>{t('Categories')}</h1>
                        </div>

                        {/* Categories Grid */}
                        {categories.length === 0 ? (
                            <div className={styles.emptyState}>
                                <Grid3x3 size={48} className={styles.emptyIcon} />
                                <p>{t('No categories available')}</p>
                            </div>
                        ) : (
                            <div className={styles.categoriesGrid}>
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className={styles.categoryCard}
                                        onClick={() => handleCategoryClick(category.slug)}
                                    >
                                        <div className={styles.categoryImageWrapper}>
                                            {category.image ? (
                                                <img
                                                    src={category.image}
                                                    alt={category.name}
                                                    className={styles.categoryImage}
                                                />
                                            ) : (
                                                <div className={styles.categoryImagePlaceholder}>
                                                    <Grid3x3 size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className={styles.categoryName}>{category.name}</h3>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </Layout>
    );
}