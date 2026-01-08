import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getExchangeBalances } from '../services/exchange'

export type AssetType = 'crypto' | 'stock'

export interface Asset {
    id: string
    type: 'crypto' | 'stock'
    symbol: string
    amount: number
    dateAdded: number
    apiId?: string // CoinGecko API ID
    thumb?: string // Thumbnail URL
    exchangeId?: string // If auto-synced from exchange
    buyPrice?: number // Optional cost basis
}

export interface ExchangeConnection {
    id: string // internal uuid
    exchangeId: string // e.g. 'binance'
    name: string
    apiKey: string
    apiSecret: string
    passphrase?: string // Required for OKX
    lastSynced: number
    status: 'ok' | 'error'
}

interface AssetStore {
    assets: Asset[]
    exchanges: ExchangeConnection[]
    prices: Record<string, number> // Map of apiId -> current price
    exchangeRate: number // USD to TWD
    preferredCurrency: 'USD' | 'TWD'
    lastUpdated: number | null
    error: string | null
    addAsset: (asset: Omit<Asset, 'id' | 'dateAdded'>) => void
    removeAsset: (id: string) => void
    updateAsset: (id: string, updates: Partial<Asset>) => void
    setPrices: (newPrices: Record<string, number>) => void
    setExchangeRate: (rate: number) => void
    setPreferredCurrency: (currency: 'USD' | 'TWD') => void
    setLastUpdated: (timestamp: number) => void
    setError: (error: string | null) => void

    // Exchange Actions
    addExchange: (connection: Omit<ExchangeConnection, 'lastSynced' | 'status'>) => void
    removeExchange: (id: string) => void
    syncExchanges: () => Promise<void>
}

// Simple mapping for top cryptos to ensure they get prices immediately
const SYMBOL_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'USDC': 'usd-coin',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'TRX': 'tron',
    'SHIB': 'shiba-inu',
    'ARB': 'arbitrum',
    'OKB': 'okb',
    'LINK': 'chainlink',
    'DAI': 'dai',
    'ACE': 'fusionist',
    'ZKJ': 'polyhedra-network',
    'ULTI': 'ultiverse',
    'BETH': 'binance-eth',
}

