// Symbol to CoinGecko API ID mapping for common cryptocurrencies
// Used for price lookup when apiId is not explicitly set on an asset
export const SYMBOL_TO_API_ID: Record<string, string> = {
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
    'AVAX': 'avalanche-2',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'LTC': 'litecoin',
    'ATOM': 'cosmos',
    'UNI': 'uniswap',
    'NEAR': 'near',
    'APT': 'aptos',
    'OP': 'optimism',
}

// Helper function to get the price key for an asset
export const getPriceKey = (asset: { type: string, symbol: string, apiId?: string }): string | undefined => {
    if (asset.type === 'crypto') {
        // If apiId is set, use it; otherwise try to map from symbol
        return asset.apiId || SYMBOL_TO_API_ID[asset.symbol.toUpperCase()]
    } else {
        // For stocks, use the symbol directly
        return asset.symbol
    }
}
