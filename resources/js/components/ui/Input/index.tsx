import React from 'react';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    variant?: 'default' | 'search';
    className?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ variant = 'default', className = '', ...props }, ref) => {
        const variantClass = variant === 'search' ? styles.search : styles.default;
        const combinedClassName = `${styles.input} ${variantClass} ${className}`.trim();

        return (
            <input
                ref={ref}
                className={combinedClassName}
                {...props}
            />
        );
    }
);

Input.displayName = 'Input';

