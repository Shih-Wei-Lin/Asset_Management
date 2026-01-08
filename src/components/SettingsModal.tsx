import React, { useState } from 'react'
import { X, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useAssetStore } from '../store/assetStore'
import { SUPPORTED_EXCHANGES, checkExchangeConnection } from '../services/exchange'

interface SettingsModalProps {
    onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const { exchanges, addExchange, removeExchange } = useAssetStore()

    // Form State
    const [selectedExchangeId, setSelectedExchangeId] = useState(SUPPORTED_EXCHANGES[0].id)
    const [apiKey, setApiKey] = useState('')
    const [apiSecret, setApiSecret] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    const handleAddExchange = async (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMsg(null)
        setIsValidating(true)

        // Basic validation
        if (!apiKey || !apiSecret) {
            setErrorMsg('API Key and Secret are required')
            setIsValidating(false)
            return
        }

        // Connection Check
        const isConnected = await checkExchangeConnection(selectedExchangeId, apiKey, apiSecret)

        if (isConnected) {
            const exchangeInfo = SUPPORTED_EXCHANGES.find(ex => ex.id === selectedExchangeId)
            addExchange({
                id: crypto.randomUUID(),
                exchangeId: selectedExchangeId,
                name: exchangeInfo?.name || selectedExchangeId,
                apiKey,
                apiSecret
            })
            // Reset form
            setApiKey('')
            setApiSecret('')
        } else {
            setErrorMsg('Connection failed. Please check your keys and try again.')
        }

        setIsValidating(false)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-[#1a1b26] rounded-2xl shadow-2xl border border-white/10 overflow-hidden text-white">

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/5 bg-white/5">
                    <h2 className="text-lg font-bold">API Settings</h2>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
                        <X size={20} className="text-white/60" />
                    </button>
                </div>

                <div className="p-6 space-y-6">

                    {/* Add New Exchange */}
                    <form onSubmit={handleAddExchange} className="space-y-4">
                        <h3 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Connect Exchange</h3>

                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-white/40 mb-1">Exchange</label>
                                <select
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    value={selectedExchangeId}
                                    onChange={(e) => setSelectedExchangeId(e.target.value)}
                                >
                                    {SUPPORTED_EXCHANGES.map(ex => (
                                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-white/40 mb-1">API Key</label>
                                <input
                                    type="text"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Enter your API Key"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-white/40 mb-1">API Secret</label>
                                <input
                                    type="password"
                                    className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                    placeholder="Enter your Secret Key"
                                    value={apiSecret}
                                    onChange={(e) => setApiSecret(e.target.value)}
                                />
                            </div>
                        </div>

                        {errorMsg && (
                            <div className="text-red-400 text-xs px-2">{errorMsg}</div>
                        )}

                        <button
                            type="submit"
                            disabled={isValidating}
                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            {isValidating ? (
                                <span className="animate-pulse">Verifying...</span>
                            ) : (
                                <>
                                    <Plus size={16} />
                                    Connect
                                </>
                            )}
                        </button>
                    </form>

                    {/* Connected Exchanges List */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-white/60">Connected Accounts</h3>

                        {exchanges.length === 0 ? (
                            <p className="text-center text-white/20 text-xs py-4">No exchanges connected</p>
                        ) : (
                            <div className="space-y-2">
                                {exchanges.map(conn => (
                                    <div key={conn.id} className="flex justify-between items-center bg-white/5 p-3 rounded-lg border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-300">
                                                {conn.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-white">{conn.name}</p>
                                                <p className="text-[10px] text-white/40">Id: {conn.apiKey.substring(0, 6)}...</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {conn.status === 'error' ? (
                                                <div className="flex items-center gap-1 text-red-400 text-[10px]">
                                                    <AlertCircle size={12} />
                                                    <span>Error</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1 text-emerald-500 text-[10px]">
                                                    <CheckCircle2 size={12} />
                                                    <span>Synced</span>
                                                </div>
                                            )}
                                            <button
                                                onClick={() => removeExchange(conn.id)}
                                                className="p-1.5 text-white/20 hover:text-red-400 hover:bg-white/5 rounded transition-colors"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
