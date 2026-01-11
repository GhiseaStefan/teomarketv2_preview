import { useTranslations } from '../../utils/translations';
import styles from './Footer.module.css';

export const Footer = () => {
    const { t } = useTranslations();
    const currentYear = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <div className={styles.footerContainer}>
                {/* Main Footer Content */}
                <div className={styles.footerContent}>
                    {/* Company Information Section */}
                    <div className={styles.footerSection}>
                        <h3 className={styles.footerTitle}>{t('About Us')}</h3>
                        <div className={styles.footerInfo}>
                            <p className={styles.companyName}>{t('Company Name')}</p>
                            <p className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('CUI')}</span>
                                <span className={styles.infoValue}>RO12345678</span>
                            </p>
                            <p className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('Registration Number')}</span>
                                <span className={styles.infoValue}>J40/1234/2024</span>
                            </p>
                            <p className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('Address')}</span>
                                <span className={styles.infoValue}>
                                    Strada Exemplu, Nr. 123<br />
                                    Bucuresti, Romania
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Contact Section */}
                    <div className={styles.footerSection}>
                        <h3 className={styles.footerTitle}>{t('Contact')}</h3>
                        <div className={styles.footerInfo}>
                            <p className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('Email')}</span>
                                <a href="mailto:contact@example.com" className={styles.infoLink}>
                                    contact@example.com
                                </a>
                            </p>
                            <p className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('Phone')}</span>
                                <a href="tel:+40123456789" className={styles.infoLink}>
                                    +40 123 456 789
                                </a>
                            </p>
                            <p className={styles.infoItem}>
                                <span className={styles.infoLabel}>{t('Schedule')}</span>
                                <span className={styles.infoValue}>
                                    {t('Monday - Friday')} 09:00 - 18:00<br />
                                    {t('Saturday')}: 10:00 - 14:00
                                </span>
                            </p>
                        </div>
                    </div>

                    {/* Legal Links Section */}
                    <div className={styles.footerSection}>
                        <h3 className={styles.footerTitle}>{t('Legal Information')}</h3>
                        <nav className={styles.footerNav}>
                            <a href="/politica-confidentialitate" className={styles.footerLink}>
                                {t('Privacy Policy')}
                            </a>
                            <a href="/politica-cookies" className={styles.footerLink}>
                                {t('Cookie Policy')}
                            </a>
                            <a href="/termeni-si-conditii" className={styles.footerLink}>
                                {t('Terms and Conditions')}
                            </a>
                            <a href="/politica-retur" className={styles.footerLink}>
                                {t('Return Policy')}
                            </a>
                            <a href="/gdpr" className={styles.footerLink}>
                                {t('GDPR - Your Rights')}
                            </a>
                            <a href="/anpc" className={styles.footerLink}>
                                {t('ANPC Information')}
                            </a>
                        </nav>
                    </div>

                    {/* Quick Links Section */}
                    <div className={styles.footerSection}>
                        <h3 className={styles.footerTitle}>{t('Useful Links')}</h3>
                        <nav className={styles.footerNav}>
                            <a href="/despre-noi" className={styles.footerLink}>
                                {t('About Us')}
                            </a>
                            <a href="/livrare" className={styles.footerLink}>
                                {t('Delivery')}
                            </a>
                            <a href="/plata" className={styles.footerLink}>
                                {t('Payment Methods')}
                            </a>
                            <a href="/intrebari-frecvente" className={styles.footerLink}>
                                {t('Frequently Asked Questions')}
                            </a>
                            <a href="/returns/create" className={styles.footerLink}>
                                {t('Create Return')}
                            </a>
                            <a href="/contact" className={styles.footerLink}>
                                {t('Contact')}
                            </a>
                        </nav>
                    </div>
                </div>

                {/* Footer Bottom */}
                <div className={styles.footerBottom}>
                    <div className={styles.footerBottomContent}>
                        <p className={styles.copyright}>
                            © {currentYear} {t('Company Name')}. {t('All rights reserved')}.
                        </p>
                        <div className={styles.footerBottomLinks}>
                            <a href="/politica-confidentialitate" className={styles.footerBottomLink}>
                                {t('Privacy')}
                            </a>
                            <span className={styles.separator}>|</span>
                            <a href="/termeni-si-conditii" className={styles.footerBottomLink}>
                                {t('Terms')}
                            </a>
                            <span className={styles.separator}>|</span>
                            <a href="/politica-cookies" className={styles.footerBottomLink}>
                                {t('Cookies')}
                            </a>
                        </div>
                    </div>
                    <div className={styles.footerDisclaimer}>
                        <p className={styles.disclaimerText}>
                            {t('Consumer Rights Disclaimer')}
                        </p>
                        <p className={styles.disclaimerText}>
                            {t('ANPC Disclaimer')} -{' '}
                            <a 
                                href="https://anpc.ro" 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className={styles.externalLink}
                            >
                                www.anpc.ro
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