export const useAssetStore = create<AssetStore>()(
    persist(
        (set, get) => ({
            assets: [],
            exchanges: [],
            prices: {},
            exchangeRate: 32.5, // Default backup
            preferredCurrency: 'USD',
            lastUpdated: null,
            error: null,
            addAsset: (asset) => set((state) => ({
                assets: [
                    ...state.assets,
                    {
                        ...asset,
                        id: crypto.randomUUID(),
                        dateAdded: Date.now(),
                    },
                ],
            })),
            removeAsset: (id) => set((state) => ({
                assets: state.assets.filter((a) => a.id !== id),
            })),
            updateAsset: (id, updates) => set((state) => ({
                assets: state.assets.map((a) =>
                    a.id === id ? { ...a, ...updates } : a
                ),
            })),
            setPrices: (newPrices) => set((state) => ({
                prices: { ...state.prices, ...newPrices }
            })),
            setExchangeRate: (rate) => set(() => ({ exchangeRate: rate })),
            setPreferredCurrency: (currency) => set(() => ({ preferredCurrency: currency })),
            setLastUpdated: (timestamp) => set(() => ({ lastUpdated: timestamp })),
            setError: (error) => set(() => ({ error: error })),

            addExchange: (connection) => set((state) => ({
                exchanges: [
                    ...state.exchanges,
                    { ...connection, lastSynced: 0, status: 'ok' }
                ]
            })),

            removeExchange: (id) => set((state) => {
                // Also remove assets associated with this exchange
                const filteredAssets = state.assets.filter(a => a.exchangeId !== id)
                return {
                    exchanges: state.exchanges.filter(e => e.id !== id),
                    assets: filteredAssets
                }
            }),

            syncExchanges: async () => {
                const state = get()
                const { exchanges, assets } = state
                const newAssets = [...assets]
                // Create a copy of exchanges to update status/lastSynced
                const newExchanges = exchanges.map(e => ({ ...e }))
                let hasChanges = false

                // Dynamic import to avoid bundling issues
                const {
                    getOKXAccountBalance,
                    getOKXFundingBalance,
                    getOKXSavingsBalance,
                    getOKXTickers
                } = await import('../services/okxApi')

                for (const conn of exchanges) {
                    try {
                        const connIdx = newExchanges.findIndex(e => e.id === conn.id)

                        // Handle OKX - Fetch Trading, Funding, and Savings
                        if (conn.exchangeId === 'okx' && conn.passphrase) {

                            // 1. Fetch all balances AND tickers in parallel
                            const [trading, funding, savings, tickers] = await Promise.all([
                                getOKXAccountBalance({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase }),
                                getOKXFundingBalance({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase }),
                                getOKXSavingsBalance({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase }),
                                getOKXTickers({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase })
                            ])

                            // 2. Aggregate balances by currency (ccy)
                            const balanceMap = new Map<string, number>()
                            const priceMap = new Map<string, number>()

                            // Helper to add to map
                            const addToMap = (ccy: string, amount: string) => {
                                const val = parseFloat(amount)
                                if (!isNaN(val) && val > 0) {
                                    balanceMap.set(ccy, (balanceMap.get(ccy) || 0) + val)
                                }
                            }

                            // Build Price Map from Tickers (CCY-USDT)
                            if (tickers && Array.isArray(tickers)) {
                                tickers.forEach(t => {
                                    if (!t.instId) return
                                    const [base, quote] = t.instId.split('-')
                                    if (quote === 'USDT' && t.last) {
                                        priceMap.set(base, parseFloat(t.last))
                                    }
                                    if (t.instId === 'USDT-USD' || t.instId === 'USDC-USD' || t.instId === 'USDC-USDT') {
                                        // Keep USDT/USDC as 1 roughly?
                                    }
                                })
                            }

                            // Force stablecoins if missing
                            if (!priceMap.has('USDT')) priceMap.set('USDT', 1)
                            if (!priceMap.has('USDC')) priceMap.set('USDC', 1)

                            trading.forEach(item => {
                                addToMap(item.ccy, item.cashBal || item.availBal || '0')
                            })
                            // (Removed duplicate garbage lines)
                            funding.forEach(item => addToMap(item.ccy, item.bal || item.availBal || '0'))
                            savings.forEach(item => addToMap(item.ccy, item.amnt || item.amt || '0'))


                            // 3. Update Assets in Store
                            const processedSymbols = new Set<string>()
                            const aggregated = Array.from(balanceMap.entries()).map(([ccy, amount]) => ({ ccy, amount }))

                            for (const { ccy, amount } of aggregated) {
                                processedSymbols.add(ccy)
                                const existingIdx = newAssets.findIndex(
                                    a => a.exchangeId === conn.id && a.symbol === ccy
                                )

                                if (existingIdx >= 0) {
                                    // Update
                                    const updatedAsset = { ...newAssets[existingIdx], amount }

                                    // Update fallback price if available
                                    if (priceMap.has(ccy)) {
                                        updatedAsset.buyPrice = priceMap.get(ccy)
                                    }

                                    if (JSON.stringify(updatedAsset) !== JSON.stringify(newAssets[existingIdx])) {
                                        newAssets[existingIdx] = updatedAsset
                                        hasChanges = true
                                    }
                                } else {
                                    // Add New
                                    const apiId = SYMBOL_MAP[ccy] || undefined
                                    newAssets.push({
                                        id: crypto.randomUUID(),
                                        type: 'crypto',
                                        symbol: ccy,
                                        amount: amount,
                                        dateAdded: Date.now(),
                                        exchangeId: conn.id,
                                        apiId: apiId,
                                        buyPrice: priceMap.get(ccy) // Set fallback price
                                    })
                                    hasChanges = true
                                }
                            }

                            // Cleanup: Remove assets that are no longer present OR the old OKX_TOTAL
                            const indicesToRemove = newAssets
                                .map((a, i) => ({ ...a, originalIndex: i }))
                                .filter(a => a.exchangeId === conn.id && (!processedSymbols.has(a.symbol) || a.symbol === 'OKX_TOTAL'))
                                .map(a => a.originalIndex)
                                .sort((a, b) => b - a)

                            for (const idx of indicesToRemove) {
                                newAssets.splice(idx, 1)
                                hasChanges = true
                            }

                            // Update connection status
                            if (connIdx >= 0) {
                                newExchanges[connIdx].lastSynced = Date.now()
                                newExchanges[connIdx].status = 'ok'
                            }
                        } else {
                            // Non-OKX exchanges: use CCXT-based approach (may need proxy fixes)
                            const balances = await getExchangeBalances(conn.exchangeId, conn.apiKey, conn.apiSecret)

                            if (connIdx >= 0) {
                                newExchanges[connIdx].lastSynced = Date.now()
                                newExchanges[connIdx].status = 'ok'
                                hasChanges = true
                            }

                            for (const item of balances) {
                                const existingIdx = newAssets.findIndex(
                                    a => a.exchangeId === conn.id && a.symbol === item.symbol
                                )

                                if (existingIdx >= 0) {
                                    if (newAssets[existingIdx].amount !== item.amount) {
                                        newAssets[existingIdx] = {
                                            ...newAssets[existingIdx],
                                            amount: item.amount
                                        }
                                        hasChanges = true
                                    }
                                } else {
                                    const apiId = SYMBOL_MAP[item.symbol] || undefined
                                    newAssets.push({
                                        id: crypto.randomUUID(),
                                        type: 'crypto',
                                        symbol: item.symbol,
                                        amount: item.amount,
                                        dateAdded: Date.now(),
                                        exchangeId: conn.id,
                                        apiId: apiId,
                                        thumb: `https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png`
                                    })
                                    hasChanges = true
                                }
                            }
                        }
                    } catch (error) {
                        console.error(`Sync failed for ${conn.name}:`, error)
                        const connIdx = newExchanges.findIndex(e => e.id === conn.id)
                        if (connIdx >= 0) {
                            newExchanges[connIdx].status = 'error'
                            newExchanges[connIdx].lastSynced = Date.now() // still update time so we know when we tried
                            hasChanges = true
                        }

                    }
                }

                if (hasChanges) {
                    set({ assets: newAssets, exchanges: newExchanges, lastUpdated: Date.now() })
                }
            }
        }),
        {
            name: 'asset-storage',
            partialize: (state) => ({
                assets: state.assets,
                exchanges: state.exchanges, // Persist keys! Be careful.
                exchangeRate: state.exchangeRate,
                preferredCurrency: state.preferredCurrency
            }),
        }
    )
)

export const selectTotalValue = (state: AssetStore) => {
    const { assets, prices, exchangeRate, preferredCurrency } = state

    // Calculate total portfolio value (in USD first)
    const totalValueUSD = assets.reduce((sum, asset) => {
        const priceKey = asset.type === 'crypto' ? asset.apiId : asset.symbol
        const price = (priceKey && prices[priceKey])
            ? prices[priceKey]
            : (asset.buyPrice ?? 0)

        // If it's a Taiwan stock (symbol ends with .TW), convert TWD to USD
        let valueUSD = price * asset.amount
        if (asset.type === 'stock' && asset.symbol.endsWith('.TW')) {
            valueUSD = valueUSD / exchangeRate
        }

        return sum + valueUSD
    }, 0)

    // Final display value based on preference
    return preferredCurrency === 'USD'
        ? totalValueUSD
        : totalValueUSD * exchangeRate
}
