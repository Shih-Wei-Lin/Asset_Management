
const symbol = '00679B.TWO';
const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;

// We can try fetching directly first since we are in node (no CORS needed), but node fetch might fail with user-agent issues.
// Let's rely on standard fetch if available (Node 18+) or just try to use the direct URL since we are not in a browser.

console.log(`Testing symbol: ${symbol}`);
console.log(`URL: ${url}`);

async function test() {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`Direct fetch failed: ${response.status} ${response.statusText}`);
            // Yahoo often blocks requests without a User-Agent.
            return;
        }
        const data = await response.json();
        console.log('Response:', JSON.stringify(data, null, 2));

        const result = data.chart?.result?.[0];
        if (result && result.meta?.regularMarketPrice) {
            console.log(`✅ Success! Price: ${result.meta.regularMarketPrice}`);
        } else {
            console.log('❌ Valid JSON but missing price data.');
        }
    } catch (e) {
        console.error('Fetch error:', e);
    }
}

test();
