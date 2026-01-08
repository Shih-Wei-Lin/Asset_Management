import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { useAssetStore } from '../store/assetStore'
import { getMarketChart } from '../services/coingecko'
import { getStockChart } from '../services/yahooFinance'

export type TimeRange = '1W' | '1M' | '1Y'

const RANGE_DAYS: Record<TimeRange, number> = {
    '1W': 7,
    '1M': 30,
    '1Y': 365,
}

interface ChartDataPoint {
    date: string
    value: number
}

export interface PortfolioChartProps {
    range: TimeRange
}

export const PortfolioChart: React.FC<PortfolioChartProps> = ({ range }) => {
    const { assets, preferredCurrency, exchangeRate } = useAssetStore()
    const [chartData, setChartData] = useState<ChartDataPoint[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        const fetchChartData = async () => {
            if (assets.length === 0) {
                setChartData([])
                return
            }

            setIsLoading(true)
            const days = RANGE_DAYS[range]

            // For a simple POC, we'll fetch the first crypto or stock and show its trend
            // A full implementation would aggregate all assets' historical values
            const primaryAsset = assets.find(a => a.apiId) || assets.find(a => a.type === 'stock')

            if (!primaryAsset) {
                setChartData([])
                setIsLoading(false)
                return
            }

            try {
                let rawData: [number, number][] = []

                if (primaryAsset.type === 'crypto' && primaryAsset.apiId) {
                    rawData = await getMarketChart(primaryAsset.apiId, days)
                } else if (primaryAsset.type === 'stock') {
                    // Map our range to Yahoo's format: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
                    const yahooRange = range === '1W' ? '5d' : range === '1M' ? '1mo' : '1y'
                    rawData = await getStockChart(primaryAsset.symbol, yahooRange)
                }

                // Process data
                const isTWDAsset = primaryAsset.type === 'stock' && primaryAsset.symbol.endsWith('.TW')

                const processed: ChartDataPoint[] = rawData.map(([timestamp, price]) => {
                    let value = price * primaryAsset.amount

                    // Convert based on preference
                    if (isTWDAsset && preferredCurrency === 'USD') {
                        value = value / exchangeRate
                    } else if (!isTWDAsset && preferredCurrency === 'TWD') {
                        value = value * exchangeRate
                    }

                    return {
                        date: new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        value: value
                    }
                })

                setChartData(processed)
            } catch (error) {
                console.error('Chart fetch error:', error)
                setChartData([])
            }
            setIsLoading(false)
        }

        fetchChartData()
    }, [assets, range, preferredCurrency, exchangeRate])

    const currencySymbol = preferredCurrency === 'USD' ? '$' : 'NT$'

    return (
        <div className="w-full h-full min-h-[160px]">
            {isLoading ? (
                <div className="h-full flex items-center justify-center text-white/20 text-xs">Loading chart...</div>
            ) : chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-white/20 text-xs">No chart data</div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#c084fc" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#c084fc" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="date"
                            hide
                        />
                        <YAxis
                            hide
                            domain={['dataMin', 'dataMax']}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(30, 30, 46, 0.9)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '12px'
                            }}
                            formatter={(value: number | undefined) => value !== undefined ? [`${currencySymbol}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, 'Value'] : ['N/A', 'Value']}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                        />
                        <Area
                            type="monotone"
                            dataKey="value"
                            stroke="#c084fc"
                            strokeWidth={2}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}
