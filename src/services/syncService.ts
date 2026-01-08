import type { Asset, ExchangeConnection } from '../store/assetStore'
import {
    getOKXAccountBalance,
    getOKXFundingBalance,
    getOKXSavingsBalance,
    getOKXTickers,
    type OKXBalanceDetail
} from './okxApi'
import { getExchangeBalances } from './exchange'

// Simple mapping for top cryptos to ensure they get prices immediately
const SYMBOL_MAP: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'USDT': 'tether',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'USDC': 'usd-coin',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'TRX': 'tron',
    'SHIB': 'shiba-inu',
    'ARB': 'arbitrum',
    'OKB': 'okb',
    'LINK': 'chainlink',
    'DAI': 'dai',
    'ACE': 'fusionist',
    'ZKJ': 'polyhedra-network',
    'ULTI': 'ultiverse',
    'BETH': 'binance-eth',
}

interface SyncResult {
    assets: Asset[]
    exchanges: ExchangeConnection[]
    hasChanges: boolean
}

export async function syncAllExchanges(
    currentAssets: Asset[],
    currentExchanges: ExchangeConnection[]
): Promise<SyncResult> {
    const newAssets = [...currentAssets]
    // Create a copy of exchanges to update status/lastSynced
    const newExchanges = currentExchanges.map(e => ({ ...e }))
    let hasChanges = false

    for (const conn of currentExchanges) {
        try {
            const connIdx = newExchanges.findIndex(e => e.id === conn.id)

            // Handle OKX - Fetch Trading, Funding, and Savings
            if (conn.exchangeId === 'okx' && conn.passphrase) {

                // 1. Fetch all balances AND tickers in parallel
                const [trading, funding, savings, tickers] = await Promise.all([
                    getOKXAccountBalance({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase }),
                    getOKXFundingBalance({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase }),
                    getOKXSavingsBalance({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase }),
                    getOKXTickers({ apiKey: conn.apiKey, secretKey: conn.apiSecret, passphrase: conn.passphrase })
                ])

                // 2. Aggregate balances by currency (ccy)
                const balanceMap = new Map<string, number>()
                const priceMap = new Map<string, number>()

                // Helper to add to map
                const addToMap = (ccy: string, amount: string) => {
                    const val = parseFloat(amount)
                    if (!isNaN(val) && val > 0) {
                        balanceMap.set(ccy, (balanceMap.get(ccy) || 0) + val)
                    }
                }

                // Build Price Map from Tickers (CCY-USDT)
                if (tickers && Array.isArray(tickers)) {
                    tickers.forEach(t => {
                        if (!t.instId) return
                        const [base, quote] = t.instId.split('-')
                        if (quote === 'USDT' && t.last) {
                            priceMap.set(base, parseFloat(t.last))
                        }
                    })
                }

                // Force stablecoins if missing
                if (!priceMap.has('USDT')) priceMap.set('USDT', 1)
                if (!priceMap.has('USDC')) priceMap.set('USDC', 1)

                trading.forEach((item: OKXBalanceDetail) => {
                    addToMap(item.ccy, item.cashBal || item.availBal || '0')
                })
                funding.forEach((item: OKXBalanceDetail) => addToMap(item.ccy, item.bal || item.availBal || '0'))
                savings.forEach((item: OKXBalanceDetail) => addToMap(item.ccy, item.amnt || item.amt || '0'))


                // 3. Update Assets in Store
                const processedSymbols = new Set<string>()
                const aggregated = Array.from(balanceMap.entries()).map(([ccy, amount]) => ({ ccy, amount }))

                for (const { ccy, amount } of aggregated) {
                    processedSymbols.add(ccy)
                    const existingIdx = newAssets.findIndex(
                        a => a.exchangeId === conn.id && a.symbol === ccy
                    )

                    if (existingIdx >= 0) {
                        // Update
                        const updatedAsset = { ...newAssets[existingIdx], amount }

                        // Update fallback price if available
                        if (priceMap.has(ccy)) {
                            updatedAsset.buyPrice = priceMap.get(ccy)
                        }

                        if (JSON.stringify(updatedAsset) !== JSON.stringify(newAssets[existingIdx])) {
                            newAssets[existingIdx] = updatedAsset
                            hasChanges = true
                        }
                    } else {
                        // Add New
                        const apiId = SYMBOL_MAP[ccy] || undefined
                        newAssets.push({
                            id: crypto.randomUUID(),
                            type: 'crypto',
                            symbol: ccy,
                            amount: amount,
                            dateAdded: Date.now(),
                            exchangeId: conn.id,
                            apiId: apiId,
                            buyPrice: priceMap.get(ccy) // Set fallback price
                        })
                        hasChanges = true
                    }
                }

                // Cleanup: Remove assets that are no longer present OR the old OKX_TOTAL
                const indicesToRemove = newAssets
                    .map((a, i) => ({ ...a, originalIndex: i }))
                    .filter(a => a.exchangeId === conn.id && (!processedSymbols.has(a.symbol) || a.symbol === 'OKX_TOTAL'))
                    .map(a => a.originalIndex)
                    .sort((a, b) => b - a)

                for (const idx of indicesToRemove) {
                    newAssets.splice(idx, 1)
                    hasChanges = true
                }

                // Update connection status
                if (connIdx >= 0) {
                    newExchanges[connIdx].lastSynced = Date.now()
                    newExchanges[connIdx].status = 'ok'
                }
            } else {
                // Non-OKX exchanges: use CCXT-based approach (may need proxy fixes)
                const balances = await getExchangeBalances(conn.exchangeId, conn.apiKey, conn.apiSecret)

                if (connIdx >= 0) {
                    newExchanges[connIdx].lastSynced = Date.now()
                    newExchanges[connIdx].status = 'ok'
                    hasChanges = true
                }

                for (const item of balances) {
                    const existingIdx = newAssets.findIndex(
                        a => a.exchangeId === conn.id && a.symbol === item.symbol
                    )

                    if (existingIdx >= 0) {
                        if (newAssets[existingIdx].amount !== item.amount) {
                            newAssets[existingIdx] = {
                                ...newAssets[existingIdx],
                                amount: item.amount
                            }
                            hasChanges = true
                        }
                    } else {
                        const apiId = SYMBOL_MAP[item.symbol] || undefined
                        newAssets.push({
                            id: crypto.randomUUID(),
                            type: 'crypto',
                            symbol: item.symbol,
                            amount: item.amount,
                            dateAdded: Date.now(),
                            exchangeId: conn.id,
                            apiId: apiId,
                            thumb: `https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png`
                        })
                        hasChanges = true
                    }
                }
            }
        } catch (error) {
            console.error(`Sync failed for ${conn.name}:`, error)
            const connIdx = newExchanges.findIndex(e => e.id === conn.id)
            if (connIdx >= 0) {
                newExchanges[connIdx].status = 'error'
                newExchanges[connIdx].lastSynced = Date.now() // still update time so we know when we tried
                hasChanges = true
            }

        }
    }

    return {
        assets: newAssets,
        exchanges: newExchanges,
        hasChanges
    }
}
