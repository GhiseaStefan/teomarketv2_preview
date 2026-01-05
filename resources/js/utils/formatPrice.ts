/**
 * Formats a price string or number with:
 * - Comma (,) as decimal separator
 * - Dot (.) as thousands separator
 * 
 * @param price - Price as string or number
 * @returns Formatted price string (e.g., "1.234,56")
 */
export function formatPrice(price: string | number): string {
    // Convert to number first to handle any string formatting
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    // Check if it's a valid number
    if (isNaN(numPrice)) {
        return String(price);
    }
    
    // Split into integer and decimal parts
    const parts = numPrice.toFixed(2).split('.');
    const integerPart = parts[0];
    const decimalPart = parts[1];
    
    // Add thousands separator (dot) to integer part
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    
    // Combine with comma as decimal separator
    return `${formattedInteger},${decimalPart}`;
}
