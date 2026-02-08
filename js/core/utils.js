// utils.js - Zero-dependency utility functions

// Parse length (null for empty, "-", or non-numeric)
export function parseLength(lengthStr) {
    // Handle numeric input (from Excel)
    if (typeof lengthStr === 'number') {
        return isNaN(lengthStr) ? null : lengthStr;
    }
    // Handle string input (from CSV/XML)
    if (!lengthStr || lengthStr.trim() === '' || lengthStr === '-') {
        return null;
    }
    const num = parseFloat(lengthStr);
    return isNaN(num) ? null : num;
}

// Convert decimal to fractional (1/16" increments with reduction)
export function decimalToFractional(decimal) {
    if (decimal === null) return '';

    // Round to nearest 1/16"
    const sixteenths = Math.round(decimal * 16);
    const wholePart = Math.floor(sixteenths / 16);
    const fractionalPart = sixteenths % 16;

    // No fraction
    if (fractionalPart === 0) {
        return wholePart + '"';
    }

    // Reduce fraction using GCD
    const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
    const divisor = gcd(fractionalPart, 16);
    const numerator = fractionalPart / divisor;
    const denominator = 16 / divisor;

    // Format
    if (wholePart === 0) {
        return `${numerator}/${denominator}"`;
    } else {
        return `${wholePart}-${numerator}/${denominator}"`;
    }
}

// Get parent level from level string
export function getParentLevel(level) {
    const parts = level.split('.');
    if (parts.length === 1) return null;
    return parts.slice(0, -1).join('.');
}

// Generate composite key
export function getCompositeKey(partNumber, length) {
    if (length === null) {
        return partNumber;
    }
    return `${partNumber}|${length}`;
}

// Create word-level diff highlighting
export function createDiff(oldText, newText) {
    if (!oldText && !newText) return { old: '-', new: '-' };
    if (!oldText) return { old: '-', new: newText };
    if (!newText) return { old: oldText, new: '-' };
    if (oldText === newText) return { old: oldText, new: newText };

    // Split into words
    const oldWords = oldText.split(/\s+/);
    const newWords = newText.split(/\s+/);

    // Find common and different words
    const oldSet = new Set(oldWords);
    const newSet = new Set(newWords);

    // Build highlighted versions
    let oldHtml = oldWords.map(word => {
        if (!newSet.has(word)) {
            return `<span class="diff-removed">${word}</span>`;
        }
        return word;
    }).join(' ');

    let newHtml = newWords.map(word => {
        if (!oldSet.has(word)) {
            return `<span class="diff-added">${word}</span>`;
        }
        return word;
    }).join(' ');

    return { old: oldHtml, new: newHtml };
}
