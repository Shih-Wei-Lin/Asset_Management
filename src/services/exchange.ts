// import ccxt from 'ccxt' // Removing import to use CDN version

// Declare global ccxt from CDN
const ccxt = (window as any).ccxt

if (!ccxt) {
    console.error('CCXT library not loaded from CDN!')
}

// Map of supported exchanges and their display names
// We can expand this list as needed
export const SUPPORTED_EXCHANGES = [
    { id: 'binance', name: 'Binance' },
    { id: 'okx', name: 'OKX' },
    { id: 'bybit', name: 'Bybit' },
    { id: 'kraken', name: 'Kraken' },
]

export interface ExchangeAsset {
    symbol: string
    amount: number
    free: number
    used: number
}

// Proxy configuration to bypass CORS in browser environment
const PROXY_URL = 'https://corsproxy.io/?'

export const checkExchangeConnection = async (exchangeId: string, apiKey: string, apiSecret: string): Promise<boolean> => {
    try {
        // Dynamic instantiation based on exchangeId
        const exchangeClass = (ccxt as any)[exchangeId]
        if (!exchangeClass) throw new Error(`Exchange ${exchangeId} not supported`)

        const exchange = new exchangeClass({
            apiKey: apiKey,
            secret: apiSecret,
            proxy: PROXY_URL,
            enableRateLimit: true,
        })

        // Try to fetch balance as a connectivity check
        await exchange.fetchBalance()
        return true
    } catch (error) {
        console.error(`Failed to connect to ${exchangeId}:`, error)
        return false
    }
}

export const getExchangeBalances = async (exchangeId: string, apiKey: string, apiSecret: string): Promise<ExchangeAsset[]> => {
    try {
        const exchangeClass = (ccxt as any)[exchangeId]
        if (!exchangeClass) throw new Error(`Exchange ${exchangeId} not supported`)

        const exchange = new exchangeClass({
            apiKey: apiKey,
            secret: apiSecret,
            proxy: PROXY_URL,
            enableRateLimit: true,
        })

        const balance = await exchange.fetchBalance()
        // const items = balance.info ? balance.info.balances : balance.total // generic fallback

        // Normalize data (ccxt usually normalizes to .total, .free, .used)
        // We iterate over the 'total' object which contains non-zero balances for many exchanges in ccxt
        const result: ExchangeAsset[] = []

        // CCXT unified response structure
        if (balance && balance.total) {
            Object.entries(balance.total).forEach(([symbol, amount]) => {
                const val = amount as number
                if (val > 0) {
                    result.push({
                        symbol: symbol,
                        amount: val,
                        free: (balance.free as any)[symbol] || 0,
                        used: (balance.used as any)[symbol] || 0
                    })
                }
            })
        }

        return result
    } catch (error) {
        console.error(`Error fetching balance from ${exchangeId}:`, error)
        throw error
    }
}
