const BASE_URL = 'https://api.coingecko.com/api/v3'

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

    try {
        // CoinGecko allows multiple IDs separated by comma
        const idsParam = ids.join(',')
        const response = await fetch(`${BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=usd`)
        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        // Transform: { "bitcoin": { "usd": 50000 } } -> { "bitcoin": 50000 }
        const prices: Record<string, number> = {}
        for (const id of ids) {
            if (data[id] && data[id].usd) {
                prices[id] = data[id].usd
            }
        }
    return prices
  } catch (error) {
    console.error('CoinGecko Price Error:', error)
    return {}
  }
}

export const getMarketChart = async (id: string, days: number): Promise<[number, number][]> => {
  try {
    const response = await fetch(`${BASE_URL}/coins/${id}/market_chart?vs_currency=usd&days=${days}`)
    if (!response.ok) throw new Error('Network response was not ok')
    
    const data = await response.json()
    return data.prices || [] // Array of [timestamp, price]
  } catch (error) {
    console.error('CoinGecko Chart Error:', error)
    return []
  }
}
