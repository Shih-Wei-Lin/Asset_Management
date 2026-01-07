const BASE_URL = 'https://api.coingecko.com/api/v3'

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
        // CoinGecko allows multiple IDs separated by comma
        const idsParam = idsToFetch.join(',')
        const response = await fetch(`${BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd`)
        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()

        // 3. Update cache and result
        for (const id of idsToFetch) {
            if (data[id] && data[id].usd) {
                const price = data[id].usd
                result[id] = price
                priceCache[id] = { value: price, timestamp: now }
            }
        }

        return result
    } catch (error) {
        console.error('CoinGecko Price Error:', error)
        // In case of error, try to return stale cache if available for the requested IDs
        idsToFetch.forEach(id => {
            if (priceCache[id]) result[id] = priceCache[id].value
        })
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
