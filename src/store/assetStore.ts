import { create } from 'zustand'
import { persist } from 'zustand/middleware'

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
// Simple mapping for top cryptos to ensure they get prices immediately

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

                // Dynamic import to avoid bundling issues (and because syncService imports okxApi)
                const { syncAllExchanges } = await import('../services/syncService')

                const result = await syncAllExchanges(assets, exchanges)

                if (result.hasChanges) {
                    set({
                        assets: result.assets,
                        exchanges: result.exchanges,
                        lastUpdated: Date.now()
                    })
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
        if (asset.type === 'stock' && (asset.symbol.endsWith('.TW') || asset.symbol.endsWith('.TWO'))) {
            valueUSD = valueUSD / exchangeRate
        }

        return sum + valueUSD
    }, 0)

    // Final display value based on preference
    return preferredCurrency === 'USD'
        ? totalValueUSD
        : totalValueUSD * exchangeRate
}
