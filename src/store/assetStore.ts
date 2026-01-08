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


                for (const conn of exchanges) {
                    try {
                        const balances = await getExchangeBalances(conn.exchangeId, conn.apiKey, conn.apiSecret)

                        // Update connection status on success
                        const connIdx = newExchanges.findIndex(e => e.id === conn.id)
                        if (connIdx >= 0) {
                            newExchanges[connIdx].lastSynced = Date.now()
                            newExchanges[connIdx].status = 'ok'
                            hasChanges = true // Mark as changed to ensure we save the status update
                        }


                        for (const item of balances) {
                            // Find existing asset for this exchange & symbol
                            const existingIdx = newAssets.findIndex(
                                a => a.exchangeId === conn.id && a.symbol === item.symbol
                            )

                            if (existingIdx >= 0) {
                                // Update amount if changed
                                if (newAssets[existingIdx].amount !== item.amount) {
                                    newAssets[existingIdx] = {
                                        ...newAssets[existingIdx],
                                        amount: item.amount
                                    }
                                    hasChanges = true
                                }
                            } else {
                                // Create new asset
                                // Try to map symbol to Coingecko ID
                                const apiId = SYMBOL_MAP[item.symbol] || undefined

                                newAssets.push({
                                    id: crypto.randomUUID(),
                                    type: 'crypto',
                                    symbol: item.symbol,
                                    amount: item.amount,
                                    dateAdded: Date.now(),
                                    exchangeId: conn.id,
                                    apiId: apiId,
                                    // Use a placeholder thumb or define logic to fetch it later
                                    thumb: `https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png` // Generic fallback or we could try to find one
                                })
                                hasChanges = true
                            }
                        }
                    } catch (error) {
                        console.error(`Sync failed for ${conn.name}:`, error)
                        // Update connection status to error
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
