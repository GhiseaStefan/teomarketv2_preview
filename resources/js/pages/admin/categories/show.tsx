import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, ExternalLink, Package, Trash2 } from 'lucide-react';
import { AdminLayout, MultiSelect } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { useEdit } from '../../../contexts/EditContext';
import { Input } from '../../../components/ui/Input';
import { formatPrice } from '../../../utils/formatPrice';
import styles from './show.module.css';
import categoriesTableStyles from '../categories.module.css';
import productsTableStyles from '../products.module.css';

interface ParentCategory {
    id: number;
    name: string;
    slug: string;
}

interface AvailableParent {
    id: number;
    name: string;
}

interface ChildCategory {
    id: number;
    name: string;
    slug: string;
    status: boolean;
    products_count: number;
}

interface Product {
    id: number;
    name: string;
    model: string | null;
    sku: string | null;
    brand_name: string;
    price_ron: string;
    stock_quantity: number;
    status: boolean;
    image_url: string | null;
    created_at: string | null;
    created_at_formatted: string | null;
}

interface BreadcrumbItem {
    id: number;
    name: string;
    slug: string;
}

interface Category {
    id: number;
    name: string;
    slug: string;
    status: boolean;
    image_url: string | null;
    parent_id: number | null;
    parent: ParentCategory | null;
    breadcrumb: BreadcrumbItem[];
    children: ChildCategory[];
    products: Product[];
    products_count: number;
    children_count: number;
    level: number;
    created_at: string | null;
    updated_at: string | null;
}

interface CategoryShowPageProps {
    category: Category;
    availableParents: AvailableParent[];
}

