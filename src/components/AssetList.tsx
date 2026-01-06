import React from 'react'
import { useAssetStore } from '../store/assetStore'
import { Trash2, TrendingUp, TrendingDown } from 'lucide-react'

export const AssetList: React.FC = () => {
    const { assets, removeAsset } = useAssetStore()

    if (assets.length === 0) {
        return (
            <div className="text-center py-12 text-zinc-500 dark:text-zinc-400">
                <p className="mb-2">尚無資產</p>
                <p className="text-sm">點擊按鈕新增您的第一筆資產</p>
            </div>
        )
    }

    // Calculate total value (mock current price = buy price * 1.1 for demo until API connected)
    // In real app, we would fetch current prices

    return (
        <div className="space-y-4">
            {assets.map((asset) => {
                const currentPrice = asset.buyPrice // TODO: Fetch real price
                const totalValue = currentPrice * asset.amount
                const profit = (currentPrice - asset.buyPrice) * asset.amount
                const profitPercent = 0 // Mock

                return (
                    <div
                        key={asset.id}
                        className="bg-white dark:bg-zinc-800 p-4 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-700 flex justify-between items-center"
                    >
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-lg text-zinc-900 dark:text-white">{asset.symbol}</span>
                                <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                    {asset.type === 'crypto' ? 'Crypto' : 'Stock'}
                                </span>
                            </div>
                            <p className="text-sm text-zinc-500 dark:text-zinc-400">{asset.name}</p>
                            <div className="mt-2 text-xs text-zinc-400">
                                持倉: {asset.amount.toLocaleString()} | 均價: ${asset.buyPrice.toLocaleString()}
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="font-bold text-lg text-zinc-900 dark:text-white">
                                ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <div className={`flex items-center justify-end gap-1 text-sm ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                                {profit >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                                <span>{profitPercent.toFixed(2)}%</span>
                            </div>
                            <button
                                onClick={() => removeAsset(asset.id)}
                                className="mt-2 text-zinc-400 hover:text-red-500 p-1"
                                aria-label="Remove asset"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
