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
    preferredCurrency: 'USD' | 'TWD'
    addAsset: (asset: Omit<Asset, 'id' | 'dateAdded'>) => void
    removeAsset: (id: string) => void
    updateAsset: (id: string, updates: Partial<Asset>) => void
    setPrices: (newPrices: Record<string, number>) => void
    setExchangeRate: (rate: number) => void
    setPreferredCurrency: (currency: 'USD' | 'TWD') => void
}

export const useAssetStore = create<AssetStore>()(
    persist(
        (set) => ({
            assets: [],
            prices: {},
            exchangeRate: 32.5, // Default backup
            preferredCurrency: 'USD',
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
