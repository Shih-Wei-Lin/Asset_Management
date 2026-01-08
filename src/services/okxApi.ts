/**
 * Direct OKX API implementation for browser environment
 * Uses HMAC-SHA256 signing via Web Crypto API
 */

const PROXY_URL = 'https://corsproxy.io/?'
const OKX_BASE_URL = 'https://www.okx.com'

export interface OKXCredentials {
    apiKey: string
    secretKey: string
    passphrase: string
}

export interface OKXAssetValuation {
    totalBal: string // Total balance in USD
    details: {
        classic?: string
        earn?: string
        funding?: string
        trading?: string
    }
    ts: string
}

/**
 * Generate HMAC-SHA256 signature for OKX API
 * Uses Web Crypto API for browser compatibility
 */
async function signRequest(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string,
    secretKey: string
): Promise<string> {
    const preHash = timestamp + method + requestPath + body

    // Use Web Crypto API for HMAC-SHA256
    const encoder = new TextEncoder()
    const keyData = encoder.encode(secretKey)
    const messageData = encoder.encode(preHash)

    const cryptoKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    )

    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData)

    // Convert to Base64
    const signatureArray = new Uint8Array(signature)
    const base64 = btoa(String.fromCharCode(...signatureArray))

    return base64
}

/**
 * Make authenticated request to OKX API
 */
