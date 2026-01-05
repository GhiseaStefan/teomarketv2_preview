import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface Currency {
    id: number;
    code: string;
    symbol_left: string | null;
    symbol_right: string | null;
    value: number;
}

export interface CustomerGroup {
    id: number;
    name: string;
    code: string;
}

export interface CartSummary {
    total_items: number;
    total_excl_vat: number;
    total_incl_vat: number;
    vat_rate: number;
    vat_included: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    currencies?: Currency[];
    currentCurrency?: Currency;
    locale?: string;
    translations?: Record<string, string>;
    customerGroup?: CustomerGroup | null;
    b2bStandardGroup?: CustomerGroup | null;
    cartSummary?: CartSummary;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}
