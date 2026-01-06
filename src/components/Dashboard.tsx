import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { AddAssetForm } from './AddAssetForm'
import { AssetList } from './AssetList'
import { useAssetStore } from '../store/assetStore'

export const Dashboard: React.FC = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const assets = useAssetStore((state) => state.assets)

    // Calculate total portfolio value
    const totalValue = assets.reduce((sum, asset) => {
        return sum + (asset.buyPrice * asset.amount) // TODO: Use real price
    }, 0)

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900 pb-20">
            {/* Header */}
            <div className="bg-white dark:bg-zinc-800 p-6 sticky top-0 z-10 shadow-sm border-b border-zinc-200 dark:border-zinc-700">
                <div className="max-w-md mx-auto">
                    <h1 className="text-zinc-500 dark:text-zinc-400 text-sm font-medium mb-1">總資產價值</h1>
                    <p className="text-3xl font-bold text-zinc-900 dark:text-white">
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-md mx-auto p-4">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-zinc-900 dark:text-white">您的資產</h2>
                </div>

                <AssetList />
            </div>

            {/* FAB (Floating Action Button) */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
            >
                <Plus size={28} />
            </button>

            {/* Modal */}
            {isAddModalOpen && (
                <AddAssetForm onClose={() => setIsAddModalOpen(false)} />
            )}
        </div>
    )
}
