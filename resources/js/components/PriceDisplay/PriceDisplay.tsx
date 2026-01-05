import React from 'react';
import { formatPriceWithSuperscript } from '../../utils/priceFormatter';
import styles from './PriceDisplay.module.css';

interface PriceDisplayProps {
    price: string;
    className?: string;
}

/**
 * Component to display a price with superscript decimal formatting.
 * This component wraps the formatted price in a span with optional custom className.
 */
export const PriceDisplay = ({ price, className }: PriceDisplayProps) => {
    return (
        <span className={className}>
            {formatPriceWithSuperscript(price)}
        </span>
    );
};

