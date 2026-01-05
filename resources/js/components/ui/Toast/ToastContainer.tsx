import { Toast } from './Toast';
import styles from './ToastContainer.module.css';

export interface ToastItem {
    id: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface ToastContainerProps {
    toasts: ToastItem[];
    onRemove: (id: string) => void;
}

export const ToastContainer = ({ toasts, onRemove }: ToastContainerProps) => {
    if (toasts.length === 0) {
        return null;
    }

    return (
        <div className={styles.container}>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    duration={toast.duration}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </div>
    );
};

