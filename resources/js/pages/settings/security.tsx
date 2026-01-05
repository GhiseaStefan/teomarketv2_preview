import { useState } from 'react';
import { router } from '@inertiajs/react';
import { useTranslations } from '../../utils/translations';
import Layout from '../../components/layout/Layout';
import SettingsLayout from '../../components/settings/SettingsLayout';
import { SettingsModalProvider } from '../../contexts/SettingsModalContext';
import { Button } from '../../components/ui/Button';
import { Shield, Lock, Smartphone, Eye, EyeOff } from 'lucide-react';
import styles from './security.module.css';

function SecurityContent() {
    const { t } = useTranslations();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

    const handlePasswordUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        router.put('/settings/password', {
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: confirmPassword,
        }, {
            onSuccess: () => {
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            },
        });
    };

    return (
        <Layout activeSidebarItem="me">
            <SettingsLayout>
                <div className={styles.securityContainer}>
                    <div className={styles.securityCard}>
                        <h2 className={styles.securityTitle}>{t('Security Settings')}</h2>

                        {/* Change Password Section */}
                        <div className={styles.securitySection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionIcon}>
                                    <Lock size={24} />
                                </div>
                                <div className={styles.sectionTitleWrapper}>
                                    <h3 className={styles.sectionTitle}>{t('Change Password')}</h3>
                                    <p className={styles.sectionDescription}>
                                        {t('Update your password to keep your account secure')}
                                    </p>
                                </div>
                            </div>

                            <form onSubmit={handlePasswordUpdate} className={styles.passwordForm}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="current_password" className={styles.formLabel}>
                                        {t('Current Password')}
                                    </label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            id="current_password"
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className={styles.formInput}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                            className={styles.passwordToggle}
                                        >
                                            {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="new_password" className={styles.formLabel}>
                                        {t('New Password')}
                                    </label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            id="new_password"
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className={styles.formInput}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            className={styles.passwordToggle}
                                        >
                                            {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="confirm_password" className={styles.formLabel}>
                                        {t('Confirm New Password')}
                                    </label>
                                    <div className={styles.passwordInputWrapper}>
                                        <input
                                            id="confirm_password"
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className={styles.formInput}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className={styles.passwordToggle}
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className={styles.formActions}>
                                    <Button type="submit" variant="primary" size="lg">
                                        {t('Update Password')}
                                    </Button>
                                </div>
                            </form>
                        </div>

                        {/* Two-Factor Authentication Section */}
                        <div className={styles.securitySection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.sectionIcon}>
                                    <Smartphone size={24} />
                                </div>
                                <div className={styles.sectionTitleWrapper}>
                                    <h3 className={styles.sectionTitle}>{t('Two-Factor Authentication')}</h3>
                                    <p className={styles.sectionDescription}>
                                        {t('Add an extra layer of security to your account')}
                                    </p>
                                </div>
                            </div>

                            <div className={styles.twoFactorActions}>
                                <Button
                                    variant="secondary"
                                    size="md"
                                    onClick={() => router.visit('/settings/two-factor')}
                                >
                                    {t('Manage Two-Factor Authentication')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </SettingsLayout>
        </Layout>
    );
}

export default function Security() {
    return (
        <SettingsModalProvider>
            <SecurityContent />
        </SettingsModalProvider>
    );
}
