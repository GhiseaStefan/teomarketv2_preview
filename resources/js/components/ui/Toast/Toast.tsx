import { useEffect } from 'react';
import styles from './Toast.module.css';

interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    onClose: () => void;
    duration?: number;
}

export const Toast = ({ message, type = 'info', onClose, duration = 5000 }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    return (
        <div className={`${styles.toast} ${styles[type]}`}>
            <span className={styles.message}>{message}</span>
            <button
                type="button"
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close"
            >
                ×
            </button>
        </div>
    );
};

