import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './SlideOver.module.css';

interface SlideOverProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    closeOnOverlayClick?: boolean;
    className?: string;
    bodyClassName?: string;
    hideHeader?: boolean;
}

export const SlideOver = ({
    isOpen,
    onClose,
    title,
    children,
    closeOnOverlayClick = true,
    className,
    bodyClassName,
    hideHeader = false,
}: SlideOverProps) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={closeOnOverlayClick ? onClose : undefined}>
            <div className={`${styles.panel} ${className || ''}`} onClick={(e) => e.stopPropagation()}>
                {!hideHeader && (
                    <div className={styles.header}>
                        <div className={styles.title}>{title || ''}</div>
                        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div className={`${styles.body} ${bodyClassName || ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

