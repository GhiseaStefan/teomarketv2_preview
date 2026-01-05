import React from 'react';
import { router } from '@inertiajs/react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import Layout from '../../components/layout/Layout';
import { useTranslations } from '../../utils/translations';
import { ChevronRight, Grid3x3 } from 'lucide-react';
import styles from './Show.module.css';

interface SubCategory {
    id: number;
    name: string;
    slug: string;
    image: string | null;
    isActive?: boolean;
}

interface BreadcrumbItem {
    name: string;
    slug: string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    subCategories: SubCategory[];
    breadcrumb?: BreadcrumbItem[];
    parentSubCategories?: SubCategory[];
}

interface CategoryPageProps {
    category: Category;
}

export default function CategoryShow({ category }: CategoryPageProps) {
    const { t } = useTranslations();
    
    // Get siblings (parent's children) - same logic for desktop and mobile
    const allSiblings = category.parentSubCategories || [];
    const hasSiblings = allSiblings.length > 0;
    
    // Reorder siblings for mobile carousel: active category first
    const siblingsForCarousel = React.useMemo(() => {
        if (!hasSiblings) return [];
        const activeIndex = allSiblings.findIndex(
            sibling => sibling.isActive || sibling.id === category.id
        );
        if (activeIndex === -1) return allSiblings;
        return [
            allSiblings[activeIndex],
            ...allSiblings.slice(0, activeIndex),
            ...allSiblings.slice(activeIndex + 1)
        ];
    }, [allSiblings, category.id, hasSiblings]);
    
    // Use original order for sidebar (desktop)
    const siblings = allSiblings;

    const handleSiblingClick = (sibling: SubCategory) => {
        router.get(`/categories/${sibling.slug}`);
    };

    const handleSubCategoryClick = (subCategory: SubCategory) => {
        router.get(`/categories/${subCategory.slug}`);
    };

    // Render sibling item for sidebar (desktop)
    const renderSidebarItem = (sibling: SubCategory) => {
        const isActive = sibling.isActive || sibling.id === category.id;
        return (
            <button
                key={sibling.id}
                className={`${styles.sidebarItem} ${isActive ? styles.sidebarItemActive : ''}`}
                onClick={() => handleSiblingClick(sibling)}
            >
                <span className={styles.sidebarItemName}>{sibling.name}</span>
                {isActive && (
                    <div className={styles.sidebarItemIndicator} />
                )}
            </button>
        );
    };

    // Render sibling item for carousel (mobile)
    const renderCarouselItem = (sibling: SubCategory) => {
        const isActive = sibling.isActive || sibling.id === category.id;
        return (
            <div
                className={`${styles.carouselSlide} ${isActive ? styles.carouselSlideActive : ''}`}
                onClick={() => handleSiblingClick(sibling)}
            >
                <div className={styles.carouselImageWrapper}>
                    {sibling.image ? (
                        <img
                            src={sibling.image}
                            alt={sibling.name}
                            className={styles.carouselImage}
                        />
                    ) : (
                        <div className={styles.carouselImagePlaceholder}>
                            <Grid3x3 size={24} />
                        </div>
                    )}
                </div>
                <span className={styles.carouselLabel}>{sibling.name}</span>
            </div>
        );
    };

    return (
        <Layout>
            <div className={styles.container}>
                {/* Breadcrumb */}
                <nav className={styles.breadcrumb}>
                    <a href="/" onClick={(e) => { e.preventDefault(); router.get('/'); }}>
                        {t('Home')}
                    </a>
                    {category.breadcrumb?.map((item, index) => (
                        <React.Fragment key={item.slug}>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            {category.breadcrumb && index < category.breadcrumb.length - 1 ? (
                                <a 
                                    href={`/categories/${item.slug}`}
                                    onClick={(e) => { e.preventDefault(); router.get(`/categories/${item.slug}`); }}
                                >
                                    {item.name}
                                </a>
                            ) : (
                                <span className={styles.breadcrumbCurrent}>{item.name}</span>
                            )}
                        </React.Fragment>
                    ))}
                </nav>

                {/* Mobile Carousel - Siblings (shown above on mobile) */}
                {hasSiblings && (
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
                            {siblingsForCarousel.map((sibling) => (
                                <SwiperSlide key={sibling.id} className={styles.swiperSlide}>
                                    {renderCarouselItem(sibling)}
                                </SwiperSlide>
                            ))}
                        </Swiper>
                    </div>
                )}

                <div className={styles.contentWrapper}>
                    {/* Sidebar - Siblings (Desktop) */}
                    {hasSiblings && (
                        <aside className={styles.sidebar}>
                            <nav className={styles.sidebarNav}>
                                {siblings.map((sibling) => renderSidebarItem(sibling))}
                            </nav>
                        </aside>
                    )}

                    {/* Main Content */}
                    <main className={styles.mainContent}>
                        {/* Category Title */}
                        <div className={styles.headerSection}>
                            <h1 className={styles.categoryTitle}>{category.name}</h1>
                        </div>

                        {/* Subcategories Grid */}
                        {category.subCategories && category.subCategories.length > 0 ? (
                            <div className={styles.subCategoriesGrid}>
                                {category.subCategories.map((subCategory) => (
                                    <div
                                        key={subCategory.id}
                                        className={styles.subCategoryCard}
                                        onClick={() => handleSubCategoryClick(subCategory)}
                                    >
                                        <div className={styles.subCategoryImageWrapper}>
                                            {subCategory.image ? (
                                                <img
                                                    src={subCategory.image}
                                                    alt={subCategory.name}
                                                    className={styles.subCategoryImage}
                                                />
                                            ) : (
                                                <div className={styles.subCategoryImagePlaceholder}>
                                                    <Grid3x3 size={32} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className={styles.subCategoryName}>{subCategory.name}</h3>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>{t('No subcategories available')}</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </Layout>
    );
}
