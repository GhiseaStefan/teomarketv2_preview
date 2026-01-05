import { Link } from '@inertiajs/react';
import { Home, Search, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useTranslations } from '../../utils/translations';
import styles from './Error.module.css';

export default function NotFound() {
    const { t } = useTranslations();

    return (
        <div className={styles.errorContainer}>
            <div className={styles.errorContent}>
                <div className={styles.errorCode}>404</div>
                <h1 className={styles.errorTitle}>{t('Page Not Found')}</h1>
                <p className={styles.errorMessage}>
                    {t('The page you are looking for does not exist or has been moved.')}
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
                        <Button variant="primary" className={styles.errorButton}>
                            <Home size={18} />
                            {t('Go Home')}
                        </Button>
                    </Link>
                    <Link href="/products">
                        <Button variant="secondary" className={styles.errorButton}>
                            <Search size={18} />
                            {t('Browse Products')}
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
}

