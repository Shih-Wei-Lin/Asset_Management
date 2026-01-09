const BASE_URL = 'https://api.coingecko.com/api/v3'
const COINCAP_URL = 'https://api.coincap.io/v2'

// Symbol to CoinCap ID mapping for common coins
const COINCAP_ID_MAP: Record<string, string> = {
    'bitcoin': 'bitcoin',
    'ethereum': 'ethereum',
    'tether': 'tether',
    'binancecoin': 'binance-coin',
    'solana': 'solana',
    'ripple': 'xrp',
    'usd-coin': 'usd-coin',
    'cardano': 'cardano',
    'dogecoin': 'dogecoin',
    'tron': 'tron',
    'shiba-inu': 'shiba-inu',
    'chainlink': 'chainlink',
    'dai': 'multi-collateral-dai',
    'okb': 'okb',
}

// Cache configuration
const CACHE_TTL = 60 * 1000 // 60 seconds
const priceCache: Record<string, { value: number, timestamp: number }> = {}
const chartCache: Record<string, { data: [number, number][], timestamp: number }> = {}

export interface CoinSearchResult {
    id: string
    name: string
    symbol: string
    thumb: string
}

export const searchCoins = async (query: string): Promise<CoinSearchResult[]> => {
    if (!query || query.length < 2) return []

    try {
        const response = await fetch(`${BASE_URL}/search?query=${encodeURIComponent(query)}`)
        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        return data.coins || []
    } catch (error) {
        console.error('CoinGecko Search Error:', error)
        return []
    }
}

// Primary: CoinGecko
const getPricesFromCoinGecko = async (ids: string[]): Promise<Record<string, number>> => {
    const idsParam = ids.join(',')
    const response = await fetch(`${BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd`)
    if (!response.ok) throw new Error('CoinGecko API failed')

    const data = await response.json()
    const result: Record<string, number> = {}

    for (const id of ids) {
        if (data[id]?.usd) {
            result[id] = data[id].usd
        }
    }
    return result
}

// Backup: CoinCap
const getPricesFromCoinCap = async (ids: string[]): Promise<Record<string, number>> => {
    const result: Record<string, number> = {}

    // CoinCap doesn't support batch requests, so we fetch individually
    // But we can use the /assets endpoint to get all at once
    const response = await fetch(`${COINCAP_URL}/assets?limit=100`)
    if (!response.ok) throw new Error('CoinCap API failed')

    const data = await response.json()
    const assets = data.data || []

    // Create a map of CoinCap ID to price
    const priceMap: Record<string, number> = {}
    for (const asset of assets) {
        priceMap[asset.id] = parseFloat(asset.priceUsd)
    }

    // Map CoinGecko IDs to CoinCap IDs and get prices
    for (const id of ids) {
        const coinCapId = COINCAP_ID_MAP[id]
        if (coinCapId && priceMap[coinCapId]) {
            result[id] = priceMap[coinCapId]
        }
    }

    return result
}

export const getPrices = async (ids: string[]): Promise<Record<string, number>> => {
    if (ids.length === 0) return {}

    const now = Date.now()
    const result: Record<string, number> = {}
    const idsToFetch: string[] = []

    // 1. Check cache
    ids.forEach(id => {
        const cached = priceCache[id]
        if (cached && (now - cached.timestamp < CACHE_TTL)) {
            result[id] = cached.value
        } else {
            idsToFetch.push(id)
        }
    })

    // 2. If all cached, return immediately
    if (idsToFetch.length === 0) {
        return result
    }

    try {
        // Try CoinGecko first
        const geckoResult = await getPricesFromCoinGecko(idsToFetch)

        for (const id of idsToFetch) {
            if (geckoResult[id]) {
                result[id] = geckoResult[id]
                priceCache[id] = { value: geckoResult[id], timestamp: now }
            }
        }

        // Check if any IDs are still missing
        const missingIds = idsToFetch.filter(id => !result[id])
        if (missingIds.length > 0) {
            console.warn('CoinGecko missing some IDs, trying CoinCap fallback:', missingIds)
            const coinCapResult = await getPricesFromCoinCap(missingIds)
            for (const id of missingIds) {
                if (coinCapResult[id]) {
                    result[id] = coinCapResult[id]
                    priceCache[id] = { value: coinCapResult[id], timestamp: now }
                }
            }
        }

        return result
    } catch (error) {
        console.error('CoinGecko Price Error, trying CoinCap fallback:', error)

        // Fallback to CoinCap
        try {
            const coinCapResult = await getPricesFromCoinCap(idsToFetch)
            for (const id of idsToFetch) {
                if (coinCapResult[id]) {
                    result[id] = coinCapResult[id]
                    priceCache[id] = { value: coinCapResult[id], timestamp: now }
                }
            }
        } catch (fallbackError) {
            console.error('CoinCap fallback also failed:', fallbackError)
            // Return stale cache if available
            idsToFetch.forEach(id => {
                if (priceCache[id]) result[id] = priceCache[id].value
            })
        }

        return result
    }
}

export const getMarketChart = async (id: string, days: number): Promise<[number, number][]> => {
    const cacheKey = `${id}_${days}`
    const now = Date.now()
    const cached = chartCache[cacheKey]

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data
    }

    try {
        const response = await fetch(`${BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`)
        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        const prices = data.prices || []

        // Update cache
        chartCache[cacheKey] = { data: prices, timestamp: now }

        return prices
    } catch (error) {
        console.error('CoinGecko Chart Error:', error)
        return cached ? cached.data : []
    }
}
