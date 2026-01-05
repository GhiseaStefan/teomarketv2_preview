import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
    closeOnOverlayClick?: boolean;
    className?: string;
    bodyClassName?: string;
    hideHeader?: boolean;
}

export const Modal = ({ isOpen, onClose, title, children, closeOnOverlayClick = true, className, bodyClassName, hideHeader = false }: ModalProps) => {
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
        <div className={styles.modalOverlay} onClick={closeOnOverlayClick ? onClose : undefined}>
            <div className={`${styles.modalContent} ${className || ''}`} onClick={(e) => e.stopPropagation()}>
                {!hideHeader && (
                    <div className={styles.modalHeader}>
                        <h2 className={styles.modalTitle}>{title}</h2>
                        <button className={styles.modalCloseButton} onClick={onClose} aria-label="Close">
                            <X size={20} />
                        </button>
                    </div>
                )}
                <div className={`${styles.modalBody} ${bodyClassName || ''}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};
