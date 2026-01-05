import React from 'react';
import { useTranslations } from '../../utils/translations';
import styles from './CheckoutProgress.module.css';

export interface CheckoutProgressProps {
    currentStep: 1 | 2 | 3;
}

export const CheckoutProgress = ({ currentStep }: CheckoutProgressProps) => {
    const { t } = useTranslations();

    const steps = [
        { number: 1, label: t('My Cart'), key: 'my_cart' },
        { number: 2, label: t('Order Details'), key: 'order_details' },
        { number: 3, label: t('Order Placed'), key: 'order_placed' },
    ];

    // Calculate progress
    // When currentStep is 3 (Order Placed), progress should be 100% (complete)
    // For other steps, progress stops at the middle of current step
    const progressPercentage = currentStep === 3 
        ? 100 
        : ((currentStep - 1) / steps.length) * 100 + (100 / steps.length / 2);

    return (
        <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
                <div
                    className={styles.progressBarFill}
                    style={{ width: `${progressPercentage}%` }}
                />
            </div>
            <div className={styles.stepsContainer}>
                {steps.map((step, index) => {
                    const isCompleted = step.number < currentStep;
                    const isCurrent = step.number === currentStep;
                    const isFirst = index === 0;
                    const isLast = index === steps.length - 1;

                    return (
                        <div 
                            key={step.number} 
                            className={`${styles.step} ${isFirst ? styles.firstStep : ''} ${isLast ? styles.lastStep : ''}`}
                        >
                            <div
                                className={`${styles.stepLabel} ${isCurrent ? styles.current : ''} ${isCompleted ? styles.completed : ''}`}
                            >
                                {step.label}
                            </div>
                            {isCurrent && <div className={styles.currentIndicator} />}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

