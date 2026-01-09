
const proxyUrl = 'https://frosty-block-56bd.sean7115.workers.dev/?';



const targetUrl = 'https://query1.finance.yahoo.com/v8/finance/chart/00857B.TWO?interval=1d&range=1mo';
const fullUrl = `${proxyUrl}${encodeURIComponent(targetUrl)}`;

console.log('Testing Proxy Chart URL (1mo):', fullUrl);

async function test() {
    try {
        const response = await fetch(fullUrl);
        console.log('Status:', response.status);
        if (!response.ok) {
            const text = await response.text();
            console.log('Error Body:', text);
            return;
        }
        const data = await response.json();
        console.log('Success! Data preview:', JSON.stringify(data).substring(0, 100));

        const result = data.chart?.result?.[0];
        if (result?.meta?.regularMarketPrice) {
            console.log('Price found:', result.meta.regularMarketPrice);
        } else {
            console.log('Price NOT found in data.');
        }

    } catch (e) {
        console.error('Fetch failed:', e);
    }
}

test();
