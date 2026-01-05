import { useEffect, useState } from 'react';
import styles from './TeomarketAnimation.module.css';

export const TeomarketAnimation = () => {
    const [isVisible, setIsVisible] = useState(true);
    const [animationComplete, setAnimationComplete] = useState(false);

    useEffect(() => {
        // Hide animation after it completes
        const timer = setTimeout(() => {
            setAnimationComplete(true);
            setTimeout(() => {
                setIsVisible(false);
            }, 150); // Fade out delay
        }, 1000); // Total animation duration

        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) {
        return null;
    }

    const letters = ['T', 'e', 'o', 'm', 'a', 'r', 'k', 'e', 't'];

    return (
        <div className={`${styles.container} ${animationComplete ? styles.fadeOut : ''}`}>
            <div className={styles.contentWrapper}>
                <img 
                    src="/logo.png" 
                    alt="teomarket" 
                    className={styles.logo}
                />
                <div className={styles.wordContainer}>
                    {letters.map((letter, index) => (
                        <span
                            key={`${letter}-${index}`}
                            className={styles.letter}
                            style={{
                                animationDelay: `${index * 0.02}s`,
                            }}
                        >
                            {letter}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
};

