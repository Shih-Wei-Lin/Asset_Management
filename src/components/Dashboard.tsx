import React, { useState, useEffect } from 'react'
import { Plus, Wallet, TrendingUp, RefreshCw } from 'lucide-react'
import { AddAssetForm } from './AddAssetForm'
import { AssetList } from './AssetList'
import { useAssetStore } from '../store/assetStore'
import { getPrices } from '../services/coingecko'
import { getStockPrices, getExchangeRate } from '../services/yahooFinance'

export const Dashboard: React.FC = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const { assets, prices, setPrices, exchangeRate, setExchangeRate } = useAssetStore()
    const [isRefreshing, setIsRefreshing] = useState(false)

    const fetchPrices = async () => {
        setIsRefreshing(true)

        // 0. Fetch Exchange Rate
        const rate = await getExchangeRate()
        setExchangeRate(rate)

        // 1. Fetch Crypto Prices
        const cryptoIds = assets
            .filter(a => a.type === 'crypto' && a.apiId)
            .map(a => a.apiId as string)

        const cryptoPrices = cryptoIds.length > 0 ? await getPrices(cryptoIds) : {}

        // 2. Fetch Stock Prices
        const stockSymbols = assets
            .filter(a => a.type === 'stock')
            .map(a => a.symbol)

        const stockPrices = stockSymbols.length > 0 ? await getStockPrices(stockSymbols) : {}

        // 3. Merge and Update Store
        setPrices({ ...cryptoPrices, ...stockPrices })
        setIsRefreshing(false)
    }

    // Initial fetch and periodic update (every 60s)
    useEffect(() => {
        fetchPrices()
        const interval = setInterval(fetchPrices, 60000)
        return () => clearInterval(interval)
    }, [assets.length]) // Refetch when assets change

    // Calculate total portfolio value (in USD)
    const totalValue = assets.reduce((sum, asset) => {
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

    // Calculate mock daily change (purely aesthetic for now)
    const isPositive = true
    const dailyChangePercent = 2.54

    return (
        <div className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto">
            {/* Header / Top Bar */}
            <div className="flex justify-between items-center py-6">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm">
                        <Wallet className="text-indigo-400" size={24} />
                    </div>
                    <span className="font-bold text-lg tracking-wide text-white/90">MyAssets</span>
                    {isRefreshing && (
                        <RefreshCw size={16} className="text-white/40 animate-spin ml-2" />
                    )}
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-500 border-2 border-white/20"></div>
            </div>

            {/* Hero Card / Total Balance */}
            <div className="glass-card p-6 mb-8 relative overflow-hidden group">
                {/* Background blobs for card */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/30 rounded-full blur-3xl group-hover:bg-purple-500/40 transition-all duration-700"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/30 rounded-full blur-3xl group-hover:bg-blue-500/40 transition-all duration-700"></div>

                <div className="relative z-10">
                    <p className="text-indigo-200 text-sm font-medium mb-1">Total Portfolio Value</p>
                    <h1 className="text-4xl font-bold text-white mb-4 tracking-tight">
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h1>

                    <div className="flex items-center gap-2 bg-white/5 w-fit px-3 py-1.5 rounded-full border border-white/5">
                        <TrendingUp size={16} className={isPositive ? 'text-emerald-400' : 'text-red-400'} />
                        <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                            +{dailyChangePercent}%
                        </span>
                        <span className="text-xs text-white/40 ml-1">Today</span>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white/90">Your Assets</h2>
                {/* <button className="text-sm text-indigo-300 hover:text-indigo-200 transition-colors">See All</button> */}
            </div>

            {/* Asset List */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <AssetList />
            </div>

            {/* FAB (Floating Action Button) */}
            <button
                onClick={() => setIsAddModalOpen(true)}
                className="fixed bottom-8 right-6 w-16 h-16 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-full shadow-lg shadow-indigo-500/40 flex items-center justify-center transition-all hover:scale-110 active:scale-95 z-20"
            >
                <Plus size={32} />
            </button>

            {/* Modal */}
            {isAddModalOpen && (
                <AddAssetForm onClose={() => setIsAddModalOpen(false)} />
            )}
        </div>
    )
}