function AdminCategoryShowContent({ category, availableParents }: CategoryShowPageProps) {
    const { t } = useTranslations();
    const { setHasUnsavedChanges, setSaveHandler, setDiscardHandler } = useEdit();

    // Store initial data for comparison
    const initialFormData = useRef({
        name: category.name || '',
        slug: category.slug || '',
        status: category.status !== undefined ? category.status : true,
        parent_id: category.parent_id || null,
        image_url: category.image_url || '',
    });

    const [formData, setFormData] = useState(initialFormData.current);
    const [isSaving, setIsSaving] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSave = useCallback(async () => {
        if (isSaving) return;

        setIsSaving(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const currentFormData = formData;

            const updateData = {
                name: currentFormData.name,
                slug: currentFormData.slug,
                status: currentFormData.status,
                parent_id: currentFormData.parent_id,
                image_url: currentFormData.image_url || null,
            };

            const response = await fetch(`/admin/categories/${category.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify(updateData),
            });

            if (response.ok) {
                // Update initial data to reflect saved state
                initialFormData.current = { ...currentFormData };
                setHasUnsavedChanges(false);

                // Reload page to get updated data
                router.reload({ only: ['category', 'availableParents'] });
            } else {
                const errorData = await response.json();
                alert(errorData.message || t('Error saving category', 'Eroare la salvarea categoriei'));
            }
        } catch (error) {
            console.error('Error saving category:', error);
            alert(t('Error saving category', 'Eroare la salvarea categoriei'));
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, formData, category.id, setHasUnsavedChanges, t]);

    const handleDiscard = useCallback(() => {
        // Reset form data to initial values
        setFormData({ ...initialFormData.current });
        setHasUnsavedChanges(false);
    }, [setHasUnsavedChanges]);

    // Check if form has changes
    useEffect(() => {
        const hasChanges =
            formData.name !== initialFormData.current.name ||
            formData.slug !== initialFormData.current.slug ||
            formData.status !== initialFormData.current.status ||
            formData.parent_id !== initialFormData.current.parent_id ||
            formData.image_url !== initialFormData.current.image_url;

        setHasUnsavedChanges(hasChanges);
    }, [formData, setHasUnsavedChanges]);

    // Set up save and discard handlers
    useEffect(() => {
        setSaveHandler(() => handleSave);
        setDiscardHandler(() => handleDiscard);

        return () => {
            setSaveHandler(null);
            setDiscardHandler(null);
        };
    }, [handleSave, handleDiscard, setSaveHandler, setDiscardHandler]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSave();
    };

    const handleDelete = useCallback(async () => {
        if (isDeleting) return;

        const confirmMessage = t('Are you sure you want to delete this category?', 'Esti sigur ca vrei sa stergi aceasta categorie?');
        if (!confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            const response = await fetch(`/admin/categories/${category.id}`, {
                method: 'DELETE',
                headers: {
                    'X-CSRF-TOKEN': csrfToken,
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Redirect to categories list
                router.get('/admin/categories');
            } else {
                alert(data.message || t('Error deleting category', 'Eroare la stergerea categoriei'));
            }
        } catch (error) {
            console.error('Error deleting category:', error);
            alert(t('Error deleting category', 'Eroare la stergerea categoriei'));
        } finally {
            setIsDeleting(false);
        }
    }, [isDeleting, category.id, t]);

    const getStatusBadgeStyle = (isActive: boolean) => {
        if (isActive) {
            return {
                backgroundColor: '#d1fae5',
                color: '#059669',
                borderColor: '#10b981',
            };
        } else {
            return {
                backgroundColor: '#ef444420',
                color: '#ef4444',
                borderColor: '#ef4444',
            };
        }
    };

    const getStockBadgeStyle = (stockQuantity: number) => {
        if (stockQuantity > 0) {
            return {
                backgroundColor: '#dbeafe',
                color: '#1d4ed8',
                borderColor: '#60a5fa',
            };
        } else {
            return {
                backgroundColor: '#ef444420',
                color: '#ef4444',
                borderColor: '#ef4444',
            };
        }
    };

    return (
        <div className={styles.categoryPage}>
            <div className={styles.header}>
                <button
                    onClick={() => router.get('/admin/categories')}
                    className={styles.backButton}
                >
                    <ArrowLeft size={18} />
                    {t('Back', 'Inapoi')}
                </button>
                <div className={styles.headerTitle}>
                    <h1 className={styles.pageTitle}>{t('Edit Category', 'Editeaza Categorie')}</h1>
                    <span className={styles.categoryId}>{t('ID', 'ID')}: {category.id}</span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                    <a
                        href={`/categories/${category.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.viewSiteButton}
                    >
                        <ExternalLink size={16} />
                        {t('View in site', 'Vezi in site')}
                    </a>
                    <button
                        onClick={handleDelete}
                        disabled={isDeleting}
                        className={styles.deleteButton}
                        title={t('Delete category', 'Sterge categorie')}
                    >
                        <Trash2 size={16} />
                        {t('Delete category', 'Sterge categorie')}
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.mainContent}>
                    {/* General Information */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('General Information', 'Informatii Generale')}</h2>
                        {category.breadcrumb && category.breadcrumb.length > 1 && (
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Path', 'Cale')}</label>
                                <div className={styles.breadcrumb}>
                                    {category.breadcrumb.map((item, index) => (
                                        <span key={item.id}>
                                            {index > 0 && <span className={styles.breadcrumbSeparator}> / </span>}
                                            <a
                                                href={`/admin/categories/${item.id}`}
                                                className={styles.breadcrumbLink}
                                            >
                                                {item.name}
                                            </a>
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className={styles.rowGroup}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Category name', 'Nume categorie')}</label>
                                <Input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Level', 'Nivel')}</label>
                                <div className={styles.value}>{category.level}</div>
                            </div>
                        </div>
                        <div className={styles.rowGroupThree}>
                            {category.level > 1 && (
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>{t('Parent', 'Parinte')}</label>
                                    <MultiSelect
                                        options={availableParents}
                                        value={formData.parent_id}
                                        onChange={(selectedId) => {
                                            setFormData(prev => ({ ...prev, parent_id: Array.isArray(selectedId) ? selectedId[0] : selectedId }));
                                        }}
                                        placeholder={t('Select parent category...', 'Selecteaza categorie parinte...')}
                                        searchPlaceholder={t('Search category...', 'Cauta categorie...')}
                                        multiple={false}
                                    />
                                </div>
                            )}
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Slug', 'Slug')}</label>
                                <Input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Status', 'Status')}</label>
                                <select
                                    name="status"
                                    value={formData.status ? '1' : '0'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value === '1' }))}
                                    className={styles.select}
                                >
                                    <option value="1">{t('Active', 'Activ')}</option>
                                    <option value="0">{t('Inactive', 'Inactiv')}</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Image */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Image', 'Imagine')}</h2>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Image URL', 'URL Imagine')}</label>
                            <Input
                                type="url"
                                name="image_url"
                                value={formData.image_url}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder={t('Image URL', 'URL Imagine')}
                            />
                        </div>
                        {formData.image_url && (
                            <div className={styles.fieldGroup}>
                                <div className={styles.imageContainer}>
                                    <img
                                        src={formData.image_url}
                                        alt={category.name}
                                        className={styles.categoryImage}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Subcategories */}
                    {category.children_count > 0 && (
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>
                                {t('Subcategories', 'Subcategorii')} ({category.children_count})
                            </h2>
                            <div className={categoriesTableStyles.tableContainer}>
                                <table className={categoriesTableStyles.categoriesTable}>
                                    <thead>
                                        <tr>
                                            <th className={categoriesTableStyles.idHeader}>{t('ID', 'ID')}</th>
                                            <th>{t('Category name', 'Nume categorie')}</th>
                                            <th className={categoriesTableStyles.statusHeader}>{t('Status', 'Status')}</th>
                                            <th className={categoriesTableStyles.productsCountHeader}>{t('Products', 'Produse')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {category.children.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className={categoriesTableStyles.emptyState}>
                                                    {t('No subcategories', 'Nu sunt subcategorii')}
                                                </td>
                                            </tr>
                                        ) : (
                                            category.children.map((child) => (
                                                <tr key={child.id} className={!child.status ? categoriesTableStyles.inactiveRow : ''}>
                                                    <td className={categoriesTableStyles.categoryId}>{child.id}</td>
                                                    <td className={categoriesTableStyles.categoryName}>
                                                        <a
                                                            href={`/admin/categories/${child.id}`}
                                                            className={categoriesTableStyles.categoryLink}
                                                        >
                                                            {child.name}
                                                        </a>
                                                    </td>
                                                    <td className={categoriesTableStyles.status}>
                                                        <span className={child.status ? categoriesTableStyles.statusActive : categoriesTableStyles.statusInactive}>
                                                            {child.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                                        </span>
                                                    </td>
                                                    <td className={categoriesTableStyles.productsCount}>{child.products_count}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Products */}
                    {category.products_count > 0 && (
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>
                                {t('Products', 'Produse')} ({category.products_count})
                            </h2>
                            <div className={productsTableStyles.tableContainer}>
                                <table className={productsTableStyles.productsTable}>
                                    <thead>
                                        <tr>
                                            <th>{t('Product', 'Produs')}</th>
                                            <th>{t('SKU', 'SKU')}</th>
                                            <th>{t('Brand', 'Marca')}</th>
                                            <th>{t('Price', 'Pret')}</th>
                                            <th>{t('Stock', 'Stoc')}</th>
                                            <th>{t('Status', 'Status')}</th>
                                            <th>{t('Date', 'Data')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {category.products.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className={productsTableStyles.emptyState}>
                                                    {t('No products', 'Nu sunt produse')}
                                                </td>
                                            </tr>
                                        ) : (
                                            category.products.map((product) => (
                                                <tr key={product.id}>
                                                    <td className={productsTableStyles.productInfo}>
                                                        <div className={productsTableStyles.productImageContainer}>
                                                            {product.image_url ? (
                                                                <img
                                                                    src={product.image_url}
                                                                    alt={product.name}
                                                                    className={productsTableStyles.productImage}
                                                                />
                                                            ) : (
                                                                <div className={productsTableStyles.productImagePlaceholder}>
                                                                    <Package size={20} />
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className={productsTableStyles.productDetails}>
                                                            <a
                                                                href={`/admin/products/${product.id}`}
                                                                className={productsTableStyles.productNameLink}
                                                            >
                                                                {product.name}
                                                            </a>
                                                            {product.model && (
                                                                <div className={productsTableStyles.productModel}>{product.model}</div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className={productsTableStyles.sku}>
                                                        {product.sku || '-'}
                                                    </td>
                                                    <td className={productsTableStyles.brand}>
                                                        {product.brand_name}
                                                    </td>
                                                    <td className={productsTableStyles.price}>
                                                        {formatPrice(parseFloat(product.price_ron))} RON
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={productsTableStyles.stockBadge}
                                                            style={getStockBadgeStyle(product.stock_quantity)}
                                                        >
                                                            {product.stock_quantity}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={productsTableStyles.statusBadge}
                                                            style={getStatusBadgeStyle(product.status)}
                                                        >
                                                            {product.status ? t('Active', 'Activ') : t('Inactive', 'Inactiv')}
                                                        </span>
                                                    </td>
                                                    <td className={productsTableStyles.dateTime}>
                                                        {product.created_at_formatted || '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            {category.products_count > 20 && (
                                <div className={styles.viewAllContainer}>
                                    <a
                                        href={`/admin/products?category_id=${category.id}&filter=all`}
                                        className={styles.viewAllLink}
                                    >
                                        {t('View all products', 'Vezi toate produsele')} ({category.products_count})
                                    </a>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    {/* Statistics */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Statistics', 'Statistici')}</h2>
                        <div className={styles.statsGrid}>
                            <div className={styles.statItem}>
                                <div className={styles.statLabel}>{t('Products', 'Produse')}</div>
                                <div className={styles.statValue}>{category.products_count}</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statLabel}>{t('Subcategories', 'Subcategorii')}</div>
                                <div className={styles.statValue}>{category.children_count}</div>
                            </div>
                            <div className={styles.statItem}>
                                <div className={styles.statLabel}>{t('Level', 'Nivel')}</div>
                                <div className={styles.statValue}>{category.level}</div>
                            </div>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Dates', 'Date')}</h2>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Created at', 'Data crearii')}</label>
                            <div className={styles.value}>{category.created_at || '-'}</div>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Updated at', 'Data actualizarii')}</label>
                            <div className={styles.value}>{category.updated_at || '-'}</div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

export default function AdminCategoryShow(props: CategoryShowPageProps) {
    return (
        <AdminLayout activeSidebarItem="categories">
            <AdminCategoryShowContent {...props} />
        </AdminLayout>
    );
}
