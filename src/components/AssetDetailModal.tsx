import React, { useState, useEffect } from 'react'
import { X, Bitcoin, Link2, Trash2 } from 'lucide-react'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import { type Asset, useAssetStore } from '../store/assetStore'
import { formatCurrency } from '../utils/format'
import { getMarketChart } from '../services/coingecko'
import { getStockChart } from '../services/yahooFinance'

type TimeRange = '1W' | '1M' | '1Y'

const RANGE_DAYS: Record<TimeRange, number> = {
    '1W': 7,
    '1M': 30,
    '1Y': 365,
}

interface AssetDetailModalProps {
    asset: Asset
    onClose: () => void
}

export const AssetDetailModal: React.FC<AssetDetailModalProps> = ({ asset, onClose }) => {
    const { prices, preferredCurrency, exchangeRate, removeAsset } = useAssetStore()
    const [chartRange, setChartRange] = useState<TimeRange>('1M')
    const [chartData, setChartData] = useState<{ date: string, value: number }[]>([])
    const [isLoading, setIsLoading] = useState(false)

    // Calculate current values
    const priceKey = asset.type === 'crypto' ? asset.apiId : asset.symbol
    const currentPriceRaw = (priceKey && prices[priceKey]) ? prices[priceKey] : (asset.buyPrice || 0)

    // Adjust for Currency
    const isTWDStock = asset.type === 'stock' && asset.symbol.endsWith('.TW')

    // Unit Price Display
    let displayUnitPrice = currentPriceRaw
    if (isTWDStock && preferredCurrency === 'USD') displayUnitPrice /= exchangeRate
    else if (!isTWDStock && preferredCurrency === 'TWD') displayUnitPrice *= exchangeRate

    // Total Value Display
    const totalValue = displayUnitPrice * asset.amount

    // Chart Fetching Logic
    useEffect(() => {
        const fetchHistory = async () => {
            setIsLoading(true)
            const days = RANGE_DAYS[chartRange]

            try {
                let rawData: [number, number][] = []

                if (asset.type === 'crypto' && asset.apiId) {
                    rawData = await getMarketChart(asset.apiId, days)
                } else if (asset.type === 'stock') {
                    const yahooRange = chartRange === '1W' ? '5d' : chartRange === '1M' ? '1mo' : '1y'
                    rawData = await getStockChart(asset.symbol, yahooRange)
                }

                // Process to Unit Price in Preferred Currency
                const processed = rawData.map(([timestamp, price]) => {
                    let value = price
                    if (isTWDStock && preferredCurrency === 'USD') value /= exchangeRate
                    else if (!isTWDStock && preferredCurrency === 'TWD') value *= exchangeRate

                    return {
                        date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        value
                    }
                })
                setChartData(processed)
            } catch (e) {
                console.error("Failed to fetch history", e)
                setChartData([])
            } finally {
                setIsLoading(false)
            }
        }

        if (asset.apiId || asset.type === 'stock') {
            fetchHistory()
        } else {
            setChartData([])
        }
    }, [asset, chartRange, preferredCurrency, exchangeRate])

    const handleDelete = () => {
        if (confirm('Are you sure you want to delete this asset?')) {
            removeAsset(asset.id)
            onClose()
        }
    }

    const currencySymbol = preferredCurrency === 'USD' ? '$' : 'NT$'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#1a1b26] rounded-3xl shadow-2xl border border-white/10 overflow-hidden text-white relative">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X size={20} className="text-white/60" />
                </button>

                <div className="p-6 pb-0">
                    {/* Header Info */}
                    <div className="flex items-center gap-4 mb-6">
                        {asset.thumb ? (
                            <img src={asset.thumb} alt={asset.symbol} className="w-16 h-16 rounded-full shadow-lg" />
                        ) : (
                            <div className="w-16 h-16 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Bitcoin size={32} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">{asset.symbol}</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-white/40 uppercase bg-white/5 px-2 py-0.5 rounded">{asset.type}</span>
                                {asset.exchangeId && (
                                    <span className="text-xs text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                                        <Link2 size={10} /> Synced
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-white/40 mb-1">Total Quantity</p>
                            <p className="text-xl font-mono font-medium">{asset.amount.toLocaleString()}</p>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
                            <p className="text-xs text-white/40 mb-1">Current Value</p>
                            <p className="text-xl font-mono font-medium text-emerald-400">
                                {formatCurrency(totalValue, preferredCurrency)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Chart Section */}
                <div className="relative h-[250px] w-full bg-gradient-to-b from-[#1a1b26] to-black/20">
                    <div className="absolute top-4 right-6 z-10 flex bg-white/5 rounded-lg p-0.5 backdrop-blur-md">
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

                    {isLoading ? (
                        <div className="h-full flex items-center justify-center text-white/20 text-sm">Loading Chart...</div>
                    ) : chartData.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'rgba(26, 27, 38, 0.9)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '12px'
                                    }}
                                    formatter={(val: number | undefined) => [
                                        val !== undefined ? `${currencySymbol}${val.toLocaleString(undefined, { maximumFractionDigits: 4 })}` : 'N/A',
                                        'Price'
                                    ]}
                                    labelStyle={{ display: 'none' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#818cf8"
                                    strokeWidth={3}
                                    fill="url(#colorPrice)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-full flex items-center justify-center text-white/20 text-sm">
                            {asset.apiId ? 'No chart data available' : 'Price data unavailble for this asset'}
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                {!asset.exchangeId && (
                    <div className="p-6 border-t border-white/5 flex justify-end">
                        <button
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors text-sm font-medium"
                        >
                            <Trash2 size={16} /> Delete Asset
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}
