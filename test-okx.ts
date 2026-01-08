/**
 * Test script to verify OKX API connection
 * Run with: npx ts-node test-okx.ts
 */
import * as crypto from 'crypto'

const PROXY_URL = 'https://corsproxy.io/?'
const OKX_BASE_URL = 'https://www.okx.com'

interface OKXCredentials {
    apiKey: string
    secretKey: string
    passphrase: string
}

async function signRequest(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string,
    secretKey: string
): Promise<string> {
    const preHash = timestamp + method + requestPath + body
    const hmac = crypto.createHmac('sha256', secretKey)
    hmac.update(preHash)
    return hmac.digest('base64')
}

async function testOKXConnection(credentials: OKXCredentials): Promise<void> {
    const path = '/api/v5/asset/asset-valuation'
    const timestamp = new Date().toISOString()
    const signature = await signRequest(timestamp, 'GET', path, '', credentials.secretKey)

    console.log('=== OKX API Test ===')
    console.log('Timestamp:', timestamp)
    console.log('Path:', path)
    console.log('Signature:', signature)

    const headers = {
        'OK-ACCESS-KEY': credentials.apiKey,
        'OK-ACCESS-SIGN': signature,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': credentials.passphrase,
        'Content-Type': 'application/json',
    }

    console.log('\nHeaders:', headers)

    try {
        // Direct call (for Node.js environment)
        const response = await fetch(OKX_BASE_URL + path, {
            method: 'GET',
            headers,
        })

        const data = await response.json()
        console.log('\n=== Response ===')
        console.log('Status:', response.status)
        console.log('Data:', JSON.stringify(data, null, 2))

        if (data.code === '0') {
            console.log('\n✅ SUCCESS! Total Balance:', data.data[0].totalBal, 'USD')
        } else {
            console.log('\n❌ API Error:', data.msg || data.code)
        }
    } catch (error) {
        console.error('\n❌ Request Error:', error)
    }
}

// Test with provided credentials
const credentials: OKXCredentials = {
    apiKey: process.env.OKX_API_KEY || '',
    secretKey: process.env.OKX_SECRET_KEY || '',
    passphrase: process.env.OKX_PASSPHRASE || ''
}

testOKXConnection(credentials)
