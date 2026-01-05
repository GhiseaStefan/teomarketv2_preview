import { usePage } from '@inertiajs/react';
import type { SharedData } from '../types';

/**
 * Hook to get translations from Laravel
 * Returns a function that can translate keys using Laravel's __() function equivalent
 */
export function useTranslations() {
    const { props } = usePage<SharedData>();
    const translations = (props.translations as Record<string, string> | undefined) || {};
    const locale = (props.locale as string | undefined) || 'ro';

    /**
     * Translate a key
     * @param key - The translation key
     * @param fallback - Optional fallback text if translation is not found
     * @returns The translated string
     */
    const t = (key: string, fallback?: string): string => {
        return translations[key] || fallback || key;
    };

    return { t, locale, translations };
}

/**
 * Simple translation function for use outside of React components
 * Note: This requires translations to be available in window or passed as parameter
 */
export function translate(key: string, translations: Record<string, string>, fallback?: string): string {
    return translations[key] || fallback || key;
}

