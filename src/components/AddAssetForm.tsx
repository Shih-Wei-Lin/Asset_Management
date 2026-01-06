import React, { useState } from 'react'
import { useAssetStore, type AssetType } from '../store/assetStore'
import { PlusCircle, X } from 'lucide-react'

interface AddAssetFormProps {
    onClose: () => void
}

export const AddAssetForm: React.FC<AddAssetFormProps> = ({ onClose }) => {
    const addAsset = useAssetStore((state) => state.addAsset)
    const [name, setName] = useState('')
    const [symbol, setSymbol] = useState('')
    const [type, setType] = useState<AssetType>('crypto')
    const [amount, setAmount] = useState('')
    const [buyPrice, setBuyPrice] = useState('')

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!name || !symbol || !amount || !buyPrice) return

        addAsset({
            name,
            symbol: symbol.toUpperCase(),
            type,
            amount: parseFloat(amount),
            buyPrice: parseFloat(buyPrice),
        })
        onClose()
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-6 text-zinc-900 dark:text-white">新增資產</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">類型</label>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setType('crypto')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === 'crypto'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                                    }`}
                            >
                                加密貨幣
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('stock')}
                                className={`flex-1 py-2 rounded-lg font-medium transition-colors ${type === 'stock'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                                    }`}
                            >
                                股票
                            </button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">名稱</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={type === 'crypto' ? 'Bitcoin' : 'Apple Inc.'}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">代號</label>
                        <input
                            type="text"
                            value={symbol}
                            onChange={(e) => setSymbol(e.target.value)}
                            placeholder={type === 'crypto' ? 'BTC' : 'AAPL'}
                            className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">持有數量</label>
                            <input
                                type="number"
                                step="any"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">購買價格 (單價)</label>
                            <input
                                type="number"
                                step="any"
                                value={buyPrice}
                                onChange={(e) => setBuyPrice(e.target.value)}
                                placeholder="0.00"
                                className="w-full px-4 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-colors mt-6"
                    >
                        <PlusCircle size={20} />
                        新增資產
                    </button>
                </form>
            </div>
        </div>
    )
}
