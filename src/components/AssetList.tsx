import React from 'react'
import { useAssetStore } from '../store/assetStore'
import { Trash2, TrendingUp, TrendingDown, Bitcoin, Activity } from 'lucide-react'

export const AssetList: React.FC = () => {
    const { assets, removeAsset, prices } = useAssetStore()

    if (assets.length === 0) {
        return (
            <div className="glass-card p-12 text-center text-indigo-300/60 flex flex-col items-center justify-center">
                <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
                    <Activity size={32} />
                </div>
                <p className="mb-2 text-lg font-medium text-white/80">No assets yet</p>
                <p className="text-sm">Tap the + button to add your first asset</p>
            </div>
        )
    }

    return (
        <div className="space-y-3 pb-8">
            {assets.map((asset) => {
                const priceKey = asset.type === 'crypto' ? asset.apiId : asset.symbol
                const currentPrice = (priceKey && prices[priceKey])
                    ? prices[priceKey]
                    : (asset.buyPrice ?? 0)
                const totalValue = currentPrice * asset.amount
                const profit = asset.buyPrice ? (currentPrice - asset.buyPrice) * asset.amount : 0
                const profitPercent = asset.buyPrice && asset.buyPrice !== 0 ? (profit / (asset.buyPrice * asset.amount)) * 100 : 0

                // Currency check
                const isTWD = asset.type === 'stock' && asset.symbol.endsWith('.TW')
                const currencySymbol = isTWD ? 'NT$' : '$'

                return (
                    <div
                        key={asset.id}
                        className="glass-card p-4 hover:bg-white/15 transition-colors duration-200 flex justify-between items-center group"
                    >
                        <div className="flex items-center gap-4">
                            {/* Icon Placeholder */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                                }`}>
                                {asset.type === 'crypto' ? <Bitcoin size={20} /> : <Activity size={20} />}
                            </div>

                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-base text-white">{asset.symbol}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/50 uppercase tracking-wider">
                                        {asset.type}
                                    </span>
                                </div>
                                <p className="text-xs text-white/40 font-medium">{asset.amount.toLocaleString()} units</p>
                            </div>
                        </div>

                        <div className="text-right">
                            <p className="font-bold text-base text-white tracking-wide">
                                {currencySymbol}{totalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </p>
                            <div className={`flex items-center justify-end gap-1 text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                <span>{profitPercent.toFixed(2)}%</span>
                            </div>
                        </div>


                        {/* Delete Action (Hidden by default, visible on hover/focus) */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation()
                                if (confirm('Delete this asset?')) removeAsset(asset.id)
                            }}
                            className="absolute right-4 opacity-0 group-hover:opacity-100 p-2 bg-red-500/80 text-white rounded-lg transition-all translate-x-4 group-hover:translate-x-0 ml-4 shadow-lg"
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
