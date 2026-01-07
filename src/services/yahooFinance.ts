
// Yahoo Finance API via CORS Proxy
// Note: This is a free endpoint and might be rate-limited.
// Using https://corsproxy.io/ to bypass CORS restrictions on client-side.

// Alternative proxies if one fails:
// https://api.allorigins.win/get?url=
// https://cors-anywhere.herokuapp.com/ (requires request access)

const PROXY_URL = 'https://corsproxy.io/?'
const YAHOO_BASE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart'

export const getStockPrice = async (symbol: string): Promise<number | null> => {
    try {
        // Encode the target URL
        const targetUrl = encodeURIComponent(`${YAHOO_BASE_URL}/${symbol}?interval=1d&range=1d`)
        const response = await fetch(`${PROXY_URL}${targetUrl}`)

        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
        const result = data.chart.result[0]

        if (!result || !result.meta || !result.meta.regularMarketPrice) {
            return null
        }

        return result.meta.regularMarketPrice
    } catch (error) {
        console.error(`Error fetching price for ${symbol}:`, error)
        return null
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
    try {
        // Map common ranges to Yahoo API format
        // valid ranges: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
        const interval = range === '1d' ? '30m' : '1d' // 30m for intraday, 1d for longer

        const targetUrl = encodeURIComponent(`${YAHOO_BASE_URL}/${symbol}?interval=${interval}&range=${range}`)
        const response = await fetch(`${PROXY_URL}${targetUrl}`)

        if (!response.ok) throw new Error('Network response was not ok')

        const data = await response.json()
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

        return chartData
    } catch (error) {
        console.error(`Error fetching chart for ${symbol}:`, error)
        return []
    }
}

export const getExchangeRate = async (): Promise<number> => {
    try {
        const price = await getStockPrice('USDTWD=X')
        return price || 32.5
    } catch (e) {
        console.error('Error fetching exchange rate')
        return 32.5
    }
}
