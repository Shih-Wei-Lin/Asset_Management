import React, { useState } from 'react'
import { useAssetStore, type Asset } from '../store/assetStore'
import { AssetDetailModal } from './AssetDetailModal'
import { Trash2, TrendingUp, TrendingDown, Bitcoin, Activity, Link2 } from 'lucide-react'
import { formatCurrency } from '../utils/format'

export const AssetList: React.FC = () => {
    const { assets, removeAsset, prices, preferredCurrency, exchangeRate, exchanges } = useAssetStore()
    const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
    const [hideSmallBalances, setHideSmallBalances] = useState(false)

    if (assets.length === 0) {
        // ... (empty state same)
        return (
            <div className="glass-card p-12 text-center text-indigo-300/60 flex flex-col items-center justify-center">
                {/* ... */}
                <div className="bg-indigo-500/10 p-4 rounded-full mb-4">
                    <Activity size={32} />
                </div>
                <p className="mb-2 text-lg font-medium text-white/80">還沒有資產</p>
                <p className="text-sm">點擊右下角的 + 按鈕來新增你的第一筆資產</p>
            </div>
        )
    }

    const filteredAssets = assets.map(asset => {
        const priceKey = asset.type === 'crypto' ? asset.apiId : asset.symbol
        const rawPrice = (priceKey && prices[priceKey]) ? prices[priceKey] : (asset.buyPrice || 0)
        let value = rawPrice * asset.amount

        // Normalize to USD for filter/sort
        if (asset.type === 'stock' && (asset.symbol.endsWith('.TW') || asset.symbol.endsWith('.TWO')) && !prices[asset.symbol]) {
            value /= exchangeRate
        }
        return { ...asset, valueUSD: value }
    })
        .filter(item => !hideSmallBalances || item.valueUSD >= 0.01)
        .sort((a, b) => b.valueUSD - a.valueUSD)

    return (
        <>
            <div className="flex justify-end mb-2">
                <button
                    onClick={() => setHideSmallBalances(!hideSmallBalances)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-all ${hideSmallBalances
                        ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                        }`}
                >
                    {hideSmallBalances ? 'Hiding < $0.01' : 'Show All'}
                </button>
            </div>

            <div className="space-y-3 pb-8">
                {filteredAssets.map((asset) => {
                    const priceKey = asset.type === 'crypto' ? asset.apiId : asset.symbol
                    const rawPrice = (priceKey && prices[priceKey])
                        ? prices[priceKey]
                        : (asset.buyPrice ?? 0)

                    // Determine Raw Value in USD
                    let valueUSD = rawPrice * asset.amount
                    if (asset.type === 'stock' && (asset.symbol.endsWith('.TW') || asset.symbol.endsWith('.TWO'))) {
                        valueUSD = valueUSD / exchangeRate
                    }

                    // Final Display Value
                    const displayValue = preferredCurrency === 'USD'
                        ? valueUSD
                        : valueUSD * exchangeRate

                    // Profit Calc (Simplified for POC - strictly comparing current vs buy in ONE currency)
                    // Note: This needs buyPrice currency metadata to be 100% accurate across currencies.
                    // For now assuming buyPrice entered matches the asset's native currency.

                    let profit = 0
                    let profitPercent = 0

                    if (asset.buyPrice) {
                        // Convert Buy Price to USD for uniform calc
                        let buyPriceUSD = asset.buyPrice
                        if (asset.type === 'stock' && (asset.symbol.endsWith('.TW') || asset.symbol.endsWith('.TWO'))) {
                            buyPriceUSD = asset.buyPrice / exchangeRate
                        }

                        const totalBuyUSD = buyPriceUSD * asset.amount
                        const diffUSD = valueUSD - totalBuyUSD

                        profit = preferredCurrency === 'USD' ? diffUSD : diffUSD * exchangeRate
                        profitPercent = (diffUSD / totalBuyUSD) * 100
                    }

                    return (
                        <div
                            key={asset.id}
                            onClick={() => setSelectedAsset(asset)}
                            className="glass-card p-4 hover:bg-white/15 transition-colors duration-200 flex justify-between items-center group relative overflow-hidden cursor-pointer"
                        >
                            {/* Synced Indicator Background Hint */}
                            {asset.exchangeId && (
                                <div className="absolute top-0 right-0 p-1 opacity-10">
                                    <Link2 size={64} />
                                </div>
                            )}

                            {/* ... (Icon & Name section same) */}
                            <div className="flex items-center gap-4 z-10">
                                {/* Asset Icon - Use thumb for crypto, flag for stock */}
                                {asset.thumb ? (
                                    <img
                                        src={asset.thumb}
                                        alt={asset.symbol}
                                        className="w-10 h-10 rounded-full"
                                    />
                                ) : (
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${asset.type === 'crypto' ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'
                                        }`}>
                                        {asset.type === 'crypto' ? <Bitcoin size={20} /> : (
                                            (asset.symbol.endsWith('.TW') || asset.symbol.endsWith('.TWO')) ? (
                                                <span className="text-xs font-bold">🇹🇼</span>
                                            ) : (
                                                <span className="text-xs font-bold">🇺🇸</span>
                                            )
                                        )}
                                    </div>
                                )}

                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-base text-white">{asset.symbol}</span>
                                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/10 text-white/50 uppercase tracking-wider">
                                            {asset.type}
                                        </span>
                                        {asset.exchangeId && (
                                            <div className="flex items-center gap-1 text-[10px] text-indigo-300 px-1.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-500/30">
                                                <Link2 size={10} />
                                                <span>{exchanges.find(e => e.id === asset.exchangeId)?.name || 'SYNCED'}</span>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-xs text-white/40 font-medium">{asset.amount.toLocaleString()} 單位</p>
                                </div>
                            </div>

                            <div className="text-right z-10">
                                <p className="font-bold text-base text-white tracking-wide">
                                    {formatCurrency(displayValue, preferredCurrency)}
                                </p>
                                <div className={`flex items-center justify-end gap-1 text-xs font-medium ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {profit >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                    <span>{profitPercent.toFixed(2)}%</span>
                                </div>
                            </div>


                            {/* Delete Action (Only for manual assets) */}
                            {!asset.exchangeId && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        if (confirm('Delete this asset?')) removeAsset(asset.id)
                                    }}
                                    className="absolute right-4 opacity-0 group-hover:opacity-100 p-2 bg-red-500/80 text-white rounded-lg transition-all translate-x-4 group-hover:translate-x-0 ml-4 shadow-lg z-20"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    )
                })}
            </div>

            {selectedAsset && (
                <AssetDetailModal
                    asset={selectedAsset}
                    onClose={() => setSelectedAsset(null)}
                />
            )}
        </>
    )
}
