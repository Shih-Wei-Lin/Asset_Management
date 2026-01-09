import React, { useState, useEffect } from 'react'
import { useAssetStore, type AssetType } from '../store/assetStore'
import { PlusCircle, X, Bitcoin, Briefcase, Search, Loader2 } from 'lucide-react'
import { searchCoins, type CoinSearchResult } from '../services/coingecko'
import { searchStocks, type StockSearchResult } from '../services/yahooFinance'

interface AddAssetFormProps {
    onClose: () => void
}

export const AddAssetForm: React.FC<AddAssetFormProps> = ({ onClose }) => {
    const addAsset = useAssetStore((state) => state.addAsset)
    const [symbol, setSymbol] = useState('')
    const [type, setType] = useState<AssetType>('crypto')
    const [amount, setAmount] = useState('')
    const [buyPrice, setBuyPrice] = useState('')
    const [apiId, setApiId] = useState<string | undefined>(undefined)
    const [thumb, setThumb] = useState<string | undefined>(undefined)

    // Search State
    const [searchQuery, setSearchQuery] = useState('')
    const [searchResults, setSearchResults] = useState<(CoinSearchResult | StockSearchResult)[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)

    // Debounced Search
    useEffect(() => {
        if (!searchQuery || searchQuery.length < 2) {
            setSearchResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsSearching(true)
            let results: any[] = []

            if (type === 'crypto') {
                results = await searchCoins(searchQuery)
            } else {
                results = await searchStocks(searchQuery)
            }

            setSearchResults(results)
            setIsSearching(false)
            setShowResults(true)
        }, 500)

        return () => clearTimeout(timer)
    }, [searchQuery, type])

    const selectAsset = (asset: CoinSearchResult | StockSearchResult) => {
        setSymbol(asset.symbol.toUpperCase())

        if (type === 'crypto' && 'id' in asset) {
            setApiId(asset.id)
            setThumb(asset.thumb)
        } else {
            setApiId(undefined)
            setThumb(undefined)
        }

        setSearchQuery('')
        setShowResults(false)
    }

    // Auto-detect market based on symbol input
    const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSymbol(value)
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Form submitting...', { symbol, amount, type })
        if (!symbol || !amount) {
            console.warn('Missing symbol or amount')
            return
        }

        let finalSymbol = symbol.toUpperCase()

        // Auto-append suffix for Taiwan stocks ONLY if not already present
        // If it's alphanumeric 4-6 chars (e.g. 2330, 00878) AND doesn't have a dot yet
        if (type === 'stock' && /^[0-9A-Z]{4,6}$/.test(finalSymbol) && !finalSymbol.includes('.')) {
            // Heuristic: Bond ETFs (ending in 'B') are usually OTC (.TWO)
            // Others are usually Main Board (.TW)
            // NOTE: Search results should be preferred as they include the suffix.
            if (finalSymbol.endsWith('B')) {
                finalSymbol = `${finalSymbol}.TWO`
            } else {
                finalSymbol = `${finalSymbol}.TW`
            }
        }

        addAsset({
            symbol: finalSymbol,
            type,
            amount: parseFloat(amount),
            buyPrice: buyPrice ? parseFloat(buyPrice) : undefined,
            apiId: type === 'crypto' ? apiId : undefined,
            thumb: type === 'crypto' ? thumb : undefined
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
            <div className="relative w-full max-w-md w-full glass-modal p-6 animate-in slide-in-from-bottom-10 fade-in duration-300 max-h-[90vh] overflow-y-auto">
                <button
                    onClick={onClose}
                    className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-2xl font-bold mb-8 text-white gradient-text">新增資產</h2>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Asset Type Selector */}
                    <div className="grid grid-cols-2 gap-3 p-1 bg-black/20 rounded-xl">
                        <button
                            type="button"
                            onClick={() => { setType('crypto'); setApiId(undefined); setSearchQuery(''); setShowResults(false); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${type === 'crypto'
                                ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-lg'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            <Bitcoin size={18} />
                            加密貨幣
                        </button>
                        <button
                            type="button"
                            onClick={() => { setType('stock'); setApiId(undefined); setSearchQuery(''); setShowResults(false); }}
                            className={`flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all ${type === 'stock'
                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                : 'text-white/40 hover:text-white/70'
                                }`}
                        >
                            <Briefcase size={18} />
                            股票
                        </button>
                    </div>

                    {/* Search Input (For Both Crypto and Stock) */}
                    <div className="relative z-20">
                        <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">
                            {type === 'crypto' ? '搜尋幣種' : '搜尋股票'}
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={type === 'crypto' ? '輸入幣種名稱 (如 Bitcoin)' : '輸入股票代號或是名稱'}
                                className="glass-input pl-10"
                                onFocus={() => searchQuery.length >= 2 && searchResults.length > 0 && setShowResults(true)}
                                onBlur={() => setTimeout(() => setShowResults(false), 200)}
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
                                {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                            </div>
                        </div>

                        {/* Search Results Dropdown */}
                        {showResults && searchResults.length > 0 && (
                            <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1b26] border border-white/10 rounded-xl shadow-2xl max-h-60 overflow-y-auto z-30">
                                {searchResults.map((result) => {
                                    const isCrypto = 'id' in result
                                    const key = isCrypto ? result.id : result.symbol

                                    return (
                                        <button
                                            key={key}
                                            type="button"
                                            onClick={() => selectAsset(result)}
                                            className="w-full flex items-center gap-3 p-3 hover:bg-white/10 transition-colors text-left"
                                        >
                                            {isCrypto ? (
                                                <img src={result.thumb} alt={result.name} className="w-6 h-6 rounded-full" />
                                            ) : (
                                                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-[10px] text-blue-300">
                                                    {result.exchDisp || 'STK'}
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <p className="font-medium text-white truncate">{result.name}</p>
                                                <p className="text-xs text-white/50 flex items-center gap-1">
                                                    {result.symbol}
                                                    {!isCrypto && <span className="px-1 py-0.5 rounded bg-white/5 text-[10px]">{result.exchDisp}</span>}
                                                </p>
                                            </div>
                                        </button>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">代號</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={symbol}
                                    onChange={handleSymbolChange}
                                    placeholder={type === 'crypto' ? 'e.g. BTC' : 'e.g. 2330 / AAPL'}
                                    className="glass-input uppercase"
                                    required
                                />
                                {/* Market Indicator */}
                                {type === 'stock' && symbol && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold px-2 py-1 rounded bg-white/10 text-white/60">
                                        {symbol.includes('.') ? (symbol.endsWith('.TWO') ? '🇹🇼 債券/OTC' : '🇹🇼 台股') : /^[0-9A-Z]{4,6}$/.test(symbol.toUpperCase()) ? (symbol.toUpperCase().endsWith('B') ? '🇹🇼 債券/OTC' : '🇹🇼 台股') : /^[a-zA-Z]+$/.test(symbol) ? '🇺🇸 美股' : 'Unknown'}
                                    </div>
                                )}
                            </div>
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
                                <label className="block text-xs font-semibold text-indigo-200/50 uppercase tracking-wider mb-1.5 ml-1">
                                    Buy Price ($) <span className="text-white/30 font-normal normal-case">(Optional)</span>
                                </label>
                                <input
                                    type="number"
                                    step="any"
                                    value={buyPrice}
                                    onChange={(e) => setBuyPrice(e.target.value)}
                                    placeholder="0.00"
                                    className="glass-input"
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
