import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AssetType = 'crypto' | 'stock'

export interface Asset {
    id: string
    symbol: string
    name: string
    type: AssetType
    amount: number
    buyPrice: number
    dateAdded: string
}

interface AssetStore {
    assets: Asset[]
    addAsset: (asset: Omit<Asset, 'id' | 'dateAdded'>) => void
    removeAsset: (id: string) => void
    updateAsset: (id: string, updates: Partial<Asset>) => void
}

export const useAssetStore = create<AssetStore>()(
    persist(
        (set) => ({
            assets: [],
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
        }),
        {
            name: 'asset-storage', // name of the item in the storage (must be unique)
        }
    )
)