async function okxRequest<T>(
    credentials: OKXCredentials,
    method: 'GET' | 'POST',
    path: string,
    body: string = ''
): Promise<T> {
    const timestamp = new Date().toISOString()
    const signature = await signRequest(timestamp, method, path, body, credentials.secretKey)

    const headers: HeadersInit = {
        'OK-ACCESS-KEY': credentials.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': credentials.passphrase,
        'Content-Type': 'application/json',
    }

    // Use corsproxy.io - it should forward headers correctly
    const url = PROXY_URL + encodeURIComponent(OKX_BASE_URL + path)

    console.log('[OKX API] Request:', { path, timestamp, method })
    console.log('[OKX API] URL (proxied):', url)

    const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' && body ? body : undefined,
    })

    console.log('[OKX API] Response status:', response.status)

    if (!response.ok) {
        const errorText = await response.text()
        console.error('[OKX API] Error response:', errorText)
        throw new Error(`OKX API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('[OKX API] Response data:', data)

    if (data.code !== '0') {
        throw new Error(`OKX API error: ${data.msg || data.code}`)
    }

    return data.data[0] as T
}

/**
 * Make authenticated request to OKX API (Expect List Return)
 */
async function okxRequestList<T>(
    credentials: OKXCredentials,
    method: 'GET' | 'POST',
    path: string,
    body: string = ''
): Promise<T[]> {
    const timestamp = new Date().toISOString()
    const signature = await signRequest(timestamp, method, path, body, credentials.secretKey)

    const headers: HeadersInit = {
        'OK-ACCESS-KEY': credentials.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': credentials.passphrase,
        'Content-Type': 'application/json',
    }

    // Use corsproxy.io - it should forward headers correctly
    const url = PROXY_URL + encodeURIComponent(OKX_BASE_URL + path)

    const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' && body ? body : undefined,
    })

    if (!response.ok) {
        const errorText = await response.text()
        console.error('[OKX API] Error response:', errorText)
        throw new Error(`OKX API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    if (data.code !== '0') {
        throw new Error(`OKX API error: ${data.msg || data.code}`)
    }

    return data.data as T[]
}

/**
 * Get total account asset valuation from OKX
 * Returns total balance in USD across all account types
 */
export async function getOKXTotalAssets(credentials: OKXCredentials): Promise<number> {
    const result = await okxRequest<OKXAssetValuation>(
        credentials,
        'GET',
        '/api/v5/asset/asset-valuation'
    )

    return parseFloat(result.totalBal) || 0
}

/**
 * Get detailed asset breakdown from OKX
 */
export async function getOKXAssetDetails(credentials: OKXCredentials): Promise<OKXAssetValuation> {
    return okxRequest<OKXAssetValuation>(
        credentials,
        'GET',
        '/api/v5/asset/asset-valuation'
    )
}

/**
 * Test OKX API connection
 */
export async function testOKXConnection(credentials: OKXCredentials): Promise<boolean> {
    try {
        await getOKXTotalAssets(credentials)
        // Auto-run debug to see detailed assets in console
        await debugOKXAssets(credentials)
        return true
    } catch (error) {
        console.error('OKX connection test failed:', error)
        return false
    }
}

// Interfaces for detailed balances
export interface OKXBalanceDetail {
    ccy: string
    availBal: string
    cashBal?: string
    frozenBal?: string
    bal?: string // For funding account
    amnt?: string // For savings balance
    amt?: string // Alternative for savings balance
    earnings?: string // For savings
    eq?: string // Equity in USD (from Trading account)
}

export interface OKXAccountBalance {
    totalEq: string
    details: OKXBalanceDetail[]
}

/**
 * Get Trading/Unified Account Balances
 */
export async function getOKXAccountBalance(credentials: OKXCredentials): Promise<OKXBalanceDetail[]> {
    const response = await okxRequest<{ details: OKXBalanceDetail[] }>(
        credentials,
        'GET',
        '/api/v5/account/balance'
    )
    return response.details || []
}

/**
 * Get Funding Account Balances
 */
export async function getOKXFundingBalance(credentials: OKXCredentials): Promise<OKXBalanceDetail[]> {
    try {
        return await okxRequestList<OKXBalanceDetail>(
            credentials,
            'GET',
            '/api/v5/asset/balances'
        )
    } catch (e) {
        console.error('Failed to fetch funding balance', e)
        return []
    }
}

/**
 * Get Earn (Savings) Balance
 */
export async function getOKXSavingsBalance(credentials: OKXCredentials): Promise<OKXBalanceDetail[]> {
    try {
        return await okxRequestList<OKXBalanceDetail>(
            credentials,
            'GET',
            '/api/v5/finance/savings/balance'
        )
    } catch (e) {
        console.error('Failed to fetch savings balance', e)
        return []
    }
}

export interface OKXTicker {
    instId: string
    last: string
}

/**
 * Get OKX Tickers (Spot)
 */
export async function getOKXTickers(credentials: OKXCredentials): Promise<OKXTicker[]> {
    const timestamp = new Date().toISOString()
    const path = '/api/v5/market/tickers?instType=SPOT'
    const signature = await signRequest(timestamp, 'GET', path, '', credentials.secretKey)

    const headers: HeadersInit = {
        'OK-ACCESS-KEY': credentials.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': credentials.passphrase,
        'Content-Type': 'application/json',
    }

    // Use corsproxy.io - it should forward headers correctly
    const url = PROXY_URL + encodeURIComponent(OKX_BASE_URL + path)

    try {
        const response = await fetch(url, { method: 'GET', headers })
        const data = await response.json()
        if (data.code !== '0') throw new Error(data.msg)
        return data.data as OKXTicker[]
    } catch (e) {
        console.error('Failed to fetch tickers', e)
        return []
    }
}

/**
 * Debug function to inspect all assets
 */
export async function debugOKXAssets(credentials: OKXCredentials): Promise<void> {
    console.log('--- DEBUGGING OKX ASSETS ---')

    try {
        console.log('Fetching Trading Account Balances...')
        const trading = await getOKXAccountBalance(credentials)
        console.log('Trading Balances:', trading)
    } catch (e) {
        console.error('Error fetching trading balances:', e)
    }

    try {
        console.log('Fetching Funding Account Balances...')
        const funding = await getOKXFundingBalance(credentials)
        console.log('Funding Balances:', funding)
    } catch (e) {
        console.error('Error fetching funding balances:', e)
    }

    try {
        console.log('Fetching Earn/Savings Balances...')
        const savings = await getOKXSavingsBalance(credentials)
        console.log('Earn/Savings Balances:', savings)
    } catch (e) {
        console.error('Error fetching earn balances:', e)
    }

    console.log('--- END DEBUG ---')
}
