// Utility functions for formatting

/**
 * Format large numbers for display (e.g., 1,234,567 -> 1.23M)
 */
export const formatNumber = (num: number, decimals: number = 2): string => {
    if (num === 0) return '0'

    const absNum = Math.abs(num)
    const sign = num < 0 ? '-' : ''

    if (absNum >= 1_000_000_000) {
        return sign + (absNum / 1_000_000_000).toFixed(decimals) + 'B'
    }
    if (absNum >= 1_000_000) {
        return sign + (absNum / 1_000_000).toFixed(decimals) + 'M'
    }
    if (absNum >= 10_000) {
        return sign + (absNum / 1_000).toFixed(decimals) + 'K'
    }

    return sign + absNum.toLocaleString(undefined, {
        maximumFractionDigits: decimals
    })
}

/**
 * Format currency with symbol
 */
export const formatCurrency = (
    value: number,
    currency: 'USD' | 'TWD' = 'USD',
    compact: boolean = false
): string => {
    const symbol = currency === 'USD' ? '$' : 'NT$'

    if (compact) {
        return symbol + formatNumber(value, 1)
    }

    return symbol + value.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })
}
