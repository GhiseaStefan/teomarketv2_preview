import { Link } from '@inertiajs/react';
import { Home, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTranslations } from '../../utils/translations';
import styles from './Error.module.css';

export default function ServiceUnavailable() {
    const { t } = useTranslations();

    return (
        <div className={styles.errorContainer}>
            <div className={styles.errorContent}>
                <div className={styles.errorCode}>503</div>
                <h1 className={styles.errorTitle}>{t('Service Unavailable')}</h1>
                <p className={styles.errorMessage}>
                    {t('The service is temporarily unavailable. We are performing maintenance. Please check back soon.')}
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

