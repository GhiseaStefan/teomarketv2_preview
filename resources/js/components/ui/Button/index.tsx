import React from 'react';
import styles from './Button.module.css';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'icon' | 'text' | 'search' | 'searchInline';
    size?: 'sm' | 'md' | 'lg';
    active?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', active = false, className = '', children, ...props }, ref) => {
        const variantClass = styles[variant] || styles.primary;
        const sizeClass = styles[size] || styles.md;
        const activeClass = active && variant === 'text' ? styles.textActive : '';
        const combinedClassName = `${styles.button} ${variantClass} ${sizeClass} ${activeClass} ${className}`.trim();

        return (
            <button
                ref={ref}
                className={combinedClassName}
                {...props}
            >
                {children}
            </button>
        );
    }
);

Button.displayName = 'Button';

