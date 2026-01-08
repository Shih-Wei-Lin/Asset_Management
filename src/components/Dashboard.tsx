import React, { useState, useEffect, useCallback } from 'react'
import { Plus, Wallet, TrendingUp, RefreshCw, AlertCircle, Settings } from 'lucide-react'
import { AddAssetForm } from './AddAssetForm'
import { SettingsModal } from './SettingsModal'
import { AssetList } from './AssetList'
import { PortfolioChart, type TimeRange } from './PortfolioChart'
import { AllocationChart } from './AllocationChart'
import { useAssetStore, selectTotalValue } from '../store/assetStore'
import { getPrices } from '../services/coingecko'
import { getStockPrices, getExchangeRate } from '../services/yahooFinance'


export const Dashboard: React.FC = () => {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
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
        setError,
        syncExchanges
    } = useAssetStore()
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [chartRange, setChartRange] = useState<TimeRange>('1M')

    // Use selector for consistent total value calculation
    const displayValue = selectTotalValue({ assets, prices, exchangeRate, preferredCurrency, lastUpdated, error, addAsset: () => { }, removeAsset: () => { }, updateAsset: () => { }, setPrices: () => { }, setExchangeRate: () => { }, setPreferredCurrency: () => { }, setLastUpdated: () => { }, setError: () => { }, addExchange: () => { }, removeExchange: () => { }, syncExchanges: async () => { }, exchanges: [] })

    const fetchPrices = async () => {
        setIsRefreshing(true)
        setError(null)

        try {
            // 0. Fetch Exchange Rate
            const rate = await getExchangeRate()
            setExchangeRate(rate)

            // 1. Sync Exchanges (New!)
            await syncExchanges()

            // 2. Fetch Crypto Prices
            const cryptoIds = assets
                .filter(a => a.type === 'crypto' && a.apiId)
                .map(a => a.apiId as string)

            const cryptoPrices = cryptoIds.length > 0 ? await getPrices(cryptoIds) : {}

            // 3. Fetch Stock Prices
            const stockSymbols = assets
                .filter(a => a.type === 'stock')
                .map(a => a.symbol)

            const stockPrices = stockSymbols.length > 0 ? await getStockPrices(stockSymbols) : {}

            // 4. Merge and Update Store
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
    }, []) // Removed assets.length dependency to prevent loops

    const [chartDataSummary, setChartDataSummary] = useState<{ start: number, end: number } | null>(null)

    // Calculate dynamic change based on chart data
    const absoluteChange = chartDataSummary ? chartDataSummary.end - chartDataSummary.start : 0
    const percentageChange = chartDataSummary && chartDataSummary.start !== 0
        ? (absoluteChange / chartDataSummary.start) * 100
        : 0
    const isPositiveChange = absoluteChange >= 0

    // Map time range to display label
    const rangeLabelMap: Record<TimeRange, string> = {
        '1W': '1周收益',
        '1M': '1月收益',
        '1Y': '1年收益'
    }

    // Memoize callback to prevent infinite loops in PortfolioChart
    const handleChartDataChange = useCallback((start: number, end: number) => {
        setChartDataSummary(prev => {
            // Only update if values actually changed to further reduce re-renders
            if (prev?.start === start && prev?.end === end) return prev
            return { start, end }
        })
    }, [])

    return (
        <div className="min-h-screen pb-24 px-4 sm:px-6 lg:px-8 max-w-lg mx-auto bg-black text-white">
            {/* Header / Top Bar */}
            <div className="flex flex-col gap-4 py-6">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm">
                            <Wallet className="text-white" size={24} />
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

                    {/* Right Side Actions */}
                    <div className="flex items-center gap-2">
                        {/* Settings Button */}
                        <button
                            onClick={() => setIsSettingsOpen(true)}
                            className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60"
                        >
                            <Settings size={18} />
                        </button>

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
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-3">
                        <AlertCircle className="text-red-400 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-red-200">{error}</p>
                    </div>
                )}
            </div>

            {/* Hero Card with Integrated Chart / Total Asset */}
            <div className="relative w-full aspect-[16/10] bg-[#1a1b26] rounded-3xl overflow-hidden shadow-2xl border border-white/5">

                {/* Background Chart Layer */}
                <div className="absolute inset-0 z-0 opacity-50">
                    <PortfolioChart
                        range={chartRange}
                        onDataChange={handleChartDataChange}
                    />
                </div>

                {/* Main Content Area */}
                <div className="relative z-10 p-6 flex flex-col h-full justify-between">

                    {/* Top Row: Label and Eye Icon (Visual) */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-white/60">
                            <p className="text-sm font-medium">總資產估值</p>
                            {/* Eye icon/toggle placeholder */}
                            <div className="w-4 h-4 rounded-full border-2 border-white/20"></div>
                        </div>

                        {/* Time Range Selectors */}
                        <div className="flex bg-white/5 rounded-lg p-1 backdrop-blur-md border border-white/5">
                            {(['1W', '1M', '1Y'] as TimeRange[]).map((r) => (
                                <button
                                    key={r}
                                    onClick={() => setChartRange(r)}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${chartRange === r
                                        ? 'bg-white/20 text-white shadow-sm'
                                        : 'text-white/40 hover:text-white/80 hover:bg-white/5'
                                        }`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Middle: Amount and Change */}
                    <div className="mt-4">
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-5xl font-bold text-white mb-2 tracking-tight drop-shadow-sm font-mono">
                                {displayValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </h1>
                            <span className="text-lg text-white/40 font-medium">{preferredCurrency}</span>
                        </div>

                        {/* Dynamic Change Display - Matching Screenshot Style */}
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-white/60 text-sm border-b border-dashed border-white/20 pb-0.5">
                                {rangeLabelMap[chartRange]}
                            </span>

                            <div className={`flex items-center gap-1.5 text-sm font-bold ${isPositiveChange ? 'text-[#22c55e]' : 'text-red-400'}`}>
                                <span>
                                    {isPositiveChange ? '+' : ''}{preferredCurrency === 'USD' ? '$' : 'NT$'}{Math.abs(absoluteChange).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span>
                                    ({isPositiveChange ? '+' : ''}{percentageChange.toFixed(2)}%)
                                </span>
                                <TrendingUp size={14} className={isPositiveChange ? 'rotate-0' : 'rotate-180'} />
                            </div>
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

            {/* Settings Modal */}
            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}
        </div>
    )
}
