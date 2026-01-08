import React, { useState, useEffect } from 'react'
import { Plus, Wallet, TrendingUp, RefreshCw, AlertCircle } from 'lucide-react'
import { AddAssetForm } from './AddAssetForm'
import { AssetList } from './AssetList'
import { PortfolioChart, type TimeRange } from './PortfolioChart'
import { AllocationChart } from './AllocationChart'
import { useAssetStore, selectTotalValue } from '../store/assetStore'
import { getPrices } from '../services/coingecko'
import { getStockPrices, getExchangeRate } from '../services/yahooFinance'


export const Dashboard: React.FC = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const {
        assets,
        prices,
        setPrices,
        exchangeRate,
        setExchangeRate,
        preferredCurrency,
        setPreferredCurrency,
        lastUpdated,
        error,
        setLastUpdated,
        setError
    } = useAssetStore()
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [chartRange, setChartRange] = useState<TimeRange>('1M')

    // Use selector for consistent total value calculation
    const displayValue = selectTotalValue({ assets, prices, exchangeRate, preferredCurrency, lastUpdated, error, addAsset: () => { }, removeAsset: () => { }, updateAsset: () => { }, setPrices: () => { }, setExchangeRate: () => { }, setPreferredCurrency: () => { }, setLastUpdated: () => { }, setError: () => { } })

    const fetchPrices = async () => {
        setIsRefreshing(true)
        setError(null)

        try {
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
            setLastUpdated(Date.now())
        } catch (err) {
            console.error('Failed to update prices:', err)
            setError('Failed to update prices. Using cached data.')
        } finally {
            setIsRefreshing(false)
        }
    }

    // Initial fetch and periodic update (every 60s)
    useEffect(() => {
        fetchPrices()
        const interval = setInterval(fetchPrices, 60000)
        return () => clearInterval(interval)
    }, [assets.length])

    // Calculate mock daily change (purely aesthetic for now)
    const isPositive = true
    const dailyChangePercent = 2.54

    return (
        <div className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto">
            {/* Header / Top Bar */}
            <div className="flex flex-col gap-4 py-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-indigo-500/20 p-2 rounded-lg backdrop-blur-sm">
                            <Wallet className="text-indigo-400" size={24} />
                        </div>
                        <div>
                            <span className="font-bold text-lg tracking-wide text-white/90">我的資產</span>
                            {lastUpdated && (
                                <p className="text-[10px] text-white/40">
                                    Update: {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            )}
                        </div>
                        {isRefreshing && (
                            <RefreshCw size={14} className="text-white/40 animate-spin ml-1" />
                        )}
                    </div>
                    {/* Currency Toggle */}
                    <button
                        onClick={() => setPreferredCurrency(preferredCurrency === 'USD' ? 'TWD' : 'USD')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center text-[10px] font-bold text-white">
                            {preferredCurrency === 'USD' ? '$' : 'NT'}
                        </div>
                        <span className="text-xs font-semibold text-white/80">{preferredCurrency}</span>
                    </button>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-2 text-red-200 text-xs animate-fade-in">
                        <AlertCircle size={14} className="shrink-0" />
                        <span>{error}</span>
                    </div>
                )}
            </div>

            {/* Hero Card / Total Balance */}
            <div className="glass-card mb-8 relative overflow-hidden group min-h-[220px] flex flex-col justify-between p-0">

                {/* Chart Background Layer */}
                <div className="absolute inset-0 z-0 opacity-50 translate-y-8 pointer-events-none sm:pointer-events-auto">
                    <PortfolioChart range={chartRange} />
                </div>

                {/* Background blobs for card (moved behind chart slightly or blended) */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl transition-all duration-700 pointer-events-none"></div>
                <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl transition-all duration-700 pointer-events-none"></div>

                {/* Main Content Area */}
                <div className="relative z-10 p-6 flex flex-col h-full justify-between">

                    {/* Top Row: Label and Time Range */}
                    <div className="flex justify-between items-start">
                        <p className="text-indigo-200 text-sm font-medium">總資產 ({preferredCurrency})</p>

                        <div className="flex bg-black/20 rounded-lg p-1 backdrop-blur-md">
                            {(['1W', '1M', '1Y'] as TimeRange[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setChartRange(r)}
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all ${chartRange === r
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Middle: Amount and Change */}
                    <div className="mt-2">
                        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight drop-shadow-sm">
                            {preferredCurrency === 'USD' ? '$' : 'NT$'}
                            {displayValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                        </h1>

                        <div className="flex items-center gap-2 bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/5 backdrop-blur-md">
                            <TrendingUp size={16} className={isPositive ? 'text-emerald-400' : 'text-red-400'} />
                            <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
                                +{dailyChangePercent}%
                            </span>
                            <span className="text-xs text-white/40 ml-1">今日</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Allocation Chart */}
            <AllocationChart />

            {/* Actions */}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white/90">資產清單</h2>
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
