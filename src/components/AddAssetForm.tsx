import React, { useState } from 'react'
import { useAssetStore, type AssetType } from '../store/assetStore'
import { PlusCircle, X, Bitcoin, Briefcase } from 'lucide-react'

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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Modal Content */}
            <div className="relative w-full max-w-md w-full glass-modal p-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-8 text-white gradient-text">Add New Asset</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Asset Type Selector */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-black/20 rounded-xl">
                        <button
                            type="button"
                            onClick={() => setType('crypto')}
                            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${type === 'crypto'
                                    ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                                    : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            <Bitcoin size={18} />
                            Crypto
                        </button>
                        <button
                            type="button"
                            onClick={() => setType('stock')}
                            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${type === 'stock'
                                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                    : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            <Briefcase size={18} />
                            Stocks
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">Asset Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder={type === 'crypto' ? 'e.g. Bitcoin' : 'e.g. Apple Inc.'}
                                className="glass-input"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">Symbol / Ticker</label>
                            <input
                                type="text"
                                value={symbol}
                                onChange={(e) => setSymbol(e.target.value)}
                                placeholder={type === 'crypto' ? 'e.g. BTC' : 'e.g. AAPL'}
                                className="glass-input uppercase"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">Quantity</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="glass-input"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">Buy Price ($)</label>
                                <input
                                    type="number"
                                    step="any"
                                    value={buyPrice}
                                    onChange={(e) => setBuyPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="glass-input"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="glass-button flex items-center justify-center gap-2 mt-8 group"
                    >
                        <PlusCircle size={20} className="group-hover:scale-110 transition-transform" />
                        Add to Portfolio
                    </button>

                    <div className="h-4"></div> {/* Bottom Spacer */}
                </form>
            </div>
        </div>
    )
}
