import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { useAssetStore } from '../store/assetStore'
import { formatCurrency } from '../utils/format'

const COLORS = [
    '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981',
    '#ec4899', '#6366f1', '#84cc16', '#f97316', '#14b8a6'
]

export const AllocationChart: React.FC = () => {
    const { assets, prices, preferredCurrency, exchangeRate } = useAssetStore()

    if (assets.length === 0) return null

    // Calculate each asset's value in preferred currency
    const data = assets.map((asset, index) => {
        const priceKey = asset.type === 'crypto' ? asset.apiId : asset.symbol
        const rawPrice = (priceKey && prices[priceKey]) ? prices[priceKey] : (asset.buyPrice ?? 0)

        let valueUSD = rawPrice * asset.amount
        if (asset.type === 'stock' && asset.symbol.endsWith('.TW')) {
            valueUSD = valueUSD / exchangeRate
        }

        const displayValue = preferredCurrency === 'USD'
            ? valueUSD
            : valueUSD * exchangeRate

        return {
            name: asset.symbol,
            value: displayValue,
            color: COLORS[index % COLORS.length]
        }
    }).filter(d => d.value > 0) // Filter out zero-value items

    const total = data.reduce((sum, d) => sum + d.value, 0)

    return (
        <div className="glass-card p-4 mb-6">
            <h3 className="text-sm font-semibold text-white/70 mb-3">資產配置</h3>

            <div className="flex items-center gap-4">
                {/* Pie Chart */}
                <div className="w-32 h-32">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={30}
                                outerRadius={50}
                                paddingAngle={2}
                                dataKey="value"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'rgba(30, 30, 46, 0.95)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '12px'
                                }}
                                formatter={(value: number | undefined) =>
                                    value !== undefined
                                        ? formatCurrency(value, preferredCurrency)
                                        : 'N/A'
                                }
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                    {data.slice(0, 5).map((item, index) => {
                        const percent = ((item.value / total) * 100).toFixed(1)
                        return (
                            <div key={index} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-white/70">{item.name}</span>
                                </div>
                                <span className="text-white/50">{percent}%</span>
                            </div>
                        )
                    })}
                    {data.length > 5 && (
                        <p className="text-xs text-white/30">+{data.length - 5} 其他</p>
                    )}
                </div>
            </div>
        </div>
    )
}
