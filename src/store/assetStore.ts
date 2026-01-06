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
}

interface AssetStore {
    assets: Asset[]
    prices: Record<string, number> // Map of apiId -> current price
    exchangeRate: number // USD to TWD
    addAsset: (asset: Omit<Asset, 'id' | 'dateAdded'>) => void
    removeAsset: (id: string) => void
    updateAsset: (id: string, updates: Partial<Asset>) => void
    setPrices: (newPrices: Record<string, number>) => void
    setExchangeRate: (rate: number) => void
}

export const useAssetStore = create<AssetStore>()(
    persist(
        (set) => ({
            assets: [],
            prices: {}, \n            exchangeRate: 32.5, // Default backup
            addAsset: (asset) => set((state) => ({ \n                assets: [\n                    ...state.assets, \n                    { \n                        ...asset, \n                        id: crypto.randomUUID(), \n                        dateAdded: new Date().toISOString(), \n }, \n], \n })),
            removeAsset: (id) => set((state) => ({ \n                assets: state.assets.filter((a) => a.id !== id), \n })),
            updateAsset: (id, updates) => set((state) => ({ \n                assets: state.assets.map((a) => \n                    a.id === id ? { ...a, ...updates } : a\n), \n })),
            setPrices: (newPrices) => set((state) => ({ \n                prices: { ...state.prices, ...newPrices }\n })),
            setExchangeRate: (rate) => set(() => ({ exchangeRate: rate })),
        }),
        {
            name: 'asset-storage',
            partialize: (state) => ({ assets: state.assets, exchangeRate: state.exchangeRate }), // Persist rate too
        }
    )
)
