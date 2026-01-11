import { useState, useEffect, useRef, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { ArrowLeft, Plus, X, Package, ChevronRight } from 'lucide-react';
import { AdminLayout, MultiSelect } from '../../../components/admin';
import { useTranslations } from '../../../utils/translations';
import { useEdit } from '../../../contexts/EditContext';
import { Input } from '../../../components/ui/Input';
import { Modal } from '../../../components/ui/Modal';
import styles from './show.module.css';

// Product Attributes Manager Component
interface ProductAttributesManagerProps {
    attributes: Attribute[];
    productAttributes: Array<{
        attribute_id: number;
        attribute_value_id: number;
    }>;
    onChange: (attributes: Array<{ attribute_id: number; attribute_value_id: number }>) => void;
    t: (key: string, fallback: string) => string;
}

function ProductAttributesManager({ attributes, productAttributes, onChange, t }: ProductAttributesManagerProps) {
    const handleAttributeChange = (attributeId: number, attributeValueId: number) => {
        const updated = productAttributes.filter(attr => attr.attribute_id !== attributeId);
        updated.push({ attribute_id: attributeId, attribute_value_id: attributeValueId });
        onChange(updated);
    };

    const getSelectedValue = (attributeId: number): number | null => {
        const attr = productAttributes.find(a => a.attribute_id === attributeId);
        return attr ? attr.attribute_value_id : null;
    };

    return (
        <div className={styles.productAttributesManager}>
            {attributes.length === 0 ? (
                <div className={styles.emptyState}>
                    {t('No attributes available', 'Nu sunt atribute disponibile')}
                </div>
            ) : (
                <div className={styles.productAttributesList}>
                    {attributes.map((attribute) => {
                        const selectedValueId = getSelectedValue(attribute.id);
                        return (
                            <div key={attribute.id} className={styles.productAttributeCard}>
                                <label className={styles.productAttributeLabel}>
                                    {attribute.name}
                                </label>
                                {attribute.type === 'color_swatch' ? (
                                    <div className={styles.colorSwatches}>
                                        {attribute.values.map((value) => {
                                            const isSelected = selectedValueId === value.id;
                                            return (
                                                <button
                                                    key={value.id}
                                                    type="button"
                                                    className={`${styles.colorSwatch} ${isSelected ? styles.colorSwatchSelected : ''}`}
                                                    onClick={() => handleAttributeChange(attribute.id, value.id)}
                                                    style={{
                                                        backgroundColor: value.meta_value || '#ccc',
                                                    }}
                                                    title={value.value}
                                                >
                                                    {isSelected && <span className={styles.checkmark}>✓</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <select
                                        className={styles.productAttributeSelect}
                                        value={selectedValueId || ''}
                                        onChange={(e) => {
                                            const valueId = parseInt(e.target.value);
                                            if (valueId) {
                                                handleAttributeChange(attribute.id, valueId);
                                            }
                                        }}
                                    >
                                        <option value="">{t('Select value...', 'Selecteaza valoare...')}</option>
                                        {attribute.values.map((value) => (
                                            <option key={value.id} value={value.id}>
                                                {value.value}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// Variants Manager Component - Simplified: Just shows links to variant edit pages
interface VariantsManagerProps {
    variants: Variant[];
    attributes: Attribute[];
    t: (key: string, fallback: string) => string;
}

function VariantsManager({ variants, attributes, t }: VariantsManagerProps) {
    // Generate variant display name from attributes
    const getVariantDisplayName = (variant: Variant): string => {
        if (variant.name) {
            return variant.name;
        }

        const selectedAttributes = variant.attributes
            .map(attr => {
                const attribute = attributes.find(a => a.id === attr.attribute_id);
                if (!attribute) return null;
                const value = attribute.values.find(v => v.id === attr.attribute_value_id);
                return value ? value.value : null;
            })
            .filter(Boolean);
        
        return selectedAttributes.length > 0 
            ? selectedAttributes.join(' - ')
            : `Variant #${variant.id || 'New'}`;
    };

    return (
        <div className={styles.variantsManager}>
            {variants.length === 0 ? (
                <div className={styles.emptyState}>
                    {t('No variants added yet', 'Nu sunt variante adaugate inca')}
                </div>
            ) : (
                <div className={styles.variantsGrid}>
                    {variants.map((variant) => {
                        if (!variant.id) return null;
                        
                        const displayName = getVariantDisplayName(variant);
                        
                        return (
                            <a
                                key={variant.id}
                                href={`/admin/products/${variant.id}`}
                                className={styles.variantCard}
                            >
                                <div className={styles.variantCardImage}>
                                    {variant.image_url ? (
                                        <img
                                            src={variant.image_url}
                                            alt={displayName}
                                            className={styles.variantImage}
                                        />
                                    ) : (
                                        <div className={styles.variantImagePlaceholder}>
                                            <Package size={24} />
                                        </div>
                                    )}
                                </div>
                                <div className={styles.variantCardTitle}>
                                    {displayName}
                                </div>
                            </a>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface ProductImage {
    id: number;
    image_url: string;
    sort_order: number;
}

interface Category {
    id: number;
    name: string;
}

interface Brand {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
    description: string | null;
    short_description: string | null;
    sku: string | null;
    ean: string | null;
    model: string | null;
    slug: string | null;
    price_ron: string;
    purchase_price_ron: string;
    brand_id: number | null;
    family_id?: number | null;
    family?: {
        id: number;
        name: string;
        code: string;
    } | null;
    stock_quantity: number;
    weight: string;
    length: string;
    width: string;
    height: string;
    status: boolean;
    main_image_url: string | null;
    images: ProductImage[];
    category_ids: number[] | number | null;
    type?: 'simple' | 'configurable' | 'variant';
    parent_id?: number | null;
    parent_product?: {
        id: number;
        name: string;
    } | null;
    product_attributes?: Array<{
        attribute_id: number;
        attribute_value_id: number;
    }>;
}

interface Attribute {
    id: number;
    name: string;
    code: string;
    type: 'select' | 'text' | 'color_swatch';
    is_filterable: boolean;
    values: AttributeValue[];
}

interface AttributeValue {
    id: number;
    value: string;
    meta_value: string | null;
    sort_order: number;
}

interface Variant {
    id?: number;
    name: string;
    sku: string;
    price_ron: string;
    stock_quantity: number;
    status: boolean;
    image_url?: string | null;
    attributes: Array<{
        attribute_id: number;
        attribute_value_id: number;
    }>;
}

interface ParentProduct {
    id: number;
    name: string;
}

interface ProductType {
    value: 'simple' | 'configurable' | 'variant';
    label: string;
}

interface CustomerGroup {
    id: number;
    name: string;
    code: string;
}

interface ProductGroupPrice {
    id?: number;
    customer_group_id: number;
    customer_group_name?: string;
    customer_group_code?: string;
    min_quantity: number;
    price_ron: string;
}

interface ProductFamily {
    id: number;
    name: string;
    code: string;
}

interface ProductShowPageProps {
    product: Product;
    categories: Category[];
    brands: Brand[];
    productFamilies?: ProductFamily[];
    customerGroups?: CustomerGroup[];
    groupPrices?: ProductGroupPrice[];
    attributes?: Attribute[];
    variants?: Variant[];
    parentProducts?: ParentProduct[];
    productTypes?: ProductType[];
}

function AdminProductShowContent({ 
    product, 
    categories, 
    brands,
    productFamilies = [],
    customerGroups = [], 
    groupPrices = [],
    attributes = [],
    variants: initialVariants = [],
    parentProducts = [],
    productTypes = []
}: ProductShowPageProps) {
    const { t } = useTranslations();
    const { setHasUnsavedChanges, setSaveHandler, setDiscardHandler } = useEdit();

    // Store initial data for comparison
    const initialFormData = useRef({
        name: product.name || '',
        model: product.model || '',
        description: product.description || '',
        short_description: product.short_description || '',
        price_ron: product.price_ron || '',
        category_ids: Array.isArray(product.category_ids) && product.category_ids.length > 0
            ? product.category_ids[0]
            : (typeof product.category_ids === 'number' ? product.category_ids : null),
        stock_quantity: product.stock_quantity || 0,
        weight: product.weight || '',
        length: product.length || '',
        width: product.width || '',
        height: product.height || '',
        sku: product.sku || '',
        ean: product.ean || '',
        slug: product.slug || '',
        purchase_price_ron: product.purchase_price_ron || '',
        brand_id: product.brand_id || null,
        family_id: product.family_id || null,
        status: product.status !== undefined ? product.status : true,
        type: product.type || 'simple',
        parent_id: product.parent_id || null,
    });

    // Initialize images array - ensure main_image_url is included if it exists and is not already in images
    const initializeImages = (): ProductImage[] => {
        const productImages = product.images || [];
        const mainImageUrl = product.main_image_url;

        let imagesArray: ProductImage[] = [];

        // If main_image_url exists, check if it's already in the images array
        if (mainImageUrl) {
            const mainImageExists = productImages.some(img => img.image_url === mainImageUrl);

            // If main_image_url is not in images, add it as the first image with a temporary ID
            if (!mainImageExists) {
                imagesArray = [
                    {
                        id: 0, // Use 0 to indicate it's from main_image_url (not in product_images table)
                        image_url: mainImageUrl,
                        sort_order: -1, // Use -1 to ensure it's first
                    },
                    ...productImages,
                ];
            } else {
                imagesArray = [...productImages];
            }
        } else {
            imagesArray = [...productImages];
        }

        // Sort by sort_order to ensure correct order
        return imagesArray.sort((a, b) => a.sort_order - b.sort_order);
    };

    // Helper function to reorder images so selectedMainImage is first
    const reorderImagesWithMainFirst = (imagesArray: ProductImage[], mainImageUrl: string | null): ProductImage[] => {
        if (!mainImageUrl || imagesArray.length === 0) {
            // If no main image or no images, just sort by sort_order
            return [...imagesArray].sort((a, b) => a.sort_order - b.sort_order);
        }

        const mainImageIndex = imagesArray.findIndex(img => img.image_url === mainImageUrl);

        if (mainImageIndex === -1) {
            // Main image not found in array, just sort by sort_order
            return [...imagesArray].sort((a, b) => a.sort_order - b.sort_order);
        }

        // Move main image to first position, then sort the rest by sort_order
        const reordered = [...imagesArray];
        const [mainImage] = reordered.splice(mainImageIndex, 1);
        const restSorted = reordered.sort((a, b) => a.sort_order - b.sort_order);
        return [mainImage, ...restSorted];
    };

    const initialImagesArray = initializeImages();
    const initialMainImageUrl = product.main_image_url || (initialImagesArray[0]?.image_url || null);
    const initialImagesOrdered = reorderImagesWithMainFirst(initialImagesArray, initialMainImageUrl);

    const initialImages = useRef<ProductImage[]>(initialImagesOrdered);
    const initialMainImage = useRef<string | null>(initialMainImageUrl);
    const initialGroupPrices = useRef<ProductGroupPrice[]>(groupPrices);
    const initialProductAttributes = useRef<Array<{ attribute_id: number; attribute_value_id: number }>>(
        product.product_attributes || []
    );

    const [formData, setFormData] = useState(initialFormData.current);
    const [images, setImages] = useState<ProductImage[]>(initialImagesOrdered);
    const [selectedMainImage, setSelectedMainImage] = useState<string | null>(initialMainImageUrl);
    const [imageUrlInput, setImageUrlInput] = useState('');
    const [showAddImageModal, setShowAddImageModal] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [selectedImageForView, setSelectedImageForView] = useState<string | null>(null);
    const [productGroupPrices, setProductGroupPrices] = useState<ProductGroupPrice[]>(groupPrices);
    const [productAttributes, setProductAttributes] = useState<Array<{ attribute_id: number; attribute_value_id: number }>>(
        product.product_attributes || []
    );

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;

        if (type === 'checkbox') {
            const checked = (e.target as HTMLInputElement).checked;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleImageUrlAdd = () => {
        if (!imageUrlInput.trim()) return;

        // Add image to state without saving to database
        // Use temporary ID (negative number) for new images
        const tempId = Date.now() * -1;
        const maxSortOrder = images.length > 0 ? Math.max(...images.map(img => img.sort_order)) : -1;

        const newImage: ProductImage = {
            id: tempId,
            image_url: imageUrlInput.trim(),
            sort_order: maxSortOrder + 1,
        };

        setImages(prev => [...prev, newImage]);
        setImageUrlInput('');
        setShowAddImageModal(false);
    };

    const handleModalClose = () => {
        setShowAddImageModal(false);
        setImageUrlInput('');
    };

    const handleImageRemove = (imageId: number) => {
        setImages(prev => {
            const imageToRemove = prev.find(img => img.id === imageId);
            const filtered = prev.filter(img => img.id !== imageId);

            // If we removed the selected main image, select the first remaining image
            if (selectedMainImage && imageToRemove?.image_url === selectedMainImage) {
                const newMainImage = filtered[0]?.image_url || null;
                setSelectedMainImage(newMainImage);
                return reorderImagesWithMainFirst(filtered, newMainImage);
            }

            // Reorder to keep main image first
            return reorderImagesWithMainFirst(filtered, selectedMainImage);
        });
    };

    const handleImageClick = (e: React.MouseEvent, imageUrl: string) => {
        e.stopPropagation();
        // Only open in view modal, don't change main image
        setSelectedImageForView(imageUrl);
    };



    const handleGroupPriceChange = (index: number, field: keyof ProductGroupPrice, value: string | number) => {
        setProductGroupPrices(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], [field]: value };

            // Auto-sort by customer_group_id and min_quantity after changes
            updated.sort((a, b) => {
                if (a.customer_group_id !== b.customer_group_id) {
                    return a.customer_group_id - b.customer_group_id;
                }
                return a.min_quantity - b.min_quantity;
            });

            return updated;
        });
    };


    const handleSave = useCallback(async () => {
        if (isSaving) return;

        setIsSaving(true);
        try {
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';

            // Use current state values (captured by useCallback dependencies)
            const currentFormData = formData;
            const currentImages = images;
            const currentMainImage = selectedMainImage;
            const currentGroupPrices = productGroupPrices;
            const currentProductAttributes = productAttributes;

            // Validate group prices before saving
            const errors: string[] = [];
            const seen = new Set<string>();

            currentGroupPrices.forEach((gp) => {
                const key = `${gp.customer_group_id}-${gp.min_quantity}`;
                if (seen.has(key)) {
                    errors.push(t('Duplicate group price for customer group and quantity', 'Pret duplicat pentru grupul de clienti si cantitate'));
                }
                seen.add(key);

                if (!gp.customer_group_id) {
                    errors.push(t('Customer group is required', 'Grupul de clienti este obligatoriu'));
                }

                if (!gp.min_quantity || gp.min_quantity < 1) {
                    errors.push(t('Minimum quantity must be at least 1', 'Cantitatea minima trebuie sa fie cel putin 1'));
                }

                const priceValue = typeof gp.price_ron === 'string' ? parseFloat(gp.price_ron) : (typeof gp.price_ron === 'number' ? gp.price_ron : 0);
                if (!gp.price_ron || priceValue < 0 || isNaN(priceValue)) {
                    errors.push(t('Price must be a valid positive number', 'Pretul trebuie sa fie un numar pozitiv valid'));
                }
            });

            if (errors.length > 0) {
                alert(errors.join('\n'));
                setIsSaving(false);
                return;
            }

            // Prepare data for submission
            // Separate existing images (with positive IDs) from new images (with negative IDs)
            const existingImageIds = currentImages.filter(img => img.id > 0).map(img => img.id);
            const newImages = currentImages.filter(img => img.id < 0);

            const updateData: any = {
                name: currentFormData.name,
                model: currentFormData.model,
                description: currentFormData.description,
                short_description: currentFormData.short_description,
                category_ids: currentFormData.category_ids !== null ? [currentFormData.category_ids] : [],
                stock_quantity: currentFormData.stock_quantity,
                weight: currentFormData.weight,
                length: currentFormData.length,
                width: currentFormData.width,
                height: currentFormData.height,
                sku: currentFormData.sku,
                ean: currentFormData.ean,
                slug: currentFormData.slug,
                brand_id: currentFormData.brand_id,
                family_id: currentFormData.family_id,
                status: currentFormData.status,
                main_image_url: currentMainImage,
                image_ids: existingImageIds,
                new_images: newImages.map(img => ({
                    image_url: img.image_url,
                    sort_order: img.sort_order,
                })),
            };

            // Only include pricing fields for non-configurable products
            if (currentFormData.type !== 'configurable') {
                updateData.price_ron = currentFormData.price_ron;
                updateData.purchase_price_ron = currentFormData.purchase_price_ron;
                updateData.group_prices = currentGroupPrices
                    .filter(gp => gp.customer_group_id && gp.min_quantity && gp.price_ron) // Filter out incomplete entries
                    .map(gp => {
                        const priceValue = typeof gp.price_ron === 'string' ? parseFloat(gp.price_ron) : (typeof gp.price_ron === 'number' ? gp.price_ron : 0);
                        return {
                            id: gp.id || null,
                            customer_group_id: gp.customer_group_id,
                            min_quantity: gp.min_quantity,
                            price_ron: priceValue || 0,
                        };
                    });
            }

            // Include product attributes for simple and variant products
            if (currentFormData.type === 'simple' || currentFormData.type === 'variant') {
                updateData.product_attributes = currentProductAttributes;
            }

            const response = await fetch(`/admin/products/${product.id}`, {
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
                initialImages.current = [...currentImages];
                initialMainImage.current = currentMainImage;
                initialGroupPrices.current = [...currentGroupPrices];
                initialProductAttributes.current = [...currentProductAttributes];
                setHasUnsavedChanges(false);

                // Reload page to get updated data
                router.reload({ only: ['product', 'groupPrices', 'variants', 'attributes', 'productFamilies'] });
            } else {
                const errorData = await response.json();
                alert(errorData.message || t('Error saving product', 'Eroare la salvarea produsului'));
            }
        } catch (error) {
            console.error('Error saving product:', error);
            alert(t('Error saving product', 'Eroare la salvarea produsului'));
        } finally {
            setIsSaving(false);
        }
    }, [isSaving, formData, images, selectedMainImage, productGroupPrices, productAttributes, product.id, setHasUnsavedChanges, t]);

    const handleDiscard = useCallback(() => {
        // Reset form data to initial values
        setFormData({ ...initialFormData.current });
        setImages([...initialImages.current]);
        setSelectedMainImage(initialMainImage.current);
        setProductGroupPrices([...initialGroupPrices.current]);
        setProductAttributes([...initialProductAttributes.current]);
        setHasUnsavedChanges(false);
    }, [setHasUnsavedChanges]);

    // Reorder images when selectedMainImage changes (to ensure main image is always first)
    useEffect(() => {
        setImages(prev => {
            const reordered = reorderImagesWithMainFirst(prev, selectedMainImage);
            // Only update if order actually changed
            if (JSON.stringify(reordered) !== JSON.stringify(prev)) {
                return reordered;
            }
            return prev;
        });
    }, [selectedMainImage]);

    // Reload attributes when family changes (to get filtered attributes)
    const previousFamilyId = useRef(formData.family_id);
    useEffect(() => {
        if (previousFamilyId.current !== formData.family_id) {
            previousFamilyId.current = formData.family_id;
            // Only reload if family actually changed (not initial load)
            if (initialFormData.current.family_id !== formData.family_id && formData.family_id) {
                // Reload page to get filtered attributes for the new family
                // Pass the family_id as query parameter so backend can filter before saving
                const url = new URL(window.location.href);
                url.searchParams.set('family_id', formData.family_id.toString());
                
                router.get(
                    url.pathname + url.search,
                    {},
                    { 
                        only: ['attributes'], 
                        preserveState: true, 
                        preserveScroll: true,
                        replace: true
                    }
                );
            }
        }
    }, [formData.family_id]);

    // Check if form has changes
    useEffect(() => {
        const hasChanges =
            formData.name !== initialFormData.current.name ||
            formData.model !== initialFormData.current.model ||
            formData.description !== initialFormData.current.description ||
            formData.short_description !== initialFormData.current.short_description ||
            formData.price_ron !== initialFormData.current.price_ron ||
            formData.category_ids !== initialFormData.current.category_ids ||
            formData.stock_quantity !== initialFormData.current.stock_quantity ||
            formData.weight !== initialFormData.current.weight ||
            formData.length !== initialFormData.current.length ||
            formData.width !== initialFormData.current.width ||
            formData.height !== initialFormData.current.height ||
            formData.sku !== initialFormData.current.sku ||
            formData.ean !== initialFormData.current.ean ||
            formData.slug !== initialFormData.current.slug ||
            formData.purchase_price_ron !== initialFormData.current.purchase_price_ron ||
            formData.brand_id !== initialFormData.current.brand_id ||
            formData.family_id !== initialFormData.current.family_id ||
            formData.status !== initialFormData.current.status ||
            JSON.stringify(images) !== JSON.stringify(initialImages.current) ||
            selectedMainImage !== initialMainImage.current ||
            JSON.stringify(productGroupPrices) !== JSON.stringify(initialGroupPrices.current) ||
            JSON.stringify(productAttributes) !== JSON.stringify(initialProductAttributes.current);

        setHasUnsavedChanges(hasChanges);
    }, [formData, images, selectedMainImage, productGroupPrices, productAttributes, setHasUnsavedChanges]);

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

    return (
        <div className={styles.productPage}>
            <div className={styles.header}>
                <div className={styles.headerTop}>
                    {product.type === 'variant' && product.parent_product ? (
                        <div className={styles.breadcrumbs}>
                            <button
                                onClick={() => router.get('/admin/products')}
                                className={styles.breadcrumbLink}
                            >
                                {t('Products', 'Produse')}
                            </button>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <button
                                onClick={() => router.get(`/admin/products/${product.parent_product!.id}`)}
                                className={styles.breadcrumbLink}
                            >
                                {product.parent_product.name}
                            </button>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <span className={styles.breadcrumbCurrent}>
                                {product.name}
                            </span>
                        </div>
                    ) : (
                        <div className={styles.breadcrumbs}>
                            <button
                                onClick={() => router.get('/admin/products')}
                                className={styles.breadcrumbLink}
                            >
                                {t('Products', 'Produse')}
                            </button>
                            <ChevronRight size={16} className={styles.breadcrumbSeparator} />
                            <span className={styles.breadcrumbCurrent}>
                                {product.name}
                            </span>
                        </div>
                    )}
                </div>
                <div className={styles.headerTitle}>
                    <h1 className={styles.pageTitle}>{t('Edit Product', 'Editeaza Produs')}</h1>
                    <span className={styles.productId}>{t('ID', 'ID')}: {product.id}</span>
                </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.mainContent}>
                    {/* General Information */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('General Information', 'Informatii Generale')}</h2>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Title', 'Titlu')}</label>
                            <Input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                className={styles.input}
                            />
                        </div>
                        <div className={styles.rowGroupThree}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Model', 'Model')}</label>
                                <Input
                                    type="text"
                                    name="model"
                                    value={formData.model}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('Model', 'Model')}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Brand', 'Marca')}</label>
                                <MultiSelect
                                    options={brands}
                                    value={formData.brand_id}
                                    onChange={(selectedId) => {
                                        setFormData(prev => ({ ...prev, brand_id: Array.isArray(selectedId) ? selectedId[0] : selectedId }));
                                    }}
                                    placeholder={t('Select brand...', 'Selecteaza marca...')}
                                    searchPlaceholder={t('Search brand...', 'Cauta marca...')}
                                    multiple={false}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Category', 'Categorie')}</label>
                                <MultiSelect
                                    options={categories}
                                    value={formData.category_ids}
                                    onChange={(selectedId) => {
                                        setFormData(prev => ({ ...prev, category_ids: Array.isArray(selectedId) ? selectedId[0] : selectedId }));
                                    }}
                                    placeholder={t('Select category...', 'Selecteaza categorie...')}
                                    searchPlaceholder={t('Search category...', 'Cauta categorie...')}
                                    multiple={false}
                                />
                            </div>
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Family', 'Familie')}</label>
                            <MultiSelect
                                options={productFamilies}
                                value={formData.family_id}
                                onChange={(selectedId) => {
                                    const familyId = Array.isArray(selectedId) ? selectedId[0] : selectedId;
                                    setFormData(prev => ({ ...prev, family_id: familyId }));
                                    // Clear product attributes when family changes
                                    if (familyId !== formData.family_id) {
                                        setProductAttributes([]);
                                    }
                                }}
                                placeholder={t('Select family...', 'Selecteaza familie...')}
                                searchPlaceholder={t('Search family...', 'Cauta familie...')}
                                multiple={false}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Description', 'Descriere')}</label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                className={styles.textarea}
                                rows={8}
                            />
                        </div>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label}>{t('Short Description', 'Descriere Scurta')}</label>
                            <Input
                                type="text"
                                name="short_description"
                                value={formData.short_description}
                                onChange={handleInputChange}
                                className={styles.input}
                                placeholder={t('Short Description', 'Descriere Scurta')}
                            />
                        </div>
                    </div>

                    {/* Media */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Media', 'Media')}</h2>
                        <div className={styles.fieldGroup}>
                            <div className={styles.mediaContainer}>
                                {images.length > 0 && (
                                    <div className={styles.mainMediaItem}>
                                        <button
                                            type="button"
                                            className={styles.removeImageButton}
                                            onClick={() => handleImageRemove(images[0].id)}
                                            title={t('Remove', 'Sterge')}
                                        >
                                            <X size={16} />
                                        </button>
                                        <img
                                            src={images[0].image_url}
                                            alt={`Product ${images[0].id}`}
                                            className={styles.mainMediaImage}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedImageForView(images[0].image_url);
                                            }}
                                        />
                                    </div>
                                )}
                                <div className={styles.mediaGrid}>
                                    {images.slice(1).map((image) => (
                                        <div key={image.id} className={styles.mediaItem}>
                                            <button
                                                type="button"
                                                className={styles.removeImageButton}
                                                onClick={() => handleImageRemove(image.id)}
                                                title={t('Remove', 'Sterge')}
                                            >
                                                <X size={16} />
                                            </button>
                                            <img
                                                src={image.image_url}
                                                alt={`Product ${image.id}`}
                                                className={styles.mediaImage}
                                                onClick={(e) => handleImageClick(e, image.image_url)}
                                            />
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className={styles.addImageButton}
                                        onClick={() => setShowAddImageModal(true)}
                                    >
                                        <Plus size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing - Hidden for configurable products */}
                    {formData.type !== 'configurable' && (
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>{t('Pricing', 'Preturi')}</h2>
                            <div className={styles.rowGroup}>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>
                                        {t('Sale Price', 'Pret Vanzare')} <span className={styles.labelNote}>({t('without VAT', 'fara TVA')})</span>
                                    </label>
                                    <div className={styles.priceInputWrapper}>
                                        <Input
                                            type="text"
                                            name="price_ron"
                                            value={formData.price_ron}
                                            onChange={handleInputChange}
                                            className={styles.priceInput}
                                            placeholder="0.00"
                                        />
                                        <span className={styles.priceCurrency}>RON</span>
                                    </div>
                                </div>
                                <div className={styles.fieldGroup}>
                                    <label className={styles.label}>
                                        {t('Purchase Price', 'Pret Achizitie')} <span className={styles.labelNote}>({t('without VAT', 'fara TVA')})</span>
                                    </label>
                                    <div className={styles.priceInputWrapper}>
                                        <Input
                                            type="text"
                                            name="purchase_price_ron"
                                            value={formData.purchase_price_ron}
                                            onChange={handleInputChange}
                                            className={styles.priceInput}
                                            placeholder="0.00"
                                            disabled
                                        />
                                        <span className={styles.priceCurrency}>RON</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Inventory & Identification */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Inventory & Identification', 'Inventar & Identificare')}</h2>
                        <div className={styles.rowGroup}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('SKU', 'SKU')}</label>
                                <Input
                                    type="text"
                                    name="sku"
                                    value={formData.sku}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('SKU', 'SKU')}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('EAN', 'EAN')}</label>
                                <Input
                                    type="text"
                                    name="ean"
                                    value={formData.ean}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('EAN', 'EAN')}
                                />
                            </div>
                        </div>
                        <div className={styles.rowGroup}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Slug', 'Slug')}</label>
                                <Input
                                    type="text"
                                    name="slug"
                                    value={formData.slug}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('Slug', 'Slug')}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Stock Quantity', 'Cantitate Stoc')}</label>
                                <Input
                                    type="number"
                                    name="stock_quantity"
                                    value={formData.stock_quantity}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    disabled={formData.type === 'configurable'}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Logistics */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Logistics', 'Logistica')}</h2>
                        <div className={styles.rowGroup}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Weight', 'Greutate')} ({t('kg', 'kg')})</label>
                                <Input
                                    type="text"
                                    name="weight"
                                    value={formData.weight}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('Weight', 'Greutate')}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Length', 'Lungime')} ({t('cm', 'cm')})</label>
                                <Input
                                    type="text"
                                    name="length"
                                    value={formData.length}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('Length', 'Lungime')}
                                />
                            </div>
                        </div>
                        <div className={styles.rowGroup}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Width', 'Latime')} ({t('cm', 'cm')})</label>
                                <Input
                                    type="text"
                                    name="width"
                                    value={formData.width}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('Width', 'Latime')}
                                />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>{t('Height', 'Inaltime')} ({t('cm', 'cm')})</label>
                                <Input
                                    type="text"
                                    name="height"
                                    value={formData.height}
                                    onChange={handleInputChange}
                                    className={styles.input}
                                    placeholder={t('Height', 'Inaltime')}
                                />
                            </div>
                        </div>
                    </div>

                </div>

                {/* Sidebar */}
                <div className={styles.sidebar}>
                    {/* Status */}
                    <div className={styles.sectionCard}>
                        <h2 className={styles.sectionTitle}>{t('Status', 'Status')}</h2>
                        <div className={styles.fieldGroup}>
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

                    {/* Variants Management - Only for configurable products */}
                    {formData.type === 'configurable' && (
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>{t('Variants', 'Variante')}</h2>
                            <VariantsManager
                                variants={initialVariants}
                                attributes={attributes}
                                t={t}
                            />
                        </div>
                    )}

                    {/* Product Attributes - For simple and variant products */}
                    {(formData.type === 'simple' || formData.type === 'variant') && (
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>{t('Attributes', 'Atribute')}</h2>
                            {!formData.family_id ? (
                                <div className={styles.emptyState}>
                                    {t('Please select a family first to assign attributes', 'Selecteaza mai intai o familie pentru a atribui atribute')}
                                </div>
                            ) : (
                                <ProductAttributesManager
                                    attributes={attributes}
                                    productAttributes={productAttributes}
                                    onChange={setProductAttributes}
                                    t={t}
                                />
                            )}
                        </div>
                    )}

                    {/* Group Prices - Hidden for configurable products */}
                    {formData.type !== 'configurable' && (
                        <div className={styles.sectionCard}>
                            <h2 className={styles.sectionTitle}>{t('Group Prices', 'Preturi Grupuri')}</h2>
                            <div className={styles.fieldGroup}>
                                <div className={styles.groupPricesContainer}>
                                {productGroupPrices.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <span>{t('No group prices set', 'Nu sunt preturi pentru grupuri')}</span>
                                    </div>
                                ) : (
                                    <div className={styles.groupPricesTable}>
                                        <table className={styles.groupPricesTableElement}>
                                            <tbody>
                                                {productGroupPrices.map((groupPrice, index) => {
                                                    const prevGroupPrice = index > 0 ? productGroupPrices[index - 1] : null;
                                                    const isSameGroup = prevGroupPrice?.customer_group_id === groupPrice.customer_group_id;
                                                    const customerGroup = customerGroups.find(g => g.id === groupPrice.customer_group_id);

                                                    // Check if this is the first row of a group
                                                    const isFirstInGroup = !isSameGroup;

                                                    // Generate a consistent color for each group based on customer_group_id
                                                    const getGroupColor = (groupId: number) => {
                                                        const colors = [
                                                            { bg: 'rgba(59, 130, 246, 0.1)', border: '#3b82f6', text: '#1e40af' }, // blue
                                                            { bg: 'rgba(16, 185, 129, 0.1)', border: '#10b981', text: '#047857' }, // green
                                                            { bg: 'rgba(245, 158, 11, 0.1)', border: '#f59e0b', text: '#b45309' }, // amber
                                                            { bg: 'rgba(239, 68, 68, 0.1)', border: '#ef4444', text: '#b91c1c' }, // red
                                                            { bg: 'rgba(139, 92, 246, 0.1)', border: '#8b5cf6', text: '#6d28d9' }, // purple
                                                            { bg: 'rgba(236, 72, 153, 0.1)', border: '#ec4899', text: '#be185d' }, // pink
                                                            { bg: 'rgba(6, 182, 212, 0.1)', border: '#06b6d4', text: '#0891b2' }, // cyan
                                                            { bg: 'rgba(132, 204, 22, 0.1)', border: '#84cc16', text: '#65a30d' }, // lime
                                                        ];
                                                        return colors[groupId % colors.length];
                                                    };

                                                    return (
                                                        <>
                                                            {isFirstInGroup && (
                                                                <>
                                                                    <tr key={`group-header-${groupPrice.customer_group_id}-${index}`} className={styles.groupPriceGroupHeader}>
                                                                        <td colSpan={2} className={styles.groupPriceGroupHeaderCell}>
                                                                            <span
                                                                                className={styles.groupPriceBadge}
                                                                                style={{
                                                                                    backgroundColor: getGroupColor(groupPrice.customer_group_id).bg,
                                                                                    borderColor: getGroupColor(groupPrice.customer_group_id).border,
                                                                                    color: getGroupColor(groupPrice.customer_group_id).text
                                                                                }}
                                                                            >
                                                                                {customerGroup?.name || t('Unknown', 'Necunoscut')}
                                                                            </span>
                                                                        </td>
                                                                    </tr>
                                                                    <tr key={`group-labels-${groupPrice.customer_group_id}-${index}`} className={styles.groupPriceLabelsRow}>
                                                                        <td className={styles.groupPriceLabelCell}>
                                                                            <span className={styles.groupPriceMicroLabel}>{t('Min Quantity', 'Cantitate Minima')}</span>
                                                                        </td>
                                                                        <td className={styles.groupPriceLabelCell}>
                                                                            <span className={styles.groupPriceMicroLabel}>{t('Price', 'Pret')} (fara TVA)</span>
                                                                        </td>
                                                                    </tr>
                                                                </>
                                                            )}
                                                            <tr
                                                                key={groupPrice.id || `new-${index}`}
                                                                className={styles.groupPriceRow}
                                                            >
                                                                <td className={styles.groupPriceCell}>
                                                                    <Input
                                                                        type="number"
                                                                        min="1"
                                                                        value={groupPrice.min_quantity}
                                                                        onChange={(e) => {
                                                                            const value = parseInt(e.target.value) || 1;
                                                                            handleGroupPriceChange(index, 'min_quantity', value);
                                                                        }}
                                                                        className={styles.groupPriceInput}
                                                                    />
                                                                </td>
                                                                <td className={styles.groupPriceCell}>
                                                                    <div className={styles.groupPriceInputWrapper}>
                                                                        <Input
                                                                            type="text"
                                                                            value={groupPrice.price_ron}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value.replace(/[^0-9.]/g, '');
                                                                                handleGroupPriceChange(index, 'price_ron', value);
                                                                            }}
                                                                            className={styles.groupPriceInput}
                                                                            placeholder="0.00"
                                                                        />
                                                                        <span className={styles.groupPriceCurrency}>RON</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        </>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    )}
                </div>
            </form>

            <Modal
                isOpen={showAddImageModal}
                onClose={handleModalClose}
                title={t('Add Image', 'Adauga Imagine')}
            >
                <div className={styles.modalContent}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>{t('Image URL', 'URL Imagine')}</label>
                        <Input
                            type="url"
                            placeholder={t('Image URL', 'URL Imagine')}
                            value={imageUrlInput}
                            onChange={(e) => setImageUrlInput(e.target.value)}
                            className={styles.input}
                            autoFocus
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleImageUrlAdd();
                                }
                            }}
                        />
                    </div>
                    <div className={styles.modalActions}>
                        <button
                            type="button"
                            className={styles.modalButtonPrimary}
                            onClick={handleImageUrlAdd}
                            disabled={!imageUrlInput.trim()}
                        >
                            {t('Add', 'Adauga')}
                        </button>
                        <button
                            type="button"
                            className={styles.modalButtonSecondary}
                            onClick={handleModalClose}
                        >
                            {t('Cancel', 'Anuleaza')}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Image View Modal */}
            <Modal
                isOpen={!!selectedImageForView}
                onClose={() => setSelectedImageForView(null)}
                title=""
                className={styles.imageViewModalContent}
                bodyClassName={styles.imageViewModalBody}
                hideHeader={true}
            >
                {selectedImageForView && (
                    <div className={styles.imageViewModal}>
                        <button
                            className={styles.imageViewCloseButton}
                            onClick={() => setSelectedImageForView(null)}
                            aria-label={t('Close', 'Inchide')}
                        >
                            <X size={20} />
                        </button>
                        <img
                            src={selectedImageForView}
                            alt={t('Product', 'Produs')}
                            className={styles.imageViewImage}
                        />
                    </div>
                )}
            </Modal>
        </div>
    );
}

export default function AdminProductShow(props: ProductShowPageProps) {
    return (
        <AdminLayout activeSidebarItem="products">
            <AdminProductShowContent {...props} />
        </AdminLayout>
    );
}
