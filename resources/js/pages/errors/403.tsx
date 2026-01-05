import { Link } from '@inertiajs/react';
import { Home, Lock, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTranslations } from '../../utils/translations';
import styles from './Error.module.css';

export default function Forbidden() {
    const { t } = useTranslations();

    return (
        <div className={styles.errorContainer}>
            <div className={styles.errorContent}>
                <div className={styles.errorCode}>403</div>
                <h1 className={styles.errorTitle}>{t('Access Forbidden')}</h1>
                <p className={styles.errorMessage}>
                    {t('You do not have permission to access this page.')}
                </p>
                <div className={styles.errorActions}>
                    <Button
                        variant="primary"
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
                    <Link href="/login">
                        <Button variant="secondary" className={styles.errorButton}>
                            <Lock size={18} />
                            {t('Login')}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

