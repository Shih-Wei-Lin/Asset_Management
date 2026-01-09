// Yahoo Finance API via CORS Proxy
// Note: This is a free endpoint and might be rate-limited.
// Using multiple CORS proxies as fallback options.

// Cache configuration
const CACHE_TTL = 60 * 1000 // 60 seconds
const priceCache: Record<string, { value: number, timestamp: number }> = {}
const chartCache: Record<string, { data: [number, number][], timestamp: number }> = {}

const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

// List of proxy options (ordered by preference)
const PROXY_OPTIONS = [
    // 1. Private Cloudflare Worker (Primary)
    (url: string) => `https://frosty-block-56bd.sean7115.workers.dev/?${encodeURIComponent(url)}`,
    // 2. AllOrigins (Backup 1)
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    // 3. CORS Anywhere alternative
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
]

// Helper to fetch with fallback through multiple proxies
const fetchWithFallback = async (targetUrl: string): Promise<any> => {
    let lastError: Error | null = null

    for (let i = 0; i < PROXY_OPTIONS.length; i++) {
        try {
            const proxyUrl = PROXY_OPTIONS[i](targetUrl)
            const response = await fetch(proxyUrl)

            if (response.ok) {
                const text = await response.text()
                // Handle allorigins.win which might return wrapped content
                try {
                    const data = JSON.parse(text)
                    // Check if it's wrapped by allorigins (has 'contents' field)
                    if (data.contents && typeof data.contents === 'string') {
                        return JSON.parse(data.contents)
                    }
                    return data
                } catch {
                    // If parsing fails, try as plain JSON
                    return JSON.parse(text)
                }
            }
        } catch (e) {
            console.warn(`Proxy ${i + 1} failed:`, e)
            lastError = e as Error
        }
    }

    throw lastError || new Error('All proxies failed')
}

export const getStockPrice = async (symbol: string): Promise<number | null> => {
    // Check cache
    const now = Date.now()
    const cached = priceCache[symbol]
    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.value
    }

    try {
        const targetUrl = `${YAHOO_BASE_URL}/${symbol}?interval=1d&range=1d`
        const data = await fetchWithFallback(targetUrl)
        const result = data.chart.result[0]

        if (!result || !result.meta || !result.meta.regularMarketPrice) {
            return null
        }

        const price = result.meta.regularMarketPrice

        // Update cache
        priceCache[symbol] = { value: price, timestamp: now }

        return price
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
        return cached ? cached.value : null
    }
}

export const getStockPrices = async (symbols: string[]): Promise<Record<string, number>> => {
    const prices: Record<string, number> = {}

    // Yahoo Finance V8 Chart API doesn't support batch well in this specific endpoint format for simple prices 
    // without a more complex query. We'll fetch in parallel for now.
    // In production with a real backend, we'd use a server-side proxy or a better API provider.

    const promises = symbols.map(async (symbol) => {
        const price = await getStockPrice(symbol)
        if (price !== null) {
            prices[symbol] = price
        }
    })

    await Promise.all(promises)
    return prices
}

export const getStockChart = async (symbol: string, range: '1d' | '5d' | '1mo' | '1y' = '1mo'): Promise<[number, number][]> => {
    const cacheKey = `${symbol}_${range}`
    const now = Date.now()
    const cached = chartCache[cacheKey]

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.data
    }

    try {
        // Map common ranges to Yahoo API format
        // valid ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
        const interval = range === '1d' ? '30m' : '1d' // 30m for intraday, 1d for longer

        const targetUrl = `${YAHOO_BASE_URL}/${symbol}?interval=${interval}&range=${range}`
        const data = await fetchWithFallback(targetUrl)
        const result = data.chart.result[0]

        if (!result || !result.timestamp || !result.indicators.quote[0]) {
            return []
        }

        const timestamps = result.timestamp
        const prices = result.indicators.quote[0].close

        // Zip timestamp and price, filter out nulls
        const chartData: [number, number][] = []
        for (let i = 0; i < timestamps.length; i++) {
            if (prices[i] !== null && prices[i] !== undefined) {
                // Yahoo timestamps are seconds, convert to ms
                chartData.push([timestamps[i] * 1000, prices[i]])
            }
        }

        // Update cache
        chartCache[cacheKey] = { data: chartData, timestamp: now }

        return chartData
    } catch (error) {
        console.error(`Error fetching chart for ${symbol}:`, error)
        return cached ? cached.data : []
    }
}

export const getExchangeRate = async (): Promise<number> => {
    // Determine a key for caching exchange rate
    const cacheKey = 'USDTWD=X'
    const now = Date.now()
    const cached = priceCache[cacheKey]

    if (cached && (now - cached.timestamp < CACHE_TTL)) {
        return cached.value
    }

    try {
        const price = await getStockPrice('USDTWD=X')
        const rate = price || 32.5

        // Cache is already handled inside getStockPrice, but since we default to 32.5 on failure,
        // we might want to ensure we don't hammer it if it fails. 
        // But getStockPrice handles caching on success. 

        return rate
    } catch (e) {
        console.error('Error fetching exchange rate')
        return cached ? cached.value : 32.5
    }
}

export interface StockSearchResult {
    symbol: string
    name: string
    exch: string
    type: string
    exchDisp: string
    typeDisp: string
}

export const searchStocks = async (query: string): Promise<StockSearchResult[]> => {
    if (!query || query.length < 1) return []

    try {
        // Yahoo Finance Autocomplete API
        const targetUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`
        const data = await fetchWithFallback(targetUrl)

        if (!data || !data.quotes) return []

        return data.quotes
            .filter((quote: any) => quote.quoteType === 'EQUITY' || quote.quoteType === 'ETF')
            .map((quote: any) => ({
                symbol: quote.symbol,
                name: quote.shortname || quote.longname || quote.symbol,
                exch: quote.exchange,
                type: quote.quoteType,
                exchDisp: quote.exchDisp,
                typeDisp: quote.typeDisp
            }))
    } catch (error) {
        console.error('Error searching stocks:', error)
        return []
    }
}
