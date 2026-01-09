import React, { useState } from 'react'
import { X, Plus, Trash2, CheckCircle2, AlertCircle, Download, Upload } from 'lucide-react'
import { useAssetStore } from '../store/assetStore'
import { SUPPORTED_EXCHANGES, checkExchangeConnection } from '../services/exchange'
import { testOKXConnection } from '../services/okxApi'

interface SettingsModalProps {
    onClose: () => void
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
    const { exchanges, addExchange, removeExchange } = useAssetStore()

    // Form State
    const [selectedExchangeId, setSelectedExchangeId] = useState(SUPPORTED_EXCHANGES[0].id)
    const [apiKey, setApiKey] = useState('')
    const [apiSecret, setApiSecret] = useState('')
    const [passphrase, setPassphrase] = useState('')
    const [isValidating, setIsValidating] = useState(false)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    // Check if selected exchange requires passphrase
    const requiresPassphrase = selectedExchangeId === 'okx'

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

        if (requiresPassphrase && !passphrase) {
            setErrorMsg('Passphrase is required for OKX')
            setIsValidating(false)
            return
        }

        let isConnected = false

        // Use appropriate connection check based on exchange
        if (selectedExchangeId === 'okx') {
            isConnected = await testOKXConnection({
                apiKey,
                secretKey: apiSecret,
                passphrase
            })
        } else {
            isConnected = await checkExchangeConnection(selectedExchangeId, apiKey, apiSecret)
        }

        if (isConnected) {
            const exchangeInfo = SUPPORTED_EXCHANGES.find(ex => ex.id === selectedExchangeId)
            addExchange({
                id: crypto.randomUUID(),
                exchangeId: selectedExchangeId,
                name: exchangeInfo?.name || selectedExchangeId,
                apiKey,
                apiSecret,
                passphrase: requiresPassphrase ? passphrase : undefined
            })
            // Reset form
            setApiKey('')
            setApiSecret('')
            setPassphrase('')
        } else {
            setErrorMsg('Connection failed. Please check your keys and try again.')
        }

        setIsValidating(false)
    }

    // Export Data (Backup)
    const handleExport = () => {
        const data = localStorage.getItem('asset-storage')
        if (!data) return

        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `asset-backup-${new Date().toISOString().slice(0, 10)}.json`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    // Import Data (Restore)
    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onload = (event) => {
            try {
                const json = event.target?.result as string
                // Basic validation: check if it looks like our store
                if (!json.includes('"state"') || !json.includes('"version"')) {
                    throw new Error('Invalid backup file')
                }

                localStorage.setItem('asset-storage', json)
                alert('Backup restored successfully! The page will refresh.')
                window.location.reload()
            } catch (err) {
                console.error(err)
                setErrorMsg('Failed to restore backup. Invalid file.')
            }
        }
        reader.readAsText(file)
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

                            {requiresPassphrase && (
                                <div>
                                    <label className="block text-xs text-white/40 mb-1">Passphrase</label>
                                    <input
                                        type="password"
                                        className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="Enter your Passphrase"
                                        value={passphrase}
                                        onChange={(e) => setPassphrase(e.target.value)}
                                    />
                                    <p className="text-[10px] text-white/30 mt-1">The passphrase you set when creating the API key</p>
                                </div>
                            )}
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

                    {/* Data Management Section */}
                    <div className="space-y-3 pt-4 border-t border-white/10">
                        <h3 className="text-sm font-semibold text-white/60">Data Management</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleExport}
                                className="flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors border border-white/10"
                            >
                                <Download size={16} className="text-indigo-400" />
                                Export Backup
                            </button>

                            <label className="flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 rounded-lg text-sm transition-colors border border-white/10 cursor-pointer">
                                <Upload size={16} className="text-emerald-400" />
                                Restore Backup
                                <input
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={handleImport}
                                />
                            </label>
                        </div>
                        <p className="text-[10px] text-white/30 text-center">
                            Save your keys and assets to a file to transfer between devices.
                        </p>
                    </div>

                </div>
            </div>
        </div>
    )
}
