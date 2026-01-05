import { Link } from '@inertiajs/react';
import { Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTranslations } from '../../utils/translations';
import styles from './Error.module.css';

export default function ServerError() {
    const { t } = useTranslations();

    return (
        <div className={styles.errorContainer}>
            <div className={styles.errorContent}>
                <div className={styles.errorCode}>500</div>
                <h1 className={styles.errorTitle}>{t('Server Error')}</h1>
                <p className={styles.errorMessage}>
                    {t('Something went wrong on our end. We are working to fix the issue. Please try again later.')}
                </p>
                <div className={styles.errorActions}>
                    <Button
                        variant="primary"
                        onClick={() => window.location.reload()}
                        className={styles.errorButton}
                    >
                        <RefreshCw size={18} />
                        {t('Refresh Page')}
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => window.history.back()}
                        className={styles.errorButton}
                    >
                        <ArrowLeft size={18} />
                        {t('Go Back')}
                    </Button>
                    <Link href="/">
                        <Button variant="secondary" className={styles.errorButton}>
                            <Home size={18} />
                            {t('Go Home')}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

