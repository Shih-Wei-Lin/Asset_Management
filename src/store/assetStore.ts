import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AssetType = 'crypto' | 'stock'

export interface Asset {
    id: string
    symbol: string
    name: string
    type: AssetType
    amount: number
    buyPrice?: number
    dateAdded: string
    apiId?: string // CoinGecko ID (e.g. 'bitcoin')
    note?: string  // User note for this asset
    thumb?: string // Thumbnail URL for crypto icons
}

interface AssetStore {
    assets: Asset[]
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
}

export const useAssetStore = create<AssetStore>()(
    persist(
        (set) => ({
            assets: [],
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
                        dateAdded: new Date().toISOString(),
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
        }),
        {
            name: 'asset-storage',
            partialize: (state) => ({
                assets: state.assets,
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
