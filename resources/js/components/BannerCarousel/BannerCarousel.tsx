import { useRef } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';
import styles from './BannerCarousel.module.css';

interface BannerCarouselProps {
    className?: string;
}

export const BannerCarousel = ({ className }: BannerCarouselProps) => {
    const swiperRef = useRef<SwiperType | null>(null);
    
    // Unsplash banner images - using direct image URLs with higher resolution for Retina displays
    // Using w=2400 for better quality on high-DPI displays (iPhone Retina)
    const banners = [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=90&w=2400&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'https://images.unsplash.com/photo-1534723452862-4c874018d66d?q=90&w=2400&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
        'https://images.unsplash.com/photo-1540200049848-d9813ea0e120?q=90&w=2400&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    ];

    const handlePrevious = () => {
        swiperRef.current?.slidePrev();
    };

    const handleNext = () => {
        swiperRef.current?.slideNext();
    };


    return (
        <div 
            className={`${styles.carousel} ${className || ''}`}
        >
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                spaceBetween={0}
                slidesPerView={1}
                loop={banners.length > 1}
                autoplay={{
                    delay: 5000,
                    disableOnInteraction: false,
                }}
                navigation={false}
                pagination={{
                    clickable: true,
                    bulletClass: styles.dot,
                    bulletActiveClass: styles.dotActive,
                }}
                onSwiper={(swiper) => {
                    swiperRef.current = swiper;
                }}
                className={styles.swiperContainer}
            >
                {banners.map((banner, index) => (
                    <SwiperSlide key={index} className={styles.swiperSlide}>
                        <div className={styles.carouselSlide}>
                            <img 
                                src={banner} 
                                alt={`Banner ${index + 1}`}
                                className={styles.carouselImage}
                                loading="eager"
                                decoding="async"
                                sizes="100vw"
                                draggable={false}
                            />
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
            
            {banners.length > 1 && (
                <>
                    <Button
                        variant="icon"
                        className={styles.carouselButton}
                        onClick={handlePrevious}
                        aria-label="Previous banner"
                    >
                        <ChevronLeft size={24} />
                    </Button>
                    <Button
                        variant="icon"
                        className={`${styles.carouselButton} ${styles.carouselButtonRight}`}
                        onClick={handleNext}
                        aria-label="Next banner"
                    >
                        <ChevronRight size={24} />
                    </Button>
                </>
            )}
        </div>
    );
};

